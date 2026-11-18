package handlers

import (
	"context"
	"errors"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"realestate/internal/email"
)

type CampaignsHandler struct {
	DB     *pgxpool.Pool
	Sender *email.Sender
}

type campaignRow struct {
	ID           string  `json:"id"`
	Subject      string  `json:"subject"`
	BodyHTML     string  `json:"body_html,omitempty"`
	Status       string  `json:"status"`
	SentCount    int     `json:"sent_count"`
	FailedCount  int     `json:"failed_count"`
	TotalTargets int     `json:"total_targets"`
	SentAt       *string `json:"sent_at,omitempty"`
	CreatedAt    string  `json:"created_at"`
	LastError    *string `json:"last_error,omitempty"`
}

func (h *CampaignsHandler) List(c *gin.Context) {
	rows, err := h.DB.Query(c.Request.Context(), `
		SELECT id, subject, status, sent_count, failed_count, total_targets,
		       to_char(sent_at   AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       last_error
		FROM email_campaigns ORDER BY created_at DESC LIMIT 100`)
	if err != nil {
		c.JSON(500, gin.H{"error": "query failed"})
		return
	}
	defer rows.Close()
	list := []campaignRow{}
	for rows.Next() {
		var r campaignRow
		if err := rows.Scan(&r.ID, &r.Subject, &r.Status, &r.SentCount, &r.FailedCount,
			&r.TotalTargets, &r.SentAt, &r.CreatedAt, &r.LastError); err != nil {
			c.JSON(500, gin.H{"error": "scan failed"})
			return
		}
		list = append(list, r)
	}
	c.JSON(200, gin.H{"data": list})
}

func (h *CampaignsHandler) Get(c *gin.Context) {
	id := c.Param("id")
	var r campaignRow
	err := h.DB.QueryRow(c.Request.Context(), `
		SELECT id, subject, body_html, status, sent_count, failed_count, total_targets,
		       to_char(sent_at   AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
		       last_error
		FROM email_campaigns WHERE id = $1`, id).Scan(
		&r.ID, &r.Subject, &r.BodyHTML, &r.Status, &r.SentCount, &r.FailedCount,
		&r.TotalTargets, &r.SentAt, &r.CreatedAt, &r.LastError)
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

type campaignInput struct {
	Subject  string `json:"subject" binding:"required,min=2,max=300"`
	BodyHTML string `json:"body_html" binding:"required,min=10"`
}

func (h *CampaignsHandler) Create(c *gin.Context) {
	var in campaignInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(400, gin.H{"error": "invalid payload"})
		return
	}
	uid := idOrEmpty(c.MustGet("uid"))
	var id string
	err := h.DB.QueryRow(c.Request.Context(), `
		INSERT INTO email_campaigns (subject, body_html, created_by)
		VALUES ($1,$2,$3) RETURNING id`,
		in.Subject, in.BodyHTML, nilIfEmpty(uid)).Scan(&id)
	if err != nil {
		c.JSON(500, gin.H{"error": "create failed"})
		return
	}
	audit(h.DB, uid, "create", "campaign", id, c.ClientIP())
	c.JSON(201, gin.H{"id": id})
}

func (h *CampaignsHandler) Update(c *gin.Context) {
	id := c.Param("id")
	var in campaignInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(400, gin.H{"error": "invalid payload"})
		return
	}
	ct, err := h.DB.Exec(c.Request.Context(), `
		UPDATE email_campaigns SET subject=$2, body_html=$3
		WHERE id=$1 AND status='draft'`, id, in.Subject, in.BodyHTML)
	if err != nil {
		c.JSON(500, gin.H{"error": "update failed"})
		return
	}
	if ct.RowsAffected() == 0 {
		c.JSON(400, gin.H{"error": "draft only — cannot edit after sending"})
		return
	}
	c.JSON(200, gin.H{"ok": true})
}

func (h *CampaignsHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	ct, err := h.DB.Exec(c.Request.Context(), `DELETE FROM email_campaigns WHERE id = $1`, id)
	if err != nil {
		c.JSON(500, gin.H{"error": "delete failed"})
		return
	}
	if ct.RowsAffected() == 0 {
		c.JSON(404, gin.H{"error": "not found"})
		return
	}
	audit(h.DB, idOrEmpty(c.MustGet("uid")), "delete", "campaign", id, c.ClientIP())
	c.JSON(200, gin.H{"ok": true})
}

