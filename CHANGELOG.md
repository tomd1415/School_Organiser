# Changelog

All notable changes to **School_Organiser**. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); dates are absolute (YYYY-MM-DD). The project
is pre-release, so this logs planning and build progress. Decision detail lives in
[docs/OPEN_QUESTIONS_ANSWERS.md](docs/OPEN_QUESTIONS_ANSWERS.md).

## [Unreleased]

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
