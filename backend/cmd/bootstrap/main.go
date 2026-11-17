// Bootstrap admin user. Reads env ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME.
// Idempotent: if the email exists, updates its password and role.
package main

import (
	"context"
	"log"
	"os"
	"strings"
	"time"

	"realestate/internal/auth"
	"realestate/internal/config"
	"realestate/internal/db"
)

func main() {
	cfg := config.Load()
	email := strings.ToLower(strings.TrimSpace(os.Getenv("ADMIN_EMAIL")))
	pw := os.Getenv("ADMIN_PASSWORD")
	name := os.Getenv("ADMIN_NAME")
	if email == "" || len(pw) < 8 {
		log.Fatal("ADMIN_EMAIL required and ADMIN_PASSWORD must be >=8 chars")
	}
	if name == "" {
		name = "Administrator"
	}
	pool, err := db.Connect(cfg)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer pool.Close()

	hash, err := auth.HashPassword(pw)
	if err != nil {
		log.Fatalf("hash: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_, err = pool.Exec(ctx, `
		INSERT INTO users (email_plain, password_hash, full_name, role, is_active)
		VALUES ($1,$2,$3,'super_admin',TRUE)
		ON CONFLICT (email_plain) DO UPDATE
		SET password_hash = EXCLUDED.password_hash,
		    full_name = EXCLUDED.full_name,
		    role = 'super_admin',
		    is_active = TRUE`,
		email, hash, name)
	if err != nil {
		log.Fatalf("upsert: %v", err)
	}
	log.Printf("bootstrap: user %s ready (super_admin)", email)
}
