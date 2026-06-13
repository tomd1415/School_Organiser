#!/usr/bin/env bash
# 10.1 — prove the newest DB backup actually restores. Loads it into a THROWAWAY scratch database
# inside the same Postgres container, asserts the core tables came back non-empty, drops the
# scratch DB, and records a dated PASS/FAIL to backups/verify.log and a `backup_last_verified`
# settings row (shown on Settings → Data health). Safe to run from cron monthly. Never touches the
# live `organiser` database.
#
#   crontab:  30 19 1 * *  /home/.../School_Organiser/scripts/verify-backup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT/app"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
LOG="$BACKUP_DIR/verify.log"
SCRATCH="organiser_verify"

NEWEST="$(ls -1t "$BACKUP_DIR"/db-*.sql.gz* 2>/dev/null | head -1 || true)"
[ -n "$NEWEST" ] || { echo "[verify] no db-*.sql.gz* backups found in $BACKUP_DIR" >&2; exit 1; }

# Decrypt-by-suffix → gzip stream (same scheme as restore.sh).
case "$NEWEST" in
  *.age) [ -n "${BACKUP_AGE_IDENTITY:-}" ] || { echo "set BACKUP_AGE_IDENTITY" >&2; exit 1; }; dec() { age -d -i "$BACKUP_AGE_IDENTITY"; } ;;
  *.gpg) [ -n "${BACKUP_GPG_PASSPHRASE:-}" ] || { echo "set BACKUP_GPG_PASSPHRASE" >&2; exit 1; }; dec() { gpg --batch --yes --quiet --decrypt --passphrase-fd 3 3<<<"$BACKUP_GPG_PASSPHRASE"; } ;;
  *.gz) dec() { cat; } ;;
  *) echo "[verify] unrecognised suffix: $NEWEST" >&2; exit 1 ;;
esac

cd "$APP_DIR"
psql_scratch() { docker compose exec -T db psql -v ON_ERROR_STOP=1 -U organiser "$@"; }
fail() { echo "$(date '+%Y-%m-%d %H:%M:%S') FAIL  $NEWEST  ($1)" >> "$LOG"; echo "[verify] FAIL: $1" >&2; cleanup; exit 1; }
cleanup() { docker compose exec -T db psql -U organiser -d postgres -c "DROP DATABASE IF EXISTS $SCRATCH" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "[verify] verifying $NEWEST -> scratch DB '$SCRATCH'"
docker compose exec -T db psql -U organiser -d postgres -c "DROP DATABASE IF EXISTS $SCRATCH" >/dev/null
docker compose exec -T db psql -U organiser -d postgres -c "CREATE DATABASE $SCRATCH" >/dev/null

dec < "$NEWEST" | gunzip -c | psql_scratch -d "$SCRATCH" >/dev/null || fail "restore errored"

# Assert the core tables came back and the dump wasn't an empty/truncated file.
SETTINGS="$(psql_scratch -d "$SCRATCH" -tAc "SELECT count(*) FROM settings" 2>/dev/null || echo x)"
YEARS="$(psql_scratch -d "$SCRATCH" -tAc "SELECT count(*) FROM academic_years" 2>/dev/null || echo x)"
[ "$SETTINGS" != "x" ] && [ "$YEARS" != "x" ] || fail "core tables missing after restore"
[ "$YEARS" -ge 1 ] 2>/dev/null || fail "academic_years empty after restore (suspect truncated dump)"

echo "$(date '+%Y-%m-%d %H:%M:%S') PASS  $NEWEST  (settings=$SETTINGS years=$YEARS)" >> "$LOG"
echo "[verify] PASS — settings=$SETTINGS academic_years=$YEARS"

# Stamp the live DB so Settings → Data health can show "last verified".
docker compose exec -T db psql -U organiser -d organiser -v ON_ERROR_STOP=1 -c \
  "INSERT INTO settings(key,value) VALUES ('backup_last_verified', to_char(now(),'YYYY-MM-DD HH24:MI'))
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value" >/dev/null 2>&1 || true
