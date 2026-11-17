package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestSecurityHeadersAlwaysOn(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(SecurityHeaders(false))
	r.GET("/", func(c *gin.Context) { c.String(200, "ok") })

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
	if w.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Error("missing nosniff")
	}
	if w.Header().Get("X-Frame-Options") != "DENY" {
		t.Error("missing frame options")
	}
	if w.Header().Get("Strict-Transport-Security") != "" {
		t.Error("HSTS must not fire when disabled")
	}
}

func TestHSTSOnlyWhenHTTPS(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(SecurityHeaders(true))
	r.GET("/", func(c *gin.Context) { c.String(200, "ok") })

	// plain HTTP → no HSTS even when enabled
	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/", nil))
	if w.Header().Get("Strict-Transport-Security") != "" {
		t.Error("HSTS must not fire on plain HTTP request")
	}

	// behind proxy with X-Forwarded-Proto=https
	w = httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("X-Forwarded-Proto", "https")
	r.ServeHTTP(w, req)
	if w.Header().Get("Strict-Transport-Security") == "" {
		t.Error("HSTS must fire when X-Forwarded-Proto=https")
	}
}
