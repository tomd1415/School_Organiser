# Deploying School Organiser on Proxmox

A complete, step-by-step guide to running School Organiser on your Proxmox server for one teacher.
The whole stack — **PostgreSQL + the app + a Caddy HTTPS reverse proxy** — runs under Docker Compose
inside a single Debian 12 container (or VM). Everything stays on the school LAN; no pupil data leaves
the building.

> **TL;DR (recommended path).** On the Proxmox host, as root. The host has no checkout of this repo
> yet (and usually no `git`), so fetch the one bootstrap script — it clones the full repo into the
> container itself:
> ```bash
> curl -fsSLO https://raw.githubusercontent.com/tomd1415/School_Organiser/main/deploy/proxmox-lxc.sh
> REPO_URL=https://github.com/tomd1415/School_Organiser.git SITE_ADDRESS=192.168.1.50 bash proxmox-lxc.sh
> ```
> It creates the container, installs everything, and prints a URL. Open it → the onboarding wizard sets
> your password. The rest of this document explains every step, the alternatives, and how to operate it.

---

## 0. What gets deployed

| Piece | What it is | Port |
|---|---|---|
| `app` | The School Organiser web app (Node/Fastify) | `44360` (host-local debug only — bound to `127.0.0.1`) |
| `db` | PostgreSQL 16 + pgvector | `5434` on the host (internal `5432`) |
| `caddy` | HTTPS reverse proxy — the **front door** | `80` / `443` |
| `gotenberg` | *Optional* Office→PDF preview helper | internal only |

- Data lives in Docker **named volumes** (`db-data`, `caddy-data`) plus a host bind-mount for uploaded
  resources at `data/resources/`. Stopping or rebuilding the stack never deletes them.
- Database **migrations run automatically** when the app boots — a fresh install creates an empty,
  ready-to-use database.
- All services have `restart: unless-stopped`, so the stack comes back by itself after a reboot.

---

## 1. Choose your path

| | **A — LXC (one command on the host)** | **B — Debian VM** |
|---|---|---|
| Effort | One command, no VM wizard | Click through Proxmox's VM wizard first |
| Footprint | Lighter (shared kernel) | Heavier (full VM) |
| Isolation | Good (privileged container) | **Best** |
| Recommended for | Most single-teacher installs | When you want maximum isolation, or LXC gives you trouble |

Both routes run the **same** `deploy/install.sh` and are operated identically afterwards. Start with
**A**; fall back to **B** if anything about Docker-in-LXC misbehaves.

---

## 2. Prerequisites

- A **Proxmox VE host** you can `ssh` into as root (the `pct` command must be available — it is, on any
  Proxmox host).
- A **git URL** for this repository that the container can clone (or be ready to `scp`/`git clone` the
  folder across yourself).
- A **LAN IP or hostname** to serve on, e.g. `192.168.1.50` or `organiser.school.internal`. A static IP
  or DHCP reservation is best so the address doesn't change.
- Outbound internet from the container/VM for the one-time install (Docker, base images). After install
  the app itself only needs the internet if you enable the AI features.

---

## 3. Path A — one command on the Proxmox host (LXC)

Run this **on the Proxmox host, as root**. The host has no checkout of this repo yet (and usually no
`git`), so first fetch the single bootstrap script. It creates a Debian 12 LXC, sets the two flags
Docker needs (`nesting=1,keyctl=1`), then clones the **full** repo *inside* the container and runs the
installer there:

```bash
# Fetch the one script onto the host (it self-clones the repo into the container via REPO_URL):
curl -fsSLO https://raw.githubusercontent.com/tomd1415/School_Organiser/main/deploy/proxmox-lxc.sh

# Minimal — auto-detects the container's IP and serves on it:
REPO_URL=https://github.com/tomd1415/School_Organiser.git bash proxmox-lxc.sh

# Or pin the address (recommended) and pass it positionally or by env:
REPO_URL=https://github.com/tomd1415/School_Organiser.git SITE_ADDRESS=192.168.1.50 \
     bash proxmox-lxc.sh
```

You're already root on the host, so no `sudo` is needed — a bare Proxmox host often doesn't have it,
and the script enforces `root` itself. Already have the repo cloned on the host? Skip the `curl` and
run `bash deploy/proxmox-lxc.sh …` from inside the checkout instead.

