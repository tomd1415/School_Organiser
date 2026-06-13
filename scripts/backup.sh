#!/usr/bin/env bash
# Nightly backup: Postgres dump + resource file-store snapshot, ENCRYPTED AT REST.
# Run from anywhere; resolves paths relative to the repo. Designed to drop its
# output where the school's existing off-site backup already sweeps.
#
#   crontab:  15 19 * * 1-5  /home/.../School_Organiser/scripts/backup.sh
#
# Encryption (10.1) — the dumps hold every pupil name, note, answer, mark AND the IMAP/AI secrets
# in the settings table, so they are encrypted at rest. Choose ONE mechanism via the environment:
#   BACKUP_AGE_RECIPIENT   an age recipient (age1… public key, or ssh-ed25519 …). Preferred:
#                          encrypt-only, so the box making backups never holds the decrypt secret.
#   BACKUP_GPG_PASSPHRASE  a passphrase for gpg symmetric (AES256). Simpler, but the box holds it.
# If NEITHER is set the script REFUSES to write a plaintext backup, unless you explicitly opt in
# with BACKUP_ALLOW_PLAINTEXT=1 (local dev only — never on a server holding real pupil data).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT/app"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
KEEP="${KEEP:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

# Resolve the encryption mechanism + the suffix it appends to each artifact.
EXT=""
if [ -n "${BACKUP_AGE_RECIPIENT:-}" ]; then
  command -v age >/dev/null || { echo "[backup] BACKUP_AGE_RECIPIENT set but 'age' is not installed" >&2; exit 1; }
  enc() { age -r "$BACKUP_AGE_RECIPIENT"; }
  EXT=".age"
  echo "[backup] encrypting with age (recipient ${BACKUP_AGE_RECIPIENT:0:16}…)"
elif [ -n "${BACKUP_GPG_PASSPHRASE:-}" ]; then
  command -v gpg >/dev/null || { echo "[backup] BACKUP_GPG_PASSPHRASE set but 'gpg' is not installed" >&2; exit 1; }
  enc() { gpg --batch --yes --symmetric --cipher-algo AES256 --passphrase-fd 3 3<<<"$BACKUP_GPG_PASSPHRASE"; }
  EXT=".gpg"
  echo "[backup] encrypting with gpg symmetric (AES256)"
elif [ "${BACKUP_ALLOW_PLAINTEXT:-0}" = "1" ]; then
  enc() { cat; }
  echo "[backup] ⚠ WRITING PLAINTEXT (BACKUP_ALLOW_PLAINTEXT=1) — dev only, never with real pupil data"
else
  echo "[backup] REFUSING to write a plaintext backup: set BACKUP_AGE_RECIPIENT or BACKUP_GPG_PASSPHRASE" >&2
  echo "[backup] (or BACKUP_ALLOW_PLAINTEXT=1 for local dev). See docs/RUNBOOK.md → Backups." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"

echo "[backup] dumping database -> db-$STAMP.sql.gz$EXT"
docker compose exec -T db pg_dump -U organiser organiser | gzip | enc > "$BACKUP_DIR/db-$STAMP.sql.gz$EXT"

echo "[backup] snapshotting resource file-store -> resources-$STAMP.tar.gz$EXT"
# The store is a bind-mounted host directory (app/docker-compose.yml), so tar it directly.
RESOURCE_DIR="${RESOURCE_DIR:-$ROOT/data/resources}"
tar czf - -C "$RESOURCE_DIR" . | enc > "$BACKUP_DIR/resources-$STAMP.tar.gz$EXT"

echo "[backup] pruning to the most recent $KEEP of each (all suffixes)"
ls -1t "$BACKUP_DIR"/db-*.sql.gz*        2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
ls -1t "$BACKUP_DIR"/resources-*.tar.gz* 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

echo "[backup] done -> $BACKUP_DIR"
