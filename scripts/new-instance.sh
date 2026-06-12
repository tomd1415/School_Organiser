#!/usr/bin/env bash
# Phase 6.8: create an isolated School Organiser instance for another teacher.
# One teacher = one compose project = one database volume + resource store + backups.
# Nothing is shared between instances and nothing is transmitted between them.
#
#   ./scripts/new-instance.sh <name> <port> [db_port]
#   e.g. ./scripts/new-instance.sh mrs-jones 44370 5440
#
# Then: cd instances/<name> && docker compose up -d  → http://server:<port>/welcome
set -euo pipefail

NAME="${1:?usage: new-instance.sh <name> <port> [db_port]}"
PORT="${2:?usage: new-instance.sh <name> <port> [db_port]}"
DB_PORT="${3:-0}" # 0 = don't publish the DB; it stays compose-internal
[[ "$NAME" =~ ^[a-z0-9-]+$ ]] || { echo "name must be lowercase letters/digits/hyphens" >&2; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/instances/$NAME"
[[ -e "$DIR" ]] && { echo "instance '$NAME' already exists at $DIR" >&2; exit 1; }
mkdir -p "$DIR/data/resources" "$DIR/backups"

SESSION_KEY="$(openssl rand -hex 32)"
DB_PASS="$(openssl rand -hex 16)"

cat > "$DIR/.env" <<ENV
# Instance: $NAME — generated $(date -I). Keep this file private; it is never committed.
SESSION_KEY=$SESSION_KEY
# No APP_PASSWORD_HASH: the onboarding wizard (/welcome) sets the password on first boot.
DATABASE_URL=postgres://organiser:$DB_PASS@db:5432/organiser
RESOURCE_STORE_PATH=/data/resources
PORT=44360
COOKIE_SECURE=false
# Optional AI: add the teacher's own key (each instance audits + caps separately)
# ANTHROPIC_API_KEY=
ENV

PUBLISH_DB=""
if [[ "$DB_PORT" != "0" ]]; then PUBLISH_DB="
    ports:
      - \"127.0.0.1:$DB_PORT:5432\""; fi

cat > "$DIR/docker-compose.yml" <<YML
# School Organiser — instance "$NAME" (own DB volume, own port, no cross-instance traffic)
name: organiser-$NAME
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_USER: organiser
      POSTGRES_PASSWORD: $DB_PASS
      POSTGRES_DB: organiser
    volumes:
      - dbdata:/var/lib/postgresql/data$PUBLISH_DB
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U organiser"]
      interval: 5s
      timeout: 3s
      retries: 20
  app:
    build:
      context: ../../app
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "$PORT:44360"
    volumes:
      - ./data/resources:/data/resources
    restart: unless-stopped
volumes:
  dbdata:
YML

cat > "$DIR/backup.sh" <<'BAK'
#!/usr/bin/env bash
# Nightly-able backup for this instance: DB dump + resource files, kept 14 deep.
set -euo pipefail
cd "$(dirname "$0")"
STAMP="$(date +%Y%m%d-%H%M)"
docker compose exec -T db pg_dump -U organiser organiser | gzip > "backups/db-$STAMP.sql.gz"
tar -czf "backups/resources-$STAMP.tar.gz" data/resources
ls -1t backups/db-*.sql.gz | tail -n +15 | xargs -r rm
ls -1t backups/resources-*.tar.gz | tail -n +15 | xargs -r rm
echo "backup OK: $STAMP"
BAK
chmod +x "$DIR/backup.sh"

echo "Instance '$NAME' created in instances/$NAME"
echo "  start:   cd instances/$NAME && docker compose up -d --build"
echo "  first run: open http://<server>:$PORT/ → the onboarding wizard takes it from there"
echo "  backup:  instances/$NAME/backup.sh (cron it nightly)"
