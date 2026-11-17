package handlers

import (
	"encoding/xml"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"realestate/internal/config"
)

type SEOHandler struct {
	DB  *pgxpool.Pool
	Cfg *config.Config
}

// Robots serves a simple robots.txt pointing at the sitemap.
func (h *SEOHandler) Robots(c *gin.Context) {
	base := strings.TrimRight(h.publicSiteURL(), "/")
	c.Header("Cache-Control", "public, max-age=3600")
	c.String(http.StatusOK,
		"User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /uploads/\n\nSitemap: %s/sitemap.xml\n",
		base)
}

type urlEntry struct {
	XMLName    xml.Name `xml:"url"`
	Loc        string   `xml:"loc"`
	LastMod    string   `xml:"lastmod,omitempty"`
	ChangeFreq string   `xml:"changefreq,omitempty"`
	Priority   string   `xml:"priority,omitempty"`
}
type urlSet struct {
	XMLName xml.Name   `xml:"urlset"`
	Xmlns   string     `xml:"xmlns,attr"`
	URL     []urlEntry `xml:"url"`
}

func (h *SEOHandler) Sitemap(c *gin.Context) {
	base := strings.TrimRight(h.publicSiteURL(), "/")
	set := urlSet{Xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9"}

	static := []struct {
		path, freq, pri string
	}{
		{"/", "daily", "1.0"},
		{"/buy", "daily", "0.9"},
		{"/rent", "daily", "0.9"},
		{"/sold", "weekly", "0.6"},
		{"/about", "monthly", "0.4"},
		{"/contact", "monthly", "0.5"},
	}
	for _, s := range static {
		set.URL = append(set.URL, urlEntry{
			Loc: base + s.path, ChangeFreq: s.freq, Priority: s.pri,
		})
	}

	rows, err := h.DB.Query(c.Request.Context(), `
		SELECT slug, updated_at FROM properties
		WHERE deleted_at IS NULL AND published_at IS NOT NULL
		ORDER BY updated_at DESC LIMIT 5000`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var slug string
			var upd time.Time
			if err := rows.Scan(&slug, &upd); err == nil {
				set.URL = append(set.URL, urlEntry{
					Loc:        base + "/property/" + slug,
					LastMod:    upd.UTC().Format("2006-01-02"),
					ChangeFreq: "weekly",
					Priority:   "0.8",
				})
			}
		}
	}

	c.Header("Content-Type", "application/xml; charset=utf-8")
	c.Header("Cache-Control", "public, max-age=1800")
	_, _ = c.Writer.WriteString(xml.Header)
	enc := xml.NewEncoder(c.Writer)
	enc.Indent("", "  ")
	_ = enc.Encode(set)
}

// publicSiteURL derives the customer-facing origin (not the API origin).
// CORSOrigin points at the SPA; PublicBaseURL is the API. Prefer CORSOrigin.
func (h *SEOHandler) publicSiteURL() string {
	if h.Cfg.CORSOrigin != "" {
		return h.Cfg.CORSOrigin
	}
	return h.Cfg.PublicBaseURL
}