When it finishes it prints the URL — open it and the onboarding wizard takes over (→ [§6](#6-first-run-onboarding)).
Get a root shell in the container any time with `pct enter <CTID>`.

### Tunables (environment variables, with defaults)

| Var | Default | Meaning |
|---|---|---|
| `CTID` | next free id | The container's id |
| `HOSTNAME` | `school-organiser` | Container hostname |
| `CORES` | `2` | vCPUs |
| `MEMORY` | `4096` | RAM in MB (swap is set to match) |
| `DISK` | `20` | Root disk in GB (more if you bulk-import lots of resources) |
| `STORAGE` | `local-lvm` | Proxmox storage for the rootfs |
| `TEMPLATE_STORAGE` | `local` | Where the Debian template is stored/downloaded |
| `BRIDGE` | `vmbr0` | Network bridge |
| `IPCONF` | `dhcp` | Or e.g. `192.168.1.50/24,gw=192.168.1.1` for a static IP |
| `CT_PASSWORD` | _(unset)_ | Optional container root password (else use `pct enter`) |
| `UNPRIVILEGED` | `0` | `0` = privileged (reliable Docker); `1` = unprivileged (hardened) |

### Why the LXC is privileged by default

Running Docker inside an LXC needs `nesting=1,keyctl=1` (the script always sets both). It defaults to a
**privileged** container because *unprivileged* Docker-in-LXC is unreliable on recent kernels (runc's
per-namespace sysctl write and Docker's AppArmor probe). On a single-admin school host this is an
acceptable trade-off, and the data is no more exposed than in a VM. The script **verifies Docker actually
started** and, if it didn't, tells you to fall back to privileged or to the VM (Path B).

- Want the hardened path? `UNPRIVILEGED=1 bash proxmox-lxc.sh …`.
- **The most isolated option is the VM** — use Path B if you're unsure.

Skip to [§6](#6-first-run-onboarding).

---

## 4. Path B — a Debian 12 VM

### 4.1 Create the VM on Proxmox

- **Image:** Debian 12 (bookworm) — the cloud image or a standard netinst.
- **Resources:** 2 vCPU, 2–4 GB RAM, ~20 GB disk (more if you bulk-import lots of resources).
- **Network:** a static LAN IP (or a DHCP reservation). Note the IP / give it an internal DNS name.
- Boot it, set a root password / SSH key, then `apt update && apt -y upgrade`.

### 4.2 Put the code on the VM

```bash
# As root on the VM:
apt -y install git
git clone <your-git-url> /opt/school-organiser     # or scp the folder across
cd /opt/school-organiser
```

### 4.3 Install — one command

```bash
sudo bash deploy/install.sh organiser.school.internal     # or your IP, e.g. 192.168.1.50
```

That's the whole install. Continue to [§6](#6-first-run-onboarding).

---

## 5. What `deploy/install.sh` does (for transparency)

Whether run by you (VM) or by the LXC script, the installer is **idempotent** — safe to re-run to
upgrade — and:

1. Installs **Docker Engine + Compose v2** if missing (and `openssl`, `age`).
2. Generates **`app/.env`** *once* (preserved across re-runs) with a random `SESSION_KEY` and
   `DB_PASSWORD`, your `SITE_ADDRESS`, `COOKIE_SECURE=true`, and `TRUST_PROXY=true` (the app sits behind
   Caddy, which sets the real client IP in `X-Forwarded-For` — needed for the per-IP login/PIN rate
   limits to work). It is `chmod 600` and must never be committed. **Postgres (5434) and the app's direct
   port (44360) are published on `127.0.0.1` only** — the LAN reaches the app solely through Caddy on
   80/443. The app **refuses to start in production if `DB_PASSWORD` is still the default `organiser`**.
3. Creates the data and backup directories (`data/resources/`, `backups/`).
4. Generates an **age** encryption keypair for backups and schedules a **nightly encrypted backup at
   02:30** via `/etc/cron.d/school-organiser-backup`.
5. Builds and starts **db + app + Caddy** (`docker compose --profile proxy up -d --build`). Migrations
   run on app boot.

---

## 6. First run (onboarding)

Open **`https://<SITE_ADDRESS>/`** in a browser. The first time, the onboarding wizard:

- Sets your **login password**.
- Walks you through first-time setup (your timetable, classes, etc.).

You'll get a one-time certificate warning on a LAN — see the next section.

### Load your weekly timetable shape (one-time, recommended)

A fresh instance has an **empty day shape** — only migrations run on deploy, not the seed, so no
period times exist yet. Rather than re-enter every lesson/break/briefing time by hand, load the
prepared **blank weekly skeleton** ([`app/scripts/blank-week.sql`](app/scripts/blank-week.sql)) — it
recreates the full Mon–Fri timing grid (lessons, breaks, briefings, form, lunch, before/after school)
with **no classes**, so all you do is enter the new class names. The timings stay the same every year;
only the classes change.

1. In the app: **Setup → Academic years →** add the new year (e.g. `2026/27`, with its dates) **→
   Make current**.
2. The file ships in the repo, so make sure the box is current (`cd /opt/school-organiser && git pull`),
   then load it into the database container:
   ```bash
   cd /opt/school-organiser/app
   docker compose exec -T db psql -U organiser -d organiser -v ON_ERROR_STOP=1 < scripts/blank-week.sql
   ```
3. Reload the app — the whole week is laid out with the right times and empty slots. Enter your class
   names in **Setup**.

It targets whichever year is **current** (hence step 1 first), is idempotent (safe to re-run), and
never creates or alters classes. It was generated from the `period_definitions` of a working instance.

---

## 7. The TLS certificate (LAN)

By default Caddy issues a **self-signed** certificate (`tls internal` in `app/Caddyfile`), because a
school LAN usually has no public DNS. Your browser warns once. Either accept it, or — better — install
Caddy's root CA on the teacher's devices so it's trusted everywhere:

```bash
cd /opt/school-organiser/app
docker compose --profile proxy cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt
# then import caddy-root.crt into the OS/browser trust store on each device
```

**Variations** (edit `app/Caddyfile`):
- **Real, internet-resolvable hostname** that can reach Let's Encrypt? Delete the `tls internal` line for
  a real, auto-renewing certificate.
- **Plain HTTP on a fully trusted LAN?** Use the `:80` block in the Caddyfile, set `COOKIE_SECURE=false`
  in `app/.env`, then `docker compose --profile proxy up -d` and browse to `http://<SITE_ADDRESS>/`.

---

## 8. Add the AI key (optional)

The planning / marking / review AI features need the teacher's own **Anthropic** key. Either:

- set `ANTHROPIC_API_KEY=…` in `app/.env` and restart, **or**
- paste it in the app under **Settings → AI**.

Spend is audited and £-capped per instance, and **no pupil name is ever sent to the AI** (names are
tokenised before egress; safeguarding-flagged content is withheld entirely).

---

## 9. Day-to-day operations

All commands run from the app directory (`/opt/school-organiser/app`):

```bash
docker compose --profile proxy ps           # status
docker compose --profile proxy logs -f app  # follow the app logs
docker compose --profile proxy restart      # restart the stack
docker compose --profile proxy down         # stop (data is kept in named volumes)
docker compose --profile proxy up -d        # start again
```

- **Office → PDF preview** (in-app document preview) is optional and pulls a large image. Enable it with
  `docker compose --profile preview up -d gotenberg`. Without it the app degrades to download-only.
- On the LXC, get a host shell first with `pct enter <CTID>`, then `cd /opt/school-organiser/app`.

---

## 10. Backups

The installer schedules `scripts/backup.sh` **nightly at 02:30** → `/opt/school-organiser/backups`,
**encrypted with age**. The dumps contain pupil data and secrets, so they are never written in plaintext
(project policy). Each run writes a database dump and a snapshot of `data/resources/`.

Run one on demand:

```bash
cd /opt/school-organiser
BACKUP_AGE_RECIPIENT=$(age-keygen -y /root/.config/school-organiser/backup.agekey) scripts/backup.sh
```

> ⚠ **Copy the decryption key off the server.** The installer generates it at
> `/root/.config/school-organiser/backup.agekey`. Store a copy somewhere the school controls and that is
> **not** this server (a password manager / IT safe). **Without it the backups cannot be restored.**

`scripts/verify-backup.sh` can be scheduled as a periodic restore-drill (it proves a backup actually
restores). See [docs/RUNBOOK.md](docs/RUNBOOK.md) → *Backups* for the cron details.

---

## 11. Restore / disaster recovery

Onto a rebuilt container/VM (after running the installer so the stack + `age` exist):

```bash
cd /opt/school-organiser
export BACKUP_AGE_IDENTITY=/path/to/your/copy/of/backup.agekey   # the key you saved off-box

# 1. Database:
docker compose --profile proxy up -d db
scripts/restore.sh backups/db-YYYYmmdd-HHMMSS.sql.gz.age

# 2. Resources (uploaded files), from the matching snapshot:
(age -d -i "$BACKUP_AGE_IDENTITY" < backups/resources-YYYYmmdd-HHMMSS.tar.gz.age) \
  | tar xz -C data/resources
```

`scripts/restore.sh` picks the decryption mechanism from the file suffix (`.age` → `BACKUP_AGE_IDENTITY`,
`.gpg` → `BACKUP_GPG_PASSPHRASE`, `.gz` → plaintext). Full notes: [docs/RUNBOOK.md](docs/RUNBOOK.md) →
*Restore*.

---

## 12. Upgrades

One command in the container — the light path (pull, rebuild, restart):

```bash
bash /opt/school-organiser/scripts/upgrade.sh
```

Or re-run the full installer, which also re-checks Docker and the backup cron:

```bash
cd /opt/school-organiser && git pull
bash deploy/install.sh          # rebuilds + restarts; data, secrets and backups are preserved
```

New database migrations run automatically on the app's next boot. For a major upgrade, take a Proxmox
snapshot first ([§13](#13-proxmox-snapshots)).

---

## 13. Proxmox snapshots

Take a **Proxmox snapshot** of the container/VM before a major upgrade — it's the fastest possible
rollback if anything surprises you, on top of the app-level encrypted backups.

---

## 14. Troubleshooting

| Symptom | Fix |
|---|---|
| **Docker didn't start in the LXC** | The known Docker-in-LXC issue. `pct stop <CTID>; pct destroy <CTID>` and re-run `proxmox-lxc.sh` with the default (privileged: leave `UNPRIVILEGED` unset/`0`). If it still fails, use the VM (Path B). |
| **Browser certificate warning** | Expected on a LAN with `tls internal`. Accept once, or install Caddy's root CA ([§7](#7-the-tls-certificate-lan)). |
| **Managed/locked-down PC won't let you past the cert warning** | School Chrome/Edge policy (`SSLErrorOverrideAllowed=false`) hides "Proceed" and disables the `thisisunsafe` bypass. Best: have IT trust Caddy's root CA ([§7](#7-the-tls-certificate-lan)). No IT? Switch to plain HTTP — set `COOKIE_SECURE=false` in `app/.env`, use the Caddyfile `:80` block, then browse `http://<ip>/`. (The direct `:44360` port is now bound to `127.0.0.1`, so it's reachable only on the host itself, not from another device.) LAN-cleartext trade-off; see [§7](#7-the-tls-certificate-lan). |
| **Compose v2 missing** | Install `docker-compose-plugin` (the installer needs `docker compose`, not the old `docker-compose`). |
| **App can't reach the database** | `docker compose --profile proxy logs db` — the app waits for the db healthcheck; check `DB_PASSWORD` in `app/.env` matches. |
| **Page loads on `:44360` but not `https://`** | The `caddy` service needs the `--profile proxy` flag; bring it up with `docker compose --profile proxy up -d`. |
| **`ERR_SSL_PROTOCOL_ERROR` / `tls internal error` on a bare-IP `SITE_ADDRESS`** | Clients can't send an IP in the TLS SNI field, so Caddy can't pick a cert and aborts the handshake. The Caddyfile sets `default_sni {$SITE_ADDRESS}` to fix this — make sure your deployed `app/Caddyfile` has that global block (older deploys won't), then `docker compose --profile proxy restart caddy`. Better long-term: give the box a hostname and set `SITE_ADDRESS` to it. |
| **AI features disabled** | Add `ANTHROPIC_API_KEY` to `app/.env` (then restart) or paste it in Settings → AI. |

---

## 15. Post-install checklist

- [ ] `https://<SITE_ADDRESS>/` loads and you've set your password.
- [ ] Caddy root CA installed on the teacher's devices (or the warning accepted).
- [ ] **Backup key copied off the server** (`/root/.config/school-organiser/backup.agekey`).
- [ ] A manual `scripts/backup.sh` run succeeds and `scripts/verify-backup.sh` restores it.
- [ ] (Optional) `ANTHROPIC_API_KEY` set, and an AI feature tested.
- [ ] A Proxmox snapshot taken of the known-good install.

---

## Multiple teachers on one box?

Each teacher runs as an **isolated instance** (own database, secrets, port, backups). See
`scripts/new-instance.sh` and [docs/RUNBOOK.md](docs/RUNBOOK.md). This guide covers the common
single-instance case.

---

*Deployment scripts: [`deploy/proxmox-lxc.sh`](deploy/proxmox-lxc.sh) (host → LXC),
[`deploy/install.sh`](deploy/install.sh) (inside the container/VM). Operational detail lives in
[docs/RUNBOOK.md](docs/RUNBOOK.md).*
