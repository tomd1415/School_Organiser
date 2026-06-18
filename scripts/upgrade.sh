#!/usr/bin/env bash
# School Organiser — one-command upgrade. Run INSIDE the LXC/VM (as root), from anywhere:
#   bash /opt/school-organiser/scripts/upgrade.sh
#
# It pulls the latest code and rebuilds + restarts the stack. Data, secrets and backups are
# preserved; new DB migrations auto-run on the app's next boot. This is the light day-to-day path —
# re-run deploy/install.sh instead when you also want the installer's housekeeping (Docker check,
# backup cron).
#
# MAJOR upgrade? Snapshot first FROM THE PROXMOX HOST — this script runs inside the container and
# cannot snapshot itself:    pct snapshot <CTID> pre-upgrade
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Run as root inside the container/VM (e.g. via 'pct enter <CTID>')." >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$REPO/app"
COMPOSE=(docker compose -f "$APP_DIR/docker-compose.yml" --env-file "$APP_DIR/.env" --profile proxy)

command -v git >/dev/null || { echo "git is required." >&2; exit 1; }
command -v docker >/dev/null || { echo "docker is required." >&2; exit 1; }
[[ -f "$APP_DIR/.env" ]] || { echo "No $APP_DIR/.env — run deploy/install.sh first." >&2; exit 1; }

cd "$REPO"
echo "→ upgrading School Organiser in $REPO"

BEFORE="$(git rev-parse --short HEAD 2>/dev/null || echo '?')"
git pull --ff-only
AFTER="$(git rev-parse --short HEAD 2>/dev/null || echo '?')"
[[ "$BEFORE" == "$AFTER" ]] && echo "→ already at $AFTER — rebuilding anyway." || echo "→ $BEFORE → $AFTER"

echo "→ rebuilding & restarting (db + app + Caddy); migrations run on the app's boot…"
"${COMPOSE[@]}" up -d --build
"${COMPOSE[@]}" ps

cat <<EOF

✅  Upgraded to $AFTER.
    Major upgrade next time? Snapshot first from the Proxmox host:  pct snapshot <CTID> pre-upgrade
EOF
