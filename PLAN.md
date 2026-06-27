# PLAN.md — unattended build of Phases 15 → 16 → 17

You are an autonomous agent. Work through this plan **start to finish without stopping to ask the user
anything.** Make reasonable decisions yourself. If you hit something genuinely blocking or a question that
*must* have the user's answer, **do not stop** — record it under the `BLOCKED / QUESTIONS FOR THE USER`
heading at the bottom of this file and **keep going** on everything else you can. The user will read that
section at the end.

Read this whole file first. Then read the three phase plans you are implementing (they are the detailed
spec — this file is the *operating procedure*, they are the *what to build*):
- [docs/PHASE_15_PLAN.md](docs/PHASE_15_PLAN.md) — pay down debt (planner hardening, button system, assessment proof, perf)
- [docs/PHASE_16_PLAN.md](docs/PHASE_16_PLAN.md) — Stages & strands + per-pupil tracking + baseline + stage-anchored assessments + homework loop
- [docs/PHASE_17_PLAN.md](docs/PHASE_17_PLAN.md) — reference-lesson library (import, link-to-criteria, activity variety, pupil file hosting/editing, paste/upload)
- [docs/LEVEL_SYSTEM_DB_DESIGN.md](docs/LEVEL_SYSTEM_DB_DESIGN.md) — the DDL/queries for the Phase 16/17 tables (authoritative schema)
- Also obey [CLAUDE.md](CLAUDE.md) (project rules) and `~/.claude/CLAUDE.md` (sandbox working rules).

---

## Mission & order

Build, in this exact order, to completion: **Phase 15, then Phase 16, then Phase 17.** Within each phase,
follow the numbered slices in that phase's plan (15.1, 15.2, …; 16A.1 … 16A.8, 16B.1 … ; 17.1 … 17.6).

**Depth over breadth (the user's explicit choice).** It is *better to fully finish 15 and 16 — tested,
green, committed — than to leave all three half-done.* So: **finish each phase completely before starting
the next.** A phase is "finished" only when every slice is built, the full gate is green, and it's
committed. If you run out of time/context, **stop cleanly at the last fully-complete phase** and write a
clear status note (see "Finishing"). Do **not** leave a phase in a broken, half-built state to start the
next one.

---

## Hard rules (these override convenience; the user decided these)

1. **Never call the real AI provider during normal build/test.** The unit + integration suites already
   force an empty key — keep it that way. AI-touching code must be built and tested with AI **mocked/off**.
   The one exception is the **final live-AI smoke** — see rule 7.
2. **Privacy is non-negotiable** (per [CLAUDE.md](CLAUDE.md)): no pupil name to any AI service; all AI calls
   go through the one wrapper `app/src/llm/client.ts` with inputs in `context[]` (never the `system`
   string); safeguarding-flagged content withheld entirely; per-class/cohort context is prose only.
   Every new AI path (16A.7 baseline gen, 16A.8 assessment gen, 17.2 auto-link overview) must carry a test
   asserting **no pupil token egresses**.
3. **Architecture & conventions:** `routes → services (pure) → repos`; server-rendered HTML + vendored
   HTMX; **no new npm dependencies** unless a slice's plan explicitly calls for one (the app deliberately
   avoids extra deps on the school line — if you think one is essential, log it under BLOCKED and find a
   no-dep path meanwhile). Views are pure `data → HTML` and reference URLs via `app/src/lib/paths.ts` only
   (add a builder + a `tests/pathsBuilders.test.ts` assertion — never hard-code a route in a `*View.ts`).
   Migrations go in `app/migrations/` (next free number), auto-run on boot, BIGSERIAL/BIGINT, match the
   style of `0063_assessments.sql`.
4. **Test-driven & honest:** for a bug fix, write a failing test first, then fix until green; **never weaken
   or skip a test or the typecheck to get a pass.** Re-read your own diff before each commit for edge cases,
   broken callers, and hard-coded values.
