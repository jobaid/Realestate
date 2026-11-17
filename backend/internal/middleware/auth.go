package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"

	"realestate/internal/auth"
)

const (
	CtxUserID = "uid"
	CtxRole   = "role"
)

func RequireAuth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		h := c.GetHeader("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
			return
		}
		tok := strings.TrimPrefix(h, "Bearer ")
		claims, err := auth.ParseAccess(secret, tok)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "unauthorized"})
			return
		}
		c.Set(CtxUserID, claims.UserID)
		c.Set(CtxRole, claims.Role)
		c.Next()
	}
}

func RequireRole(roles ...string) gin.HandlerFunc {
	allowed := map[string]bool{}
	for _, r := range roles {
		allowed[r] = true
	}
	return func(c *gin.Context) {
		r, _ := c.Get(CtxRole)
		role, _ := r.(string)
		if !allowed[role] {
			c.AbortWithStatusJSON(403, gin.H{"error": "forbidden"})
			return
		}
		c.Next()
	}
}
