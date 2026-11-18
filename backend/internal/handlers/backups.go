package handlers

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"realestate/internal/backup"
)

type BackupsHandler struct {
	Mgr *backup.Manager
	DB  *pgxpool.Pool
}

func (h *BackupsHandler) List(c *gin.Context) {
	list, err := h.Mgr.List(c.Request.Context())
	if err != nil {
		c.JSON(500, gin.H{"error": "list failed: " + err.Error()})
		return
	}
	c.JSON(200, gin.H{"data": list})
}

func (h *BackupsHandler) Create(c *gin.Context) {
	uid := idOrEmpty(c.MustGet("uid"))
	info, err := h.Mgr.Create(c.Request.Context(), "manual", uid)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	audit(h.DB, uid, "create", "backup", info.ID, c.ClientIP())
	c.JSON(201, info)
}

func (h *BackupsHandler) Download(c *gin.Context) {
	id := c.Param("id")
	fn, ok := h.lookupFilename(c, id)
	if !ok {
		return
	}
	path := h.Mgr.Path(fn)
	if _, err := os.Stat(path); err != nil {
		c.JSON(404, gin.H{"error": "backup file missing on disk"})
		return
	}
	c.Header("Content-Disposition", `attachment; filename="`+fn+`"`)
	c.Header("Content-Type", "application/gzip")
	c.Header("Cache-Control", "no-store")
	c.File(path)
}

func (h *BackupsHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if err := h.Mgr.Delete(c.Request.Context(), id); err != nil {
		c.JSON(500, gin.H{"error": "delete failed: " + err.Error()})
		return
	}
	audit(h.DB, idOrEmpty(c.MustGet("uid")), "delete", "backup", id, c.ClientIP())
	c.JSON(200, gin.H{"ok": true})
}

// Restore accepts a multipart upload (field "file") OR an existing backup id
// via query string ?id=<uuid>.
func (h *BackupsHandler) Restore(c *gin.Context) {
	ctx := c.Request.Context()
	uid := idOrEmpty(c.MustGet("uid"))

	if id := c.Query("id"); id != "" {
		fn, ok := h.lookupFilename(c, id)
		if !ok {
			return
		}
		f, err := os.Open(h.Mgr.Path(fn))
		if err != nil {
			c.JSON(500, gin.H{"error": "open failed: " + err.Error()})
			return
		}
		defer f.Close()
		if err := h.Mgr.Restore(ctx, f, uid, false); err != nil {
			c.JSON(500, gin.H{"error": "restore failed: " + err.Error()})
			return
		}
		audit(h.DB, uid, "restore", "backup", id, c.ClientIP())
		c.JSON(200, gin.H{"ok": true, "message": "restore complete — please sign in again"})
		return
	}

	// Else expect an upload.
	const maxBytes = 1024 * 1024 * 1024 // 1 GB
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": "file required (field 'file') or ?id= must be provided"})
		return
	}
	if !isTarGz(file.Filename) {
		c.JSON(400, gin.H{"error": "expected a .tar.gz file"})
		return
	}
	f, err := file.Open()
	if err != nil {
		c.JSON(500, gin.H{"error": "open upload failed: " + err.Error()})
		return
	}
	defer f.Close()
	if err := h.Mgr.Restore(ctx, f, uid, false); err != nil {
		c.JSON(500, gin.H{"error": "restore failed: " + err.Error()})
		return
	}
	audit(h.DB, uid, "restore", "backup", "upload", c.ClientIP())
	c.JSON(200, gin.H{"ok": true, "message": "restore complete — please sign in again"})
}

func (h *BackupsHandler) lookupFilename(c *gin.Context, id string) (string, bool) {
	list, err := h.Mgr.List(c.Request.Context())
	if err != nil {
		c.JSON(500, gin.H{"error": "lookup failed: " + err.Error()})
		return "", false
	}
	for _, b := range list {
		if b.ID == id {
			return b.Filename, true
		}
	}
	c.JSON(404, gin.H{"error": "backup not found"})
	return "", false
}

func isTarGz(name string) bool {
	n := strings.ToLower(name)
	return strings.HasSuffix(n, ".tar.gz") || strings.HasSuffix(n, ".tgz")
}
