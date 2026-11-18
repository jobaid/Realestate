// Package email sends transactional + marketing email via SMTP.
// Credentials are loaded per-call from the site_settings JSONB blob, so admins
// can rotate them from the UI without a restart.
package email

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/smtp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Config struct {
	Host, Port, User, Password string
	FromName, FromAddress      string
	UseTLS                     bool
	NotifyEmail                string
}

type Sender struct {
	DB *pgxpool.Pool
}

func (s *Sender) Load(ctx context.Context) (*Config, error) {
	var raw json.RawMessage
	if err := s.DB.QueryRow(ctx,
		`SELECT data FROM site_settings WHERE id = 1`).Scan(&raw); err != nil {
		return nil, err
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		return nil, err
	}
	str := func(k string) string {
		if v, ok := m[k].(string); ok {
			return v
		}
		return ""
	}
	c := &Config{
		Host:        str("smtp_host"),
		Port:        orDefault(str("smtp_port"), "587"),
		User:        str("smtp_user"),
		Password:    str("smtp_password"),
		FromName:    orDefault(str("smtp_from_name"), "NUR Realty"),
		FromAddress: orDefault(str("smtp_from_address"), str("smtp_user")),
		UseTLS:      strings.ToLower(str("smtp_use_tls")) != "false",
		NotifyEmail: str("notify_email"),
	}
	if c.Host == "" || c.FromAddress == "" {
		return c, errors.New("smtp not configured")
	}
	return c, nil
}

// Send dispatches a single HTML email. Blocks until delivery or error.
// Callers typically wrap this in a goroutine for API requests.
func (s *Sender) Send(cfg *Config, to, subject, html string) error {
	if cfg == nil {
		return errors.New("nil config")
	}
	addr := net.JoinHostPort(cfg.Host, cfg.Port)
	from := cfg.FromAddress
	fromHeader := from
	if cfg.FromName != "" {
		fromHeader = fmt.Sprintf("%s <%s>", cfg.FromName, from)
	}
	msg := []byte(
		"From: " + fromHeader + "\r\n" +
			"To: " + to + "\r\n" +
			"Subject: " + encodeHeader(subject) + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/html; charset=UTF-8\r\n" +
			"Date: " + time.Now().UTC().Format(time.RFC1123Z) + "\r\n" +
			"\r\n" + html,
	)

	var auth smtp.Auth
	if cfg.User != "" {
		auth = smtp.PlainAuth("", cfg.User, cfg.Password, cfg.Host)
	}

	// Port 465 = implicit TLS; others = STARTTLS upgrade (handled by smtp.SendMail).
	if cfg.Port == "465" {
		return sendImplicitTLS(addr, cfg.Host, auth, from, []string{to}, msg)
	}
	return smtp.SendMail(addr, auth, from, []string{to}, msg)
}

func sendImplicitTLS(addr, host string, auth smtp.Auth, from string, to []string, msg []byte) error {
	conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: host, MinVersion: tls.VersionTLS12})
	if err != nil {
		return err
	}
	c, err := smtp.NewClient(conn, host)
	if err != nil {
		return err
	}
	defer c.Quit()
	if auth != nil {
		if err := c.Auth(auth); err != nil {
			return err
		}
	}
	if err := c.Mail(from); err != nil {
		return err
	}
	for _, r := range to {
		if err := c.Rcpt(r); err != nil {
			return err
		}
	}
	w, err := c.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write(msg); err != nil {
		return err
	}
	return w.Close()
}

func encodeHeader(s string) string {
	for _, b := range s {
		if b > 127 {
			return "=?UTF-8?B?" + base64Encode(s) + "?="
		}
	}
	return s
}

func base64Encode(s string) string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
	b := []byte(s)
	var out strings.Builder
	for i := 0; i < len(b); i += 3 {
		n := len(b) - i
		if n > 3 {
			n = 3
		}
		var v uint32
		for j := 0; j < n; j++ {
			v = (v << 8) | uint32(b[i+j])
		}
		v <<= uint32(8 * (3 - n))
		out.WriteByte(chars[(v>>18)&63])
		out.WriteByte(chars[(v>>12)&63])
		if n > 1 {
			out.WriteByte(chars[(v>>6)&63])
		} else {
			out.WriteByte('=')
		}
		if n > 2 {
			out.WriteByte(chars[v&63])
		} else {
			out.WriteByte('=')
		}
	}
	return out.String()
}

func orDefault(s, d string) string {
	if s == "" {
		return d
	}
	return s
}
