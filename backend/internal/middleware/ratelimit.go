package middleware

import (
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// IPRateLimit allows up to `max` requests per IP in the given window.
// In-memory; sufficient for a single-instance deployment.
func IPRateLimit(max int, window time.Duration) gin.HandlerFunc {
	type entry struct {
		hits []time.Time
	}
	var mu sync.Mutex
	store := map[string]*entry{}
	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()
		mu.Lock()
		e, ok := store[ip]
		if !ok {
			e = &entry{}
			store[ip] = e
		}
		cutoff := now.Add(-window)
		kept := e.hits[:0]
		for _, t := range e.hits {
			if t.After(cutoff) {
				kept = append(kept, t)
			}
		}
		e.hits = kept
		if len(e.hits) >= max {
			mu.Unlock()
			c.AbortWithStatusJSON(429, gin.H{"error": "too many requests, please slow down"})
			return
		}
		e.hits = append(e.hits, now)
		mu.Unlock()
		c.Next()
	}
}
