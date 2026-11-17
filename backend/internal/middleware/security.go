package middleware

import (
	"github.com/gin-gonic/gin"
)

// SecurityHeaders applies baseline security headers. HSTS is only emitted when
// the request appears to arrive over HTTPS (either a direct TLS connection or
// via a reverse proxy that set X-Forwarded-Proto=https). That avoids forcing
// HSTS on localhost HTTP, which would brick the dev environment for a year.
func SecurityHeaders(hstsEnabled bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		if hstsEnabled && isHTTPS(c) {
			// 1 year, subdomains, preload-ready.
			c.Header("Strict-Transport-Security",
				"max-age=31536000; includeSubDomains; preload")
		}
		c.Next()
	}
}

func isHTTPS(c *gin.Context) bool {
	if c.Request.TLS != nil {
		return true
	}
	return c.GetHeader("X-Forwarded-Proto") == "https"
}
