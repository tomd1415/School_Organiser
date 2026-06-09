# Phase 3 Build Plan — Schemes of Work, Lesson Plans & the Hosted Resource Store

Detailed, reviewable build plan for **Phase 3** of [ROADMAP.md](ROADMAP.md): *the planning content
the daily view links to*. Grounded in [SPECIFICATION.md](SPECIFICATION.md) (§5.3), [DATA_MODEL.md](DATA_MODEL.md)
(§C), [ARCHITECTURE.md](ARCHITECTURE.md) ("Resource storage"), and the answered
[OPEN_QUESTIONS_ANSWERS.md](OPEN_QUESTIONS_ANSWERS.md) Q14 (formats PPTX/DOCX/PDF + media, preview,
bulk-import). Phases 1 (MVP) and 2 (tasks/time/focus, bar the deferred pupils piece) are complete.

**Done when** (from the roadmap): the lesson detail's **"Plan"** and **"Resources"** are real and
one click away, split classes carry a plan per course, **TA lessons are fully prepared in-app**,
and the app is the single source of truth for resources (uploaded, versioned, backed up).

**Sequencing principle:** content before files before binding. Build schemes → units → lesson
plans first (cheap, pure-ish CRUD), then the hosted **resource store** (the infra-heavy part:
uploads, a file volume, versioning, an Office-preview sidecar), then **bind** plans + resources to
occurrences so the daily screens light up. **All AI is Phase 4** — Phase 3 builds the store and the
*manual* authoring; Phase 4 generates/edits resources and drafts lessons on top, no re-migration.

---

## 0. What Phase 3 changes vs Phase 1–2

**New services** (`src/services/`): `SchemeService` (scheme/unit/plan structure + versioning),
`ResourceService` (store, version, link, preview).
**New repos**: `schemes`, `lessonPlans`, `resources`.
**New routes**: `schemes` (SoW editor), `resources` (upload / view / download / versions),
`oversee` (the "lessons I oversee" view). The **lesson detail** and **Now** screens replace their
`Plan: Phase 3` / `Resources: Phase 3` placeholders with the real thing.

**New infrastructure** (a first for the project):

- **File uploads** — add `@fastify/multipart`; files land on the existing Docker named volume
  `resource-store:/data/resources` (already declared in `docker-compose.yml` since Phase 0), path
  in `settings`.
- **An Office-preview sidecar** — a headless-LibreOffice HTTP service (e.g. **Gotenberg**) added to
  Compose, used on demand to render DOCX/PPTX → PDF for in-browser preview. PDFs/images preview
  directly; everything is always downloadable.
- **Backups now include the file store** — `scripts/backup.sh` gains a volume snapshot alongside
  the `pg_dump` (ARCHITECTURE "Deployment"). **Non-negotiable: resources are irreplaceable.**

**Reused as-is:** the lesson-detail render (placeholders already wired), `occurrence_courses.lesson_plan_id`
(placeholder column from migration 0002), the HTMX autosave / OOB pattern, `start.sh`/`stop.sh`,
and the integration-test harness.

---

## 1. Build order (each row a reviewable commit/PR)

**Status (2026-06-09):** **3.1–3.4 and 3.6 are built + tested** ✅ (the first real import landed
**312 resources**); **3.5** Office preview is **wired** (Gotenberg sidecar) but **profiled** so it
never blocks the core stack — enable with `docker compose --profile preview up -d gotenberg` (the
~500 MB image is **not pulled by default**; until then preview degrades to download, so live
conversion is **unverified**). The store is a **bind-mounted** `data/resources` (not a Docker
volume) and **backups** are updated for it. **3.8** is **done** — the lesson screen shows a bound
plan's resources, and the plan editor has an attach/detach UI (the store now holds **2,433**
resources, searchable on `/resources`). **3.7** is **done** — the `/oversee` view lists supervised
lessons by day. **Phase 3 is complete**; the only open item is pulling the Gotenberg sidecar to
turn on live Office preview (3.5).

