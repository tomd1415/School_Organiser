# Roadmap

Phased delivery. Each phase is independently useful and shippable to the school server, so the
tool earns its keep early and we learn before building more. Priorities reference the user
stories in [SPECIFICATION.md](SPECIFICATION.md).

> **Status (2026-06-11):** Phases **0–3 ✅ complete** (pupils 2.11 deferred to the pupil-facing
> project), **Phase 4 ✅** except parts of 4.6 and the optional 4.8, and **Phase 5 — curriculum
> delivery** (inserted 2026-06-10; it displaced the old "polish" phase, renumbered to Phase 6)
> **built through 5.8** plus parts of 5.9 — live status in [PHASE_5_PLAN.md](PHASE_5_PLAN.md).

## Sequencing principle

Build the **glanceable core that captures the record first** (timetable → Now → notes),
because that is the highest-value, most-used part and everything else (tasks, time, AI) builds
on the record it produces. AI comes *after* there is real data for it to use.

## Phase 0 — Skeleton (foundation)

**Goal:** a running, authenticated, backed-up empty app on the Debian server.

- Confirm stack (OPEN_QUESTIONS Q1) and scaffold `app/` per ARCHITECTURE.
- Docker Compose: Fastify + Postgres(+pgvector). Caddy in front. `.env` + session secret.
- Single-user auth, CSRF, base layout, Now route returning "nothing scheduled".
- `scripts/backup.sh` + tested restore + RUNBOOK stub.

**Done when:** you can log in over the LAN from desktop and laptop, and a nightly backup runs.

## Phase 1 — Timetable, Now & notes (the MVP)

**Goal:** the everyday core. This is the Minimum Viable Product.

- `period_definitions` seeded with the real day shapes (briefing Mon/Wed/Thu, after-school
  per day, fortnightly Wed). `term_dates`. ClockService + tests (single repeating week).
- `academic_years`; courses, groups, group_courses, staff, rooms; `timetabled_lessons` +
  multi-course slots; free periods, **clubs / open-room (break & lunch occupied)** and TA
  lessons all visible.
- Week/day timetable grid (UX_FLOWS §2) and **Lesson detail** (§3).
- `lesson_occurrences` (lazy) and **the notes system** (§5.4): fast capture, stopping point,
  follow-ups, autosave, "where we got to last time".
- **Now screen** (§1) wired to the clock: current/next lesson, resources placeholder, quick note.

**Done when:** on any school day you open the app and see/teach-from the right lesson and can
capture a note in seconds. *Most of the daily value lands here.*

## Phase 2 — Tasks, email intake & time

**Goal:** plan the day's work and capture what actually happened.

- Tasks: capture, inbox/triage, urgency, `due_rule` ("by next lesson with X") resolved by the
  clock; urgent/by-next-lesson on the Now screen.
- Email intake v1: **paste-an-email** box → draft task (ARCHITECTURE email option 2).
- Work blocks in real **work windows** (free periods + before/after school; **not** break/lunch);
  **planned vs. actual / "diverted"** path; AvailabilityService.
- Tasks gain **cognitive-load**, **context**, **sub-tasks** and **recurrence** (incl. per-lesson
  "assign to MS Teams").
- **Focus mode** — the single next action, broken into steps; **end-of-day wind-down**.
- **Events & deadlines** — parents' evenings, EHCP reviews, report deadlines with lead-time
  reminders and prep tasks.
- **Prep checklists** ("before the bell"), incl. recurring templates, on the Now screen.
- **Timers**: a lesson timer + auto-starting **task timers** that record actual time
  (interruptible); an estimate-vs-actual time report.
- **Captured info inbox** ("things I've been told"): fast capture, manual category to start,
  resurfaced via entity links.
- **Current-interest** marking; **exam dates** + a **parental-contact log** (events); a
  **start/end-of-day checklist**.
- Pupils + enrolments + `note_pupil_mentions` ("outstanding pupils"); tags. *(2.11 — **deferred**:
  picked up with the **pupil-facing resources project**, when individual names are first needed.)*
- **Write `docs/DPIA.md`** before real pupil names are entered. *(Deferred with 2.11.)*

**Done when:** emails/tasks land in one place, get planned into time, and reality is logged.

## Phase 3 — Schemes of work, lesson plans & resources

**Goal:** the planning content the daily view links to.

- Schemes of work → units → lesson plans (objectives/outline/duration), with versioning.
- **Hosted resource store** (`resources` + `resource_versions` + links): upload, view/download,
  version history, and **bulk-import** to consolidate scattered copies. One click from the lesson.
