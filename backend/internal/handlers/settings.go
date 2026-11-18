package handlers

import (
	"encoding/json"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type SettingsHandler struct {
	DB *pgxpool.Pool
}

// Keys exposed on the unauthenticated /api/v1/settings endpoint.
var publicKeys = map[string]bool{
	"company_name":    true,
	"tagline":         true,
	"phone":           true,
	"email":           true,
	"address":         true,
	"facebook_url":    true,
	"instagram_url":   true,
	"twitter_url":     true,
	"logo_url":        true,
	"about_name":      true,
	"about_title":     true,
	"about_photo_url": true,
	"about_bio":       true,
	"did_enabled":     true, // so the About page can show/hide the button
}

// Keys admin can write. Includes publicKeys + sensitive admin-only keys.
var writableKeys = merge(publicKeys, map[string]bool{
	"notify_email":      true,
	"smtp_host":         true,
	"smtp_port":         true,
	"smtp_user":         true,
	"smtp_password":     true,
	"smtp_from_name":    true,
	"smtp_from_address": true,
	"smtp_use_tls":      true,
	// Digital ID (served via dedicated endpoints, not the public /settings)
	"did_first_name":   true,
	"did_last_name":    true,
	"did_title":        true,
	"did_organization": true,
	"did_phone":        true,
	"did_email":        true,
	"did_website":      true,
	"did_address":      true,
	"did_note":         true,
	"did_photo_url":    true,
	"did_linkedin":     true,
	"did_facebook":     true,
	"did_instagram":    true,
})

// Keys returned to admin GET — same as writable, but smtp_password is masked.
var secretKeys = map[string]bool{"smtp_password": true}

func merge(a, b map[string]bool) map[string]bool {
	out := map[string]bool{}
	for k := range a {
		out[k] = true
	}
	for k := range b {
		out[k] = true
	}
	return out
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
	var full map[string]any
	if err := json.Unmarshal(raw, &full); err != nil {
		c.JSON(500, gin.H{"error": "parse failed"})
		return
	}
	// Mask secret values; admin UI only needs to know whether they're set.
	for k := range secretKeys {
		if v, ok := full[k].(string); ok && v != "" {
			full[k] = "••••••••"
		}
	}
	c.JSON(200, full)
}

func (h *SettingsHandler) AdminUpdate(c *gin.Context) {
	var body map[string]any
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": "invalid payload"})
		return
	}
	clean := map[string]any{}
	for k, v := range body {
		if !writableKeys[k] {
			continue
		}
		// Ignore masked secrets — means the admin didn't change them.
		if secretKeys[k] {
			if s, ok := v.(string); ok && (s == "" || strings.HasPrefix(s, "••")) {
				continue
			}
		}
		clean[k] = v
	}
	if len(clean) == 0 {
		c.JSON(200, gin.H{"ok": true, "unchanged": true})
		return
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
