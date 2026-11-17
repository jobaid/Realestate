#!/usr/bin/env bash
# backup.sh — dump the Azim Realty database and the uploads directory.
#
# Usage:
#   ./backup.sh                 # writes to ./backups/
#   BACKUP_DIR=/srv/backups ./backup.sh
#
# Required env (or load from .env):
#   DB_HOST DB_PORT DB_USER DB_PASSWORD DB_NAME
#   UPLOAD_DIR   (defaults to ./uploads)
#   BACKUP_DIR   (defaults to ./backups)
#   RETENTION_DAYS (defaults to 14)
set -euo pipefail

if [[ -f ".env" ]]; then set -a; . ./.env; set +a; fi

: "${DB_HOST:?missing}" "${DB_USER:?missing}" "${DB_PASSWORD:?missing}" "${DB_NAME:?missing}"
: "${DB_PORT:=5432}"
: "${UPLOAD_DIR:=./uploads}"
: "${BACKUP_DIR:=./backups}"
: "${RETENTION_DAYS:=14}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
DB_OUT="$BACKUP_DIR/db-$STAMP.dump"
UP_OUT="$BACKUP_DIR/uploads-$STAMP.tar.gz"

echo "[backup] $(date -u +%FT%TZ) dumping database $DB_NAME …"
PGPASSWORD="$DB_PASSWORD" pg_dump \
    --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" \
    --format=custom --compress=6 --no-owner --no-acl \
    --file="$DB_OUT"
chmod 600 "$DB_OUT"

if [[ -d "$UPLOAD_DIR" ]]; then
  echo "[backup] archiving $UPLOAD_DIR …"
  tar -C "$(dirname "$UPLOAD_DIR")" -czf "$UP_OUT" "$(basename "$UPLOAD_DIR")"
  chmod 600 "$UP_OUT"
fi

echo "[backup] pruning backups older than $RETENTION_DAYS days …"
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' \) \
    -mtime "+$RETENTION_DAYS" -print -delete

echo "[backup] done → $DB_OUT"
ls -lh "$DB_OUT" "$UP_OUT" 2>/dev/null || true
