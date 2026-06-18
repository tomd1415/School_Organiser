# Deploying School Organiser on Proxmox (Debian 12 VM, single instance)

A turnkey install for one teacher: a small Debian VM on Proxmox running the whole stack
(PostgreSQL + the app + a Caddy HTTPS reverse proxy) under Docker Compose. Everything stays on the
school LAN; no pupil data leaves the building.

> Multiple teachers on one box? Each is an isolated instance — see `scripts/new-instance.sh` and the
> RUNBOOK. This guide covers the common single-instance case.

## 1. Create the VM on Proxmox

- **Image:** Debian 12 (bookworm) — the *cloud image* or a standard netinst.
- **Resources:** 2 vCPU, 2–4 GB RAM, ~20 GB disk (more if you bulk-import lots of resources).
- **Network:** a static LAN IP (or a DHCP reservation). Note the IP / give it an internal DNS name
  (e.g. `organiser.school.internal`).
- Boot it, set a root password / SSH key, `apt update && apt -y upgrade`.

(LXC instead of a VM also works, but Docker in an *unprivileged* LXC needs `nesting=1,keyctl=1` on
the container — a VM avoids that, which is why this guide uses one.)

## 2. Put the code on the VM

```bash
# As root on the VM:
apt -y install git
git clone <your-repo-url> /opt/school-organiser      # or scp the folder across
cd /opt/school-organiser
```

## 3. Install — one command

```bash
sudo bash deploy/install.sh organiser.school.internal      # or your IP, e.g. 192.168.1.50
```

It installs Docker, generates `app/.env` (a random `SESSION_KEY` and DB password), builds and starts
**db + app + Caddy**, and schedules nightly **encrypted** backups. Migrations run automatically on
first boot, creating an empty database.

When it finishes, open **`https://organiser.school.internal/`** — the onboarding wizard sets your
password and walks you through first-time setup.

### The TLS certificate (LAN)

By default Caddy issues a **self-signed** certificate (`tls internal` in `app/Caddyfile`), because a
school LAN usually has no public DNS. Your browser will warn once — either accept it, or (better)
install Caddy's root CA on the teacher's devices so it's trusted everywhere:

```bash
cd /opt/school-organiser/app
docker compose --profile proxy cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
# then import caddy-root.crt into the OS/browser trust store on each device
```

Prefer no TLS on a trusted LAN? Edit `app/Caddyfile` (use the `:80` block), set `COOKIE_SECURE=false`
in `app/.env`, then `docker compose --profile proxy up -d`.

## 4. Add the AI key (optional)

The planning/marking/review AI features need the teacher's own Anthropic key. Either set
`ANTHROPIC_API_KEY=…` in `app/.env` and restart, or paste it in **Settings → AI** in the app. Spend
is audited and £-capped per instance; no pupil name is ever sent to the AI.

## 5. Day-to-day

All commands run from `/opt/school-organiser/app`:

```bash
docker compose --profile proxy ps          # status
docker compose --profile proxy logs -f app # logs
docker compose --profile proxy restart     # restart
docker compose --profile proxy down        # stop (data is kept in named volumes)
```

The stack has `restart: unless-stopped`, so it comes back automatically after a reboot.

- **Office → PDF preview** (in-app document preview) is optional and uses a large image; enable it
  with `docker compose --profile preview up -d gotenberg`. Without it the app degrades to
  download-only.

## 6. Backups & restore

`deploy/install.sh` schedules `scripts/backup.sh` nightly at 02:30 → `/opt/school-organiser/backups`,
**encrypted with age**. The dumps contain pupil data and secrets, so they are never written in
plaintext.

> ⚠ The decryption key is generated at `/root/.config/school-organiser/backup.agekey`. **Copy it off
> the server** (a password manager / the school's secure store) — without it the backups can't be
> restored.

Restore (e.g. onto a rebuilt VM): see `docs/RUNBOOK.md → Backups / Disaster recovery`. In short —
decrypt with the age key, `docker compose up -d db`, pipe the SQL dump into `psql`, and untar the
resources snapshot into `data/resources`.

## 7. Upgrades

```bash
cd /opt/school-organiser
git pull
sudo bash deploy/install.sh        # rebuilds + restarts; data, secrets and backups are preserved
```

## Snapshot tip (Proxmox)

Take a Proxmox snapshot of the VM before a major upgrade — it's the fastest possible rollback if
anything surprises you, on top of the app-level encrypted backups.

---

## Alternative: one command on the Proxmox host (LXC)

If you'd rather not click through the VM wizard, `deploy/proxmox-lxc.sh` runs **on the Proxmox host**
and does everything — creates a Debian 12 LXC, sets the flags Docker needs, clones the repo, and runs
the installer inside it:

```bash
# On the Proxmox host, as root:
sudo REPO_URL=https://github.com/you/School_Organiser.git SITE_ADDRESS=192.168.1.50 \
     bash deploy/proxmox-lxc.sh
# or positionally:  sudo bash deploy/proxmox-lxc.sh <REPO_URL> [SITE_ADDRESS]
```

When it finishes it prints the URL; open it and the onboarding wizard takes over. Get a root shell
with `pct enter <CTID>`.

**Tunables (env vars, with defaults):** `CTID` (next free), `HOSTNAME` (school-organiser), `CORES` (2),
`MEMORY` (4096 MB), `DISK` (20 GB), `STORAGE` (local-lvm), `TEMPLATE_STORAGE` (local), `BRIDGE`
(vmbr0), `IPCONF` (`dhcp`, or e.g. `192.168.1.50/24,gw=192.168.1.1`), `CT_PASSWORD` (optional root
password), `UNPRIVILEGED` (0).

### Docker-in-LXC: privileged by default, and why

Running Docker inside an LXC needs `nesting=1,keyctl=1` (the script sets both). It defaults to a
**privileged** container because *unprivileged* Docker-in-LXC is unreliable on recent kernels (runc's
per-namespace sysctl write and Docker's AppArmor probe). On a single-admin school host this is an
acceptable trade-off and the data is no more exposed than in a VM.

- Want the hardened path? `UNPRIVILEGED=1 sudo bash deploy/proxmox-lxc.sh …`. The script verifies
  Docker actually started and, if it didn't, tells you to fall back to privileged (or the VM).
- **The most isolated option is still the VM** (the first half of this guide) — prefer it if you're
  unsure; the LXC route is here for when you want the lighter footprint.

Backups, the AI key, upgrades (`git pull` then re-run the installer) and management are all identical
to the VM — the LXC just runs the same `deploy/install.sh` inside.
