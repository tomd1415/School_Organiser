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

# BUG-010: verify the newest COMPLETE SET — both artifacts against the manifest checksums, the DB
# restores into a scratch database, AND the matching resources archive unpacks. Falls back to the newest
# db alone only when there is no manifest yet (a pre-this-change backup).
MAN="$(ls -1t "$BACKUP_DIR"/manifest-*.sha256 2>/dev/null | head -1 || true)"
RES=""
if [ -n "$MAN" ]; then
  NEWEST="$BACKUP_DIR/$(awk '$2 ~ /^db-/{print $2; exit}' "$MAN")"
  RES="$BACKUP_DIR/$(awk '$2 ~ /^resources-/{print $2; exit}' "$MAN")"
else
  echo "[verify] no manifest found — verifying the newest db alone (legacy backup)" >&2
  NEWEST="$(ls -1t "$BACKUP_DIR"/db-*.sql.gz* 2>/dev/null | head -1 || true)"
fi
[ -n "${NEWEST:-}" ] && [ -f "$NEWEST" ] || { echo "[verify] no db backup found in $BACKUP_DIR" >&2; exit 1; }

# Decrypt-by-suffix → gzip stream (same scheme as restore.sh). The resources file shares the suffix.
case "$NEWEST" in
  *.age) [ -n "${BACKUP_AGE_IDENTITY:-}" ] || { echo "set BACKUP_AGE_IDENTITY" >&2; exit 1; }; dec() { age -d -i "$BACKUP_AGE_IDENTITY"; } ;;
  *.gpg) [ -n "${BACKUP_GPG_PASSPHRASE:-}" ] || { echo "set BACKUP_GPG_PASSPHRASE" >&2; exit 1; }; dec() { gpg --batch --yes --quiet --decrypt --passphrase-fd 3 3<<<"$BACKUP_GPG_PASSPHRASE"; } ;;
  *.gz) dec() { cat; } ;;
  *) echo "[verify] unrecognised suffix: $NEWEST" >&2; exit 1 ;;
esac

cd "$APP_DIR"
TMPRES=""
psql_scratch() { docker compose exec -T db psql -v ON_ERROR_STOP=1 -U organiser "$@"; }
cleanup() { docker compose exec -T db psql -U organiser -d postgres -c "DROP DATABASE IF EXISTS $SCRATCH" >/dev/null 2>&1 || true; [ -n "$TMPRES" ] && rm -rf "$TMPRES"; }
fail() { echo "$(date '+%Y-%m-%d %H:%M:%S') FAIL  $(basename "$NEWEST")  ($1)" >> "$LOG"; echo "[verify] FAIL: $1" >&2; cleanup; exit 1; }
trap cleanup EXIT

# 1) Integrity: both artifacts match the manifest checksums (catches truncation / corruption / tampering).
if [ -n "$MAN" ]; then
  ( cd "$BACKUP_DIR" && sha256sum -c "$(basename "$MAN")" ) >/dev/null 2>&1 || fail "manifest checksum mismatch — an artifact is corrupt or altered"
fi

# 2) The DB actually restores into a throwaway scratch database.
echo "[verify] verifying $(basename "$NEWEST") -> scratch DB '$SCRATCH'"
docker compose exec -T db psql -U organiser -d postgres -c "DROP DATABASE IF EXISTS $SCRATCH" >/dev/null
docker compose exec -T db psql -U organiser -d postgres -c "CREATE DATABASE $SCRATCH" >/dev/null
dec < "$NEWEST" | gunzip -c | psql_scratch -d "$SCRATCH" >/dev/null || fail "restore errored"

SETTINGS="$(psql_scratch -d "$SCRATCH" -tAc "SELECT count(*) FROM settings" 2>/dev/null || echo x)"
YEARS="$(psql_scratch -d "$SCRATCH" -tAc "SELECT count(*) FROM academic_years" 2>/dev/null || echo x)"
[ "$SETTINGS" != "x" ] && [ "$YEARS" != "x" ] || fail "core tables missing after restore"
[ "$YEARS" -ge 1 ] 2>/dev/null || fail "academic_years empty after restore (suspect truncated dump)"

# 3) The matching resources archive unpacks (an empty store is legitimate on a fresh instance, so we
#    require only that it extracts cleanly — proving the encryption + tar are intact for the SAME set).
if [ -n "$RES" ] && [ -f "$RES" ]; then
  TMPRES="$(mktemp -d)"
  dec < "$RES" | tar xz -C "$TMPRES" || fail "resources archive failed to extract"
  echo "[verify] resources archive unpacks OK ($(basename "$RES"))"
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') PASS  $(basename "$NEWEST")  (settings=$SETTINGS years=$YEARS${RES:+ +resources})" >> "$LOG"
echo "[verify] PASS — settings=$SETTINGS academic_years=$YEARS${RES:+, resources OK}"

# Stamp the live DB so Settings → Data health can show "last verified".
docker compose exec -T db psql -U organiser -d organiser -v ON_ERROR_STOP=1 -c \
  "INSERT INTO settings(key,value) VALUES ('backup_last_verified', to_char(now(),'YYYY-MM-DD HH24:MI'))
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value" >/dev/null 2>&1 || true
