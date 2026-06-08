# Phase 1 Build Plan — Timetable, Now & Notes (the MVP)

Detailed, reviewable build plan for **Phase 1** of [ROADMAP.md](ROADMAP.md): the everyday core
and the Minimum Viable Product. Grounded in [DATA_MODEL.md](DATA_MODEL.md) (schema),
[TEACHING_PATTERN.md](TEACHING_PATTERN.md) (the real week to seed), [UX_FLOWS.md](UX_FLOWS.md)
(screens) and [ARCHITECTURE.md](ARCHITECTURE.md) (the Routes → Services → Repos shape). Nothing
here is built yet — this is for sign-off before code.

**Done when** (from the roadmap): on any school day you open the app, see/teach-from the right
lesson, and capture a note in seconds. Everything else (tasks, AI, pupils-as-data, resources) is
later and additive.

**Sequencing principle:** data before views. Build the schema and the real seed, then the
ClockService that answers *"what am I teaching now?"*, then the screens that are just views over
it. The first reviewable slice (1.1–1.3) has no UI but is fully provable by tests.

---

## 0. What Phase 1 changes vs the Phase 0 skeleton

Phase 0 is flat: `routes/` + `lib/` + `auth/` + `config/` + `db/`. Phase 1 introduces the
service/repo split from [ARCHITECTURE.md](ARCHITECTURE.md) and HTMX.

**New:**

- `src/services/` — `ClockService`, `TimetableService`, `OccurrenceService`, `NotesService`.
- `src/repos/` — thin SQL functions over `pg` (no ORM): `timetableRepo`, `occurrenceRepo`,
  `notesRepo`, `settingsRepo`.
- `src/lib/time.ts` — timezone-aware helpers (weekday + `HH:MM` in `Europe/London`), no date lib.
- `src/seed/` + `npm run seed` — idempotent seed of the real timetable (tsx script, same pattern
  as `migrate.ts`), with the data in a typed structure reused by tests.
- HTMX: vendored `public/htmx.min.js`, wired into `layout()` (the layout comment already says
  *"HTMX is added in Phase 1"*); a tiny `public/app.js` for the `n` quick-note shortcut.

**Kept from Phase 0 (unchanged conventions):** the auto-discovering migration runner
([db/migrate.ts](../app/src/db/migrate.ts)), `layout()`/`esc()` HTML helpers, `registerXRoutes(app)`
wiring in [server.ts](../app/src/server.ts), Zod-validated config, and the **"renders even if the
DB is down"** rule on the Now screen.

---

## 1. Build order (each row a reviewable commit/PR)

| # | Goal | Key files | Done when |
| --- | --- | --- | --- |
| **1.1** | **Schema** — all P1 tables | `migrations/0002_phase1.sql` | `npm run migrate` applies clean; `npm run typecheck` green |
| **1.2** | **Real-timetable seed** | `src/seed/timetable.ts`, `src/seed/run.ts`, `package.json` (`seed`) | `npm run seed` is idempotent; integrity test passes (30 slots, 3 free, splits correct) |
| **1.3** | **ClockService + tests** | `src/lib/time.ts`, `src/services/clock.ts`, `tests/clock.test.ts` | ~15 table-driven cases pass; pure (no DB) |
| **1.4** | **Timetable grid** (week/day) | `src/repos/timetable.ts`, `src/services/timetable.ts`, `src/routes/timetable.ts` | `/timetable` renders the real week, colour-by-course; click → lesson detail |
| **1.5** | **Lesson detail + lazy occurrences** | `src/repos/occurrence.ts`, `src/services/occurrence.ts`, `src/routes/lesson.ts` | opening a slot find-or-creates one `lesson_occurrence`; split classes show per-course |
| **1.6** | **Notes capture** (the fast path) | `src/repos/notes.ts`, `src/services/notes.ts`, `src/routes/notes.ts`, `public/app.js` | text-only note autosaves; stopping point + follow-ups optional; `n` opens the box anywhere |
| **1.7** | **Now screen** wired to the clock | rewrite `src/routes/now.ts` | shows current/next lesson, "last time → stopped at", quick note, free-period card; self-advances |
| **1.8** | **General notes list** (light) | `src/routes/notes.ts` (list view) | `/notes` lists + filters notes by linked course/group |

---

## 2. Migration `0002_phase1.sql` — schema

The P1 subset of [DATA_MODEL.md](DATA_MODEL.md). Conventions there hold (`BIGSERIAL` PKs,
`created_at`/`updated_at`, `ON DELETE RESTRICT`, closed sets as `TEXT … CHECK`, no soft delete).
**Tables to create** (full columns in DATA_MODEL — here the Phase-1 specifics and constraints):

**Time structure**