- Occurrence ↔ plan binding; per-course plans for split classes (`occurrence_courses`).
- "Lessons I oversee" prep view for TA lessons (§7): set plan + resources + oversight notes.

**Done when:** the Now screen's "Resources" and "Plan" are real and one click away, and TA
lessons are fully prepared in-app.

## Phase 4 — AI assistance

**Goal:** turn the accumulated record into planning leverage. Only now is there data worth it.

- The single LLM client wrapper: **Anthropic Claude** by default, pupil-name redaction,
  **safeguarding withholding**, `ai_calls` audit, provider swap.
- "Draft next lesson" from SoW position + recent notes; "Summarise this term".
- **"Redesign this unit"** / **author a new scheme from scratch** — especially the unfinished
  KS3 *"Effective use of computers in school"* scheme → new scheme version.
- **AI resource editing** (new versions) and **AI task breakdown** behind the focus mode.
- **AI estimate calibration** from timed history, and **AI auto-categorisation** of captured info.
- A learned, time-decaying **"current interest"** profile that biases what surfaces.
- (Optional) pgvector semantic search over notes/resources.

**Done when:** you can produce a usable next-lesson draft and a unit redesign from real notes,
with zero pupil names leaving the building.

*Status: ✅ built (4.1–4.5, 4.7, teaching-context, task-breakdown). Remaining: captured
auto-categorisation, estimate calibration, current-interest profile (4.6) and the optional
pgvector search (4.8).*

## Phase 5 — Curriculum delivery *(added 2026-06-10 — see [PHASE_5_PLAN.md](PHASE_5_PLAN.md))*

**Goal:** the app runs the curriculum, not just the day. A downloaded unit becomes a
SEND-adapted **master scheme**; each class adapts it as it is taught, with a per-class change
log; the record feeds back into next week's lesson and the master.

- Master + **per-group adaptations** with an append-only change log (5.1/5.2). ✅
- **Convert a downloaded unit** into adapted master lessons (AI), source files linked (5.3). ✅
- **Lay a unit into a class's weekly slot**, holiday-aware (5.4) — and both in one action with
  review on the map (5.7). ✅
- The **feedback loop**: adapt the next delivery from the class's notes; fold improvements back
  into the master on approval (5.5). ✅
- **Curriculum map** (`/map`) per class-slot with carry-over ("continue next week") (5.6, 5.9). ✅
- **Equipment inventory** (`/kit`) the teacher and every AI planning feature plan within (5.8). ✅
- Remaining (5.9): content-based conversion (read the actual files), cross-group compare,
  kit-per-lesson, CSV import / convert de-dup.

**Done when:** a whole unit can be filled and assigned for a class in one request, and each
class's delivery record visibly improves the next lesson. *(Reached for the headline flow.)*

## Phase 6 — Polish & the "forgotten" extras *(was Phase 5 before curriculum delivery landed)*

**Goal:** quality-of-life and the parked ideas worth keeping.

- Global search across everything; saved filters; keyboard shortcuts everywhere.
- Calendar exceptions UI (cover, room changes, off-timetable days).
- **Academic-year rollover** UI: archive the year, carry content over, re-enter the timetable.
- **Deeper MS Teams integration** (beyond the per-class link / checklist) if worth it.
- Email intake v2 (IMAP poll) if volume justifies it.
- A TA read/feedback login if wanted (needs the second-account work).
- Selected items from SPECIFICATION §8 (homework tracking, key dates, duty rota, print queue,
  start/end-of-day checklist) — picked by what actually hurts in daily use.

## What MVP deliberately excludes

Phase 1 has **no** tasks, AI, pupils-as-data, or full lesson-plan authoring. That is on
purpose: prove the daily timetable-and-notes loop first; everything else is additive and
sequenced by real need.

## Rough order-of-magnitude

These are relative sizes, not promises (one developer, evenings):

| Phase | Relative size | Unlocks |
| --- | --- | --- |
| 0 Skeleton | S | A deployable, safe base |
| 1 Timetable + Now + Notes | L | **The daily MVP** |
| 2 Tasks + Time + Focus + Events | L | Plan the day, one-thing-now, never miss a deadline |
| 3 SoW + Hosted resources | M | Single source of truth on the Now screen |
| 4 AI | M | Planning leverage from the record |
| 5 Curriculum delivery | L | The app runs the curriculum (master → class → calendar → feedback) |
| 6 Polish + extras | ongoing | Long-tail quality of life |
