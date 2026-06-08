#!/usr/bin/env bash
# Restore a database dump produced by backup.sh. TEST THIS at least once.
#
#   scripts/restore.sh backups/db-20260608-191500.sql.gz
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT/app"
DUMP="${1:?Usage: restore.sh <path/to/db-YYYYmmdd-HHMMSS.sql.gz>}"

# Resolve DUMP relative to the current directory or the repo root.
[ -f "$DUMP" ] || DUMP="$ROOT/$DUMP"
[ -f "$DUMP" ] || { echo "Dump not found: $1" >&2; exit 1; }

cd "$APP_DIR"
echo "[restore] loading $DUMP into the organiser database"
gunzip -c "$DUMP" | docker compose exec -T db psql -v ON_ERROR_STOP=1 -U organiser -d organiser
echo "[restore] database restored."
echo "[restore] for resources, untar the matching resources-*.tar.gz into the resource-store volume."
