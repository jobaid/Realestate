package middleware

import (
	"strconv"

	"github.com/gin-gonic/gin"
)

// PublicCache sets a short Cache-Control for GETs on public read endpoints.
// It only applies when no Cache-Control header was already set by the handler.
func PublicCache(maxAgeSeconds int) gin.HandlerFunc {
	val := "public, max-age=" + strconv.Itoa(maxAgeSeconds)
	return func(c *gin.Context) {
		if c.Request.Method == "GET" && c.Writer.Header().Get("Cache-Control") == "" {
			c.Header("Cache-Control", val)
		}
		c.Next()
	}
}
