#!/usr/bin/env bash
# restore.sh — restore the Azim Realty database from a pg_dump custom-format file.
#
# Usage:
#   ./restore.sh /path/to/db-YYYYMMDD-HHMMSS.dump
#   ./restore.sh --uploads /path/to/uploads-YYYYMMDD-HHMMSS.tar.gz
#
# Requires DB_* env (same as backup.sh). Prints a confirmation prompt by default;
# pass --force to skip it (use from automation only).
set -euo pipefail

if [[ -f ".env" ]]; then set -a; . ./.env; set +a; fi

FORCE=0
MODE=db
INPUT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)    FORCE=1; shift ;;
    --uploads)  MODE=uploads; INPUT="$2"; shift 2 ;;
    -h|--help)  sed -n '2,10p' "$0"; exit 0 ;;
    *)          INPUT="$1"; shift ;;
  esac
done
[[ -n "$INPUT" ]] || { echo "usage: $0 <dump-or-tar>"; exit 2; }
[[ -f "$INPUT" ]] || { echo "not found: $INPUT"; exit 2; }

if [[ "$MODE" == "uploads" ]]; then
  : "${UPLOAD_DIR:?missing}"
  echo "About to extract $INPUT into $(dirname "$UPLOAD_DIR")/"
  if [[ $FORCE -eq 0 ]]; then read -r -p "Continue? [y/N] " a; [[ "$a" == "y" || "$a" == "Y" ]] || exit 1; fi
  tar -C "$(dirname "$UPLOAD_DIR")" -xzf "$INPUT"
  echo "[restore] uploads restored."
  exit 0
fi

: "${DB_HOST:?missing}" "${DB_USER:?missing}" "${DB_PASSWORD:?missing}" "${DB_NAME:?missing}"
: "${DB_PORT:=5432}"

echo "About to DROP and recreate the schema in $DB_NAME@$DB_HOST then restore $INPUT"
if [[ $FORCE -eq 0 ]]; then
  read -r -p "This destroys current data. Type the DB name to confirm: " a
  [[ "$a" == "$DB_NAME" ]] || { echo "aborted"; exit 1; }
fi

export PGPASSWORD="$DB_PASSWORD"
# Clean & restore inside a single transaction.
pg_restore \
    --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" --dbname="$DB_NAME" \
    --clean --if-exists --single-transaction --no-owner --no-acl \
    "$INPUT"

echo "[restore] done."
