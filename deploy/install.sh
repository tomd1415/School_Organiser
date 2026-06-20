#!/usr/bin/env bash
# School Organiser — turnkey single-instance installer for a fresh Debian 12 (bookworm) guest.
#
# Run as root INSIDE the VM, from anywhere in the repo:
#   sudo bash deploy/install.sh [SITE_ADDRESS]
#     SITE_ADDRESS = the hostname or IP to serve on (e.g. organiser.school.internal, or 192.168.1.50)
#
# It is idempotent: re-run after `git pull` to upgrade (rebuild + restart) WITHOUT touching data or
# the generated secrets. Installs Docker, generates app/.env (random SESSION_KEY + DB password),
# brings up the db + app + Caddy (HTTPS) stack, and sets up nightly ENCRYPTED backups.
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Please run as root:  sudo bash deploy/install.sh" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$REPO/app"
ENV="$APP_DIR/.env"
COMPOSE=(docker compose -f "$APP_DIR/docker-compose.yml" --env-file "$ENV" --profile proxy)

echo "→ School Organiser installer  (repo: $REPO)"

# ── 1. Docker Engine + Compose v2 ───────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  echo "→ installing Docker Engine…"
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null 2>&1 || { echo "Docker Compose v2 plugin is missing — install docker-compose-plugin." >&2; exit 1; }
systemctl enable --now docker >/dev/null 2>&1 || true
command -v openssl >/dev/null || { apt-get update -qq && apt-get install -y -qq openssl; }

# ── 2. Secrets / env (generated once, preserved across re-runs) ──────────────
if [[ ! -f "$ENV" ]]; then
  SITE="${1:-}"
  if [[ -z "$SITE" ]]; then read -rp "Hostname or IP to serve on (e.g. organiser.school.internal): " SITE; fi
  [[ -n "$SITE" ]] || { echo "A SITE_ADDRESS is required." >&2; exit 1; }
  ( umask 077; cat > "$ENV" <<EOF
# School Organiser — production secrets, generated $(date -I). PRIVATE: never commit, never share.
SITE_ADDRESS=$SITE
SESSION_KEY=$(openssl rand -hex 32)
DB_PASSWORD=$(openssl rand -hex 16)
COOKIE_SECURE=true
# BUG-045: the app sits behind Caddy, which sets X-Forwarded-For to the real client. Trust it so the
# per-IP login/PIN rate limits key on the actual device (not all-collapsed-to-the-proxy).
TRUST_PROXY=true
# Optional: the teacher's own Anthropic key enables the AI features (audited + £-capped per instance).
# ANTHROPIC_API_KEY=
EOF
  )
  echo "→ generated $ENV  (random SESSION_KEY + DB password; SITE_ADDRESS=$SITE)"
else
  echo "→ keeping existing $ENV (re-run = upgrade)"
  # Idempotent upgrade: an existing .env (preserved across re-runs) predates TRUST_PROXY — add it so the
  # per-IP rate limits work behind Caddy (BUG-045). The DB password was already randomised at first install.
  if ! grep -q '^TRUST_PROXY=' "$ENV"; then
    echo 'TRUST_PROXY=true' >> "$ENV"
    echo "→ added TRUST_PROXY=true to $ENV (BUG-045 — real client IP behind the Caddy proxy)"
  fi
fi
SITE="$(grep '^SITE_ADDRESS=' "$ENV" | cut -d= -f2-)"

# ── 3. Data + backup directories ────────────────────────────────────────────
mkdir -p "$REPO/data/resources" "$REPO/backups"

# ── 4. Encrypted backups (age, encrypt-only key) ────────────────────────────
# The dumps hold pupil data + secrets, so they are encrypted at rest (project policy: no plaintext
# backups). We generate an age keypair on the box; you MUST copy the private key off-box, because
# without it the backups cannot be restored.
KEY_DIR="/root/.config/school-organiser"
KEYFILE="$KEY_DIR/backup.agekey"
RECIPIENT=""
if command -v age >/dev/null 2>&1 || apt-get install -y -qq age 2>/dev/null; then
  mkdir -p "$KEY_DIR"; chmod 700 "$KEY_DIR"
  if [[ ! -f "$KEYFILE" ]]; then age-keygen -o "$KEYFILE" >/dev/null 2>&1; chmod 600 "$KEYFILE"; fi
  RECIPIENT="$(age-keygen -y "$KEYFILE" 2>/dev/null || true)"
fi
CRON="/etc/cron.d/school-organiser-backup"
if [[ -n "$RECIPIENT" ]]; then
  printf '30 2 * * * root BACKUP_AGE_RECIPIENT=%s %s/scripts/backup.sh >> /var/log/school-organiser-backup.log 2>&1\n' \
    "$RECIPIENT" "$REPO" > "$CRON"
  chmod 0644 "$CRON"
  echo "→ nightly encrypted backup scheduled (02:30) — age recipient ${RECIPIENT:0:16}…"
else
  echo "⚠ could not set up 'age' — skipping the backup cron. Configure backups manually (docs/RUNBOOK.md → Backups)."
fi

# ── 5. Build + start (migrations auto-run on app boot) ──────────────────────
echo "→ building & starting the stack (db + app + Caddy)…"
"${COMPOSE[@]}" up -d --build

cat <<EOF

────────────────────────────────────────────────────────────────────────────
✅  School Organiser is up.

   Open       https://$SITE/         → the onboarding wizard sets your password on first run.
              (Self-signed TLS by default — accept the certificate once, or install Caddy's root CA
               on your devices: DEPLOYMENT.md.)

   Manage     cd $APP_DIR
              docker compose --profile proxy ps | logs -f | restart | down
   Upgrade    git -C $REPO pull  &&  sudo bash deploy/install.sh
   Backups    nightly 02:30 → $REPO/backups   (run now: BACKUP_AGE_RECIPIENT=… scripts/backup.sh)
EOF
if [[ -n "$RECIPIENT" ]]; then cat <<EOF
   ⚠ IMPORTANT  Copy the backup decryption key OFF this server and keep it safe — without it the
                backups cannot be restored:   $KEYFILE
EOF
fi
cat <<EOF
   Office→PDF preview (optional, large image):
              docker compose --profile preview up -d gotenberg
────────────────────────────────────────────────────────────────────────────
EOF
