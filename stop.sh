#!/usr/bin/env bash
# Stop the School Organiser (Postgres + app) gracefully, if it is running.
# Safe to run when nothing is up. Called first by ./start.sh.
#
# `docker compose down` sends SIGTERM, waits, then removes the containers and the
# network. Named volumes (the database, the resource store) are kept, so data
# survives a stop/start.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE=(docker compose -f "$ROOT/app/docker-compose.yml")

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found — nothing to stop."
  exit 0
fi

# `ps -aq` lists this project's containers (running or stopped). Empty => nothing to do.
if [[ -n "$("${COMPOSE[@]}" ps -aq 2>/dev/null || true)" ]]; then
  echo "→ stopping School Organiser…"
  "${COMPOSE[@]}" down
  echo "✓ stopped (database volume preserved)."
else
  echo "✓ nothing running."
fi
