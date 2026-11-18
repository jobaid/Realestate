package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gabriel-vasile/mimetype"
	"github.com/gin-gonic/gin"

	"realestate/internal/config"
)

type UploadHandler struct {
	Cfg *config.Config
}

const maxUploadBytes = 16 * 1024 * 1024 // 16 MB — big enough for high-res logos

var allowedMime = map[string]string{
	"image/jpeg":    ".jpg",
	"image/png":     ".png",
	"image/webp":    ".webp",
	"image/svg+xml": ".svg",
	"image/gif":     ".gif",
}

func (h *UploadHandler) Image(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxUploadBytes+4096)
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": "file required (or too large — max 16 MB)"})
		return
	}
	if file.Size > maxUploadBytes {
		c.JSON(413, gin.H{"error": fmt.Sprintf("file too large: %.1f MB (max 16 MB)", float64(file.Size)/1024/1024)})
		return
	}
	f, err := file.Open()
	if err != nil {
		c.JSON(400, gin.H{"error": "cannot open file"})
		return
	}
	defer f.Close()

	mt, err := mimetype.DetectReader(f)
	if err != nil {
		c.JSON(400, gin.H{"error": "mime detect failed"})
		return
	}
	ext, ok := allowedMime[mt.String()]
	if !ok {
		c.JSON(415, gin.H{"error": "unsupported type: " + mt.String() + " (allowed: JPEG, PNG, WebP, SVG, GIF)"})
		return
	}
	if _, err := f.Seek(0, io.SeekStart); err != nil {
		c.JSON(500, gin.H{"error": "seek failed"})
		return
	}

	if err := os.MkdirAll(h.Cfg.UploadDir, 0o755); err != nil {
		c.JSON(500, gin.H{"error": "storage not ready: " + err.Error()})
		return
	}
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	name := hex.EncodeToString(b) + ext
	dst := filepath.Join(h.Cfg.UploadDir, name)

	out, err := os.Create(dst)
	if err != nil {
		c.JSON(500, gin.H{"error": "create failed: " + err.Error()})
		return
	}
	defer out.Close()
	if _, err := io.Copy(out, io.LimitReader(f, maxUploadBytes)); err != nil {
		_ = os.Remove(dst)
		c.JSON(500, gin.H{"error": "write failed: " + err.Error()})
		return
	}

	url := strings.TrimRight(h.Cfg.PublicBaseURL, "/") + "/uploads/" + name
	c.JSON(200, gin.H{"url": url, "filename": name, "mime": mt.String()})
}
