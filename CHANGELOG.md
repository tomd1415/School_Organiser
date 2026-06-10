# Changelog

All notable changes to **School_Organiser**. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); dates are absolute (YYYY-MM-DD). The project
is pre-release, so this logs planning and build progress. Decision detail lives in
[docs/OPEN_QUESTIONS_ANSWERS.md](docs/OPEN_QUESTIONS_ANSWERS.md).

## [Unreleased]

### 2026-06-10 — Schemes: make the selected course unmistakable

- The active **course tab now highlights** on `/schemes` — it never did, because `c.id === courseId`
  compared a `BIGINT` (pg returns a string) to a coerced number. Normalised the comparison.
- Added an explicit **"Course:"** label (showing the selected course's name) under the tabs, and the
  author form now names the course it will create the scheme under — so it's clear where it lands.

### 2026-06-09 — 4.4: author a scheme of work with AI (verified live)

- **"✨ Author scheme with AI"** in the Schemes empty state → a brief becomes a full scheme (units
  + lesson titles), **materialised atomically** as a real, editable scheme you then prune and flesh
  out lesson-by-lesson with the 4.3 drafter. Opus (design model); **nested** structured output.
- **Verified live:** a 4-unit / 23-lesson KS3 scheme authored for **1.06p** and materialised correctly.
- New: `llm/schemas/authorScheme.ts`, `llm/prompts/authorScheme.ts`, `repos/schemes.materialiseScheme`
  (one transaction), `POST /schemes/author`, `renderSchemeEmpty`. Fixed a latent `pg`
  bigint-as-string comparison bug on course ids. +3 unit, +2 integration → **108 unit / 56 integration**.

### 2026-06-09 — 4.3: draft-next-lesson (first AI feature, verified live)

- **"✨ Draft with AI"** on each lesson plan in the schemes editor → drafts objectives, a lesson
  outline and a duration from the plan's place in the scheme (course · unit · sibling lessons) and
  lands them in the plan to edit. Structured output via `messages.parse` + `zodOutputFormat`
  (zod/v4); `callLLMStructured` reuses the entire 4.1 boundary (withhold → redact → audit → expand).
- **Verified live end-to-end:** a real draft cost **0.7p** (Sonnet) and the audit row stored only
  the redacted request. Degrades cleanly with no key (full-route integration test).
- New: `llm/schemas/draftLesson.ts`, `llm/prompts/draftLesson.ts`, `repos/schemes.getPlanContext`/
  `getPlanRow`, `POST /schemes/plan/:id/draft`. +3 unit, +1 integration → **105 unit / 54 integration**.

### 2026-06-09 — Phase 4 boundary (4.1 + 4.2): the one LLM wrapper + redaction + roster

- **`src/llm/client.ts`** — the single wrapper every AI call goes through: withhold safeguarding
  content → redact pupil names to tokens → **egress-assert** → call Anthropic → audit the
  **redacted** request → re-expand tokens for display. Degrades cleanly (no key / `ai_enabled=false`
  / over the monthly cap → "unavailable"/"blocked", never throws).
- **`services/redact.ts`** — the pure boundary (withhold / `redactNames` / `containsRosterName` /
  `expandTokens`), word-bounded + longest-name-first. **8 egress unit tests** prove no roster name
  or flagged item can leave.
- **Schema `0007`** — `ai_calls` audit (redacted-only by construction) + default AI settings
  (`ai_enabled`, model choices, `ai_month_cap_pence` = £50 ceiling, all runtime-adjustable).
- **Minimal names-only roster** — `/pupils` page + `repos/pupils.ts` (auto `PUPIL_<n>` tokens);
  plus `repos/settings.ts`, `repos/aiCalls.ts`, `config/llm.ts`.
- Dep `@anthropic-ai/sdk`; `ANTHROPIC_API_KEY` documented in `.env.example` (optional — absent ⇒ AI
  off). **Tests force the key empty: no real call, no spend, ever.** +8 unit, +3 integration.
- Next: **4.3 draft-next-lesson** (the first feature) adds structured output on top.

### 2026-06-09 — Phase 4 plan authored

- **Authored [docs/PHASE_4_PLAN.md](docs/PHASE_4_PLAN.md)** — the AI build plan: one `llm/` wrapper
  (the only code that talks to a provider) carrying **pupil-name → token redaction** and
  **safeguarding withholding**, an `ai_calls` audit (redacted-only), then features in order —
  draft-next-lesson, scheme author/redesign, term summary, the "manual now, AI later" hooks
  (task breakdown, estimate calibration, captured categorisation, current-interest), and
  (staged) AI resource editing. Provider **Anthropic Claude**, provider/model in `settings`.
  Flags the **pupil-roster decision** (§10.2) that sets how real redaction is on day one.

### 2026-06-09 — 3.7: "Lessons I oversee" view — Phase 3 complete

- New **`/oversee`** view: the TA-led lessons you supervise (`isSelf = false`), grouped by day
  with time, group, course and TA, each linking to the lesson detail. Week prev/next nav + today
  highlight; new nav entry. Pure `buildOverseenWeek` service (+3 unit tests, +1 integration).
- **Phase 3 is complete** (3.1–3.8): schemes → lesson plans, the hosted **resource store** (2,433
  resources), bulk-import + reconcile tooling, the **search browser**, Office preview (wired,
  sidecar profiled — pull to enable), **lesson-resource wiring**, and this oversee view.

### 2026-06-09 — 3.8: resources on the lesson screen + attach-to-plan UI

- The **lesson screen** now shows a bound plan's linked resources (read-only — view/download),
  replacing the old "Phase 3.4" placeholder.
- The **plan editor** (schemes) gains an **attach/detach** UI per lesson plan: live resource
  search → ＋ to link, ✕ to unlink. Lazy-loaded when a plan is expanded (no upfront cost for big
  schemes). Routes under `/schemes/plan/:id/resources`.
- Repo: `linkResourceToPlan` (idempotent) / `unlinkResourceFromPlan`. +3 integration tests
  (repo idempotency, lesson render, authed HTTP attach/detach with CSRF). Phase 3 now needs only
  3.7 (the "lessons I oversee" view).

### 2026-06-09 — Resource browser: search + filter + pagination

- `/resources` now has a **live search box** (debounced), a **kind filter**, and **pagination**
  (50/page) with a running result count — previously it showed only the 200 most-recent of 2,433,
  leaving most of the store unreachable. New repo helpers `searchResources` / `countResources` /
  `listKinds`; HTMX partial endpoint `GET /resources/list`. +2 integration tests.

### 2026-06-09 — Resource ingestion: reconcile tool + first full curriculum import

- **`npm run reconcile`** (`app/src/jobs/reconcileOldPlans.ts`) — classifies the teacher's old
  `old_lesson_plan/` folder against the fresh Teach Computing downloads. The new download is a
  **different curriculum version** (renamed units, en-dash file-renames), so match-based buckets
  are unreliable; the robust signal is a **download-independent naming split** — **280 files are
  the teacher's own work**, the rest TC curriculum. Writes manifests to `data/reconcile-report/`.
- **`import-resources --filter <manifest>`** — import only the files listed in a manifest (e.g.
  `own.tsv`); also now skips `.part`/`.crdownload` partial downloads and Mac `__MACOSX`/`._` junk.
- **First full import:** own work (265 files, big backup zips excluded) + KS3 + all 16 GCSE units
  + KS4 non-GCSE → **2,433 resources, 3.6 GB** in the store (dedup skipped 534 byte-identical).
- Docs: [docs/RESOURCE_INGEST.md](docs/RESOURCE_INGEST.md) — KS4 download checklist + workflow.
- `.gitignore`: `data/reconcile-report/` (regenerable, pupil-data-adjacent).

### 2026-06-09 — Phase 3 build: schemes, plans, resource store, bulk-import (3.1–3.6) + Office preview (3.5)

- **Schema `0006`** + **schemes of work → units → lesson plans** editor with versioning, and **plan
  binding** on the lesson detail — the "Plan" placeholder is now real (3.1–3.3).
- **Hosted resource store** (3.4): upload, sha256 checksum, versioning + revert, download, inline
  PDF/image preview. Files live on a **bind-mounted** `data/resources` shared by the app, the
  importer and backups (replaces the Docker named volume).
- **Office preview** (3.5): a **Gotenberg** sidecar renders DOCX/PPTX/XLSX → PDF on demand;
  PDFs/images preview directly; the original is always downloadable. The sidecar is **profiled**
  (`docker compose --profile preview up -d gotenberg`) so it never blocks the core stack and is not
  pulled by default — preview degrades to download when it is absent (live conversion unverified).
- **Bulk-import** (3.6): `npm run import-resources` walks a folder, extracts zip lesson packages,
  and dedups by checksum. First real run imported **312 files** from the Teach Computing download.
- **Backups** updated for the bind mount (`scripts/backup.sh`/`restore.sh` tar the host store dir).
- New deps: `@fastify/multipart`, `adm-zip`. Remaining in Phase 3: 3.7 (oversee view) + 3.8 wiring.

### 2026-06-09 — Phase 3 plan authored; docs audited

- **Authored [docs/PHASE_3_PLAN.md](docs/PHASE_3_PLAN.md)** — the Phase 3 build plan (schemes of
  work → lesson plans → the **hosted, versioned resource store** + Office/PDF preview + bulk-import
  + the "lessons I oversee" view + file-store backups), 8 increments (3.1–3.8). For sign-off.
- **Docs brought up to date:** added `recurring_tasks` + `tasks.recurring_task_id` to DATA_MODEL,
  noted the recurring-task generator in ARCHITECTURE, and **marked 2.11 (pupils / DPIA) deferred**
  in the ROADMAP — picked up with the pupil-facing resources project.

### 2026-06-09 — captured info & recurrence / current-interest (2.10, 2.12)

- **2.10 Captured info** — `/captured`: a one-line capture box, a category (Pupil · Logistics ·
  Admin · Curriculum · CPD · Safeguarding · Other), an optional class link and a "resurface on"
  date; relevant items appear on **Now** ("Heads up") by date or today's classes; ⚑ safeguarding is
  highlighted (and earmarked never-to-AI for Phase 4); one tap turns a captured note into a task.
  Reuses the `notes` table (`kind='captured'`) — **no migration**. (`services/captured.ts`,
  `repos/captured.ts`, `lib/capturedView.ts`, `routes/captured.ts`)
- **2.12 Recurrence + current-interest** — migration `0005` adds `recurring_tasks`; `/recurring`
  defines them (weekly / fortnightly / monthly / **per-lesson**), and an idempotent generator
  materialises due instances into the inbox ahead of their due date — run on app boot + a daily
  in-app timer **and** as `npm run generate-recurring` (cron-friendly; no broker). Pure
  `nextDueDate` is the tested core. **Current-interest** ⭐ toggles on tasks (+ a ⭐ Interest filter)
  and captured items. (`services/recurrence.ts`, `repos/recurringTasks.ts`, `routes/recurring.ts`,
  `src/jobs/generateRecurring.ts`)
- **Deferred by the teacher:** 2.11 pupils / **DPIA** — individual pupil names come later, with the
  pupil-facing resources project.
- **Tests:** pure units for `resurfacing` and `nextDueDate`; integration for captured CRUD +
  promote, recurring generation (idempotent) + pause, and the ⭐ interest toggle; + authenticated
  renders of `/captured` and `/recurring`. **83 unit + 38 integration pass.** Built unattended,
  left **uncommitted** for review.

### 2026-06-09 — Phase 2 planning core: email, events, time, timers, prep & focus (2.4–2.9)

- **2.4 Email paste-box** — paste an email on /tasks → a draft task (Subject / first line → title),
  kept in `email_intake`. (`services/emailIntake.ts`)
- **2.5 Events & deadlines** — `/events` "what's coming" (parents' evenings, deadlines, exams,
  parent-contact); lead-time `dueSoon` surfaces them on Now. (`repos/events.ts`, `services/event.ts`,
  `lib/eventView.ts`, `routes/events.ts`)
- **2.6 Availability + work blocks** — pure `computeWindows` (free periods + before/after school,
  minus break/lunch/coffee/teaching, minus after-school commitments + a **10-min buffer** + blocking
  events); `/time` shows the windows + a planned-vs-actual work log with the one-tap **diverted**
  path. (`services/availability.ts`, `lib/commitments.ts`, `repos/workBlocks.ts`, `routes/time.ts`)
- **2.7 Timers** — one timer at a time (partial unique index), interruptible, accumulating onto
  `tasks.actual_seconds`; ▶ on tasks, a running banner on Now/Tasks. (`repos/timeEntries.ts`,
  `routes/timer.ts`)
- **2.8 Prep checklists** — per-lesson "before the bell" (`prep_templates` → `occurrence_prep`,
  materialised when a lesson is opened); a **start/end-of-day** checklist on Now. (migration `0004`,
  `repos/prep.ts`, `services/prep.ts`)
- **2.9 Focus mode** — pure `pickNext` ranks open tasks (urgency · due-before-bell · fits the
  window · load vs. energy) to **one next action** with sub-steps; morning / free-period / end-of-day
  modes + a "✅ go home" wind-down. (`services/focus.ts`, `routes/focus.ts`)
- Nav: Now · **Focus** · Timetable · Tasks · **Events** · **Time** · Notes.
- **Tests:** pure units for `parseEmail`, `dueSoon`, `computeWindows`, `pickNext`; integration for
  events, work blocks / day-slots, timers (one-running + accumulate), focus sub-steps and prep
  materialisation; + authenticated renders of every new screen. **73 unit + 31 integration pass.**
- **Deferred (need you):** 2.10 captured-info, 2.11 pupils / **DPIA**, 2.12 recurrence + current
  interest (task sub-steps already landed in 2.9). Built unattended; left **uncommitted** for review.

### 2026-06-09 — Phase 2 started: schema, tasks & "before the next bell" (2.1–2.3)

- **Migration `0003_phase2.sql`** — the full P2 schema: `tasks`, `events`, `work_blocks`,
  `time_entries` (+ one-running-timer index), `email_intake`, `prep_templates`/`occurrence_prep`,
  `pupils`, `enrolments`, `note_pupil_mentions`, `tags`, `schedule_exceptions`, and the deferred
  Phase-1 FKs (notes → pupils/tasks/events, follow-ups → tasks). `schema_phase=2`.
- **2.2 Tasks** — `/tasks` with **Inbox / Open / Done**; ＋ New task; inline HTMX-autosaved triage
  (title, urgency, estimate, cognitive-load, group, context); triage / done / drop. Nav gains Tasks.
  (`repos/tasks.ts`, `services/task.ts`, `lib/taskView.ts`, `routes/tasks.ts`)
- **2.3 due_rule + Now** — pure `resolveDueRule` ("by next lesson with group X" → the group's next
  lesson via the ClockService) + `beforeNextBell`; the Now screen gains a **"Before the next bell"**
  list (urgent + by-next-lesson + due-before-the-bell) with one-tap done. (`routes/now.ts`)
- **Tests:** +9 unit (`statusesFor`, `resolveDueRule`, `beforeNextBell`, taskView) + 5 integration
  (task CRUD/buckets, group-slots, bell candidates, `/tasks` render). **56 unit + 17 integration pass.**

### 2026-06-09 — Phase 2 plan authored

- **Authored [docs/PHASE_2_PLAN.md](docs/PHASE_2_PLAN.md)** — the detailed build plan for Phase 2
  (tasks → time → focus): 12 increments (2.1–2.12), the P2 schema, the **AvailabilityService** and
  **FocusService** as the two pure "hearts", the safeguarding/**DPIA** gate, and a "manual now, AI
  in Phase 4" split. For sign-off.

### 2026-06-09 — earlier start: 07:30 coffee + before-school slots

- The seeded day now starts at **07:30** — a 10-minute **Coffee** slot, then a **before-school**
  work/prep block to 08:30 (briefing / form / lessons unchanged). 13 period slots per weekday;
  `default_arrival` → 07:30. The Now clock strip shows "NOW Coffee" first thing. (`seed/data.ts`)

### 2026-06-08 — fast notes, the live Now screen & general notes (1.6–1.8) · Phase 1 MVP complete

- **1.6 Notes capture** — HTMX vendored (`public/htmx.min.js`). Inline, autosaving notes on the
  lesson and Now screens: ＋ New note, body autosaves (debounced; no focus loss, via out-of-band
  swaps), add/tick **follow-ups**, and an editable **per-course stopping point** that feeds "last
  time". `n` opens a new note from anywhere. (`repos/notes.ts`, `lib/notesView.ts`,
  `routes/notes.ts`, `public/app.js`)
- **1.7 Now screen** — `/` is wired to the ClockService: the current lesson (group, course, room,
  "last time → stopped at") with an embedded quick-note composer, the next teaching slot, and a
  clock strip that self-advances every 30s — kept separate from the composer so a half-typed note
  is never wiped. (`repos/clock.ts`, `routes/now.ts`)
- **1.8 General notes** — `GET /notes` lists general notes with a composer; top-bar nav
  (Now · Timetable · Notes).
- **Tests:** notesView render (incl. HTML-escaping); the integration suite now covers notes CRUD,
  the clock repo, and an **authenticated end-to-end render** of every screen (login → Timetable,
  Now strip, Notes, Lesson detail). **46 unit + 12 integration pass**; typecheck clean.

### 2026-06-08 — lesson detail & lazy occurrences (1.5)

- **1.5 Lesson detail** — opening a timetable cell find-or-creates the dated `lesson_occurrence`
  (idempotent on lesson+date) and materialises one `occurrence_course` per course, so split
  classes show a section each with its stopping point, plan placeholder and **“last time →
  stopped at”** (the previous occurrence). Read-only notes list (capture lands in 1.6).
  (`repos/occurrence.ts`, pure `services/occurrence.ts`, `routes/lesson.ts`)
- **Integration tests** — a separate `npm run test:integration` (`vitest.integration.config.ts`)
  exercises find-or-create against the dev DB (idempotency + course materialisation), kept out of
  the DB-free unit suite. Plus a `buildLessonDetail` unit test. **41 unit + 3 integration pass.**

### 2026-06-08 — start/stop scripts, login-hash fix, and the timetable grid (1.4)

- **`./start.sh` / `./stop.sh`** (repo root) — one command each. `start.sh` stops anything
  running, brings up Postgres + the app (Docker Compose; `dev` hot-reloads from source, `prod`
  runs the built image), waits for health, and seeds the timetable if the DB is empty. Identical
  on the Gentoo dev box and a Debian / Proxmox deploy. (`app/docker-compose.dev.yml`)
- **Fixed a deployment footgun:** the scrypt password hash used `$`, which Docker Compose
  interpolates — corrupting the hash in the container and breaking login. Hash format is now
  `scrypt:<salt>:<key>` (no `$`); `verifyPassword` still accepts legacy `$` hashes; secrets pass
  via `env_file` (literal). (`src/lib/passwords.ts`, `app/docker-compose.yml`)
- **1.4 Timetable grid** — `/timetable` renders the real week from the DB: colour-by-course,
  split classes, free periods, clubs and ⚑ overseen lessons; prev/next week; cells link to a
  lesson-detail placeholder (`/lesson`, fleshed out in 1.5). Top-bar nav (Now · Timetable).
  (`repos/timetable.ts`, `services/timetable.ts`, `routes/timetable.ts`, `routes/lesson.ts`)
- **Tests:** TimetableService grid assembly, seed-data invariants (catch a mistyped
  group/course or miscounted split before the DB), and the password round-trip — **36 pass**.

### 2026-06-08 — Phase 1 started: schema, real-timetable seed & ClockService (1.1–1.3)

- **Migration `0002_phase1.sql`** — the P1 schema: academic years, term dates, period definitions,
  staff / rooms / courses / groups / group_courses, timetabled lessons (+ split slots), the dated
  record (`lesson_occurrences` / `occurrence_courses`) and `notes` / `note_followups`. Adds `form`
  to the lesson `purpose` set.
- **`npm run seed`** (`src/seed/`) — idempotent seed of the real week from `TEACHING_PATTERN.md`:
  47 timetabled lessons (Post-16 ×3 and Y10 ×2 splits, 3 frees, daily form/club/open-room, the two
  known overseen lessons), **2025/26 set current** with **2026/27 seeded ahead** for rollover.
  Self-checks its integrity counts.
- **ClockService** (`src/services/clock.ts`, pure) + **`src/lib/time.ts`** + **14 tests** —
  resolves the current period, minutes remaining and the next teaching slot across every edge
  (break/lunch/free, before/after school, Fri→Mon, weekend, half-term, INSET, in-term bank holiday,
  crossing Christmas).
- **Go-live resolved: live now on 2025/26** (working ASAP); 2026/27 ready for the September
  rollover. Typecheck green; **18/18 tests pass**.

### 2026-06-08 — repo renamed; Phase 1 planned

- **Renamed** the local folder and GitHub repo to **`School_Organiser`** — the rename that was
  pending is done; spelling and naming now match across docs, `package.json` and Docker.
- **Authored [docs/PHASE_1_PLAN.md](docs/PHASE_1_PLAN.md)** — the detailed build plan for the
  Timetable + Now + Notes MVP (schema → real seed → ClockService → screens), for sign-off.
- **Captured Phase 1 seed inputs:** the **2026/27 term dates** and the first overseen-lesson
  slots (7ARO Skills Wed L3, 7JMI Curriculum Fri L3) in
  [docs/TEACHING_PATTERN.md](docs/TEACHING_PATTERN.md); the remaining overseen slots follow.

### 2026-06-08 — project-name spelling corrected

- **Corrected "Orgniser" → "Organiser"** in all docs/scripts (the project name is
  **School_Organiser**). `package.json` (`school-organiser`) and Docker (`school_organiser`)
  were already correct. The local folder and GitHub repo have **since been renamed to
  `School_Organiser`** (see the entry above), so naming is consistent everywhere.

### 2026-06-08 — Q3/Q14 answered, gitignore fix

- **Q3 → paste box (a)** to start; **Q14** resolved (formats PPTX/DOCX/PDF + media; AI editing
  "as far as possible" with editable/good-looking output; sizeable bulk-import).
  (`docs/OPEN_QUESTIONS_ANSWERS.md`)
- **Fixed `.gitignore`** — removed the over-broad Python `lib/` / `bin/` patterns that were
  excluding `app/src/lib/`; `html.ts` & `passwords.ts` were **missing from the repo** and must be
  added in the next commit.
- **Parked future direction** noted: a pupil-facing resource/quiz site (login + marking),
  overlapping `exam_questions`; the resource store stays compatible. (`SPECIFICATION §7`)

### 2026-06-08 — answers batch 2 + provider switch

- **Recorded answers batch 2** (Q3–Q28 + extra) in `docs/OPEN_QUESTIONS_ANSWERS.md`; trimmed
  `docs/OPEN_QUESTIONS.md` to a decided-summary + still-open (Q3 explained, Q14 detail).
- **AI provider → Anthropic (Claude)** (was OpenAI). Provider-swappable wrapper; default models
  per environment. (`ARCHITECTURE`, `DATA_MODEL`, `SECURITY_AND_PRIVACY`)
- **Captured real timetable** in `docs/TEACHING_PATTERN.md`: full Mon–Fri grid, all lessons in
  room **U1**, three free periods (Tue L4, Thu L1, Thu L4), Computing Club every break + lunch
  (13:00–13:30), Wednesday taxi-number duty.
- **Post-16 courses named** (BCS Thinking Like a Coder, AIMS Robotics, Computers for VI) and
  **Year 10 Sound Engineering** noted as in development.
- **New feature — "Current interest"**: mark items as current interest; the system learns and
  biases what it surfaces. (`SPEC §5.18`)
- **Safeguarding handling**: notes/captured items flagged safeguarding are highlighted and
  **withheld from all AI calls** (never sent). (`SECURITY`, `SPEC §5.17`, `DATA_MODEL`)
- **Scope added**: exam dates (events), a start/end-of-day checklist, and a light
  parental-contact log. (`SPEC`, `ROADMAP`)
- **Cognitive-load / categorisation are learned**: AI tags first, you override, the system
  learns from corrections. (`SPEC`)
- Added `CHANGELOG.md` and `docs/OPEN_QUESTIONS_ANSWERS.md`.

### 2026-06-08 — features added to the plan

- **Timers + actual-duration AI calibration** and the **"things I've been told" captured-info
  inbox**. (`SPEC §5.16–5.17`, `DATA_MODEL` `time_entries`, captured-info columns on `notes`)

### 2026-06-08 — Phase 0 scaffolded & verified

- Stood up `app/`: Fastify 5 + PostgreSQL (pgvector **pg16**) + single-user auth (scrypt +
  encrypted-cookie session + CSRF), SQL migration runner, `/health`, login flow, and
  backup/restore scripts.
- Verified end-to-end (typecheck, 4 smoke tests, live DB migrate + login + backup);
  **0 production-dependency vulnerabilities** (bumped `@fastify/static` to 9.1.3).

### 2026-06-08 — plan reshaped around teacher input

- Resources **hosted** (single source of truth, versioned, AI-editable, importable); break &
  lunch are **not** work windows; **focus mode** + end-of-day wind-down; **events & deadlines**;
  **prep checklists**; **academic-year rollover**; cognitive-load tagging.

### 2026-06-07/08 — initial documents

- Authored the specification & design set: `README`, `SPECIFICATION`, `DATA_MODEL`,
  `ARCHITECTURE`, `UX_FLOWS`, `SECURITY_AND_PRIVACY`, `ROADMAP`, `OPEN_QUESTIONS`,
  `TEACHING_PATTERN`. Locked stack (TypeScript/Fastify), single-week timetable.
