// Package backup creates and restores full-system backups: a Postgres
// custom-format dump plus the uploads directory, bundled as a single .tar.gz.
package backup

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"realestate/internal/config"
)

type Manager struct {
	DB        *pgxpool.Pool
	Cfg       *config.Config
	BackupDir string
	// PgDump, PgRestore are the paths to the respective binaries.
	// If empty, "pg_dump" / "pg_restore" are looked up on PATH.
	PgDump, PgRestore string
}

type BackupInfo struct {
	ID        string    `json:"id"`
	Filename  string    `json:"filename"`
	SizeBytes int64     `json:"size_bytes"`
	Kind      string    `json:"kind"`
	Status    string    `json:"status"`
	Error     *string   `json:"error,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// Create produces a new backup file and registers it. kind is "manual" or "auto".
func (m *Manager) Create(ctx context.Context, kind, actorID string) (*BackupInfo, error) {
	if err := os.MkdirAll(m.BackupDir, 0o700); err != nil {
		return nil, fmt.Errorf("mkdir backup dir: %w", err)
	}
	stamp := time.Now().UTC().Format("20060102-150405")
	filename := fmt.Sprintf("nurfl-%s-%s.tar.gz", kind, stamp)
	dst := filepath.Join(m.BackupDir, filename)

	// Register as "running" so the UI can show in-progress.
	var id string
	err := m.DB.QueryRow(ctx, `
		INSERT INTO backups (filename, kind, status, created_by)
		VALUES ($1,$2,'running',$3) RETURNING id`,
		filename, kind, nilIfEmpty(actorID)).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("register: %w", err)
	}

	size, err := m.writeBundle(ctx, dst)
	if err != nil {
		_ = os.Remove(dst)
		_, _ = m.DB.Exec(context.Background(),
			`UPDATE backups SET status='failed', error=$2 WHERE id=$1`, id, err.Error())
		return nil, err
	}
	if _, err := m.DB.Exec(ctx,
		`UPDATE backups SET status='ready', size_bytes=$2 WHERE id=$1`, id, size); err != nil {
		return nil, fmt.Errorf("mark ready: %w", err)
	}
	return m.get(ctx, id)
}

// writeBundle streams: db.dump + uploads/** into one gzipped tar.
func (m *Manager) writeBundle(ctx context.Context, dst string) (int64, error) {
	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
	if err != nil {
		return 0, err
	}
	defer out.Close()
	gz := gzip.NewWriter(out)
	defer gz.Close()
	tw := tar.NewWriter(gz)
	defer tw.Close()

	// 1. Dump DB via pg_dump into memory (small enough for our size range).
	//    For very large DBs, pipe through tempfile.
	dumpBytes, err := m.pgDump(ctx)
	if err != nil {
		return 0, fmt.Errorf("pg_dump: %w", err)
	}
	if err := writeTarFile(tw, "db.dump", dumpBytes, 0o600, time.Now()); err != nil {
		return 0, err
	}

	// 2. Walk uploads directory.
	up := m.Cfg.UploadDir
	if _, err := os.Stat(up); err == nil {
		err := filepath.Walk(up, func(path string, info os.FileInfo, werr error) error {
			if werr != nil {
				return werr
			}
			if info.IsDir() || !info.Mode().IsRegular() {
				return nil
			}
			rel, err := filepath.Rel(up, path)
			if err != nil {
				return err
			}
			rel = filepath.ToSlash(rel)
			f, err := os.Open(path)
			if err != nil {
				return err
			}
			defer f.Close()
			hdr := &tar.Header{
				Name:    "uploads/" + rel,
				Mode:    0o600,
				Size:    info.Size(),
				ModTime: info.ModTime(),
			}
			if err := tw.WriteHeader(hdr); err != nil {
				return err
			}
			_, err = io.Copy(tw, f)
			return err
		})
		if err != nil {
			return 0, fmt.Errorf("walk uploads: %w", err)
		}
	}

	// 3. Manifest.
	manifest := map[string]any{
		"schema_version": 1,
		"created_at":     time.Now().UTC().Format(time.RFC3339),
		"db_name":        m.Cfg.DBName,
	}
	mb, _ := json.MarshalIndent(manifest, "", "  ")
	if err := writeTarFile(tw, "manifest.json", mb, 0o600, time.Now()); err != nil {
		return 0, err
	}

	// Close writers to flush and get final size.
	if err := tw.Close(); err != nil {
		return 0, err
	}
	if err := gz.Close(); err != nil {
		return 0, err
	}
	if err := out.Sync(); err != nil {
		return 0, err
	}
	st, err := os.Stat(dst)
	if err != nil {
		return 0, err
	}
	return st.Size(), nil
}

func writeTarFile(tw *tar.Writer, name string, data []byte, mode os.FileMode, mt time.Time) error {
	hdr := &tar.Header{Name: name, Mode: int64(mode), Size: int64(len(data)), ModTime: mt}
	if err := tw.WriteHeader(hdr); err != nil {
		return err
	}
	_, err := tw.Write(data)
	return err
}

func (m *Manager) pgDump(ctx context.Context) ([]byte, error) {
	bin := m.PgDump
	if bin == "" {
		bin = "pg_dump"
	}
	cmd := exec.CommandContext(ctx, bin,
		"--host="+m.Cfg.DBHost, "--port="+m.Cfg.DBPort,
		"--username="+m.Cfg.DBUser, "--dbname="+m.Cfg.DBName,
		"--format=custom", "--compress=6", "--no-owner", "--no-acl",
	)
	cmd.Env = append(os.Environ(), "PGPASSWORD="+m.Cfg.DBPassword)
	var stderr strings.Builder
	cmd.Stderr = &stderr
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("%v: %s", err, strings.TrimSpace(stderr.String()))
	}
	return out, nil
}

// Restore reads a .tar.gz, extracts db.dump + uploads, runs pg_restore.
// Writes a pre_restore snapshot first for safety (unless skipSafety=true).
func (m *Manager) Restore(ctx context.Context, src io.Reader, actorID string, skipSafety bool) error {
	if !skipSafety {
		if _, err := m.Create(ctx, "pre_restore", actorID); err != nil {
			return fmt.Errorf("pre-restore snapshot failed: %w — aborting restore", err)
		}
	}

	gz, err := gzip.NewReader(src)
	if err != nil {
		return fmt.Errorf("gunzip: %w", err)
	}
	defer gz.Close()
	tr := tar.NewReader(gz)

	// Extract into a temp dir, then act.
	tmp, err := os.MkdirTemp("", "nurfl-restore-")
	if err != nil {
		return err
	}
	defer os.RemoveAll(tmp)

	var dumpPath string
	uploadsDir := filepath.Join(tmp, "uploads")

	for {
		hdr, err := tr.Next()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return fmt.Errorf("tar read: %w", err)
		}
		// Path safety: no absolute paths, no "..".
		clean := filepath.Clean(hdr.Name)
		if strings.HasPrefix(clean, "..") || strings.HasPrefix(clean, "/") {
			return fmt.Errorf("unsafe path in archive: %s", hdr.Name)
		}
		if hdr.Typeflag == tar.TypeDir {
			continue
		}
		dst := filepath.Join(tmp, clean)
		if err := os.MkdirAll(filepath.Dir(dst), 0o700); err != nil {
			return err
		}
		f, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o600)
		if err != nil {
			return err
		}
		if _, err := io.Copy(f, tr); err != nil {
			f.Close()
			return err
		}
		f.Close()
		if clean == "db.dump" {
			dumpPath = dst
		}
	}

	if dumpPath == "" {
		return errors.New("archive missing db.dump — not a valid NUR backup")
	}

	// Run pg_restore.
	if err := m.pgRestore(ctx, dumpPath); err != nil {
		return fmt.Errorf("pg_restore: %w", err)
	}

	// Replace uploads directory if present in archive.
	if st, err := os.Stat(uploadsDir); err == nil && st.IsDir() {
		if err := os.MkdirAll(m.Cfg.UploadDir, 0o755); err != nil {
			return err
		}
		// Copy files; don't delete existing files so a partial backup doesn't wipe them.
		err := filepath.Walk(uploadsDir, func(path string, info os.FileInfo, werr error) error {
			if werr != nil || info.IsDir() || !info.Mode().IsRegular() {
				return werr
			}
			rel, _ := filepath.Rel(uploadsDir, path)
			dst := filepath.Join(m.Cfg.UploadDir, rel)
			if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
				return err
			}
			in, err := os.Open(path)
			if err != nil {
				return err
			}
			defer in.Close()
			out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
			if err != nil {
				return err
			}
			defer out.Close()
			_, err = io.Copy(out, in)
			return err
		})
		if err != nil {
			return fmt.Errorf("uploads copy: %w", err)
		}
	}
	return nil
}

func (m *Manager) pgRestore(ctx context.Context, dumpPath string) error {
	bin := m.PgRestore
	if bin == "" {
		bin = "pg_restore"
	}
	cmd := exec.CommandContext(ctx, bin,
		"--host="+m.Cfg.DBHost, "--port="+m.Cfg.DBPort,
		"--username="+m.Cfg.DBUser, "--dbname="+m.Cfg.DBName,
		"--clean", "--if-exists", "--no-owner", "--no-acl",
		"--single-transaction",
		dumpPath,
	)
	cmd.Env = append(os.Environ(), "PGPASSWORD="+m.Cfg.DBPassword)
	var stderr strings.Builder
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("%v: %s", err, strings.TrimSpace(stderr.String()))
	}
	return nil
}

func (m *Manager) List(ctx context.Context) ([]BackupInfo, error) {
	rows, err := m.DB.Query(ctx,
		`SELECT id, filename, size_bytes, kind, status, error, created_at
		 FROM backups ORDER BY created_at DESC LIMIT 100`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []BackupInfo{}
	for rows.Next() {
		var b BackupInfo
		if err := rows.Scan(&b.ID, &b.Filename, &b.SizeBytes, &b.Kind,
			&b.Status, &b.Error, &b.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, nil
}

func (m *Manager) get(ctx context.Context, id string) (*BackupInfo, error) {
	var b BackupInfo
	err := m.DB.QueryRow(ctx,
		`SELECT id, filename, size_bytes, kind, status, error, created_at
		 FROM backups WHERE id=$1`, id).
		Scan(&b.ID, &b.Filename, &b.SizeBytes, &b.Kind, &b.Status, &b.Error, &b.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &b, nil
}

func (m *Manager) Path(filename string) string { return filepath.Join(m.BackupDir, filename) }

func (m *Manager) Delete(ctx context.Context, id string) error {
	var filename string
	if err := m.DB.QueryRow(ctx, `SELECT filename FROM backups WHERE id=$1`, id).Scan(&filename); err != nil {
		return err
	}
	_ = os.Remove(m.Path(filename))
	_, err := m.DB.Exec(ctx, `DELETE FROM backups WHERE id=$1`, id)
	return err
}

// Prune removes backups older than retentionDays. Keeps the most recent
// pre_restore snapshot for safety.
func (m *Manager) Prune(ctx context.Context, retentionDays int) (int, error) {
	if retentionDays <= 0 {
		return 0, nil
	}
	rows, err := m.DB.Query(ctx, `
		SELECT id, filename FROM backups
		WHERE created_at < NOW() - ($1::text || ' days')::interval
		  AND kind IN ('manual','auto')`, retentionDays)
	if err != nil {
		return 0, err
	}
	type row struct{ id, filename string }
	toDelete := []row{}
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.id, &r.filename); err == nil {
			toDelete = append(toDelete, r)
		}
	}
	rows.Close()
	deleted := 0
	for _, r := range toDelete {
		_ = os.Remove(m.Path(r.filename))
		if _, err := m.DB.Exec(ctx, `DELETE FROM backups WHERE id=$1`, r.id); err == nil {
			deleted++
		}
	}
	return deleted, nil
}

// ---- Scheduler ----

// Schedule reads site_settings to decide whether to run an auto-backup.
// It's intended to be called periodically (every hour or so) from a goroutine.
func (m *Manager) Schedule(ctx context.Context) {
	var raw json.RawMessage
	if err := m.DB.QueryRow(ctx,
		`SELECT data FROM site_settings WHERE id=1`).Scan(&raw); err != nil {
		return
	}
	var cfg map[string]any
	_ = json.Unmarshal(raw, &cfg)
	schedule, _ := cfg["backup_schedule"].(string)
	if schedule == "" || schedule == "off" {
		return
	}
	var last time.Time
	_ = m.DB.QueryRow(ctx,
		`SELECT COALESCE(MAX(created_at), 'epoch') FROM backups WHERE kind='auto' AND status='ready'`).
		Scan(&last)
	var interval time.Duration
	switch schedule {
	case "daily":
		interval = 24 * time.Hour
	case "weekly":
		interval = 7 * 24 * time.Hour
	default:
		return
	}
	if time.Since(last) < interval {
		return
	}
	if _, err := m.Create(ctx, "auto", ""); err != nil {
		return
	}
	// Apply retention.
	retStr, _ := cfg["backup_retention_days"].(string)
	if n, err := strconv.Atoi(retStr); err == nil {
		_, _ = m.Prune(ctx, n)
	}
}

// StartScheduler runs Schedule once immediately then every hour until ctx is cancelled.
func (m *Manager) StartScheduler(ctx context.Context) {
	t := time.NewTicker(1 * time.Hour)
	defer t.Stop()
	m.Schedule(ctx)
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			m.Schedule(ctx)
		}
	}
}

func nilIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