- `academic_years` — partial unique index `WHERE is_current` so exactly one is current.
- `term_dates` — `kind CHECK (term, half_term, holiday, inset)`. Drives "is today a school day".
- `period_definitions` — the fixed weekday shape; `UNIQUE (weekday, slot_order)`;
  `slot_type CHECK (before_school, briefing, form_am, lesson, break, lunch, form_pm, after_school)`;
  `teachable BOOL`; `lesson_index INT NULL` (1–6).

**Teaching structure**

- `staff` — partial unique index `WHERE is_self`; `role CHECK (self, ta, teacher, cover)`.
- `rooms`.
- `courses` — `key_stage`, `qualification`, `exam_board`, `colour` (for the grid).
- `groups` — `academic_year_id` FK; `teams_url`, `default_room_id`.
- `group_courses` — `UNIQUE (group_id, course_id)`; `lessons_per_week`.
- `timetabled_lessons` — `period_definition_id` FK, `purpose`, `group_id NULL`, `room_id`,
  `staff_id`, `week TEXT DEFAULT 'every'`. **Decision (see §7):** extend
  `purpose CHECK (teaching, free, duty, meeting, club, open_room)` with **`form`** for morning/extended
  form. `staff_id != self` rows are the overseen lessons.
- `timetabled_lesson_courses` — one row per course in a slot (the split mechanism).

**The record**

- `lesson_occurrences` — `UNIQUE (timetabled_lesson_id, date)`; `status CHECK (planned, taught,
  cancelled, cover)`. Created lazily (§5).
- `occurrence_courses` — `occurrence_id` + `group_course_id` + `lesson_plan_id NULL` +
  `stopping_point TEXT NULL`. One row per course in the occurrence.
- `notes` — **create the full table now** (so it never churns) but Phase 1 only writes
  `kind IN (lesson, general)`. Nullable typed FKs (`occurrence_id`, `group_id`, `course_id`,
  `pupil_id NULL`, …). `safeguarding`/`interest`/`category`/`surface_on`/`archived` columns exist
  but their capture UI is P2.
- `note_followups` — `note_id`, `text`, `done`, `becomes_task_id NULL`, `due_hint NULL`.

**Cross-cutting**