// Send kicks off delivery in a background goroutine. Returns immediately.
func (h *CampaignsHandler) Send(c *gin.Context) {
	id := c.Param("id")
	ctx := c.Request.Context()

	cfg, err := h.Sender.Load(ctx)
	if err != nil {
		c.JSON(400, gin.H{"error": "SMTP not configured — see Settings"})
		return
	}

	var subject, body, status string
	if err := h.DB.QueryRow(ctx,
		`SELECT subject, body_html, status FROM email_campaigns WHERE id=$1`, id).
		Scan(&subject, &body, &status); err != nil {
		c.JSON(404, gin.H{"error": "campaign not found"})
		return
	}
	if status != "draft" {
		c.JSON(400, gin.H{"error": "campaign already " + status})
		return
	}

	// Count current recipients.
	var total int
	if err := h.DB.QueryRow(ctx,
		`SELECT COUNT(*) FROM email_contacts WHERE unsubscribed = FALSE`).Scan(&total); err != nil {
		c.JSON(500, gin.H{"error": "count failed"})
		return
	}
	if total == 0 {
		c.JSON(400, gin.H{"error": "no subscribed contacts"})
		return
	}
	if _, err := h.DB.Exec(ctx,
		`UPDATE email_campaigns SET status='sending', total_targets=$2 WHERE id=$1`,
		id, total); err != nil {
		c.JSON(500, gin.H{"error": "mark sending failed"})
		return
	}
	audit(h.DB, idOrEmpty(c.MustGet("uid")), "send", "campaign", id, c.ClientIP())

	go h.dispatch(id, subject, body, cfg)
	c.JSON(202, gin.H{"ok": true, "targets": total})
}

func (h *CampaignsHandler) dispatch(id, subject, body string, cfg *email.Config) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Hour)
	defer cancel()
	rows, err := h.DB.Query(ctx,
		`SELECT email FROM email_contacts WHERE unsubscribed = FALSE ORDER BY created_at`)
	if err != nil {
		h.markFailed(id, err.Error())
		return
	}
	emails := []string{}
	for rows.Next() {
		var e string
		if err := rows.Scan(&e); err == nil {
			emails = append(emails, e)
		}
	}
	rows.Close()

	sent, failed := 0, 0
	var lastErr string
	for i, to := range emails {
		if err := h.Sender.Send(cfg, to, subject, body); err != nil {
			failed++
			lastErr = err.Error()
			log.Printf("campaign %s: send to %s failed: %v", id, to, err)
		} else {
			sent++
		}
		// Persist progress every 10 emails so the admin sees live counts.
		if i%10 == 9 || i == len(emails)-1 {
			_, _ = h.DB.Exec(context.Background(),
				`UPDATE email_campaigns SET sent_count=$2, failed_count=$3 WHERE id=$1`,
				id, sent, failed)
		}
		time.Sleep(50 * time.Millisecond) // gentle pacing
	}

	status := "sent"
	if failed > 0 && sent == 0 {
		status = "failed"
	}
	_, _ = h.DB.Exec(context.Background(),
		`UPDATE email_campaigns SET status=$2, sent_count=$3, failed_count=$4,
		 sent_at=NOW(), last_error=NULLIF($5,'') WHERE id=$1`,
		id, status, sent, failed, lastErr)
}

func (h *CampaignsHandler) markFailed(id, msg string) {
	_, _ = h.DB.Exec(context.Background(),
		`UPDATE email_campaigns SET status='failed', last_error=$2 WHERE id=$1`, id, msg)
}

// TestSMTP sends a one-off test email to notify_email, used by the Settings UI.
func (h *CampaignsHandler) TestSMTP(c *gin.Context) {
	ctx := c.Request.Context()
	cfg, err := h.Sender.Load(ctx)
	if err != nil {
		c.JSON(400, gin.H{"error": "SMTP not configured"})
		return
	}
	to := cfg.NotifyEmail
	if to == "" {
		to = cfg.FromAddress
	}
	if to == "" {
		c.JSON(400, gin.H{"error": "set notify_email or smtp_from_address first"})
		return
	}
	body := `<p>This is a test email from <strong>NUR Realty</strong>.</p>
<p>If you're reading this, your SMTP settings are working correctly.</p>
<p>Sent at ` + time.Now().UTC().Format(time.RFC1123) + `.</p>`
	if err := h.Sender.Send(cfg, to, "NUR Realty — SMTP test", body); err != nil {
		c.JSON(500, gin.H{"error": "send failed: " + err.Error()})
		return
	}
	c.JSON(200, gin.H{"ok": true, "sent_to": to})
}

