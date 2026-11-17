package handlers

import (
	"encoding/json"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SettingsHandler struct {
	DB *pgxpool.Pool
}

// Public subset of settings — never expose anything secret here.
var publicKeys = map[string]bool{
	"company_name":   true,
	"tagline":        true,
	"phone":          true,
	"email":          true,
	"address":        true,
	"facebook_url":   true,
	"instagram_url": true,
	"twitter_url":    true,
}

func (h *SettingsHandler) Public(c *gin.Context) {
	var raw json.RawMessage
	if err := h.DB.QueryRow(c.Request.Context(),
		`SELECT data FROM site_settings WHERE id = 1`).Scan(&raw); err != nil {
		c.JSON(500, gin.H{"error": "settings unavailable"})
		return
	}
	var full map[string]any
	if err := json.Unmarshal(raw, &full); err != nil {
		c.JSON(500, gin.H{"error": "parse failed"})
		return
	}
	out := map[string]any{}
	for k, v := range full {
		if publicKeys[k] {
			out[k] = v
		}
	}
	c.JSON(200, out)
}

func (h *SettingsHandler) AdminGet(c *gin.Context) {
	var raw json.RawMessage
	if err := h.DB.QueryRow(c.Request.Context(),
		`SELECT data FROM site_settings WHERE id = 1`).Scan(&raw); err != nil {
		c.JSON(500, gin.H{"error": "settings unavailable"})
		return
	}
	c.Data(200, "application/json", raw)
}

func (h *SettingsHandler) AdminUpdate(c *gin.Context) {
	var body map[string]any
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": "invalid payload"})
		return
	}
	// Whitelist writable keys.
	clean := map[string]any{}
	for k, v := range body {
		if publicKeys[k] {
			clean[k] = v
		}
	}
	data, err := json.Marshal(clean)
	if err != nil {
		c.JSON(400, gin.H{"error": "serialize failed"})
		return
	}
	uid := idOrEmpty(c.MustGet("uid"))
	_, err = h.DB.Exec(c.Request.Context(),
		`UPDATE site_settings SET data = data || $1::jsonb, updated_by = $2 WHERE id = 1`,
		string(data), nilIfEmpty(uid))
	if err != nil {
		c.JSON(500, gin.H{"error": "update failed"})
		return
	}
	audit(h.DB, uid, "update", "settings", "1", c.ClientIP())
	c.JSON(200, gin.H{"ok": true})
}
