package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost, DBPort, DBUser, DBPassword, DBName string
	Port, JWTSecret, CORSOrigin, UploadDir     string
	PublicBaseURL                              string
	HSTS                                       bool
	DocsPath                                   string
}

func Load() *Config {
	_ = godotenv.Load()
	c := &Config{
		DBHost:        env("DB_HOST", "localhost"),
		DBPort:        env("DB_PORT", "5432"),
		DBUser:        mustEnv("DB_USER"),
		DBPassword:    mustEnv("DB_PASSWORD"),
		DBName:        mustEnv("DB_NAME"),
		Port:          env("PORT", "8080"),
		JWTSecret:     mustEnv("JWT_SECRET"),
		CORSOrigin:    env("CORS_ORIGIN", "http://localhost:5173"),
		UploadDir:     env("UPLOAD_DIR", "./uploads"),
		PublicBaseURL: env("PUBLIC_BASE_URL", "http://localhost:8080"),
		HSTS:          env("HSTS", "false") == "true",
		DocsPath:      env("DOCS_PATH", "./docs/openapi.yaml"),
	}
	if len(c.JWTSecret) < 32 {
		log.Fatal("JWT_SECRET must be at least 32 chars")
	}
	return c
}

func env(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

func mustEnv(k string) string {
	v := os.Getenv(k)
	if v == "" {
		log.Fatalf("missing env %s", k)
	}
	return v
}
