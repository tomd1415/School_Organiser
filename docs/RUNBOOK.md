# Runbook

How to run, deploy and back up the School Organiser. Phase 0 is a running, authenticated,
backed-up empty app; later phases add features without changing this loop.

## Prerequisites

Gentoo dev box / Debian server with: Node 22+ (24 works), npm, Docker + Compose v2. Matches the
machine described in the repo-root `CLAUDE.md`.

## First-run (development)

```bash
cd app
cp .env.example .env

# 1. Session key (32 bytes) and a login password hash:
sed -i "s|replace_with_64_hex_chars|$(openssl rand -hex 32)|" .env
npm install
npm run hash-password -- 'choose-a-strong-password'      # prints a scrypt hash
#   → paste it into APP_PASSWORD_HASH in .env

# 2. Start Postgres (pgvector) on host port 5434:
docker compose up -d db

# 3. Create the schema, then run the app:
npm run migrate
npm run dev                                              # http://localhost:44360
```

Log in with the password you hashed. The Now screen should say "database connected".

### Handy dev commands

```bash
npm run typecheck     # tsc --noEmit
npm test              # vitest smoke tests (no DB needed)
npm run build         # compile to dist/
docker compose logs -f db
```

## Production (school Debian server)

```bash
cd app
# Provide secrets via the shell or an .env file next to docker-compose.yml:
export SESSION_KEY=$(openssl rand -hex 32)
export APP_PASSWORD_HASH='<output of npm run hash-password>'
export COOKIE_SECURE=true                  # served over HTTPS

docker compose up -d --build               # db + app, migrations run on app start
```

Put **Caddy** in front for TLS on the LAN (see `app/Caddyfile`); point it at `app:44360`.
The app restarts automatically (`restart: unless-stopped`) and re-runs migrations on boot.

## Backups (non-negotiable)

Notes and resource files are irreplaceable. `scripts/backup.sh` dumps the database **and**
snapshots the resource file-store volume, pruning to the most recent 14 of each.

**The dumps are encrypted at rest (10.1)** — they contain every pupil name, note, answer, mark
*and* the IMAP/AI secrets in the settings table, so the script **refuses to write plaintext** on a
server. Choose one mechanism via the environment (the cron job needs it in its env too):

```bash
# Preferred — age (encrypt-only public key; the server never holds the decrypt secret):
age-keygen -o /root/.organiser-backup.key          # do this ONCE, keep the key file OFF the server
#   → prints "Public key: age1…"; the secret is in the file.
export BACKUP_AGE_RECIPIENT=age1…                  # the public key, set on the backup server
# Restoring later needs the secret key file:
export BACKUP_AGE_IDENTITY=/secure/offline/.organiser-backup.key

# Or — gpg symmetric (simpler, but the box holds the passphrase):
export BACKUP_GPG_PASSPHRASE='a long passphrase the school stores in its password manager'
```

> **Key handling:** keep the age **secret key** (or the gpg passphrase) somewhere the school
> controls and that is **not** the same server — e.g. the school password manager / IT safe. A
> backup you can decrypt but an attacker can't is the whole point; a backup *you* can't decrypt is
> useless. Record who holds it.

```bash
scripts/backup.sh                          # writes to ./backups (override with BACKUP_DIR=)
# cron (weekdays 19:15) — put the encryption env in the crontab or a sourced env file:
15 19 * * 1-5 BACKUP_AGE_RECIPIENT=age1… /full/path/School_Organiser/scripts/backup.sh
# monthly restore-drill (proves the backups actually restore; stamps Settings → Data health):
30 19 1 * *  BACKUP_AGE_IDENTITY=/secure/.key /full/path/School_Organiser/scripts/verify-backup.sh
```

Point `BACKUP_DIR` at a location the school's existing off-site regime already sweeps. For **local
dev only**, `BACKUP_ALLOW_PLAINTEXT=1` lets the script write an unencrypted dump.

### Restore

The artifact suffix selects decryption automatically (`.age` → `BACKUP_AGE_IDENTITY`,
`.gpg` → `BACKUP_GPG_PASSPHRASE`, `.gz` → plaintext):

```bash
scripts/restore.sh backups/db-YYYYmmdd-HHMMSS.sql.gz.age
```

### Verify a restore actually works (don't trust an untested backup)

`scripts/verify-backup.sh` restores the **newest** dump into a throwaway scratch database, asserts
the core tables came back non-empty, drops the scratch DB, and writes a dated PASS/FAIL to
`backups/verify.log` plus a `backup_last_verified` row shown on **Settings → Data health**.

```bash
scripts/verify-backup.sh                   # safe — never touches the live `organiser` database
```

### Disaster recovery (bare server → running app)

1. Install Docker + Compose; clone the repo; create `app/.env` (`SESSION_KEY`, `APP_PASSWORD_HASH`
   or set a password via `/welcome`, `ANTHROPIC_API_KEY` if used).
2. `docker compose up -d --build` (migrations run on boot — this creates an empty schema).
3. Restore the DB over it: `scripts/restore.sh backups/db-LATEST.sql.gz.age` (this brings back the
   settings table — IMAP/AI secrets included — so the app is configured as it was).
4. Restore the resource files:
   `(age -d -i "$BACKUP_AGE_IDENTITY" < backups/resources-LATEST.tar.gz.age) | tar xz -C data/resources`
5. Restart the stack and confirm `/healthz` and a couple of lessons/notes load.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| App exits on boot | `.env` valid? `SESSION_KEY` 64 hex chars, `APP_PASSWORD_HASH` set. |
| Now screen "database not reachable" | `docker compose ps`; is `db` healthy? Did `npm run migrate` run? |
| Login always fails | Re-hash the password; ensure the whole `scrypt$...$...` line is in `.env`. |
| CSRF errors on a form | Cookies enabled; you're on the same host/port that issued the page. |

## Instances — one per teacher (Phase 6.8)

Each colleague gets a **fully isolated instance**: own database volume, own resource store, own
backups, own (optional) AI key. Nothing is shared and nothing is transmitted between instances.

```bash
./scripts/new-instance.sh mrs-jones 44370     # creates instances/mrs-jones/
cd instances/mrs-jones && docker compose up -d --build
# → http://server:44370/ opens the onboarding wizard (/welcome): the teacher sets their own
#   password, year, day shape, courses, groups and timetable. No SQL, no .env editing needed.
```

- **Backups:** `instances/<name>/backup.sh` dumps the DB + resources (14 kept). Cron it nightly per
  instance. Restores follow the same pattern as the main instance (see above), inside the
  instance's directory.
- **Updates:** `git pull`, then for each instance `docker compose up -d --build` — migrations run
  on boot. Update one instance first, check it, then the rest. (Single-instance LXC/VM: just
  `scripts/upgrade.sh` — see [DEPLOYMENT.md §12](../DEPLOYMENT.md).)
- **Removal:** `docker compose down -v` inside the instance directory deletes its database volume;
  hand the teacher a final backup first.
- The `instances/` directory is git-ignored; each instance's `.env` holds its own secrets.
