package handlers

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AuditHandler struct {
	DB *pgxpool.Pool
}

type auditRow struct {
	ID        int64   `json:"id"`
	UserID    *string `json:"user_id"`
	UserEmail *string `json:"user_email"`
	Action    string  `json:"action"`
	Entity    *string `json:"entity"`
	EntityID  *string `json:"entity_id"`
	IPAddr    *string `json:"ip_addr"`
	CreatedAt string  `json:"created_at"`
}

func (h *AuditHandler) List(c *gin.Context) {
	q := c.Request.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}
	size, _ := strconv.Atoi(q.Get("page_size"))
	if size < 1 || size > 200 {
		size = 50
	}
	where := "WHERE 1=1"
	args := []any{}
	if s := q.Get("entity"); s != "" {
		args = append(args, s)
		where += " AND a.entity = $" + strconv.Itoa(len(args))
	}
	if s := q.Get("action"); s != "" {
		args = append(args, s)
		where += " AND a.action = $" + strconv.Itoa(len(args))
	}
	if s := q.Get("user_id"); s != "" {
		args = append(args, s)
		where += " AND a.user_id = $" + strconv.Itoa(len(args))
	}

	ctx := c.Request.Context()
	var total int
	if err := h.DB.QueryRow(ctx, "SELECT COUNT(*) FROM audit_logs a "+where, args...).Scan(&total); err != nil {
		c.JSON(500, gin.H{"error": "query failed"})
		return
	}
	args = append(args, size, (page-1)*size)
	query := `
		SELECT a.id, a.user_id, u.email_plain, a.action, a.entity, a.entity_id, a.ip_addr,
		       to_char(a.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
		` + where + `
		ORDER BY a.id DESC
		LIMIT $` + strconv.Itoa(len(args)-1) + ` OFFSET $` + strconv.Itoa(len(args))
	rows, err := h.DB.Query(ctx, query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": "query failed"})
		return
	}
	defer rows.Close()
	list := []auditRow{}
	for rows.Next() {
		var r auditRow
		if err := rows.Scan(&r.ID, &r.UserID, &r.UserEmail, &r.Action,
			&r.Entity, &r.EntityID, &r.IPAddr, &r.CreatedAt); err != nil {
			c.JSON(500, gin.H{"error": "scan failed"})
			return
		}
		list = append(list, r)
	}
	c.JSON(200, gin.H{
		"data": list, "total": total, "page": page, "page_size": size,
		"total_pages": (total + size - 1) / size,
	})
}
