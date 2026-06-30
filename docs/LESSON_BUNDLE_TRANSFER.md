# Transferring master lessons between instances — agent runbook

**Audience:** an AI agent (or developer) asked to "copy the lessons" from one School_Organiser
instance into another, including over the internet.

**The conclusion, up front (this is the decision that was reached earlier):**
You do **not** copy the database to move lessons. The master/library lessons travel as
**instance-independent bundles** under [`app/seed-content/lessons/`](../app/seed-content/lessons/) —
plain `manifest.json` + markdown + media, carrying **no pupil data, no AI keys, no serial ids**. The
export/import tooling already exists and is the supported path:

| Direction | Tool | npm alias |
|-----------|------|-----------|
| **Export** one unit → bundle | [`app/scripts/export-lesson-unit.ts`](../app/scripts/export-lesson-unit.ts) | `npm run export-lesson-unit -- <unitId>` |
| **Import** all bundles → an instance | [`app/src/seed/seedLessons.ts`](../app/src/seed/seedLessons.ts) | `npm run seed:lessons` |

This runbook is the operational consolidation for an agent. The authoritative references it builds on:
[`app/seed-content/lessons/README.md`](../app/seed-content/lessons/README.md) (the bundle format +
git-as-transport, incl. git-LFS) and [docs/LESSON_CONVERSION_GUIDE.md §5a](LESSON_CONVERSION_GUIDE.md#L186-L199).
**Don't reinvent any of this** — drive the two scripts.

---

## Why not `pg_dump` / a DB copy?

The user's framing was "the database is the default build, too big for GitHub; I just want the
**lessons** importable into a new setup *and* into an existing setup that already has lessons + pupils."

- A full DB copy would carry **pupil names and safeguarding-flagged content** — which must never leave
  the school machine in the clear (see [docs/SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md)). Backups
  exist for disaster recovery (encrypted, `scripts/backup.sh`) and are a *different* job — do not
  conflate them with lesson transfer.
- A full DB copy **cannot** merge into a populated instance — serial PKs collide, and you'd clobber the
  target's pupils/timetable.
- Lesson bundles are curriculum-only and **mergeable** (additive, by design). That is exactly the two
  scenarios asked for. So: **bundles, every time.**

The "too big for GitHub" point is about the *whole DB*, not the lessons. The bundles are small markdown
+ a few binaries and **are** committed to git today (79 units already present). Git is the transport.

---

## What a "master lesson" is (the export boundary)

A bundle is **one unit**. The export walks this master-only table chain and nothing pupil-related:

```
courses → schemes_of_work → units → lesson_plans → resource_links → resources → resource_versions(file on disk)
```

Explicitly **excluded** (per-class / per-pupil — never in a bundle): `lesson_adaptations`,
`occurrence_courses`, `lesson_occurrences`, `enrolments`, `group_courses`, every `pupil_*` table.

**Identity is by title, not by id.** A unit is matched on import by `(target scheme, units.title)`; a
lesson by its title within the unit. There is no slug/UUID — the directory slug is just a filename.
Consequences an agent must respect:
- Two genuinely different units that share a title **will** be treated as the same unit. Keep unit
  titles distinct.
- The portability trick: embedded media URLs `/resources/<id>/view` are rewritten on export to
  `{{res:<file>}}` placeholders and re-resolved to fresh local ids on import
  ([export-lesson-unit.ts:85-88](../app/scripts/export-lesson-unit.ts#L85-L88),
  [seedLessons.ts:102](../app/src/seed/seedLessons.ts#L102)). This is what makes a bundle survive the
  move. Don't hand-edit those placeholders.

---

## Preconditions (an agent cannot guess these)

1. **Run from the `app/` directory.** Both scripts resolve `seed-content/lessons/` relative to the repo.
2. **Set both env vars** on every invocation (they have no safe defaults for this task):
   - `DATABASE_URL` — e.g. `postgres://organiser:organiser@localhost:5434/organiser` (dev). On a
     deployed box the password is in `app/.env` as `DB_PASSWORD`; read the real `DATABASE_URL` from
     there, do not hard-code.
   - `RESOURCE_STORE_PATH` — where resource files live (default `/data/resources`; dev bind-mount is
     `<repo>/data/resources`). Export **reads** files from here; import **writes** them here.
3. **The DB must be up and migrated.** Schema is built by migrations auto-run at boot; if you started
   the stack with `./start.sh` it's already migrated. A bundle import does **not** create schema.
4. **Import self-provisions the course + active scheme** if the target instance doesn't have them
   ([seedLessons.ts:36-47](../app/src/seed/seedLessons.ts#L36-L47)) — so a blank instance needs no
   manual curriculum setup first. The course is a thin container the teacher can rename later.

---

## Procedure A — export the lessons from the source instance

Each unit is exported individually by its **numeric `unit_id`** (find ids in the curriculum UI, or
`SELECT u.id, u.title FROM units u JOIN schemes_of_work s ON s.id=u.scheme_id ...`).

```bash
cd app
DATABASE_URL=… RESOURCE_STORE_PATH=… npm run export-lesson-unit -- <unitId>
# → writes app/seed-content/lessons/<slug>/  (manifest.json + l1-…md + media)
# repeat per unit; each export wipes & rewrites only that unit's own slug dir
```

Then commit the bundles (curriculum content, no pupil data → safe to commit and push):

```bash
git add app/seed-content/lessons/<slug>     # or the whole dir for a bulk export
git commit -m "Export lesson bundles for transfer"
```

To export **every** unit in one pass, loop over the unit ids (small shell loop calling the script per
id). There is no built-in "export all" flag — export is per-unit by design.

**Git is the transfer channel.** Push to a private remote; the target instance pulls it as part of its
normal deploy. No extra service, no exposed port, no DB connection between machines.

---

## Procedure B — import into the TARGET instance

> **Decision rule (read before running):**
> | Target instance | Command | Why |
> |---|---|---|
> | **Brand-new / fresh setup** | `npm run seed:lessons` (or `-- --new-only`) | Nothing to clobber; either works. `--new-only` is fine and future-proof. |
> | **Already populated (existing lessons + pupils)** | `npm run seed:lessons -- --new-only` | **Mandatory.** See the warning below. |
> | **Deliberately pushing an *updated* master** over an old copy | `npm run seed:lessons` (replace) | Only when you intend to overwrite that unit's content. |

```bash
cd app
# Fresh instance — materialise every committed bundle:
DATABASE_URL=… RESOURCE_STORE_PATH=… npm run seed:lessons -- --new-only

# Populated instance — additive only, never overwrite existing units:
DATABASE_URL=… RESOURCE_STORE_PATH=… npm run seed:lessons -- --new-only

# Just one unit (by its SLUG = the bundle directory name, not the id):
DATABASE_URL=… RESOURCE_STORE_PATH=… npm run seed:lessons -- <unit-slug>
```

### On a production server (Docker, no Node on the host)

The commands above assume Node/npm on the host — true in dev, **not** on a deployed box, where the app
runs the **built image** (`node dist/server.js`) and the host has no `npm`/`tsx`. There you seed by
running the **compiled** script **inside the `app` container** (env vars are already set in-container
via `.env` + the compose overrides, so you don't pass them):

```bash
# from the repo root on the server; container must be up (./start.sh prod brings it up + migrates)
docker compose -f app/docker-compose.yml exec app node dist/seed/seedLessons.js --new-only
```

> **The bundles must be IN the image.** The runtime image copies `seed-content/` in (see the
> `COPY seed-content ./seed-content` line in [app/Dockerfile](../app/Dockerfile)). So after pulling new
> bundles on the server you must **rebuild** before seeding, or the container won't have them and the
> seed prints `no seed-content/lessons/ — nothing to seed`:
> ```bash
> git pull --ff-only
> docker compose -f app/docker-compose.yml build app
> docker compose -f app/docker-compose.yml up -d app
> docker compose -f app/docker-compose.yml exec app node dist/seed/seedLessons.js --new-only
> ```
> One-off escape hatch without a rebuild — bind-mount the host bundles into a throwaway container:
> ```bash
> docker compose -f app/docker-compose.yml run --rm \
>   -v "$(pwd)/app/seed-content:/app/seed-content:ro" \
>   app node dist/seed/seedLessons.js --new-only
> ```

### ⚠️ The one footgun — plain `seed:lessons` is destructive on a populated DB

The **default** (no `--new-only`) **replaces** any unit whose title already exists on the target
scheme: it `DELETE`s that unit's resources and the unit row, cascading into its `lesson_plans` and
`resource_links` ([seedLessons.ts:50-59, 75](../app/src/seed/seedLessons.ts#L50-L75)). On a **live**
instance that also drops anything hanging off those plans — including a class's
**`lesson_adaptations`** for those lessons (they reference `lesson_plan_id`). That is real, silent
teacher-data loss.

➡️ **On any instance that has been taught from, use `--new-only`.** It checks each unit's existence and
**skips** it if present, so local edits/adaptations are never touched
([seedLessons.ts:72-74](../app/src/seed/seedLessons.ts#L72-L74)). Reserve plain `seed:lessons` for the
deliberate "overwrite my master with the newer version" case, ideally after a backup.

**Trade-off to state plainly:** because `--new-only` skips existing units wholesale, it will **not**
pick up *content changes* to a unit that already exists on the target — it only adds units that are
missing. There is currently no per-resource "update if changed" merge; updating an existing unit means
the destructive replace (or deleting that unit first). If the user needs safe in-place content updates
on a populated instance, that's a small enhancement to `seedLessons.ts` (checksum-compare and version
changed resources instead of unit-level delete-replace), not something to fake in this runbook.

---

## Verify the import

```bash
# Unit + lesson counts landed:
psql "$DATABASE_URL" -c "SELECT u.title, count(lp.id) AS lessons
  FROM units u LEFT JOIN lesson_plans lp ON lp.unit_id=u.id GROUP BY u.title ORDER BY u.title;"
```
Then spot-check one lesson's worksheet in the running app and confirm an **embedded image renders**
(this proves the `{{res:…}}` placeholders re-resolved and the files copied into `RESOURCE_STORE_PATH`).
Round-trip is lossless by design (export → wipe → re-seed yields byte-identical plans + resources).

---

## Unattended / over-the-internet provisioning (already supported)

For a new or remote instance to pull lessons automatically (the README documents this; reuse it, don't
build anew):

- **First deploy:** add `npm run seed:lessons -- --new-only` to the deploy/boot step, right **after**
  migrations. A fresh instance then materialises every committed bundle with zero manual steps.
- **Ongoing sync:** a cron on the instance — `git pull --ff-only && npm run seed:lessons -- --new-only`
  — the `--new-only` guard makes it safe to run on a schedule (adds new units, never clobbers).
- **Binaries at scale:** when hundreds of units make the embedded images/videos heavy in plain git,
  move just those binaries to **git-LFS** (one-off, no bundle-layout change) — exact `git lfs track`
  commands are in [`app/seed-content/lessons/README.md`](../app/seed-content/lessons/README.md#L59-L72).
  (LFS isn't installed on the dev box yet, so the rule isn't added.)

Curriculum-only content → safe to transmit over the internet. No pupil data ever leaves via this path.

---

## Quick reference

```bash
# EXPORT (source)            run from app/, env vars set
npm run export-lesson-unit -- <unitId>     # → seed-content/lessons/<slug>/ ; git add + commit + push

# IMPORT (target)            run from app/, env vars set, DB up & migrated
npm run seed:lessons -- --new-only         # fresh OR populated: ADD missing units, never clobber  ← default choice
npm run seed:lessons                       # REPLACE same-title units (overwrite master; destructive on live!)
npm run seed:lessons -- <unit-slug>        # one unit by slug
```

**Golden rules:** bundles not DB · `--new-only` on anything taught-from · titles are the identity ·
back up before a deliberate replace.