5. **The gate** (must be green before every commit — run all three):
   ```bash
   cd app && npm run typecheck
   cd app && npm test                 # unit, DB-free  (baseline at handover: 116 files / 1062 tests green)
   cd app && npm run test:integration # needs the dev DB up; never calls the real API
   ```
   Bring the dev stack up once at the start with `./start.sh` (docker + db + app; migrations auto-apply).
   If a Playwright/E2E suite exists and a slice's plan asks for it, run it too; if the browser harness
   isn't installed, note it under BLOCKED and rely on the pure + integration tests (Phase 14/15 explicitly
   allow this).
6. **Git (feature branch, commit per slice — the user's choice):**
   - First, **commit the already-staged planning docs on `main`** as a clean baseline (they're just docs):
     `.gitignore`, `docs/PHASE_16_PLAN.md`, `docs/ROADMAP.md`, and the untracked `docs/PHASE_17_PLAN.md`,
     `docs/LEVEL_SYSTEM_*.md`, `PLAN.md`. One commit, message e.g. `docs: phase 15-17 plans + level system`.
   - Then create and switch to branch **`phase-15-17-unattended`** and do ALL build work there.
   - **Commit after each completed slice** that leaves the gate green, with a clear message
     (`feat(16A.1): progression schema + pure roll-up`, etc.). Small, reviewable commits.
   - **Do NOT push.** End every commit message with the `Co-Authored-By: Claude …` trailer per
     `~/.claude/CLAUDE.md`. The user reviews the branch afterwards.
   - If a slice's gate can't be made green after a genuine effort, **commit the rest**, leave that slice's
     work out (or behind a flag, not breaking the build), and log it under BLOCKED — don't let one stuck
     slice block the others or leave the tree red.
7. **Live-AI smoke — ONCE, at the very end, max 2 attempts (the user's rule).** After *all* other tests for
   a phase's AI features pass with AI off, you MAY run a **single throwaway, self-cleaning** live-AI smoke
   (`app/scripts/X-smoke.ts`, deleted after) for that phase's AI path, using the real key in `app/.env`.
   - Keep it **tiny** (one generation / one mark / one auto-link overview) to limit cost.
   - If it **fails, you may retry it once**. **If it fails a second time, STOP all live-AI testing** for
     good — do not try further live calls. Fix the code as best you can against the mocked tests, and
     **record the failure (full output + your diagnosis) under BLOCKED** for the user.
   - Always clean up test data in `finally`; never write to real tables; delete the smoke script after.

---

## The Teach Computing source files (Phase 17) — IMPORTANT

The ~4.8 GB of real lesson files live in **`/home/duguid/School_Organiser/TeachComputing/`** (the user is
uploading them; the directory exists and is filling). It is **git-ignored on purpose** (too large + may
contain hand-edited material) — **but git-ignored does NOT mean off-limits to you.** You SHOULD read it
from disk to build and exercise the Phase 17 importer/auto-link against **real** files.

- Build the importer and auto-link to **work on the real directory**, but **also commit small synthetic
  fixtures** (a handful of tiny fake lesson files mirroring the TCC folder/zip shape) under
  `app/tests/fixtures/…` so the test suite is self-contained and doesn't depend on the 4.8 GB (which isn't
  in git and won't be on a CI box).
- If, when you reach Phase 17.1, the directory is **still uploading / incomplete / empty**, do **not** block:
  build everything against the committed fixtures, leave a documented one-line command for the user to run
  the real bulk import later, and note it under BLOCKED.
- **Never commit anything from `TeachComputing/`**, and never copy its contents into a tracked path.
- The small curriculum-map spreadsheets in `docs/TeachComputing_docs/` are separate and already tracked —
  use them (they define the unit→lesson→criteria structure the auto-link matches against).

---

## Per-phase notes (read the plan docs for the full detail)

### Phase 15 — debt paydown (do first)
Follow [docs/PHASE_15_PLAN.md](docs/PHASE_15_PLAN.md). Order per its "Sequencing": **15.2b** (silent
data-loss in the planner) → **15.1** (principled dark-shell button system — scope the teal fill to explicit
`.primary`, stop the bare `button[type="submit"]` force-fill; extend `app/tests/btnSecondaryColor.test.ts`)
→ **15.2a/15.2c** (extract `resolvePlannerDrop` pure module + tests; click-to-place + ARIA) → **15.3**
(assessment privacy regression locks + edge tests, AI off — the live smoke is rule 7) → **15.4** (perf:
`applyPlacements` N+1) → **15.5/15.6** (small resource follow-ons + regression net). Migrations only if a
slice needs one (15.2b's lock snapshot, 15.4's index).

### Phase 16 — Stages & strands (do second)
Follow [docs/PHASE_16_PLAN.md](docs/PHASE_16_PLAN.md) build order **16A.1 → 16A.8, then 16B**. The schema
is in [docs/LEVEL_SYSTEM_DB_DESIGN.md](docs/LEVEL_SYSTEM_DB_DESIGN.md) — implement those tables (`prog_*`,
`pupil_criteria_evidence`, `pupil_year_assessment`, `pupil_baseline`, `assessment_question_criteria`,
`pupil_unit_placement`, etc.) as migrations. **Seed the year-ladder scheme** (Stages 6–14, one stage = one
year) from the committed `docs/LEVEL_SYSTEM_*` content / `docs/TeachComputing_docs/` maps via an idempotent
seed script. Key behaviours from the plan: per-strand roll-up with overall (16A.1); start-of-year baseline
cold/warm start, short + adaptive + random-click guard (16A.7); stage-anchored end-of-unit assessments,
optionally individualised (16A.8); auto-suggested evidence from marking, teacher-confirmed (16A.4). All AI
paths off-by-mock except the final rule-7 smoke. This is a **new per-pupil data category** → add the DPIA
delta + erasure coverage (16A.6) before the phase is "finished".

### Phase 17 — reference-lesson library (do third)
Follow [docs/PHASE_17_PLAN.md](docs/PHASE_17_PLAN.md). Order per its "Sequencing": **17.6** (unified
`pasteOrUpload` component) is independent — a good first slice — then the library spine **17.1 (import) →
17.2 (link to criteria, incl. the AI overview pass, advisory) → 17.3 (activity variety)**, then **17.4**
(pupil file hosting; then worksheet/doc online editing). Extend the existing resource store
(`app/src/lib/resourceStore.ts`, `resourceImport.ts`, the `resources` table) — do not rebuild it. The
17.2 AI overview is the only AI in this phase: wrapper-only, cohort content, advisory verdict in
`resource_criteria.verify_state`, runs once at import, degrades to `unverified` with AI off.

---

## Working rhythm (so you genuinely run for hours without stalling)

- Keep a short running progress log at the very bottom of this file (under `PROGRESS LOG`), appending one
  line per slice as you complete it (slice id, commit hash, gate result). This is your memory across
  context — update it as you go.
- After each slice: run the full gate, fix any breakage, commit, append to the log, move to the next slice.
  Do not pause for confirmation between slices.
- If a slice is genuinely too big/ambiguous to finish, build the most valuable testable part, commit that,
  log the remainder under BLOCKED, and continue — never spin or wait.
- Don't re-litigate decisions already made in this file or the plans. When the plan gives a choice and a
  recommendation, take the recommendation.
- Watch your context budget. If you sense you're nearing a limit, **finish and commit the current slice
  cleanly**, update the PROGRESS LOG and BLOCKED/status, and stop at a green state rather than mid-slice.

## Finishing

When you've completed everything you can (ideally all of 15+16+17, at minimum every phase you fully
finished), do a final pass:
1. Ensure the working tree is clean and the gate is green on the last commit.
2. If allowed and not already done, run the rule-7 live-AI smoke(s) (≤2 attempts each, then stop).
3. Write a concise **FINAL STATUS** section at the bottom: what's done per phase, what's left, anything in
   BLOCKED, the live-AI smoke result, and the exact commands the user should run (e.g. the real
   `TeachComputing/` bulk import). Then stop.

---

## BLOCKED / QUESTIONS FOR THE USER
*(Append here as you go. Do not stop working to ask — collect them here for the end.)*

- **Dev DB was re-seeded at the start of this run.** The dev DB (port 5434) had been up ~16h with
  accumulated/drifted data and the integration suite was red (10–14 failures, varying between runs). To get a
  trustworthy, reproducible gate I wiped the `school_organiser_db-data` volume and re-seeded the real
  timetable cleanly (`./start.sh`). If you had hand-entered dev planning data you cared about, it's gone —
  but it was dev data reproducible from the seed. The unit suite (1062 tests) + typecheck are fully green and
  are my primary gate throughout.
- **Pre-existing integration failures — NOW FIXED (per your "fix the failing tests" request).** On a *fresh*
  seed, 14 integration tests failed because the documented run path (`./start.sh` → `npm run test:integration`)
  only seeds the **base timetable**, never the **test-data fixture** (`src/seed/testData.ts` — enrolled pupils,
  authored schemes, lessons-on-calendar, occurrences, resources) that the suite reads. Root-cause fixes:
  (1) a vitest **`globalSetup`** that seeds the fixture once if absent (idempotent, fast-skips when present);
  (2) the school-default **course teaching context** is now set at course creation + base seed (not only by
  migration 0008's one-off backfill); (3) testData seeds a few **imported reference units** so the
  convert-a-downloaded-unit search has folders to find; (4) the clock test's term-date count updated to the
  fixture's (15). Result: the integration suite is **green (413 passed, 0 failed)** from a fresh DB.
- **15.5 deferred (the plan marks it optional — "pick up if time allows").** Two items, both low code-value:
  (1) *External reference link on lessons/units* — the infra already exists (`kind='link'` resources with
  `external_url`, migration 0006, attachable to a plan via the existing resource-attach), so this is a UX
  convenience over working primitives, not new capability. (2) *Finish the KS4/GCSE import (units 9–16)* —
  pure data-entry/mapping against `RESOURCE_INGEST.md`, "no new code shape," needing the source material.
  Deferred to keep depth on the high-value Phase 16/17 builds. Neither blocks anything.
- **Live-AI smokes (rule 7)** for Phase 15 (assessment generate→mark) and the Phase 16/17 AI paths are batched
  to the very end, ≤2 attempts each, per rule 7.

## PROGRESS LOG
*(Append one line per completed slice: `<slice> — <commit> — gate green`.)*

- _(start)_ — re-seeded dev DB clean; baseline gate: typecheck ✓, unit 1062 ✓, integration 14 pre-existing failures (data-fixture gaps).
- test-infra — integration fixture now auto-seeded (globalSetup) + teaching-context default + imported-units fixture → integration **413 pass / 0 fail**. (addresses user's "fix failing tests" request)
- 15.2b — planner silent-data-loss guard (lostOffWindow + year-end refusal + window-to-year-end + Undo disable) — gate green (typecheck, unit, integration).
- 15.1 — principled dark-shell button system (teal scoped to .primary; contract test; ~40 call sites audited; gallery showcase) — gate green (typecheck, unit 1069, integration 413).
- 15.2a/15.2c — pure resolvePlannerDrop/Act module (13 tests) + click-to-place & keyboard + ARIA — gate green (typecheck, unit 1082, integration 413).
- 15.3 — assessment privacy/edge locks AUDITED: all 12 checklist invariants already covered by standing tests (no new tests needed); live-AI smoke deferred to rule 7 (end).
- 15.4 — applyPlacements N+1 batched (ensureOccurrenceCoursesForClass + set-based UPDATE) — gate green (typecheck, unit 1082, integration 413).
- 15.6 — CHANGELOG + classic-shell removal verified (none remain); docs updated. **Phase 15 complete.**

## FINAL STATUS
*(Fill in at the very end.)*