| # | Goal | Key files | Done when |
| --- | --- | --- | --- |
| **3.1** | **Schema** — schemes/units/plans + resources + links | `migrations/0006_phase3.sql` | `npm run migrate` clean; typecheck green |
| **3.2** | **Schemes → units → lesson plans** (+ versioning) | `repos/schemes.ts`, `services/scheme.ts`, `routes/schemes.ts` | author a course's SoW (units → plans with objectives/outline); version a scheme |
| **3.3** | **Occurrence ↔ plan binding** | `repos/lessonPlans.ts`, `routes/lesson.ts` | bind a plan to an occurrence-course (per course for splits); lesson "Plan" is real |
| **3.4** | **Hosted resource store** (upload / version / download / link) | `services/resource.ts`, `repos/resources.ts`, `routes/resources.ts` | upload a file → v1; re-upload → v2 + history; link to a plan/course; one-click download |
| **3.5** | **In-browser preview** (PDF/images direct; Office via sidecar) | `docker-compose.yml` (+sidecar), `services/resource.ts` | PDFs/images preview inline; DOCX/PPTX render to PDF for preview, download always available |
| **3.6** | **Bulk-import** (consolidate scattered copies) | `src/jobs/importResources.ts` | `data/imports/` ingested into the store, duplicates flagged by checksum |
| **3.7** | **"Lessons I oversee" view** (TA lessons, §5.8) | `routes/oversee.ts` | 7JMI/7ARO/7RAL etc.: set plan + resources + oversight notes in one place |
| **3.8** | **Backups extended + daily-screen wiring** | `scripts/backup.sh`, `routes/now.ts` | backup snapshots the file store (tested restore); Now/lesson "Resources" one click |

---

## 2. Migration `0006_phase3.sql` — schema

The P3 subset of [DATA_MODEL.md](DATA_MODEL.md) §C. Same conventions as before.

- `schemes_of_work` — `course_id` FK, `title`, `version INT`, `active BOOL`. `version` supports
  the planned "large changes": keep last year's SoW while drafting a new one.
- `units` — `scheme_id` FK, `title`, `display_order`.
- `lesson_plans` — `unit_id` FK NULL, `course_id` FK, `title`, `display_order`, `objectives TEXT`,
  `outline TEXT`, `duration_min INT`, `active BOOL`.
- `resources` — `title`, `kind CHECK (document, slides, worksheet, quiz, image, link, note)`,
  `mime_type`, `source CHECK (uploaded, imported, ai_generated)`, `ai_editable BOOL`,
  `current_version_id` FK NULL, `active BOOL`.
- `resource_versions` — `resource_id` FK, `version_no INT`, `storage_path TEXT`, `byte_size INT`,
  `checksum TEXT`, `author CHECK (teacher, ai)`, `change_note TEXT`, `created_at`.
- `resource_links` — `resource_id` FK + **exactly one** of `course_id` / `unit_id` /
  `lesson_plan_id` / `occurrence_id` / `group_id` (a `CHECK` enforces exactly-one + the app does
  too). `UNIQUE` per (resource, target).

**Deferred FK wired now:** `occurrence_courses.lesson_plan_id → lesson_plans` (the Phase-1
placeholder). **Settings:** `resource_store_path` (default `/data/resources`).

---

## 3. Schemes → units → lesson plans (`SchemeService`)

The content tree per course: **scheme of work → units → lesson plans**, each plan holding
**objectives / outline / duration** (SPEC §5.3). Editor at `/schemes` (pick a course → its scheme →
drag-order units and plans, inline-autosave like notes/tasks). **Versioning:** a scheme has a
`version`; "start a new version" clones units/plans into a fresh inactive scheme to redraft while
the live one keeps teaching — directly supporting the planned big KS3 changes and the unfinished
**"Computer Skills"** scheme (its structure is authored here; AI authoring is Phase 4).

**Pure/testable:** `display_order` re-sequencing; the clone-to-new-version transform.

---

## 4. The hosted resource store (`ResourceService`)

**The app hosts resources and is the single source of truth** (SPEC §5.3, ARCHITECTURE). Files on
the `resource-store` volume; metadata + history in the DB.

- **Upload** (`@fastify/multipart`) → compute `sha256` `checksum`, write to
  `/<resource_id>/<version_no>-<filename>`, insert `resources` (first upload) + a `resource_versions`
  row, advance `current_version_id`.
- **Versioned** — re-uploading over a resource writes a **new `resource_versions`** (`version_no =
  max+1`) and advances `current_version_id`; **history is viewable and revertible** (point
  `current_version_id` back). Every teacher *or AI* edit is a new version (author column).
- **Link** — attach a resource to a course / unit / plan / occurrence / group via `resource_links`
  (exactly one target). The lesson detail lists the plan's + course's resources, one click to
  open/download. The same deck links to many plans.
- **Download / view** — stream the current version with the right `mime_type`; `kind='link'` keeps
  the occasional external URL.

**Pure/testable:** the `resource_links` **exactly-one-target** invariant; `version_no` assignment;
checksum-based **duplicate detection**.

---

## 5. In-browser preview (the Office sidecar)

Q14: preview Office via a server-side render; media served directly.

- **PDF & images** → served inline (`Content-Disposition: inline`, correct `mime_type`).
- **DOCX / PPTX / XLSX** → converted to **PDF on demand** by a headless-LibreOffice sidecar (e.g.
  **Gotenberg**) added to `docker-compose.yml`; the rendered PDF is cached next to the version so we
  convert once. **Download of the original is always available** (pupils still receive these via MS
  Teams, so the editable original matters).
