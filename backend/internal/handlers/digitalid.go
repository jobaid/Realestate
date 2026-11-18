package handlers

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	qrcode "github.com/skip2/go-qrcode"
)

type DigitalIDHandler struct {
	DB *pgxpool.Pool
}

func (h *DigitalIDHandler) load(c *gin.Context) (map[string]string, bool) {
	var raw json.RawMessage
	if err := h.DB.QueryRow(c.Request.Context(),
		`SELECT data FROM site_settings WHERE id = 1`).Scan(&raw); err != nil {
		c.JSON(500, gin.H{"error": "settings unavailable"})
		return nil, false
	}
	var full map[string]any
	if err := json.Unmarshal(raw, &full); err != nil {
		c.JSON(500, gin.H{"error": "parse failed"})
		return nil, false
	}
	str := func(k string) string {
		if v, ok := full[k].(string); ok {
			return v
		}
		return ""
	}
	m := map[string]string{
		"enabled":      str("did_enabled"),
		"first_name":   str("did_first_name"),
		"last_name":    str("did_last_name"),
		"title":        str("did_title"),
		"organization": str("did_organization"),
		"phone":        str("did_phone"),
		"email":        str("did_email"),
		"website":      str("did_website"),
		"address":      str("did_address"),
		"note":         str("did_note"),
		"photo_url":    str("did_photo_url"),
		"linkedin":     str("did_linkedin"),
		"facebook":     str("did_facebook"),
		"instagram":    str("did_instagram"),
	}
	if strings.ToLower(m["enabled"]) == "false" {
		c.JSON(404, gin.H{"error": "digital id disabled"})
		return nil, false
	}
	return m, true
}

func (h *DigitalIDHandler) Info(c *gin.Context) {
	m, ok := h.load(c)
	if !ok {
		return
	}
	c.Header("Cache-Control", "public, max-age=300")
	c.JSON(200, m)
}

func (h *DigitalIDHandler) Download(c *gin.Context) {
	m, ok := h.load(c)
	if !ok {
		return
	}
	v := buildVCard(m)
	fn := slugFor(m) + ".vcf"
	c.Header("Content-Type", "text/vcard; charset=utf-8")
	c.Header("Content-Disposition", `attachment; filename="`+fn+`"`)
	c.Header("Cache-Control", "no-store")
	_, _ = c.Writer.WriteString(v)
}

func (h *DigitalIDHandler) QR(c *gin.Context) {
	if _, ok := h.load(c); !ok {
		return
	}
	scheme := "https"
	if fp := c.GetHeader("X-Forwarded-Proto"); fp != "" {
		scheme = fp
	} else if c.Request.TLS == nil {
		scheme = "http"
	}
	url := fmt.Sprintf("%s://%s/api/v1/digital-id.vcf", scheme, c.Request.Host)

	png, err := qrcode.Encode(url, qrcode.Medium, 512)
	if err != nil {
		c.JSON(500, gin.H{"error": "qr encode failed"})
		return
	}
	c.Header("Cache-Control", "public, max-age=300")
	c.Data(200, "image/png", png)
}

// RFC 6350 vCard 3.0 — widely supported on iOS/Android/Outlook.
func buildVCard(m map[string]string) string {
	var b strings.Builder
	w := func(line string) { b.WriteString(line); b.WriteString("\r\n") }

	esc := func(s string) string {
		s = strings.ReplaceAll(s, "\\", "\\\\")
		s = strings.ReplaceAll(s, ",", "\\,")
		s = strings.ReplaceAll(s, ";", "\\;")
		s = strings.ReplaceAll(s, "\n", "\\n")
		return s
	}

	fullName := strings.TrimSpace(m["first_name"] + " " + m["last_name"])
	if fullName == "" {
		fullName = m["organization"]
	}

	w("BEGIN:VCARD")
	w("VERSION:3.0")
	w("N:" + esc(m["last_name"]) + ";" + esc(m["first_name"]) + ";;;")
	w("FN:" + esc(fullName))
	if m["organization"] != "" {
		w("ORG:" + esc(m["organization"]))
	}
	if m["title"] != "" {
		w("TITLE:" + esc(m["title"]))
	}
	if m["phone"] != "" {
		w("TEL;TYPE=CELL,VOICE:" + esc(m["phone"]))
	}
	if m["email"] != "" {
		w("EMAIL;TYPE=INTERNET:" + esc(m["email"]))
	}
	if m["website"] != "" {
		w("URL:" + esc(m["website"]))
	}
	if m["address"] != "" {
		w("ADR;TYPE=WORK:;;" + esc(m["address"]) + ";;;;")
	}
	if m["note"] != "" {
		w("NOTE:" + esc(m["note"]))
	}
	if m["linkedin"] != "" {
		w("X-SOCIALPROFILE;TYPE=linkedin:" + esc(m["linkedin"]))
	}
	if m["facebook"] != "" {
		w("X-SOCIALPROFILE;TYPE=facebook:" + esc(m["facebook"]))
	}
	if m["instagram"] != "" {
		w("X-SOCIALPROFILE;TYPE=instagram:" + esc(m["instagram"]))
	}
	w("END:VCARD")
	return b.String()
}

func slugFor(m map[string]string) string {
	s := strings.ToLower(strings.TrimSpace(m["first_name"] + "-" + m["last_name"]))
	s = strings.ReplaceAll(s, " ", "-")
	if s == "-" || s == "" {
		s = "contact"
	}
	return s
}
