package handlers

import (
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ContactsHandler struct{ DB *pgxpool.Pool }

type contactRow struct {
	ID           string `json:"id"`
	Email        string `json:"email"`
	Name         string `json:"name"`
	Tags         string `json:"tags"`
	Source       string `json:"source"`
	Unsubscribed bool   `json:"unsubscribed"`
	CreatedAt    string `json:"created_at"`
}

func (h *ContactsHandler) List(c *gin.Context) {
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
	if s := strings.TrimSpace(q.Get("q")); s != "" {
		args = append(args, "%"+strings.ToLower(s)+"%")
		where += " AND (LOWER(email) LIKE $" + strconv.Itoa(len(args)) +
			" OR LOWER(name) LIKE $" + strconv.Itoa(len(args)) + ")"
	}
	ctx := c.Request.Context()
	var total, subscribed int
	if err := h.DB.QueryRow(ctx, "SELECT COUNT(*) FROM email_contacts "+where, args...).Scan(&total); err != nil {
		c.JSON(500, gin.H{"error": "query failed"})
		return
	}
	_ = h.DB.QueryRow(ctx, "SELECT COUNT(*) FROM email_contacts WHERE unsubscribed = FALSE").Scan(&subscribed)

	args = append(args, size, (page-1)*size)
	rows, err := h.DB.Query(ctx, `
		SELECT id, email, name, tags, source, unsubscribed,
		       to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM email_contacts `+where+`
		ORDER BY created_at DESC LIMIT $`+strconv.Itoa(len(args)-1)+` OFFSET $`+strconv.Itoa(len(args)), args...)
	if err != nil {
		c.JSON(500, gin.H{"error": "query failed"})
		return
	}
	defer rows.Close()
	list := []contactRow{}
	for rows.Next() {
		var r contactRow
		if err := rows.Scan(&r.ID, &r.Email, &r.Name, &r.Tags, &r.Source, &r.Unsubscribed, &r.CreatedAt); err != nil {
			c.JSON(500, gin.H{"error": "scan failed"})
			return
		}
		list = append(list, r)
	}
	c.JSON(200, gin.H{
		"data": list, "total": total, "subscribed": subscribed,
		"page": page, "page_size": size,
		"total_pages": (total + size - 1) / size,
	})
}

type contactInput struct {
	Email string `json:"email" binding:"required,email"`
	Name  string `json:"name"`
	Tags  string `json:"tags"`
}

func (h *ContactsHandler) Create(c *gin.Context) {
	var in contactInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(400, gin.H{"error": "invalid payload"})
		return
	}
	email := strings.ToLower(strings.TrimSpace(in.Email))
	var id string
	err := h.DB.QueryRow(c.Request.Context(), `
		INSERT INTO email_contacts (email, name, tags, source)
		VALUES ($1,$2,$3,'manual')
		ON CONFLICT (email) DO UPDATE
		SET name = EXCLUDED.name, tags = EXCLUDED.tags, unsubscribed = FALSE
		RETURNING id`,
		email, strings.TrimSpace(in.Name), strings.TrimSpace(in.Tags)).Scan(&id)
	if err != nil {
		c.JSON(500, gin.H{"error": "create failed"})
		return
	}
	audit(h.DB, idOrEmpty(c.MustGet("uid")), "create", "contact", id, c.ClientIP())
	c.JSON(201, gin.H{"id": id})
}

type bulkImportReq struct {
	Emails string `json:"emails" binding:"required"`
	Tags   string `json:"tags"`
}

func (h *ContactsHandler) BulkImport(c *gin.Context) {
	var in bulkImportReq
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(400, gin.H{"error": "invalid payload"})
		return
	}
	// Accept emails separated by comma, semicolon, or newline.
	seps := func(r rune) bool { return r == ',' || r == '\n' || r == ';' || r == ' ' }
	raw := strings.FieldsFunc(in.Emails, seps)
	added, skipped := 0, 0
	ctx := c.Request.Context()
	for _, e := range raw {
		e = strings.ToLower(strings.TrimSpace(e))
		if !strings.Contains(e, "@") || len(e) > 200 {
			skipped++
			continue
		}
		_, err := h.DB.Exec(ctx, `
			INSERT INTO email_contacts (email, tags, source)
			VALUES ($1,$2,'import')
			ON CONFLICT (email) DO NOTHING`, e, in.Tags)
		if err != nil {
			skipped++
			continue
		}
		added++
	}
	audit(h.DB, idOrEmpty(c.MustGet("uid")), "import", "contacts", "", c.ClientIP())
	c.JSON(200, gin.H{"added": added, "skipped": skipped})
}

func (h *ContactsHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var in struct {
		Name         *string `json:"name"`
		Tags         *string `json:"tags"`
		Unsubscribed *bool   `json:"unsubscribed"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(400, gin.H{"error": "invalid payload"})
		return
	}
	ct, err := h.DB.Exec(c.Request.Context(), `
		UPDATE email_contacts SET
		  name = COALESCE($2, name),
		  tags = COALESCE($3, tags),
		  unsubscribed = COALESCE($4, unsubscribed)
		WHERE id = $1`, id, in.Name, in.Tags, in.Unsubscribed)
	if err != nil {
		c.JSON(500, gin.H{"error": "update failed"})
		return
	}
	if ct.RowsAffected() == 0 {
		c.JSON(404, gin.H{"error": "not found"})
		return
	}
	audit(h.DB, idOrEmpty(c.MustGet("uid")), "update", "contact", id, c.ClientIP())
	c.JSON(200, gin.H{"ok": true})
}

func (h *ContactsHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	ct, err := h.DB.Exec(c.Request.Context(), `DELETE FROM email_contacts WHERE id = $1`, id)
	if err != nil {
		c.JSON(500, gin.H{"error": "delete failed"})
		return
	}
	if ct.RowsAffected() == 0 {
		c.JSON(404, gin.H{"error": "not found"})
		return
	}
	audit(h.DB, idOrEmpty(c.MustGet("uid")), "delete", "contact", id, c.ClientIP())
	c.JSON(200, gin.H{"ok": true})
}
