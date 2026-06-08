#!/usr/bin/env bash
# Start the School Organiser, exactly, every time:
#   1. stop anything already running (a re-run is a clean restart)
#   2. bring up Postgres + the app
#   3. wait until both are healthy
#   4. seed the real timetable if the database is empty
#
# Usage:
#   ./start.sh         # dev  — app runs from source with hot-reload (tsx watch)
#   ./start.sh prod    # prod — app runs the built image (node dist/server.js)
#
# Identical mechanism on the Gentoo dev box and a Debian / Proxmox deployment.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$ROOT/app"
MODE="${1:-dev}"
URL="http://localhost:44360"

die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

case "$MODE" in
  dev)
    COMPOSE=(docker compose -f "$APP_DIR/docker-compose.yml" -f "$APP_DIR/docker-compose.dev.yml")
    SEED=(npx tsx src/seed/run.ts)
    ;;
  prod)
    COMPOSE=(docker compose -f "$APP_DIR/docker-compose.yml")
    SEED=(node dist/seed/run.js)
    ;;
  *) die "unknown mode '$MODE' — use: dev | prod" ;;
esac

command -v docker >/dev/null 2>&1 || die "docker is not installed."
docker info >/dev/null 2>&1 || die "the docker daemon is not running."
[[ -f "$APP_DIR/.env" ]] || die "missing app/.env — copy app/.env.example to app/.env and fill it in."

# True once the app answers on /health (curl if available, else a TCP connect).
app_up() {
  if command -v curl >/dev/null 2>&1; then
    local code
    code="$(curl -s -o /dev/null -w '%{http_code}' "$URL/health" 2>/dev/null || true)"
    [[ "$code" =~ ^(200|204|302)$ ]]
  else
    (exec 3<>/dev/tcp/localhost/44360) 2>/dev/null
  fi
}

# 1) Clean restart.
echo "→ [1/4] stopping anything already running…"
"$ROOT/stop.sh"

# 2) Up.
echo "→ [2/4] starting Postgres + app ($MODE)…"
"${COMPOSE[@]}" up -d --build

# 3) Health: database, then the app.
echo "→ [3/4] waiting for the database…"
db_cid="$("${COMPOSE[@]}" ps -q db)"
[[ -n "$db_cid" ]] || die "the db container did not start."
for i in $(seq 1 30); do
  [[ "$(docker inspect -f '{{.State.Health.Status}}' "$db_cid" 2>/dev/null || true)" == "healthy" ]] && break
  [[ $i -eq 30 ]] && die "the database did not become healthy (see: ${COMPOSE[*]} logs db)."
  sleep 2
done

echo "→ waiting for the app…"
for i in $(seq 1 60); do
  if app_up; then break; fi
  [[ $i -eq 60 ]] && die "the app did not respond on $URL/health (see: ${COMPOSE[*]} logs app)."
  sleep 2
done

# 4) Seed the timetable only if there is none (idempotent regardless).
echo "→ [4/4] checking timetable data…"
count="$("${COMPOSE[@]}" exec -T db psql -U organiser -d organiser -tAc 'SELECT count(*) FROM timetabled_lessons' 2>/dev/null | tr -d '[:space:]' || echo 0)"
if [[ "${count:-0}" == "0" ]]; then
  echo "  database empty — seeding the real timetable…"
  "${COMPOSE[@]}" exec -T app "${SEED[@]}"
else
  echo "  $count timetabled lessons already present — leaving them."
fi

# Friendly reminder if login can't work yet.
if grep -q '^APP_PASSWORD_HASH=replace_me' "$APP_DIR/.env" 2>/dev/null; then
  printf '\n⚠  No login password set yet. Set one with:\n     ( cd app && npm run hash-password -- '\''your-password'\'' )\n   put the printed hash in app/.env (APP_PASSWORD_HASH=…), then re-run ./start.sh\n'
fi

printf '\n✓ School Organiser is up (%s) → %s\n' "$MODE" "$URL"
printf '  logs:  %s logs -f app\n' "${COMPOSE[*]}"
printf '  stop:  ./stop.sh\n'