- **Media** (audio/video/images) → served directly.

The sidecar is the one heavyweight container; it is **only** used for preview, so the app degrades
to download-only if it's down.

---

## 6. Bulk-import (consolidate today's scattered copies)

`npm run import-resources` (`src/jobs/importResources.ts`): walk `data/imports/` (already
git-ignored for pupil-data safety), hash each file, create `resources` (`source='imported'`), and
**flag likely duplicates by `checksum`** so you consolidate to one canonical copy rather than
re-importing the same deck five times. Idempotent (re-running skips already-imported checksums).
Reports what it imported and what it flagged.

**Pure/testable:** the dedup/group-by-checksum logic.

---

## 7. "Lessons I oversee" prep view (§5.8)

A dedicated `/oversee` view for the **TA-taught lessons** (7JMI Curriculum + Skills, 7ARO Skills,
7RAL Skills — the non-self `staff_id` rows from Phase 1): set the **lesson plan + resources** the
other teacher should use, and keep **oversight notes** ("check how 7ARO got on with loops"). Reuses
the plan-binding (3.3), resource-linking (3.4) and notes (`kind='oversight'`, already in the
schema). Surfaced from the timetable's ⚑ markers.

---

## 8. Backups extended + daily-screen wiring

- **`scripts/backup.sh`** gains a **snapshot of the resource file-store volume** alongside the
  nightly `pg_dump`, into the same local path the school's off-site sweep covers; **the restore is
  re-tested** with files (ARCHITECTURE "Deployment" — non-negotiable).
- **Now + lesson detail** finish the loop: the current/next lesson shows its **Plan** (objectives +
  "where we got to" linked to the plan position) and its **Resources** one click away.

---

## 9. Test strategy

- **Pure unit:** the `resource_links` exactly-one-target invariant, `version_no` assignment, the
  bulk-import dedup, and the scheme-version clone transform.
- **Integration (dev DB + a temp file dir):** create scheme→unit→plan; bind a plan to an
  occurrence-course; **upload → v1, re-upload → v2, revert**; link + download round-trip; bulk-import
  dedups two identical files to one canonical + a flag. Self-cleaning (temp files + far-future IDs).
- **Authenticated screen renders:** extend `screens.int.test.ts` for `/schemes`, `/resources`,
  `/oversee`, and the lesson detail showing a real Plan + Resources.
- **Manual/CI-optional:** the LibreOffice-sidecar preview (needs the sidecar up) — gated like the
  rest of `test:integration`.

---

## 10. Confirmations needed (before/at the relevant increment)

None block starting 3.1/3.2.

1. **Office preview** — OK to add the **LibreOffice/Gotenberg sidecar** (one extra container, a few
   hundred MB image) for DOCX/PPTX preview? Or **download-only to start** and add preview later?
2. **Bulk-import source** — where are today's scattered copies (a network share to mount, or do you
   drop them into `data/imports/`)? Roughly how many files / GB (sizing the volume + backups)?
3. **Upload limits** — max file size and the allowed types (PPTX/DOCX/PDF/images/audio/video?).
4. **Scheme versioning** — confirm the "clone to a new version, keep the old live" model, and
   whether to seed the **Computer Skills** scheme's unit structure now (you author lessons; AI in P4).
5. **Backups** — confirm the local path the school's off-site backup already sweeps (for the volume
   snapshot), and the keep-N-daily / M-weekly policy.
6. **Teams** — keep "assign to Teams" as the per-class link + checklist (Phase 2), or anything
   deeper in scope here? (Deeper Teams is Phase 5.)

---

## 11. Out of scope for Phase 3 (deferred, by design)

- **Phase 4 (AI):** generating/revising resources (worksheets, decks) into new versions, authoring
  a scheme from scratch, "draft next lesson" from SoW position + notes, semantic search over
  resources. Phase 3 builds the *store and the manual authoring*; Phase 4 acts on it.
- **Phase 5:** deeper MS Teams integration, the academic-year rollover UI for content, global search.
- **Separate project:** the **pupil-facing resource/quiz site** (and the deferred **2.11 pupils /
  DPIA**) — the store is designed to stay compatible with `exam_questions` so it can feed that later.

---

## 12. Recommended first slice

Ship **3.1 + 3.2 + 3.3** together — the schema, the **scheme/unit/plan authoring**, and **binding a
plan to a lesson** so the lesson detail's "Plan" stops being a placeholder. That's immediately
useful (your planning content finally lives next to the timetable) and needs **no new
infrastructure**, so it's reviewable before the heavier resource-store + sidecar work (3.4–3.6).
