package handlers

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DashboardHandler struct {
	DB *pgxpool.Pool
}

type statsResp struct {
	Properties struct {
		Total       int   `json:"total"`
		Available   int   `json:"available"`
		Pending     int   `json:"pending"`
		Sold        int   `json:"sold"`
		Rented      int   `json:"rented"`
		Draft       int   `json:"draft"`
		OffMarket   int   `json:"off_market"`
		Featured    int   `json:"featured"`
		Published   int   `json:"published"`
		ValueActive int64 `json:"value_active"`
	} `json:"properties"`
	Inquiries struct {
		Total      int `json:"total"`
		New        int `json:"new"`
		Last7Days  int `json:"last_7d"`
		Last30Days int `json:"last_30d"`
	} `json:"inquiries"`
}

func (h *DashboardHandler) Stats(c *gin.Context) {
	ctx := c.Request.Context()
	var s statsResp

	rows, err := h.DB.Query(ctx, `
		SELECT status, COUNT(*) FROM properties
		WHERE deleted_at IS NULL GROUP BY status`)
	if err != nil {
		c.JSON(500, gin.H{"error": "stats failed"})
		return
	}
	for rows.Next() {
		var st string
		var n int
		if err := rows.Scan(&st, &n); err != nil {
			rows.Close()
			c.JSON(500, gin.H{"error": "scan failed"})
			return
		}
		s.Properties.Total += n
		switch st {
		case "available":
			s.Properties.Available = n
		case "pending":
			s.Properties.Pending = n
		case "sold":
			s.Properties.Sold = n
		case "rented":
			s.Properties.Rented = n
		case "draft":
			s.Properties.Draft = n
		case "off_market":
			s.Properties.OffMarket = n
		}
	}
	rows.Close()

	_ = h.DB.QueryRow(ctx,
		`SELECT COUNT(*) FROM properties WHERE deleted_at IS NULL AND featured = TRUE`).
		Scan(&s.Properties.Featured)
	_ = h.DB.QueryRow(ctx,
		`SELECT COUNT(*) FROM properties WHERE deleted_at IS NULL AND published_at IS NOT NULL`).
		Scan(&s.Properties.Published)
	_ = h.DB.QueryRow(ctx, `
		SELECT COALESCE(SUM(COALESCE(sale_price, monthly_rent)), 0)::bigint
		FROM properties WHERE deleted_at IS NULL AND status = 'available'`).
		Scan(&s.Properties.ValueActive)

	_ = h.DB.QueryRow(ctx, `SELECT COUNT(*) FROM inquiries`).Scan(&s.Inquiries.Total)
	_ = h.DB.QueryRow(ctx, `SELECT COUNT(*) FROM inquiries WHERE status = 'new'`).Scan(&s.Inquiries.New)
	_ = h.DB.QueryRow(ctx,
		`SELECT COUNT(*) FROM inquiries WHERE created_at > NOW() - INTERVAL '7 days'`).
		Scan(&s.Inquiries.Last7Days)
	_ = h.DB.QueryRow(ctx,
		`SELECT COUNT(*) FROM inquiries WHERE created_at > NOW() - INTERVAL '30 days'`).
		Scan(&s.Inquiries.Last30Days)

	c.JSON(200, s)
}

type dailyPoint struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

func (h *DashboardHandler) InquiriesDaily(c *gin.Context) {
	days := 30
	ctx := c.Request.Context()
	rows, err := h.DB.Query(ctx, `
		SELECT to_char(day, 'YYYY-MM-DD') AS d, COALESCE(c, 0)
		FROM generate_series(CURRENT_DATE - $1::int + 1, CURRENT_DATE, '1 day') day
		LEFT JOIN (
		    SELECT date_trunc('day', created_at)::date AS day, COUNT(*)::int c
		    FROM inquiries WHERE created_at > NOW() - ($1::text || ' days')::interval
		    GROUP BY 1
		) t USING(day)
		ORDER BY day`, days)
	if err != nil {
		c.JSON(500, gin.H{"error": "query failed"})
		return
	}
	defer rows.Close()
	out := make([]dailyPoint, 0, days)
	for rows.Next() {
		var p dailyPoint
		if err := rows.Scan(&p.Date, &p.Count); err != nil {
			c.JSON(500, gin.H{"error": "scan failed"})
			return
		}
		out = append(out, p)
	}
	c.JSON(200, gin.H{"data": out, "days": days, "generated_at": time.Now().UTC()})
}

func (h *DashboardHandler) RecentActivity(c *gin.Context) {
	ctx := c.Request.Context()
	rows, err := h.DB.Query(ctx, `
		SELECT a.action, a.entity, a.entity_id, u.email_plain, a.created_at
		FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
		ORDER BY a.created_at DESC LIMIT 20`)
	if err != nil {
		c.JSON(500, gin.H{"error": "query failed"})
		return
	}
	defer rows.Close()
	type row struct {
		Action    string    `json:"action"`
		Entity    *string   `json:"entity"`
		EntityID  *string   `json:"entity_id"`
		UserEmail *string   `json:"user_email"`
		CreatedAt time.Time `json:"created_at"`
	}
	out := []row{}
	for rows.Next() {
		var r row
		if err := rows.Scan(&r.Action, &r.Entity, &r.EntityID, &r.UserEmail, &r.CreatedAt); err != nil {
			c.JSON(500, gin.H{"error": "scan failed"})
			return
		}
		out = append(out, r)
	}
	c.JSON(200, gin.H{"data": out})
}
