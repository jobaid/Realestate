package handlers

import (
	"context"
	"errors"
	"fmt"
	"html"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"realestate/internal/email"
)

type InquiryHandler struct {
	DB     *pgxpool.Pool
	Sender *email.Sender
}

type inquiryCreate struct {
	PropertyID *string `json:"property_id"`
	Name       string  `json:"name" binding:"required,min=2,max=100"`
	Email      string  `json:"email" binding:"required,email"`
	Phone      *string `json:"phone"`
	Message    string  `json:"message" binding:"required,min=5,max=4000"`
	Source     string  `json:"source"`
}

func (h *InquiryHandler) Create(c *gin.Context) {
	var in inquiryCreate
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(400, gin.H{"error": "invalid payload"})
		return
	}
	src := in.Source
	if src == "" {
		if in.PropertyID != nil {
			src = "property"
		} else {
			src = "contact"
		}
	}
	if src != "property" && src != "contact" {
		src = "contact"
	}
	// Verify property exists (when supplied) to avoid fake refs.
	if in.PropertyID != nil && *in.PropertyID != "" {
		var exists bool
		if err := h.DB.QueryRow(c.Request.Context(),
			`SELECT EXISTS(SELECT 1 FROM properties WHERE id=$1 AND deleted_at IS NULL)`,
			*in.PropertyID).Scan(&exists); err != nil || !exists {
			c.JSON(400, gin.H{"error": "invalid property"})
			return
		}
	} else {
		in.PropertyID = nil
	}

	cleanName := strings.TrimSpace(in.Name)
	cleanEmail := strings.ToLower(strings.TrimSpace(in.Email))
	cleanMsg := strings.TrimSpace(in.Message)

	var id string
	err := h.DB.QueryRow(c.Request.Context(), `
		INSERT INTO inquiries (property_id, name, email, phone, message, source, ip_addr, user_agent)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
		in.PropertyID, cleanName, cleanEmail,
		in.Phone, cleanMsg, src, c.ClientIP(), c.Request.UserAgent()).Scan(&id)
	if err != nil {
		c.JSON(500, gin.H{"error": "could not record inquiry"})
		return
	}

	// Fire-and-forget email notification to the admin. Failure here does NOT
	// fail the user's submission — the inquiry is already stored.
	if h.Sender != nil {
		go h.notifyAdmin(id, cleanName, cleanEmail, in.Phone, cleanMsg, in.PropertyID)
	}
	c.JSON(http.StatusCreated, gin.H{"id": id, "ok": true})
}

func (h *InquiryHandler) notifyAdmin(id, name, fromEmail string, phone *string, msg string, propertyID *string) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	cfg, err := h.Sender.Load(ctx)
	if err != nil || cfg.NotifyEmail == "" {
		return
	}
	phoneLine := ""
	if phone != nil && *phone != "" {
		phoneLine = fmt.Sprintf("<p><strong>Phone:</strong> %s</p>", html.EscapeString(*phone))
	}
	propLine := ""
	if propertyID != nil && *propertyID != "" {
		var title, slug string
		if err := h.DB.QueryRow(ctx,
			`SELECT title, slug FROM properties WHERE id=$1`, *propertyID).
			Scan(&title, &slug); err == nil {
			propLine = fmt.Sprintf(`<p><strong>Property:</strong> %s</p>`, html.EscapeString(title))
			_ = slug
		}
	}
	body := fmt.Sprintf(`<h2>New inquiry received</h2>
<p><strong>From:</strong> %s &lt;%s&gt;</p>
%s%s
<p><strong>Message:</strong></p>
<blockquote style="border-left:3px solid #ccc;padding-left:1em;color:#333">%s</blockquote>
<hr>
<p style="color:#888;font-size:12px">Inquiry ID: %s</p>`,
		html.EscapeString(name), html.EscapeString(fromEmail),
		phoneLine, propLine, html.EscapeString(msg), id)

	subject := "New inquiry from " + name
	if err := h.Sender.Send(cfg, cfg.NotifyEmail, subject, body); err != nil {
		log.Printf("inquiry %s: notify email failed: %v", id, err)
	}
}

type inquiryRow struct {
	ID           string  `json:"id"`
	PropertyID   *string `json:"property_id,omitempty"`
	PropertyTitle *string `json:"property_title,omitempty"`
	PropertySlug  *string `json:"property_slug,omitempty"`
	Name         string  `json:"name"`
	Email        string  `json:"email"`
	Phone        *string `json:"phone,omitempty"`
	Message      string  `json:"message"`
	Status       string  `json:"status"`
	Source       string  `json:"source"`
	AdminNotes   *string `json:"admin_notes,omitempty"`
	RespondedAt  *string `json:"responded_at,omitempty"`
	CreatedAt    string  `json:"created_at"`
}

const inquirySelect = `
SELECT i.id, i.property_id, p.title, p.slug, i.name, i.email, i.phone, i.message,
       i.status, i.source, i.admin_notes,
       to_char(i.responded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
       to_char(i.created_at   AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
FROM inquiries i LEFT JOIN properties p ON p.id = i.property_id`

func scanInquiry(row pgx.Row) (*inquiryRow, error) {
	var r inquiryRow
	if err := row.Scan(&r.ID, &r.PropertyID, &r.PropertyTitle, &r.PropertySlug,
		&r.Name, &r.Email, &r.Phone, &r.Message, &r.Status, &r.Source,
		&r.AdminNotes, &r.RespondedAt, &r.CreatedAt); err != nil {
		return nil, err
	}
	return &r, nil
}

func (h *InquiryHandler) AdminList(c *gin.Context) {
	q := c.Request.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	if page < 1 {
		page = 1
	}
	size, _ := strconv.Atoi(q.Get("page_size"))
	if size < 1 || size > 100 {
		size = 20
	}
	where := "WHERE 1=1"
	args := []any{}
	if s := q.Get("status"); s != "" {
		args = append(args, s)
		where += " AND i.status = $" + strconv.Itoa(len(args))
	}
	if s := q.Get("property_id"); s != "" {
		args = append(args, s)
		where += " AND i.property_id = $" + strconv.Itoa(len(args))
	}

	ctx := c.Request.Context()
	var total, unread int
	if err := h.DB.QueryRow(ctx, "SELECT COUNT(*) FROM inquiries i "+where, args...).Scan(&total); err != nil {
		c.JSON(500, gin.H{"error": "query failed"})
		return
	}
	_ = h.DB.QueryRow(ctx, "SELECT COUNT(*) FROM inquiries WHERE status = 'new'").Scan(&unread)

	args = append(args, size, (page-1)*size)
	query := inquirySelect + " " + where +
		" ORDER BY i.created_at DESC LIMIT $" + strconv.Itoa(len(args)-1) +
		" OFFSET $" + strconv.Itoa(len(args))
	rows, err := h.DB.Query(ctx, query, args...)
	if err != nil {
		c.JSON(500, gin.H{"error": "query failed"})
		return
	}
	defer rows.Close()
	list := []*inquiryRow{}
	for rows.Next() {
		r, err := scanInquiry(rows)
		if err != nil {
			c.JSON(500, gin.H{"error": "scan failed"})
			return
		}
		list = append(list, r)
	}
	c.JSON(200, gin.H{
		"data": list, "total": total, "unread": unread,
		"page": page, "page_size": size,
		"total_pages": (total + size - 1) / size,
	})
}

func (h *InquiryHandler) AdminGet(c *gin.Context) {
	id := c.Param("id")
	row := h.DB.QueryRow(c.Request.Context(), inquirySelect+" WHERE i.id = $1", id)
	r, err := scanInquiry(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			c.JSON(404, gin.H{"error": "not found"})
			return
		}
		c.JSON(500, gin.H{"error": "query failed"})
		return
	}
	c.JSON(200, r)
}

type inquiryPatch struct {
	Status     *string `json:"status"`
	AdminNotes *string `json:"admin_notes"`
}

func (h *InquiryHandler) AdminUpdate(c *gin.Context) {
	id := c.Param("id")
	var in inquiryPatch
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(400, gin.H{"error": "invalid payload"})
		return
	}
	if in.Status != nil {
		switch *in.Status {
		case "new", "in_progress", "responded", "archived", "spam":
		default:
			c.JSON(400, gin.H{"error": "invalid status"})
			return
		}
	}
	setResponded := in.Status != nil && *in.Status == "responded"
	ct, err := h.DB.Exec(c.Request.Context(), `
		UPDATE inquiries SET
		  status       = COALESCE($2, status),
		  admin_notes  = COALESCE($3, admin_notes),
		  responded_at = CASE WHEN $4 AND responded_at IS NULL THEN NOW() ELSE responded_at END
		WHERE id = $1`, id, in.Status, in.AdminNotes, setResponded)
	if err != nil {
		c.JSON(500, gin.H{"error": "update failed"})
		return
	}
	if ct.RowsAffected() == 0 {
		c.JSON(404, gin.H{"error": "not found"})
		return
	}
	uid, _ := c.Get("uid")
	uidStr, _ := uid.(string)
	audit(h.DB, uidStr, "update", "inquiry", id, c.ClientIP())
	c.JSON(200, gin.H{"ok": true})
}

func (h *InquiryHandler) AdminDelete(c *gin.Context) {
	id := c.Param("id")
	ct, err := h.DB.Exec(c.Request.Context(), `DELETE FROM inquiries WHERE id = $1`, id)
	if err != nil {
		c.JSON(500, gin.H{"error": "delete failed"})
		return
	}
	if ct.RowsAffected() == 0 {
		c.JSON(404, gin.H{"error": "not found"})
		return
	}
	uid, _ := c.Get("uid")
	uidStr, _ := uid.(string)
	audit(h.DB, uidStr, "delete", "inquiry", id, c.ClientIP())
	c.JSON(200, gin.H{"ok": true})
}
