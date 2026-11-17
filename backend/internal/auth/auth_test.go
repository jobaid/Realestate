package auth

import (
	"strings"
	"testing"
	"time"
)

func TestPasswordHashAndCheck(t *testing.T) {
	h, err := HashPassword("correct horse battery staple")
	if err != nil {
		t.Fatalf("hash: %v", err)
	}
	if !CheckPassword(h, "correct horse battery staple") {
		t.Fatal("expected password to match")
	}
	if CheckPassword(h, "wrong password") {
		t.Fatal("expected wrong password to fail")
	}
}

func TestAccessTokenRoundTrip(t *testing.T) {
	secret := strings.Repeat("s", 32)
	tok, exp, err := IssueAccess(secret, "user-123", "admin")
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	if time.Until(exp) <= 0 {
		t.Fatal("expiry must be in the future")
	}
	c, err := ParseAccess(secret, tok)
	if err != nil {
		t.Fatalf("parse: %v", err)
	}
	if c.UserID != "user-123" || c.Role != "admin" {
		t.Fatalf("claims mismatch: %+v", c)
	}
	if _, err := ParseAccess(strings.Repeat("x", 32), tok); err == nil {
		t.Fatal("expected wrong secret to fail")
	}
	if _, err := ParseAccess(secret, tok+"tampered"); err == nil {
		t.Fatal("expected tampered token to fail")
	}
}

func TestRefreshTokenHash(t *testing.T) {
	plain, hash, err := NewRefreshToken()
	if err != nil {
		t.Fatalf("new: %v", err)
	}
	if plain == "" || hash == "" || plain == hash {
		t.Fatal("bad refresh token output")
	}
	if HashRefresh(plain) != hash {
		t.Fatal("hash mismatch")
	}
	p2, h2, _ := NewRefreshToken()
	if p2 == plain || h2 == hash {
		t.Fatal("tokens must be unique")
	}
}
