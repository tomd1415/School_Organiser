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

# Write to dot-prefixed temp files first, then mv into place ONLY after the whole pipeline succeeds
# and the artifact is non-empty. Without this, the `>` truncates the target before the pipeline runs,
# so a failed pg_dump (db down/restarting) would leave a valid-looking but EMPTY/partial backup that
# sorts as the newest — and restore/verify would happily pick it. The temp names start with "." so the
# db-* / resources-* prune+restore globs never see them; a trap clears them on any failure (set -e).
TMP_DB="$BACKUP_DIR/.tmp-db-$STAMP"
TMP_RES="$BACKUP_DIR/.tmp-res-$STAMP"
trap 'rm -f "$TMP_DB" "$TMP_RES"' EXIT
RESOURCE_DIR="${RESOURCE_DIR:-$ROOT/data/resources}"

DB_NAME="db-$STAMP.sql.gz$EXT"
RES_NAME="resources-$STAMP.tar.gz$EXT"
MAN_NAME="manifest-$STAMP.sha256"

echo "[backup] dumping database -> $DB_NAME"
docker compose exec -T db pg_dump -U organiser organiser | gzip | enc > "$TMP_DB"
[ -s "$TMP_DB" ] || { echo "[backup] DB dump produced no data — aborting (no backup written)" >&2; exit 1; }

echo "[backup] snapshotting resource file-store -> $RES_NAME"
# The store is a bind-mounted host directory (app/docker-compose.yml), so tar it directly.
tar czf - -C "$RESOURCE_DIR" . | enc > "$TMP_RES"
[ -s "$TMP_RES" ] || { echo "[backup] resources archive empty — aborting" >&2; exit 1; }

# BUG-010: a backup is the DB + resources as ONE recovery set. Publish both only after BOTH succeeded,
# and write a checksum MANIFEST last — its presence is what marks the set complete. verify/restore key off
# the manifest, so a half-written set (e.g. a crash between the two moves) is ignored, never restored.
DB_SHA="$(sha256sum "$TMP_DB" | awk '{print $1}')"
RES_SHA="$(sha256sum "$TMP_RES" | awk '{print $1}')"
mv "$TMP_DB"  "$BACKUP_DIR/$DB_NAME"
mv "$TMP_RES" "$BACKUP_DIR/$RES_NAME"
printf '%s  %s\n%s  %s\n' "$DB_SHA" "$DB_NAME" "$RES_SHA" "$RES_NAME" > "$BACKUP_DIR/$MAN_NAME"
echo "[backup] published set $STAMP (manifest $MAN_NAME)"

# Prune by COMPLETE SET: keep the most recent $KEEP manifests, delete older manifests + the files they
# name. Then sweep any db-*/resources-* NOT named by a surviving manifest (orphans from an aborted run),
# so a half-set can never be mistaken for a restorable backup.
echo "[backup] pruning to the most recent $KEEP complete sets"
ls -1t "$BACKUP_DIR"/manifest-*.sha256 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
  while read -r _sha fname; do rm -f "$BACKUP_DIR/$fname"; done < "$old"
  rm -f "$old"
done
referenced="$(cat "$BACKUP_DIR"/manifest-*.sha256 2>/dev/null | awk '{print $2}' | sort -u)"
if [ -n "$referenced" ]; then
  for f in "$BACKUP_DIR"/db-*.sql.gz* "$BACKUP_DIR"/resources-*.tar.gz*; do
    [ -e "$f" ] || continue
    grep -qxF "$(basename "$f")" <<<"$referenced" || { echo "[backup] removing orphan (no manifest): $(basename "$f")"; rm -f "$f"; }
  done
fi

echo "[backup] done -> $BACKUP_DIR"
