#!/usr/bin/env bash
# Restore a database dump produced by backup.sh, encrypted or not. Verified by verify-backup.sh.
#
#   scripts/restore.sh backups/db-20260608-191500.sql.gz.age
#
# Decryption — picks the mechanism from the file suffix:
#   *.age   needs BACKUP_AGE_IDENTITY (path to the age identity file holding the secret key)
#   *.gpg   needs BACKUP_GPG_PASSPHRASE
#   *.gz    plaintext (dev)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT/app"
DUMP="${1:?Usage: restore.sh <path/to/db-YYYYmmdd-HHMMSS.sql.gz[.age|.gpg]>}"

# Resolve DUMP relative to the current directory or the repo root.
[ -f "$DUMP" ] || DUMP="$ROOT/$DUMP"
[ -f "$DUMP" ] || { echo "Dump not found: $1" >&2; exit 1; }

# stdin (the raw artifact) -> stdout (the gzip stream), decrypting by suffix.
case "$DUMP" in
  *.age)
    command -v age >/dev/null || { echo "'age' is not installed" >&2; exit 1; }
    [ -n "${BACKUP_AGE_IDENTITY:-}" ] || { echo "set BACKUP_AGE_IDENTITY (path to the age identity file)" >&2; exit 1; }
    dec() { age -d -i "$BACKUP_AGE_IDENTITY"; } ;;
  *.gpg)
    command -v gpg >/dev/null || { echo "'gpg' is not installed" >&2; exit 1; }
    [ -n "${BACKUP_GPG_PASSPHRASE:-}" ] || { echo "set BACKUP_GPG_PASSPHRASE" >&2; exit 1; }
    dec() { gpg --batch --yes --quiet --decrypt --passphrase-fd 3 3<<<"$BACKUP_GPG_PASSPHRASE"; } ;;
  *.gz)
    dec() { cat; } ;;
  *)
    echo "Unrecognised dump suffix: $DUMP" >&2; exit 1 ;;
esac

cd "$APP_DIR"

# BUG-009: a plain pg_dump can't be loaded over a POPULATED database (objects already exist → errors, or
# duplicate rows), so restore into a freshly-recreated EMPTY database. That is DESTRUCTIVE — require an
# explicit confirmation (skip with FORCE=1 for an automated drill), and STOP the app first so nothing is
# writing while we drop the database out from under it.
FORCE="${FORCE:-0}"
if [ "$FORCE" != "1" ]; then
  echo "[restore] ⚠ This REPLACES the live 'organiser' database with $DUMP — every current row is dropped first."
  echo "[restore]   The app is stopped during the restore and restarted after."
  read -rp "[restore] Type 'REPLACE' to proceed: " ans
  [ "$ans" = "REPLACE" ] || { echo "[restore] aborted — nothing changed."; exit 1; }
fi

echo "[restore] stopping the app so it isn't writing during the restore…"
docker compose stop app >/dev/null 2>&1 || true

echo "[restore] recreating an empty 'organiser' database…"
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U organiser -d postgres <<'SQL'
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'organiser' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS organiser;
CREATE DATABASE organiser;
SQL

echo "[restore] loading $DUMP into the fresh 'organiser' database…"
dec < "$DUMP" | gunzip -c | docker compose exec -T db psql -v ON_ERROR_STOP=1 -U organiser -d organiser >/dev/null
echo "[restore] database restored."

# Restore the MATCHING resource snapshot from the same set (same STAMP), so the DB and its files agree.
STAMP="$(basename "$DUMP" | sed -n 's/^db-\([0-9]\{8\}-[0-9]\{6\}\)\..*/\1/p')"
RES=""
[ -n "$STAMP" ] && RES="$(ls "$ROOT/backups/resources-$STAMP.tar.gz"* 2>/dev/null | head -1 || true)"
if [ -n "$RES" ]; then
  echo "[restore] restoring matching resources $RES -> $ROOT/data/resources"
  mkdir -p "$ROOT/data/resources"
  dec < "$RES" | tar xz -C "$ROOT/data/resources"
else
  echo "[restore] ⚠ no matching resources-$STAMP archive found — restore the resource snapshot manually, e.g.:"
  echo "[restore]   (age -d -i \"\$BACKUP_AGE_IDENTITY\" < backups/resources-STAMP.tar.gz.age) | tar xz -C \"$ROOT/data/resources\""
fi

echo "[restore] restarting the app (migrations run automatically on boot)…"
docker compose start app >/dev/null 2>&1 || docker compose up -d app >/dev/null 2>&1 || true
echo "[restore] done."
