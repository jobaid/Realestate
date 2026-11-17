package handlers

import (
	"context"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"realestate/internal/auth"
	"realestate/internal/config"
)

type AuthHandler struct {
	DB  *pgxpool.Pool
	Cfg *config.Config
}

type loginReq struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type tokenResp struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	User         userDTO   `json:"user"`
}

type userDTO struct {
	ID       string `json:"id"`
	Email    string `json:"email"`
	FullName string `json:"full_name"`
	Role     string `json:"role"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "invalid payload"})
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	ctx := c.Request.Context()

	var id, hash, role, name string
	var active bool
	err := h.DB.QueryRow(ctx,
		`SELECT id, password_hash, role, full_name, is_active FROM users WHERE email_plain = $1`,
		email).Scan(&id, &hash, &role, &name, &active)
	if err != nil || !active || !auth.CheckPassword(hash, req.Password) {
		c.JSON(401, gin.H{"error": "invalid credentials"})
		return
	}

	access, exp, err := auth.IssueAccess(h.Cfg.JWTSecret, id, role)
	if err != nil {
		c.JSON(500, gin.H{"error": "token issue failed"})
		return
	}
	plain, hashR, err := auth.NewRefreshToken()
	if err != nil {
		c.JSON(500, gin.H{"error": "refresh issue failed"})
		return
	}
	_, err = h.DB.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_addr)
		 VALUES ($1,$2,$3,$4,$5)`,
		id, hashR, time.Now().Add(auth.RefreshTTL), c.Request.UserAgent(), c.ClientIP())
	if err != nil {
		c.JSON(500, gin.H{"error": "refresh store failed"})
		return
	}
	_, _ = h.DB.Exec(ctx, `UPDATE users SET last_login_at = NOW() WHERE id = $1`, id)
	audit(h.DB, id, "login", "user", id, c.ClientIP())

	c.JSON(http.StatusOK, tokenResp{
		AccessToken:  access,
		RefreshToken: plain,
		ExpiresAt:    exp,
		User:         userDTO{ID: id, Email: email, FullName: name, Role: role},
	})
}

type refreshReq struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req refreshReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "invalid payload"})
		return
	}
	ctx := c.Request.Context()
	hash := auth.HashRefresh(req.RefreshToken)

	var id, userID, role string
	var exp time.Time
	var revoked *time.Time
	err := h.DB.QueryRow(ctx,
		`SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, u.role
		 FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
		 WHERE rt.token_hash = $1 AND u.is_active = TRUE`, hash).
		Scan(&id, &userID, &exp, &revoked, &role)
	if err != nil || revoked != nil || time.Now().After(exp) {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(401, gin.H{"error": "invalid refresh"})
			return
		}
		c.JSON(401, gin.H{"error": "invalid refresh"})
		return
	}
	_, _ = h.DB.Exec(ctx, `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`, id)
	plain, hashR, err := auth.NewRefreshToken()
	if err != nil {
		c.JSON(500, gin.H{"error": "refresh issue failed"})
		return
	}
	_, err = h.DB.Exec(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_addr)
		 VALUES ($1,$2,$3,$4,$5)`,
		userID, hashR, time.Now().Add(auth.RefreshTTL), c.Request.UserAgent(), c.ClientIP())
	if err != nil {
		c.JSON(500, gin.H{"error": "refresh store failed"})
		return
	}
	access, expA, err := auth.IssueAccess(h.Cfg.JWTSecret, userID, role)
	if err != nil {
		c.JSON(500, gin.H{"error": "token issue failed"})
		return
	}
	c.JSON(200, gin.H{
		"access_token":  access,
		"refresh_token": plain,
		"expires_at":    expA,
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	var req refreshReq
	if err := c.ShouldBindJSON(&req); err == nil && req.RefreshToken != "" {
		hash := auth.HashRefresh(req.RefreshToken)
		_, _ = h.DB.Exec(c.Request.Context(),
			`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`, hash)
	}
	c.JSON(200, gin.H{"ok": true})
}

func (h *AuthHandler) Me(c *gin.Context) {
	uid, _ := c.Get("uid")
	id, _ := uid.(string)
	var u userDTO
	err := h.DB.QueryRow(c.Request.Context(),
		`SELECT id, email_plain, full_name, role FROM users WHERE id = $1`, id).
		Scan(&u.ID, &u.Email, &u.FullName, &u.Role)
	if err != nil {
		c.JSON(404, gin.H{"error": "not found"})
		return
	}
	c.JSON(200, u)
}

func audit(db *pgxpool.Pool, uid, action, entity, entityID, ip string) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	var userID any = uid
	if uid == "" {
		userID = nil
	}
	_, _ = db.Exec(ctx,
		`INSERT INTO audit_logs (user_id, action, entity, entity_id, ip_addr) VALUES ($1,$2,$3,$4,$5)`,
		userID, action, entity, entityID, ip)
}