- `settings` extensions (seeded rows, not columns — it's a `key/value` table): `timezone`
  (`Europe/London`), `current_academic_year_id`, `default_arrival`, `default_leave`,
  `target_leave`.

**Explicitly deferred** (do **not** create yet): `tasks`, `work_blocks`, `time_entries`,
`events`, `pupils`, `enrolments`, `tags`, `email_intake`, `resources*`, `schemes/units/plans`,
`prep_templates`, `ai_calls`, `schedule_exceptions` (P2 — Phase 1 assumes the recurring week with
no one-off overrides; the ClockService is written so exceptions slot in later).

---

## 3. The real-timetable seed (`npm run seed`)

Idempotent and re-runnable (guards / `ON CONFLICT`), because the timetable is re-entered each
September (rollover). Data lives in a typed TS structure so the **integrity test** can assert on
the same source. Encodes [TEACHING_PATTERN.md](TEACHING_PATTERN.md):

**Day shape → `period_definitions`** (per weekday 1–5):

| slot_type | time | teachable | notes |
| --- | --- | --- | --- |
| `briefing` / `before_school` | 08:30–08:50 | no | briefing Mon/Wed/Thu; prep (before_school) Tue/Fri |
| `form_am` | 08:50–09:10 | no | daily morning form with 9TDU |
| `lesson` L1 | 09:10–10:00 | yes | |
| `lesson` L2 | 10:00–10:50 | yes | |
| `break` | 10:50–11:05 | no | Computing Club open-room → **not a work window** |
| `lesson` L3 | 11:05–11:55 | yes | |
| `lesson` L4 | 11:55–12:45 | yes | |
| `lunch` | 12:45–13:50 | no | Computing Club 13:00–13:30 → **not a work window** |
| `lesson` L5 | 13:50–14:40 | yes | |
| `lesson` L6 | 14:40–15:30 | yes | |
| `after_school` | 15:30– | no | varies by day (club/meeting); commitments are P2 |

**Courses:** Computing Curriculum (KS3), Computer Skills (KS3, *being written*), OCR J277 GCSE CS
(KS4), Y10 Sound Engineering (KS4 custom, *building*), and the three Post-16 courses — BCS
"Thinking Like a Coder", AIMS Robotics, Using Computers for VI. Plus a Form/Tutor pseudo-entry for
9TDU form time.

**Groups & `group_courses`** (group → course × lessons/week):

| Group | Courses (slots) |
| --- | --- |
| 8PFA, 8SJO, 8MDU | Curriculum + Computer Skills (1 each) |
| 9TDU | Curriculum + Skills + **Extended Form** (Wed L5) |
| 9SCL, 9EME | Curriculum + Skills |
| 7ARO, 7RAL | Curriculum (1) — *Skills overseen, other teacher* |
| 7JMI | Curriculum + Skills — *both overseen, not in my grid* |
| Y10 GCSE | **OCR J277 + Sound Engineering** (split, 1 pupil) — Mon L5, Wed L4, Thu L5 |
| Y11 Gp1 | OCR J277 — Wed L6 + **Fri L3–L4 double** |
| Y11 Gp2 | OCR J277 — Tue L3, Thu L3, Fri L1 |
| Post-16 | **3 courses at once** (split) — Wed L1–L2 double + Thu L6 |

**`timetabled_lessons` + `timetabled_lesson_courses`:** one `timetabled_lessons` row per cell of
the Mon–Fri grid in TEACHING_PATTERN (room U1, `staff=self`, `purpose='teaching'`), with:

- **Splits** → multiple `timetabled_lesson_courses` rows: Post-16 slots = 3 courses; Y10 GCSE
  slots = 2 courses.
- **Free** (`purpose='free'`): Tue L4, Thu L1, Thu L4 — the protected work windows.
- **Club** (`purpose='club'`, every lunch) and **open-room** (`purpose='open_room'`, every break).
- **Duty** (`purpose='duty'`): Wednesday taxi-numbers (time TBC — see §7).
- **Form** (`purpose='form'`): daily `form_am` + the Wed L5 Extended Form, group 9TDU.

**Counts to assert in the integrity test:** 6×5 = 30 lesson slots; 27 teaching/form + 3 free;
Post-16 slots each have 3 courses; Y10 slots each have 2; one `is_self` staff; one `is_current`
year.

**Known gap (needs teacher input, §7):** the overseen Skills lessons for 7ARO / 7RAL / 7JMI (and
7JMI Curriculum) — slots captured so far are 7ARO Skills **Wed L3** and 7JMI Curriculum **Fri L3**
(in TEACHING_PATTERN); 7JMI Skills + 7RAL Skills still to follow. They're taught by another
teacher in parallel with my own lessons, shown on the grid as `⚑TA` (UX §2).

---

## 4. `ClockService` — the heart

Pure and unit-tested in isolation; the Now screen and (later) "by next lesson" task rules both
depend on it. The route handler fetches `period_definitions` + `term_dates` from repos and passes
them in, so the service itself takes no DB.

**Signature (sketch):**

```ts
resolveNow(now: Date, ctx: { periods: PeriodDefinition[]; terms: TermDate[]; tz: string })
  : NowState
```

**`NowState`:** `{ localTime, weekday, isSchoolDay, reason?, currentSlot?, currentLesson?,
minutesRemaining?, nextSlot?, nextLesson?, nextLessonDate }`.

**Algorithm:**

1. Compute local weekday + `HH:MM` in `tz` (`Europe/London`) via `Intl`, not the raw `Date`.
2. **School day?** weekday ∈ 1–5 **and** the date falls in a `term`/no overriding `holiday|inset`
   in `term_dates`. If not → `isSchoolDay=false`, `reason`, and look ahead to the next school
   day's first slot for `nextLesson`.
3. Find the `period_definition` whose `[start_time, end_time)` contains the local time →
   `currentSlot`. The day is contiguous 08:30–15:30, so there are no gaps mid-day.
4. `currentLesson` = the `timetabled_lesson` for that slot (may be teaching / free / club / form /
   null before/after school).
5. `nextLesson` = the next slot with `purpose='teaching'` (looking into following days, skipping
   non-school days) — what the Now screen's **NEXT** card shows.
6. `minutesRemaining` = end of `currentSlot` − now.

**Edge cases → test cases** (`tests/clock.test.ts`, table-driven, ~15):
mid-lesson · exact `start_time` (inclusive) · exact `end_time` (exclusive → next slot) · during
break (club) · during lunch · during a free period · before 08:30 (before-school) · after L6
(after-school) · **Fri L6 → next is Mon L1** · Saturday/Sunday → next Monday · half-term week ·
single INSET day · last day of term → next is after the holiday · a teaching slot vs a free slot ·
a split slot (3 post-16 courses) returns all three.

Single repeating week → no A/B; any "Week A/B" label in the UI is cosmetic only.

---

## 5. Screens, routes & HTMX

Server-rendered HTML via `layout()`; HTMX for partial swaps. All POST/PATCH CSRF-protected
(token from `reply.generateCsrf()`), per-route Zod validation.

| Screen (UX flow) | Route(s) | Notes / HTMX |
| --- | --- | --- |
| **Now** (§1) | `GET /` | Current+next lesson, "last time → stopped at" (most recent prior occurrence's `stopping_point`), inline quick-note, free-period work card. `hx-trigger="every 30s"` (or 60s) on a `/now/card` partial advances the period without reload. Still renders if DB is down. |
| **Timetable** (§2) | `GET /timetable`, `GET /timetable?date=YYYY-MM-DD` | Week grid + day/list/today toggles; colour by `courses.colour`; `free`=protected, `⚑TA`=overseen. Each cell links to lesson detail. |
| **Lesson detail** (§3) | `GET /lesson?lesson=<id>&date=YYYY-MM-DD` | Find-or-create the `lesson_occurrence`; show plan placeholder (P3), notes for this occurrence, per-course tabs for splits. |
| **Quick note** (§4) | `GET /notes/quick?occurrence=<id>` (partial), `POST /notes`, `PATCH /notes/:id`, `POST /notes/:id/followups`, `POST /followups/:id/toggle` | Overlay pre-bound to the current lesson. Autosave: `hx-trigger="keyup changed delay:800ms, blur"` → `PATCH`. Text-only = a complete note. `n` shortcut opens it from anywhere (`public/app.js`). |
| **General notes** (§9) | `GET /notes`, `GET /notes?course=&group=` | Light list + filter over the same `notes` table (`kind='general'`). |

---

## 6. Test strategy

- **Unit (priority):** `ClockService` — pure, table-driven (§4). No DB; fast; the safety net for
  the whole "what now?" promise.
- **Integration (needs the Docker DB):** migration `0002` applies clean; **seed integrity**
  (counts/splits from §3); occurrence **find-or-create is idempotent** (same slot+date → one row);
  note create + `PATCH` autosave round-trips; `stopping_point` from the previous occurrence
  surfaces as "last time".
- **Smoke (extend [tests/smoke.test.ts](../app/tests/smoke.test.ts)):** with a fixed/mocked clock,
  `/` renders the expected current lesson; `/timetable` renders 30 cells; unauthenticated still
  redirects to login.
- **Preserve Phase 0 guarantees:** auth + CSRF on every mutation; Now degrades gracefully with no
  DB; `0` production-dependency vulnerabilities.

---

## 7. Confirmations (status as of 2026-06-08)

None block starting 1.1.

1. **Term dates — ANSWERED (2026/27)**, captured in
   [TEACHING_PATTERN.md](TEACHING_PATTERN.md#term-dates-202627); they seed `term_dates`. One
   decision remains — the target year / go-live (below).
2. **Overseen-lesson slots — PARTIAL.** 7ARO Skills = **Wed L3**, 7JMI Curriculum = **Fri L3**
   (in TEACHING_PATTERN). 7JMI Skills + 7RAL Skills slots **to follow**. They run in parallel
   with my own lessons (non-self `staff_id`), so they don't consume my grid slot.
3. **`purpose` CHECK** — proceeding with adding **`form`** to `timetabled_lessons.purpose` unless
   you object; briefing stays a pure `period_definitions` band.
4. **Wednesday taxi-number duty** — time still TBC → seed as a `duty` with no pinned slot; revisit
   as a recurring task in P2.
5. **Timezone** — proceeding with `Europe/London` for server clock + display.
6. **Now self-advance cadence** — default `every 30s`.

### The one real decision — target year / go-live

The **captured timetable is the current 2025/26 arrangement**; the **2026/27 timetable won't
exist until it's published in September 2026** ("the whole timetable changes each September"). The
term dates supplied are **2026/27**. Recommendation:

- **Seed the 2026/27 term dates** (done) and **go live in September 2026** for the new year.
- **Build over the summer using the current captured timetable as the development seed** (real-
  shaped data for the screens + clock tests), then **re-seed the real 2026/27 timetable once it's
  published** — exactly the academic-year rollover the model already supports.

To go **live this term** instead (the last weeks of 2025/26) I'd also need the current year's term
boundaries — you gave only the end (**Mon 20 Jul 2026**, INSET). Otherwise September is the clean
boundary.

---

## 8. Out of scope for Phase 1 (deferred, by design)

Tasks & triage, email paste-box, work blocks/timers, events & deadlines, focus mode, pupils as
data + enrolments + mentions, the captured-info inbox, tags, hosted resources & lesson plans, and
**all** AI. These are Phases 2–4. Phase 1 proves the timetable-and-notes loop first.

---

## 9. Recommended first slice

Ship **1.1 + 1.2 + 1.3 together** (schema + real seed + ClockService with its full test table) as
the first PR. It has no UI but is end-to-end provable: the database holds the real week and the
service correctly answers "what am I teaching now?" for every edge case — the foundation every
screen then renders. 1.4–1.8 follow as independent, each-shippable commits.
