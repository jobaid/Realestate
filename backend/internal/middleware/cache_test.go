package middleware

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestPublicCacheSetsHeaderOnGET(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(PublicCache(120))
	r.GET("/x", func(c *gin.Context) { c.String(200, "ok") })

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/x", nil))
	got := w.Header().Get("Cache-Control")
	if got != "public, max-age=120" {
		t.Fatalf("wrong header: %q", got)
	}
}

func TestPublicCacheSkipsNonGET(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(PublicCache(60))
	r.POST("/x", func(c *gin.Context) { c.String(200, "ok") })

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("POST", "/x", nil))
	if got := w.Header().Get("Cache-Control"); got != "" {
		t.Fatalf("expected empty header on POST, got %q", got)
	}
}

func TestPublicCacheDoesNotOverride(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(PublicCache(60))
	r.GET("/x", func(c *gin.Context) {
		c.Header("Cache-Control", "no-store")
		c.String(200, "ok")
	})

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest("GET", "/x", nil))
	if got := w.Header().Get("Cache-Control"); got != "no-store" {
		t.Fatalf("middleware overrode handler header: got %q", got)
	}
}
