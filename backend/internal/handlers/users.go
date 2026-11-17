package handlers

import (
	"errors"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"realestate/internal/auth"
)

type UserHandler struct {
	DB *pgxpool.Pool
}

type adminUser struct {
	ID          string  `json:"id"`
	Email       string  `json:"email"`
	FullName    string  `json:"full_name"`
	Role        string  `json:"role"`
	IsActive    bool    `json:"is_active"`
	LastLoginAt *string `json:"last_login_at"`
	CreatedAt   string  `json:"created_at"`
}

func validRole(r string) bool {
	switch r {
	case "super_admin", "admin", "listing_manager":
		return true
	}
	return false
}

func (h *UserHandler) List(c *gin.Context) {
	rows, err := h.DB.Query(c.Request.Context(), `
		SELECT id, email_plain, full_name, role, is_active,
		       to_char(last_login_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       to_char(created_at   AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM users ORDER BY created_at DESC`)
	if err != nil {
		c.JSON(500, gin.H{"error": "query failed"})
		return
	}
	defer rows.Close()
	list := []adminUser{}
	for rows.Next() {
		var u adminUser
		if err := rows.Scan(&u.ID, &u.Email, &u.FullName, &u.Role,
			&u.IsActive, &u.LastLoginAt, &u.CreatedAt); err != nil {
			c.JSON(500, gin.H{"error": "scan failed"})
			return
		}
		list = append(list, u)
	}
	c.JSON(200, gin.H{"data": list})
}

type createUserReq struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	FullName string `json:"full_name"`
	Role     string `json:"role" binding:"required"`
}

func (h *UserHandler) Create(c *gin.Context) {
	var in createUserReq
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(400, gin.H{"error": "invalid payload"})
		return
	}
	if !validRole(in.Role) {
		c.JSON(400, gin.H{"error": "invalid role"})
		return
	}
	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		c.JSON(500, gin.H{"error": "hash failed"})
		return
	}
	email := strings.ToLower(strings.TrimSpace(in.Email))
	var id string
	err = h.DB.QueryRow(c.Request.Context(), `
		INSERT INTO users (email_plain, password_hash, full_name, role, is_active)
		VALUES ($1,$2,$3,$4,TRUE) RETURNING id`,
		email, hash, in.FullName, in.Role).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "users_email_plain_key") {
			c.JSON(409, gin.H{"error": "email already in use"})
			return
		}
		c.JSON(500, gin.H{"error": "create failed"})
		return
	}
	uid, _ := c.Get("uid")
	audit(h.DB, idOrEmpty(uid), "create", "user", id, c.ClientIP())
	c.JSON(201, gin.H{"id": id})
}

type updateUserReq struct {
	FullName *string `json:"full_name"`
	Role     *string `json:"role"`
	IsActive *bool   `json:"is_active"`
	Password *string `json:"password"`
}

func (h *UserHandler) Update(c *gin.Context) {
	id := c.Param("id")
	actorID := idOrEmpty(c.MustGet("uid"))
	var in updateUserReq
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(400, gin.H{"error": "invalid payload"})
		return
	}
	if in.Role != nil && !validRole(*in.Role) {
		c.JSON(400, gin.H{"error": "invalid role"})
		return
	}
	// Prevent locking yourself out.
	if id == actorID {
		if in.Role != nil && *in.Role != "super_admin" {
			c.JSON(400, gin.H{"error": "cannot demote yourself"})
			return
		}
		if in.IsActive != nil && !*in.IsActive {
			c.JSON(400, gin.H{"error": "cannot deactivate yourself"})
			return
		}
	}
	var pwHash *string
	if in.Password != nil {
		if len(*in.Password) < 8 {
			c.JSON(400, gin.H{"error": "password must be >=8 chars"})
			return
		}
		h2, err := auth.HashPassword(*in.Password)
		if err != nil {
			c.JSON(500, gin.H{"error": "hash failed"})
			return
		}
		pwHash = &h2
	}
	ct, err := h.DB.Exec(c.Request.Context(), `
		UPDATE users SET
		  full_name     = COALESCE($2, full_name),
		  role          = COALESCE($3, role),
		  is_active     = COALESCE($4, is_active),
		  password_hash = COALESCE($5, password_hash)
		WHERE id = $1`,
		id, in.FullName, in.Role, in.IsActive, pwHash)
	if err != nil {
		c.JSON(500, gin.H{"error": "update failed"})
		return
	}
	if ct.RowsAffected() == 0 {
		c.JSON(404, gin.H{"error": "not found"})
		return
	}
	// If password changed, revoke all refresh tokens for that user.
	if pwHash != nil {
		_, _ = h.DB.Exec(c.Request.Context(),
			`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, id)
	}
	audit(h.DB, actorID, "update", "user", id, c.ClientIP())
	c.JSON(200, gin.H{"ok": true})
}

func (h *UserHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	actorID := idOrEmpty(c.MustGet("uid"))
	if id == actorID {
		c.JSON(400, gin.H{"error": "cannot delete yourself"})
		return
	}
	ct, err := h.DB.Exec(c.Request.Context(), `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		c.JSON(500, gin.H{"error": "delete failed"})
		return
	}
	if ct.RowsAffected() == 0 {
		c.JSON(404, gin.H{"error": "not found"})
		return
	}
	audit(h.DB, actorID, "delete", "user", id, c.ClientIP())
	c.JSON(200, gin.H{"ok": true})
}

type changePasswordReq struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

// ChangeOwnPassword lets the current user rotate their own password.
func (h *UserHandler) ChangeOwnPassword(c *gin.Context) {
	uid := idOrEmpty(c.MustGet("uid"))
	var in changePasswordReq
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(400, gin.H{"error": "invalid payload"})
		return
	}
	var hash string
	if err := h.DB.QueryRow(c.Request.Context(),
		`SELECT password_hash FROM users WHERE id=$1`, uid).Scan(&hash); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(404, gin.H{"error": "not found"})
			return
		}
		c.JSON(500, gin.H{"error": "lookup failed"})
		return
	}
	if !auth.CheckPassword(hash, in.CurrentPassword) {
		c.JSON(401, gin.H{"error": "current password incorrect"})
		return
	}
	nh, err := auth.HashPassword(in.NewPassword)
	if err != nil {
		c.JSON(500, gin.H{"error": "hash failed"})
		return
	}
	_, err = h.DB.Exec(c.Request.Context(),
		`UPDATE users SET password_hash=$2 WHERE id=$1`, uid, nh)
	if err != nil {
		c.JSON(500, gin.H{"error": "update failed"})
		return
	}
	_, _ = h.DB.Exec(c.Request.Context(),
		`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL`, uid)
	audit(h.DB, uid, "change_password", "user", uid, c.ClientIP())
	c.JSON(200, gin.H{"ok": true})
}

func idOrEmpty(v any) string {
	s, _ := v.(string)
	return s
}
