#!/usr/bin/env bash
# Nightly backup: Postgres dump + resource file-store snapshot.
# Run from anywhere; resolves paths relative to the repo. Designed to drop its
# output where the school's existing off-site backup already sweeps.
#
#   crontab:  15 19 * * 1-5  /home/.../School_Organiser/scripts/backup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT/app"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
KEEP="${KEEP:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
PROJECT="school_organiser"   # docker compose project name (see app/docker-compose.yml)

mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"

echo "[backup] dumping database -> db-$STAMP.sql.gz"
docker compose exec -T db pg_dump -U organiser organiser | gzip > "$BACKUP_DIR/db-$STAMP.sql.gz"

echo "[backup] snapshotting resource file-store -> resources-$STAMP.tar.gz"
# The store is a bind-mounted host directory (app/docker-compose.yml), so tar it directly.
RESOURCE_DIR="${RESOURCE_DIR:-$ROOT/data/resources}"
tar czf "$BACKUP_DIR/resources-$STAMP.tar.gz" -C "$RESOURCE_DIR" .

echo "[backup] pruning to the most recent $KEEP of each"
ls -1t "$BACKUP_DIR"/db-*.sql.gz        2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
ls -1t "$BACKUP_DIR"/resources-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

echo "[backup] done -> $BACKUP_DIR"
