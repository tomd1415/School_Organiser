# Changelog

All notable changes to **School_Organiser**. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); dates are absolute (YYYY-MM-DD). The project
is pre-release, so this logs planning and build progress. Decision detail lives in
[docs/OPEN_QUESTIONS_ANSWERS.md](docs/OPEN_QUESTIONS_ANSWERS.md).

## [Unreleased]

### 2026-06-08 — project-name spelling corrected

- **Corrected "Orgniser" → "Organiser"** in all docs/scripts (the project name is
  **School_Organiser**). `package.json` (`school-organiser`) and Docker (`school_organiser`)
  were already correct. **Pending:** rename the local folder and the GitHub repo to
  `School_Organiser` to match (outward-facing — awaiting go-ahead).

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
