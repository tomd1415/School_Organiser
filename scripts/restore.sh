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

# BUG-010: a backup is the DB + its resources as ONE matched set, recorded by a checksum manifest
# (backup.sh writes manifest-STAMP.sha256 last, naming both artifacts + their sha256). Verify the WHOLE
# set BEFORE the destructive database drop — so we never replace the live DB and only THEN discover the
# matching resources are missing or corrupt, leaving the database and file-store at different points in time.
verify_against_manifest() {
  local artifact="$1" manifest="$2" base want got
  base="$(basename "$artifact")"
  want="$(awk -v f="$base" '$2==f{print $1}' "$manifest")"
  [ -n "$want" ] || { echo "[restore] $base is not named in the manifest — wrong/foreign artifact" >&2; return 1; }
  got="$(sha256sum "$artifact" | awk '{print $1}')"
  [ "$want" = "$got" ] || { echo "[restore] checksum MISMATCH for $base (manifest ${want:0:12}…, file ${got:0:12}…)" >&2; return 1; }
}

DB_ONLY="${DB_ONLY:-0}"
STAMP="$(basename "$DUMP" | sed -n 's/^db-\([0-9]\{8\}-[0-9]\{6\}\)\..*/\1/p')"
[ -n "$STAMP" ] || { echo "[restore] can't derive the backup stamp from $(basename "$DUMP") — expected db-YYYYmmdd-HHMMSS.…" >&2; exit 1; }
MANIFEST="$ROOT/backups/manifest-$STAMP.sha256"
RES="$(ls "$ROOT/backups/resources-$STAMP.tar.gz"* 2>/dev/null | head -1 || true)"

if [ "$DB_ONLY" = "1" ]; then
  echo "[restore] ⚠ DB_ONLY=1 — restoring the database ONLY; the resource file-store is left untouched and may"
  echo "[restore]   then be out of step with the DB. Use this only for a deliberate database-only recovery."
  [ -f "$MANIFEST" ] && { verify_against_manifest "$DUMP" "$MANIFEST" || exit 1; }
else
  [ -f "$MANIFEST" ] || { echo "[restore] no manifest-$STAMP.sha256 beside $(basename "$DUMP") — refusing to restore an unverified/half set. (Set DB_ONLY=1 to force a database-only restore.)" >&2; exit 1; }
  [ -n "$RES" ]      || { echo "[restore] manifest present but no resources-$STAMP archive — incomplete set, refusing. (DB_ONLY=1 to force.)" >&2; exit 1; }
  echo "[restore] verifying the matched set $STAMP against its manifest…"
  verify_against_manifest "$DUMP" "$MANIFEST" || exit 1
  verify_against_manifest "$RES"  "$MANIFEST" || exit 1
  echo "[restore] manifest OK — DB + resources checksums match; restoring both as one set."
fi

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

# Restore the MATCHING resource snapshot (verified above) as one set, REPLACING the store so stale files
# from a different snapshot can't linger. Extract to a temp dir first (a bad archive then can't leave a
# half-cleared store), then swap the live store's contents in place (keeps the bind-mounted directory).
if [ "$DB_ONLY" = "1" ]; then
  echo "[restore] DB_ONLY=1 — left $ROOT/data/resources untouched."
else
  RES_DIR="$ROOT/data/resources"
  NEW_DIR="$ROOT/data/.resources-restore-$STAMP"
  echo "[restore] restoring matching resources $RES -> $RES_DIR (replacing the store)"
  rm -rf "$NEW_DIR"; mkdir -p "$NEW_DIR" "$RES_DIR"
  dec < "$RES" | tar xz -C "$NEW_DIR"
  find "$RES_DIR" -mindepth 1 -delete   # clear the live store (dotfiles too), keep the dir inode for the bind mount
  cp -a "$NEW_DIR"/. "$RES_DIR"/        # copy the verified snapshot in
  rm -rf "$NEW_DIR"
  echo "[restore] resource store replaced from the matched snapshot $STAMP."
fi

echo "[restore] restarting the app (migrations run automatically on boot)…"
docker compose start app >/dev/null 2>&1 || docker compose up -d app >/dev/null 2>&1 || true
echo "[restore] done."
