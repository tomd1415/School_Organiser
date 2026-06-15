# Data Model

Draft relational schema for the School Organiser. Types are PostgreSQL. This is a starting
point for discussion, not the final migration. Phase markers (P0–P5) tie each table to
[ROADMAP.md](ROADMAP.md).

## Conventions

Mirrors the sibling `exam_questions` project so patterns transfer:

- Primary keys are `id BIGSERIAL` unless stated.
- Every table has `created_at TIMESTAMPTZ DEFAULT now()` and, where mutated, `updated_at TIMESTAMPTZ`.
- **No soft delete.** Rows are deleted, or carry an explicit lifecycle field (`active`, `status`).
- Foreign keys are `ON DELETE RESTRICT` by default. Pupil deletion is a deliberate, audited
  retention action, never a silent cascade.
- Free text is `TEXT`; length limits live in the application layer (Zod), not the database.
- Small closed sets use a `TEXT` column with a `CHECK (... IN (...))` constraint rather than
  a Postgres `ENUM`, so values are easy to evolve.
- Times-of-day are `TIME`; instants are `TIMESTAMPTZ`; calendar dates are `DATE`.

## Entity map

```text
                       courses ──< schemes_of_work ──< units ──< lesson_plans
                          │                                          │
                  group_courses >── groups                    resource_links >── resources
                          │            │                             │
        timetabled_lesson_courses      │                    (course/unit/plan/occurrence/group)
                          │            │
   period_definitions ──< timetabled_lessons >── staff (me / TA)
                                       │   │
                                       │   └── rooms
                                       │
                              lesson_occurrences ──< occurrence_courses
                                       │   │
                                       │   └──────────────< notes >── tags
                                       │                      │  │
                                pupils │            note_followups  note_pupil_mentions
                                  │    │                      │
                              enrolments                   tasks ──< work_blocks
                                                              │
                                                        email_intake

                  group_courses ──< lesson_adaptations >── lesson_plans
                                            │
                                 lesson_adaptation_history

   academic_years · events · prep_templates · resource_versions · time_entries · settings · term_dates · schedule_exceptions · ai_calls · equipment   (cross-cutting)
```

## A. Time structure

### `period_definitions` (P1) — the fixed shape of each weekday

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGSERIAL PK | |
| `weekday` | INT | 1=Mon … 5=Fri |
| `slot_order` | INT | ordering within the day |
| `slot_type` | TEXT | CHECK in `before_school, briefing, form_am, lesson, break, lunch, form_pm, after_school` |
| `label` | TEXT | "Lesson 1", "Break", "Morning briefing" |
| `lesson_index` | INT NULL | 1–6 for teaching lessons, else NULL |
| `start_time` | TIME | e.g. `09:10` |
| `end_time` | TIME | e.g. `10:00` |
| `teachable` | BOOL | true if a class can be timetabled here |

Seed encodes the day shapes: briefing rows only for Mon/Wed/Thu; after-school rows vary
(Tue club, Thu meeting, Fri club, fortnightly Wed). See SPECIFICATION §5.1.

### `term_dates` (P1) — calendar overlay

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGSERIAL PK | |
| `name` | TEXT | "Autumn 1", "October half term" |
| `start_date` / `end_date` | DATE | inclusive |
| `kind` | TEXT | CHECK `term, half_term, holiday, inset` |

### `schedule_exceptions` (P1/P2) — when a date deviates from the recurring timetable

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGSERIAL PK | |
| `date` | DATE | |
| `scope` | TEXT | CHECK `whole_day, period, lesson` |
| `period_definition_id` | BIGINT FK NULL | when scope=period |
| `timetabled_lesson_id` | BIGINT FK NULL | when scope=lesson |
| `kind` | TEXT | CHECK `cancelled, room_change, cover, off_timetable, event` |
| `new_room_id` | BIGINT FK NULL | for room_change |
| `cover_staff_id` | BIGINT FK NULL | for cover |
| `detail` | TEXT | |

## B. Teaching structure

### `staff` (P1)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGSERIAL PK | |
| `name` | TEXT | |
| `role` | TEXT | CHECK `self, ta, teacher, cover` |
| `is_self` | BOOL | exactly one row true (the teacher) |
| `active` | BOOL | |

### `rooms` (P1)

| `id` BIGSERIAL PK · `name` TEXT · `active` BOOL |

### `courses` (P1)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGSERIAL PK | |
| `name` | TEXT | "OCR J277 GCSE CS", "KS3 Year 8 Computing" |
| `key_stage` | TEXT NULL | "KS3", "KS4", "KS5" |
| `qualification` | TEXT NULL | "GCSE", "BTEC", "A-Level", "none" |
| `exam_board` | TEXT NULL | "OCR" |
| `colour` | TEXT NULL | for timetable rendering |
| `active` | BOOL | |
| `notes` | TEXT NULL | |

### `groups` (P1) — teaching groups

| `id` · `name` (`9X/Cp1`) · `year_group` TEXT · `academic_year_id` FK · `default_room_id` FK NULL · `teams_url` TEXT NULL · `size` INT NULL · `active` BOOL · `notes` TEXT |

### `group_courses` (P1) — a group studies a course, N times/week

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGSERIAL PK | |
| `group_id` | BIGINT FK | |
| `course_id` | BIGINT FK | |
| `lessons_per_week` | INT | 1–3 (SPECIFICATION: classes vary) |
| `active` | BOOL | |

> A group with two courses has two `group_courses` rows. This is how "more than one course
> going on" is represented at the planning level; see `timetabled_lesson_courses` for how it
> appears inside a single slot.

### `timetabled_lessons` (P1) — the recurring weekly assignment

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGSERIAL PK | |
| `period_definition_id` | BIGINT FK | which weekday+slot |
| `purpose` | TEXT | CHECK `teaching, free, duty, meeting, club, open_room` |
| `group_id` | BIGINT FK NULL | NULL for non-teaching purposes (free/duty) |
| `room_id` | BIGINT FK NULL | |
| `staff_id` | BIGINT FK | who teaches — defaults to self; a TA for non-specialist lessons |
| `week` | TEXT | CHECK `every, A, B`. Single-week timetable → always `every` (A/B kept only if ever needed) |
| `active` | BOOL | |
| `notes` | TEXT NULL | |

`purpose='free'` rows are the protected free periods surfaced on the Now screen.
`staff_id != self` rows are the non-specialist lessons the teacher oversees (SPECIFICATION §5.8).
The **lunchtime club** (`purpose='club'`, every lunch) and **break-time open room**
(`purpose='open_room'`, every break) occupy break/lunch, so those periods are never offered as
work windows — only `purpose='free'`, before-school and after-school are.

### `timetabled_lesson_courses` (P1) — multiple courses inside one slot

| `id` · `timetabled_lesson_id` FK · `group_course_id` FK |

One row per course running in that slot. A normal lesson has one row; a split post-16 room
has several.

## C. Planning content

### `schemes_of_work` (P3) · `units` (P3) · `lesson_plans` (P3)

```text
schemes_of_work(id, course_id FK, title, version INT, active BOOL)
units(id, scheme_id FK, title, display_order INT)
lesson_plans(id, unit_id FK NULL, course_id FK, title, display_order INT,
             objectives TEXT, outline TEXT, duration_min INT, active BOOL)
```

`version` on a scheme supports the planned "large changes": keep last year's SoW while
drafting a new one.

### `resources` (P3) + `resource_versions` (P3) + `resource_links` (P3)

The app **hosts** resources (single source of truth); files live on disk, metadata + history in
the DB. Backups must therefore include the file store (see ARCHITECTURE).

```text
resources(id, title, kind, mime_type, source, ai_editable BOOL,
          current_version_id FK NULL, active BOOL)
  kind   CHECK (document, slides, worksheet, quiz, image, link, note)
  source CHECK (uploaded, imported, ai_generated)
resource_versions(id, resource_id FK, version_no INT, storage_path TEXT,
                  byte_size INT, checksum TEXT, author CHECK (teacher, ai),
                  change_note TEXT, created_at TIMESTAMPTZ)
resource_links(id, resource_id FK,
               course_id FK NULL, unit_id FK NULL, lesson_plan_id FK NULL,
               occurrence_id FK NULL, group_id FK NULL)
```

Every edit (teacher or AI) writes a new `resource_versions` row and advances
`current_version_id`, so changes are reviewable and reversible. `checksum` powers
duplicate-detection on bulk import; `kind='link'` keeps the occasional external URL. A resource
attaches to one thing per `resource_links` row (exactly one nullable FK set; enforced in app +
a `CHECK`); the same deck can link to many plans, viewed/downloaded in one click from the lesson.

## D. Delivery & the record

### `lesson_occurrences` (P1) — a dated instance

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGSERIAL PK | |
| `timetabled_lesson_id` | BIGINT FK | |
| `date` | DATE | |
| `status` | TEXT | CHECK `planned, taught, cancelled, cover` |
| `taught_by_staff_id` | BIGINT FK NULL | usually self; a TA for covered lessons |
| `week` | TEXT | always `every` (single repeating week) |

Occurrences are generated lazily (created the first time a note/plan is attached, or rolled
out a week ahead) — we do not pre-materialise the whole year.

### `occurrence_courses` (P1/P3) — per-course detail when a slot is split

| `id` · `occurrence_id` FK · `group_course_id` FK · `lesson_plan_id` FK NULL · `stopping_point` TEXT NULL |

For a single-course lesson this is one row; for a split class, one per course, each with its
own plan and "where we got to".

### `notes` (P1) — *the core asset*

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGSERIAL PK | |
| `kind` | TEXT | CHECK `lesson, general, oversight, plan_change, captured` |
| `body` | TEXT | free text, the fast path |
| `stopping_point` | TEXT NULL | "where we got to" |
| `occurrence_id` | BIGINT FK NULL | the lesson it's about |
| `group_id` | BIGINT FK NULL | |
| `course_id` | BIGINT FK NULL | |
| `pupil_id` | BIGINT FK NULL | a pupil-specific note |
| `task_id` | BIGINT FK NULL | |
| `event_id` | BIGINT FK NULL | a captured item promoted to / about an event |
| `category` | TEXT NULL | AI-assigned filing for `kind='captured'` (pupil, logistics, admin, …) |
| `surface_on` | DATE NULL | optional date a captured item becomes relevant (resurface then) |
| `archived` | BOOL | captured items: filed away / no longer relevant |
| `safeguarding` | BOOL | highlight + **withhold from all AI calls** (SECURITY) |
| `interest` | BOOL | marked a "current interest" (§5.18) — biases surfacing |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

Nullable typed FKs (rather than a generic `entity_type/entity_id`) keep referential integrity
— the bounded set of targets makes this practical. A note autosaves with only `kind` + `body`
required; everything else is optional, satisfying "capture in seconds".

### `note_followups` (P1) — checklist items that can become tasks

| `id` · `note_id` FK · `text` TEXT · `done` BOOL · `becomes_task_id` FK NULL · `due_hint` TEXT NULL |

### `note_pupil_mentions` (P2) — "outstanding pupils"

| `id` · `note_id` FK · `pupil_id` FK · `text` TEXT · `resolved` BOOL |

### `tags` (P2) + `note_tags` (P2)

| `tags(id, name UNIQUE)` · `note_tags(note_id FK, tag_id FK, PK(note_id,tag_id))` |

## E. Pupils

### `pupils` (P2)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGSERIAL PK | |
| `display_name` | TEXT | stored locally only |
| `ai_token` | TEXT | the redaction placeholder, e.g. `PUPIL_7` — **what the AI sees instead of the name** |
| `active` | BOOL | |

### `enrolments` (P2)

| `id` · `pupil_id` FK · `group_id` FK · `active` BOOL · `UNIQUE(pupil_id, group_id)` |

### `pupil_progress` (P5, optional)

| `id` · `pupil_id` FK · `unit_id` FK · `status` (`on_track, behind, exceeding`) · `updated_at` |

## F. Tasks & time

### `tasks` (P2)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGSERIAL PK | |
| `title` | TEXT | |
| `detail` | TEXT NULL | |
| `source` | TEXT | CHECK `manual, email, note, event, recurring` |
| `email_intake_id` | BIGINT FK NULL | provenance |
| `due_at` | TIMESTAMPTZ NULL | a hard time |
| `due_rule` | TEXT NULL | e.g. `before_next_lesson:<group_id>` (resolved against the timetable) |
| `urgency` | TEXT | CHECK `urgent_today, by_next_lesson, this_week, someday` |
| `estimate_min` | INT NULL | |
| `status` | TEXT | CHECK `inbox, triaged, scheduled, in_progress, done, dropped` |
| `group_id` / `course_id` / `occurrence_id` / `pupil_id` | BIGINT FK NULL | what it's linked to |
| `event_id` | BIGINT FK NULL | prep task for a deadline/event (§5.13) |
| `parent_task_id` | BIGINT FK NULL | self-ref — a sub-step of a broken-down task |
| `cognitive_load` | TEXT NULL | CHECK `low, medium, high` — offer heavy work when fresh |
| `context` | TEXT NULL | e.g. `needs_computer, quick_win, can_do_tired` |
| `recurrence` | TEXT NULL | (legacy free-text rule; recurring tasks now use `recurring_tasks` + `recurring_task_id`, P2.12) |
| `recurring_task_id` | BIGINT FK NULL | the `recurring_tasks` template that generated this instance (P2.12) |
| `task_type` | TEXT NULL | grouping for calibration (e.g. `marking, email, resource_prep, admin`) |
| `actual_seconds` | INT NULL | accumulated from `time_entries` (cached for calibration) |
| `interest` | BOOL | marked a "current interest" (§5.18) |
| `completed_at` | TIMESTAMPTZ NULL | |

### `recurring_tasks` (P2.12) — recurring task templates

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGSERIAL PK | |
| `title` / `detail` | TEXT | copied onto each generated instance |
| `urgency` / `estimate_min` / `cognitive_load` / `group_id` / `course_id` | — | copied onto each instance |
| `pattern` | TEXT | `weekly:<dow>` · `every_weeks:<n>:<dow>` · `monthly:<dom>` · `per_lesson:<group_id>` |
| `lead_days` | INT | create the instance this many days before its due date |
| `active` | BOOL | paused templates don't generate |
| `last_generated` | DATE | the last due date materialised (idempotency guard) |

A daily generator (app boot + in-process timer, and `npm run generate-recurring`) creates `tasks`
(`source='recurring'`, `recurring_task_id` set) for due dates within `lead_days`; the pure
`nextDueDate` computes the schedule, and `per_lesson` uses the timetable (skipping non-school days).

### `work_blocks` (P2) — planned vs. actual time

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGSERIAL PK | |
| `date` | DATE | |
| `start_at` / `end_at` | TIMESTAMPTZ | |
| `period_definition_id` | BIGINT FK NULL | the free period it lines up with (break/lunch are not work windows) |
| `planned_task_id` | BIGINT FK NULL | what I intended to do |
| `planned_note` | TEXT NULL | |
| `actual_task_id` | BIGINT FK NULL | what I actually did (may differ) |
| `actual_note` | TEXT NULL | "pupil needed help, didn't get to it" |
| `status` | TEXT | CHECK `planned, done, diverted` |

`status='diverted'` with `actual_note` is the one-tap "I did something else" path from
SPECIFICATION §5.6. The original `planned_task_id` is preserved.

### `time_entries` (P2) — timers & recorded actuals

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGSERIAL PK | |
| `kind` | TEXT | CHECK `task, lesson, activity, other` |
| `task_id` | BIGINT FK NULL | the task being timed |
| `occurrence_id` | BIGINT FK NULL | the lesson/activity being timed |
| `started_at` | TIMESTAMPTZ | |
| `ended_at` | TIMESTAMPTZ NULL | NULL while the timer is running |
| `seconds` | INT NULL | filled on stop |
| `source` | TEXT | CHECK `timer, manual` |
| `note` | TEXT NULL | e.g. "paused — pupil needed help" |

A task's actual time is `SUM(seconds)` of its entries (cached on `tasks.actual_seconds`).
**At most one timer runs at a time** — enforce with a partial unique index
(`CREATE UNIQUE INDEX one_running_timer ON time_entries ((1)) WHERE ended_at IS NULL`). An
interruption stops one entry; resuming opens another, so total time accumulates across
sittings. The `(estimate_min, actual_seconds, task_type, cognitive_load)` history is what the
AI uses to calibrate future estimates.

### `email_intake` (P2)

| `id` · `received_at` · `from_addr` · `subject` · `body` TEXT · `raw_path` TEXT NULL · `processed` BOOL · `created_task_id` FK NULL |

## G. Cross-cutting

### `ai_calls` (P4) — audit every AI interaction

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGSERIAL PK | |
| `purpose` | TEXT | CHECK `plan_lesson, summarise, curriculum, author_scheme, make_resource, break_down_task, categorise_info, calibrate_estimate, search` |
| `model` | TEXT | |
| `prompt_version` | TEXT | |
| `request_redacted` | TEXT | exactly what was sent (names already → tokens) |
| `response` | TEXT | |
| `tokens_in` / `tokens_out` | INT | |
| `course_id` / `group_id` / `occurrence_id` | BIGINT FK NULL | context |

Storing only the *redacted* request proves no pupil names left the building.

*(Drafted here before Phase 4; the as-built shape — migration `0007` — differs slightly. See
section I.)*

### `settings` (P1)

| `key` TEXT PK · `value` TEXT |

Holds default arrival/leave times, the **target leave time** (for the end-of-day wind-down),
the AI provider/model (default **Anthropic Claude**), the resource **file-store path**, the
current academic year, and the fortnightly staff-TTRPG anchor date. No A/B teaching cycle —
single repeating week.

## H. Year, events & prep

### `academic_years` (P1)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGSERIAL PK | |
| `name` | TEXT | "2025/26" |
| `start_date` / `end_date` | DATE | |
| `is_current` | BOOL | exactly one true |

`groups`, `timetabled_lessons` and `enrolments` carry an `academic_year_id` FK. Courses,
schemes, lesson plans, resources and the note archive are **year-independent** and carry over;
rollover creates a new year and re-creates only the year-specific rows. (SPECIFICATION §5.14.)

### `events` (P2) — irregular commitments & deadlines

| Column | Type | Notes |
| --- | --- | --- |
| `id` | BIGSERIAL PK | |
| `kind` | TEXT | CHECK `parents_evening, ehcp_review, report_deadline, exam, data_drop, inset, trip, open_evening, meeting, parent_contact, other` |
| `title` | TEXT | |
| `detail` | TEXT NULL | |
| `date` | DATE | |
| `start_at` / `end_at` | TIMESTAMPTZ NULL | timed events that consume a work window |
| `all_day` | BOOL | |
| `affects_availability` | BOOL | true → removes the overlapping after-school work window |
| `due_at` | TIMESTAMPTZ NULL | for deadlines |
| `lead_days` | INT NULL | start reminding this many days before `due_at` |
| `pupil_id` / `group_id` / `course_id` | BIGINT FK NULL | who/what it concerns |
| `status` | TEXT | CHECK `upcoming, done, cancelled` |

Deadlines are `events` with `due_at` + `lead_days`; they can spawn prep `tasks` (via
`tasks.event_id`). EHCP reviews link a `pupil_id`; report deadlines a `group_id`/`course_id`.

### `prep_templates` (P2) + `occurrence_prep` (P2) — "before the bell" checklists

```text
prep_templates(id, scope, ref_id NULL, text, display_order, active)
  scope CHECK (global, group_course, timetabled_lesson)   -- e.g. global "Assign resources to MS Teams"
occurrence_prep(id, occurrence_id FK, text, done BOOL,
                source CHECK (template, manual), template_id FK NULL)
```

Templates are materialised into `occurrence_prep` when an occurrence is created; the Now screen
shows undone items "before the next bell". (SPECIFICATION §5.15.)

## I. Phase 4–5 — as built (migrations `0007`–`0012`)

Phases 4–5 shipped; the migration files in `app/migrations/` are the source of truth for this
section, which records the schema **as built**. (The §C planning tables landed as drafted in
`0006_phase3.sql`; the drafts above stand wherever unchanged.)

### `ai_calls` (P4, `0007`) — the AI audit log, as built

```text
ai_calls(id, created_at, feature TEXT,           -- 'draft_lesson', 'author_scheme', …
         provider TEXT, model TEXT, prompt_version TEXT,
         request_redacted JSONB,                 -- redacted payload ONLY; no raw column exists
         response JSONB, input_tokens INT, output_tokens INT,
         cost_pence NUMERIC(10,2),
         status TEXT DEFAULT 'ok',               -- ok | error | blocked
         error TEXT)
```

Differs from the §G draft: a free-text `feature` replaces the CHECKed `purpose`; the
request/response are JSONB; `cost_pence` + `status`/`error` power the **monthly spend cap** and
record blocked calls (cap reached, redaction check failed); the FK context columns were dropped.
Features in use: `author_scheme`, `draft_lesson`, `term_summary`, `task_breakdown`,
`generate_resource`, `convert_unit`, `adapt_lesson`, `improve_master` — every one through the
single wrapper (`src/llm/client.ts`). `0007` also seeds `settings` with the AI defaults:
`ai_provider` (`anthropic`), `ai_enabled`, `ai_model_plan` / `ai_model_design` /
`ai_model_cheap`, and `ai_month_cap_pence`.

### `courses.teaching_context` (P4, `0008`) · `group_courses.teaching_context` (P5, `0012`)

```text
ALTER TABLE courses       ADD COLUMN teaching_context TEXT;   -- cohort default (0008)
ALTER TABLE group_courses ADD COLUMN teaching_context TEXT;   -- this class's additions (0012)
```

Cohort + pedagogy guidance the AI layer auto-prepends to every lesson/scheme request, so the
teacher stops retyping it. Non-identifying prose only — never a named or described pupil.
`0008` seeds a school-wide SEND default onto every course (editable per course); `0012` layers
an optional per-class note (7ARO ≠ 7JMI) injected alongside the course context when adapting
for that group — but **not** when improving the master, which serves every class.

### `schemes_of_work.labels` (P4, `0009`)

```text
ALTER TABLE schemes_of_work ADD COLUMN labels TEXT;   -- comma-separated; rendered as chips
```

Free-text labels ("Year 7", "Computer Skills") for organising and finding schemes across courses.

### `lesson_adaptations` (P5, `0010`) + `lesson_adaptation_history` (P5, `0010`)

```text
lesson_adaptations(id, group_course_id FK ON DELETE CASCADE,
                   lesson_plan_id FK ON DELETE CASCADE,
                   objectives TEXT,               -- NULL ⇒ inherit master
                   outline TEXT,                  -- NULL ⇒ inherit master
                   adaptation_note TEXT, updated_at,
                   UNIQUE (group_course_id, lesson_plan_id))
lesson_adaptation_history(id, adaptation_id FK ON DELETE CASCADE,
                          objectives, outline, adaptation_note,
                          change_summary TEXT,    -- "teacher edit" / "AI adapted from notes"
                          author TEXT DEFAULT 'teacher',   -- 'teacher' | 'ai'
                          created_at)
```

Master `lesson_plans` stay canonical; a group stores only its **differences**. **Resolution
rule: override-else-master, per field** — a NULL `objectives`/`outline` inherits the master's
value, and the absence of a row means the group teaches the master unchanged. Every change
(teacher or AI) appends a history row, giving each group its own change log; "reset to master"
deletes the adaptation and, via the CASCADE, its log.

### `equipment` (P5, `0011`) — the classroom kit list

```text
equipment(id, name TEXT,                     -- "micro:bit v2", "Crumble kit", "ESP32 CYD"
          category TEXT DEFAULT 'other',     -- soft vocabulary: physical-computing | robotics |
                                             --   computers | peripherals | av | consumables | other
          qty_total INT,                     -- how many we own (NULL = uncounted class set)
          qty_working INT,                   -- usable now; total − working = out of action
          location TEXT,                     -- "cupboard B top shelf", "trolley 2"
          notes TEXT,                        -- "needs 2xAAA each", "3 missing USB leads"
          tags TEXT,                         -- comma labels, like scheme labels
          active BOOL DEFAULT true,          -- archive, never delete
          last_checked DATE,                 -- when last counted / tested
          updated_at)
```

One flat, fast-to-maintain list: what's in the room, how many work, where it lives. Referred to
during planning (`/kit` + a panel on Schemes) and injected into every AI planning feature, so
practical suggestions fit the kit we actually own.

## J. Phase 6+ — as built (migrations `0013`–`0017`)

Phase 6 (setup, September & new instances — see PHASE_6_PLAN.md) and the post-phase
improvements shipped; as in §I, the migration files are the source of truth for this section,
and the drafts above stand wherever unchanged.

### Year scoping (P6, `0013`) — `period_definitions.academic_year_id` · `groups.predecessor_group_id`

```text
ALTER TABLE period_definitions ADD COLUMN academic_year_id BIGINT NOT NULL
  REFERENCES academic_years(id);             -- backfilled to the current year
-- (weekday, slot_order) is now unique PER YEAR, not globally:
CREATE UNIQUE INDEX period_definitions_year_slot
  ON period_definitions (academic_year_id, weekday, slot_order);

ALTER TABLE groups ADD COLUMN predecessor_group_id BIGINT REFERENCES groups(id);
```

The academic year becomes a hard boundary: **day shapes are year-scoped**, so September can
have new lesson times while the old year's record keeps its old ones. The self-FK is the
**predecessor chain** — the same class last year, set by the September rollover (NULL for new
intake and pre-Phase-6 rows) — so a group keeps its identity across the annual rename
(7ARO → 8ARO) without rewriting any history. `0013` also backfills
`settings.setup_complete = 'true'` where timetabled lessons already exist, so only a
brand-new instance gets the onboarding wizard (`/welcome`).

### `lesson_exceptions` (P6, `0014`) — the dated reality over the weekly pattern

```text
lesson_exceptions(id, date,
                  timetabled_lesson_id FK ON DELETE CASCADE,   -- NULL = the whole day
                  kind TEXT CHECK (cancelled | room_change | cover | off_timetable),
                  room_id FK NULL,                             -- for room_change
                  staff_id FK NULL,                            -- for cover
                  note TEXT, created_at)                       -- indexed by date
```

A row either targets **one timetabled lesson on one date** (cancelled / room change / cover)
or, with a NULL lesson, **the whole day** (off-timetable: trips, exam days, snow).
Display-level for now — banners on the lesson screen, ⚠ marks on the week grid, a count on the
Now screen; the clock and availability still follow the recurring pattern.

### `resource_links.adaptation_id` (P6+, `0015`) — per-class adapted resources

```text
ALTER TABLE resource_links ADD COLUMN adaptation_id BIGINT
  REFERENCES lesson_adaptations(id) ON DELETE CASCADE;
-- the one-target CHECK now spans six columns: exactly one of
-- (course_id, unit_id, lesson_plan_id, occurrence_id, group_id, adaptation_id) is set
```

A resource can now belong to **one class's adaptation** of a lesson — the AI-adapted class
copies. Resetting the adaptation CASCADEs the links away; the documents stay in the store.

### `occurrence_courses.progress_step` · `group_courses.ability_midpoint` (P6+, `0016`)

```text
ALTER TABLE occurrence_courses ADD COLUMN progress_step INT;      -- the in-lesson marker
ALTER TABLE group_courses      ADD COLUMN ability_midpoint TEXT;  -- cohort-level prose
```

`progress_step` is which outline step a class is on for one dated lesson — the movable marker
behind the **in-lesson tracker**; the same tap also writes the textual `stopping_point`, so the
resume machinery and the AI feedback loop keep working off one record. `ability_midpoint` is
the class's recorded anchor for **three-level differentiation** — Core work pitches here,
Support one step below, Challenge one step above. Cohort-level prose only, never a pupil.

### `ta_feedback` (P6+, `0017`)

```text
ta_feedback(id, occurrence_course_id FK ON DELETE CASCADE,
            pupils_text TEXT DEFAULT '',     -- how the pupils were
            lesson_text TEXT DEFAULT '',     -- thoughts on the lesson itself
            safeguarding BOOL DEFAULT false,
            created_at)                      -- indexed (occurrence_course_id, created_at DESC)
```

A TA — logged in with the separate password in `settings.ta_password_hash`, on a locked-down
session — leaves **two-part feedback** on the current lesson. It renders on the teacher's
lesson page and joins the group's recent history feeding "adapt from recent lessons";
**safeguarding-flagged rows are withheld from AI entirely** — the standing boundary.

### `settings` keys — as built (P6/P6+)

Beyond the AI keys seeded by `0007` (§I), the key/value table now also carries: `school_name`;
`auth_password_hash` (the in-app password — `APP_PASSWORD_HASH` in `.env`, where set, always
wins); `setup_complete`; `ta_password_hash` (empty ⇒ TA access disabled); and the email-intake
group — `email_imap_host` / `email_imap_port` / `email_imap_user` / `email_imap_password` /
`email_imap_folder` / `email_imap_tls`, `email_poll_enabled` / `email_poll_minutes`, and
`email_last_poll` (the human-readable status line every poll writes, success or failure).
Phase 8 adds `pupil_access_enabled` (the DPIA-gated master switch — `'true'` only after the
teacher confirms DPO/SLT sign-off), `pupil_dpia_ack` (ISO timestamp of that confirmation), and
`pupil_idle_minutes` (the shared-machine idle-logout default).

## K. Phase 8 — pupils log in & do the work (migration `0018`)

```text
ta_accounts(id, name UNIQUE, staff_id FK→staff ON DELETE SET NULL,
            password_hash, active, created_at)     -- named TA logins; the shared password retires

pupil_credentials(pupil_id PK FK→pupils ON DELETE CASCADE,
            pin_hash,                               -- scrypt, like every credential
            enabled, failed_count,                  -- locked at 5 until the teacher unlocks
            updated_at)                             -- created ONLY once pupil access is enabled

groups.login_code TEXT                              -- the class code (UNIQUE where set); NULL ⇒ no pupil login

pupil_answers(id, pupil_id FK, occurrence_course_id FK, resource_id FK NULL, version_no NULL,
            field_key,                              -- deterministic "t2.r3.c1" / "task.4" from the doc structure
            value DEFAULT '', seen_by_teacher, updated_at,
            UNIQUE(pupil_id, occurrence_course_id, field_key))  -- 0019: keyed on the lesson instance, not the resource_id

pupil_done(pupil_id, occurrence_course_id, done_at, PK(pupil_id, occurrence_course_id))  -- self-declared Done ✓

pupil_levels(pupil_id FK, group_course_id FK, level CHECK in (support|core|challenge), updated_at,
            PK(pupil_id, group_course_id))          -- no row ⇒ core; the slice the pupil receives

pupil_lesson_feedback(id, pupil_id FK, occurrence_course_id FK,
            rating CHECK 1..4, liked DEFAULT '', disliked DEFAULT '', comment DEFAULT '', updated_at,
            UNIQUE(pupil_id, occurrence_course_id)) -- one editable row per pupil per lesson
```

**Pupils never reach `/resources/*`** — worksheet content is rendered server-side into `/me`,
sliced to the pupil's `pupil_levels` row. Answer writes are checked against the pupil's active
enrolment, not just the session, and the worksheet resource is resolved **server-side** for
provenance (the client never supplies a resource id). Field keys derive from the **full**
worksheet structure so the teacher's read-back aligns whichever slice the pupil saw. Answers are
**keyed on the lesson instance** (`pupil_id, occurrence_course_id, field_key` — migration `0019`),
not the worksheet resource, so they survive the class's worksheet resolving to a master vs an
adapted copy or being re-versioned; `resource_id`/`version_no` are recorded as provenance only.
The AI class-work summary (`class_work@1`) sends answers **grouped per question, anonymised**,
through the one wrapper — so a classmate's (or a left pupil's) name typed into an answer is still
tokenised before egress. The redaction roster includes **inactive** pupils for exactly that
reason, and name matching is **Unicode-aware** (accented names like José/Zoë are bounded
correctly, where JS `\b` previously failed open).

## L. Phase 9 — auto-marking & the results loop (migration `0022`)

```text
mark_schemes(id, resource_id FK→resources ON DELETE CASCADE, version_no,
             source CHECK(generated|derived|teacher), status CHECK(draft|ready),
             UNIQUE(resource_id, version_no))        -- one scheme per worksheet resource version

mark_scheme_points(id, mark_scheme_id FK ON DELETE CASCADE,
             field_key,                               -- SAME keys as pupil_answers ("t2.r3.c1")
             kind CHECK(tick|choice|exact|numeric|keyword|open),
             expected, alternatives TEXT[], marks, required, display_order)

pupil_marks(id, pupil_answer_id FK→pupil_answers ON DELETE CASCADE UNIQUE,
             marks_awarded, marks_total, points_hit BIGINT[], evidence TEXT[],
             marker CHECK(auto|ai|teacher), confidence NUMERIC(3,2),
             status CHECK(suggested|confirmed), needs_review, feedback, history JSONB, updated_at)

pupil_lesson_comments(pupil_id FK, occurrence_course_id FK, comment, updated_at,
             UNIQUE(pupil_id, occurrence_course_id)) -- the teacher's comment back

pupil_devices(id, pupil_id FK ON DELETE CASCADE, token_hash UNIQUE, label,
             last_used_at, expires_at, created_at)   -- "stay signed in" (sha256 of the cookie secret)

pupil_profiles(pupil_id PK FK, digest, updated_at)   -- "what works for me" (pupil-keyed bridge)

-- plus: occurrence_courses.marks_released_at TIMESTAMPTZ                 (the hold-mode release)
--       group_courses.marking_trigger  CHECK(on_done|manual)   DEFAULT on_done
--       group_courses.results_mode     CHECK(instant|on_release) DEFAULT instant
--       group_courses.show_scores      BOOLEAN DEFAULT false      (ticks-only by default)
--       group_courses.devices_enabled  BOOLEAN DEFAULT false      (remembered devices off by default)
```

The whole surface is gated by the `pupil_marks_enabled` setting (the 9.0 DPIA-addendum gate, off
by default, requires acknowledging DPO/SLT sign-off + pupil access already on). **Marking resolves
the scheme via the lesson instance** (`occurrence_course → bound plan → the class's current
worksheet resource + version`), matching answers by `field_key` — not via `pupil_answers.resource_id`
(nullable provenance). **AI open-answer marking sends anonymous, slot-lettered per-question batches**
(no pupil id/name; the slot→pupil map stays server-side) through the one wrapper; **guard-matched
answers are withheld from the AI entirely** and flagged for the teacher. Pupils see **only confirmed
marks**, gated by the per-class `results_mode` (instant on confirm, or held until `marks_released_at`
is set). `pupil_profiles`/`pupil_devices` are **pupil-keyed** with no teacher/class binding — the
multi-teacher forward-compat choice (PHASE_9_PLAN §13).

## M. Phase 10 — trustworthy in daily use (migrations `0023`–`0027`)

Phase 10 (see [PHASE_10_PLAN.md](PHASE_10_PLAN.md)) made the privacy/safeguarding promises real and
stopped the app silently losing work. As before, the migration files are the source of truth.

### `mark_schemes.resource_id` → `ON DELETE SET NULL` (`0023`)

```text
ALTER TABLE mark_schemes ALTER COLUMN resource_id DROP NOT NULL;
-- FK re-created ON DELETE SET NULL (was CASCADE)
```

Closes the footgun `0020` fixed for `pupil_answers`: deleting a worksheet resource would have
silently deleted its mark scheme and left marks dangling. There is no hard-delete path for resources
today, so this is latent — but made safe and consistent.

### `pupil_disposals` (P10.2, `0024`) — the erasure / leaver audit

```text
pupil_disposals(id, ai_token TEXT,                  -- the KEPT, non-identifying token ("PUPIL_7")
                action CHECK (anonymise | erase),
                detail JSONB DEFAULT '{}',          -- per-table counts removed/detached
                created_at)                          -- indexed created_at DESC
```

Pupil erasure / leaver anonymisation is "a deliberate, audited retention action" (SECURITY,
DPIA §7). This records **that** it happened and what it removed **without re-storing the identity
that was just removed** — the stable `ai_token` is kept (not identifying on its own), so the audit
reads "PUPIL_7 erased on `<date>`, removed N answers".

### `safeguarding_review` + `pupil_marks.disclosure` (P10.4, `0025`) — the disclosure register

```text
ALTER TABLE pupil_marks ADD COLUMN disclosure BOOLEAN NOT NULL DEFAULT false;  -- set when the
                                          -- content guard withholds an answer from the AI

safeguarding_review(source_type CHECK (answer | captured | ta_feedback),
                    source_id BIGINT,               -- the flagged row in its own table
                    status CHECK (recorded | actioned | referred) DEFAULT 'recorded',
                    action_note TEXT DEFAULT '', updated_at,
                    PRIMARY KEY (source_type, source_id))
```

A guard-matched pupil answer used to wear the same generic "⚠ needs your eyes" badge as a benign
low-confidence mark, so a real disclosure could be lost in the noise. The distinct `disclosure` flag
tags it; `safeguarding_review` gives the teacher **one place** to review every flagged item
(disclosure answers + safeguarding-flagged captured items + TA feedback) and **record what was done**.
A flagged item with no row here is implicitly *new* (unreviewed); the row is created lazily on the
first action. It is a **record-of-handling, never a referral system, and never sent to any AI**.

### `marking_queue` (P10.9, `0026`) — the durable open-marking queue

```text
marking_queue(occurrence_course_id PK FK→occurrence_courses ON DELETE CASCADE,
              due_at TIMESTAMPTZ,                    -- indexed
              created_at)
```

The "mark as pupils finish" open-answer AI pass was a debounced in-process `setTimeout`, so a
reboot/crash/redeploy during a live lesson silently dropped every pending mark (the NFR requires
"survives a server reboot"). The pending job is now persisted here: a boot sweep + periodic tick run
any that are due, one row per occurrence-course; a fresh "Done" tap pushes `due_at` forward so
finishers still batch. `markOpen` is idempotent (only marks unmarked answers), so running a job twice
is harmless — and the [services/markingQueue.ts](../app/src/services/markingQueue.ts) re-arms a job
on an `unavailable`/failed pass rather than dropping it (review fix #7).

### `pupil_unit_signal` (P10.24, `0027`) — a per-unit progress traffic-light

```text
pupil_unit_signal(pupil_id FK ON DELETE CASCADE, unit_id FK ON DELETE CASCADE,
                  signal CHECK (behind | on_track | exceeding), updated_at,
                  PRIMARY KEY (pupil_id, unit_id))
```

A one-tap per-unit traffic-light per pupil (SPECIFICATION §5.7 C). Teacher-only signal; **never
AI-bound**.

## N. Phase 11 — the teacher's idea backlog (migrations `0028`–`0037`)

Phase 11 (see [MORE_IDEAS.md](MORE_IDEAS.md)) is largely built. Every new AI input here is
cohort/curriculum-level and rides the wrapper's `context[]` (so it inherits redaction → withholding →
egress-assert → audit); **none names or describes an individual pupil**.

### `teaching_concepts` (idea 1.1, `0028`) — a library of cohort-level teaching ideas

```text
teaching_concepts(id, course_id FK→courses ON DELETE CASCADE,  -- NULL = all courses
                  title, body, tags,
                  active BOOL DEFAULT true,          -- archive, never delete (kit convention)
                  created_at, updated_at)            -- partial index (course_id) WHERE active
```

Concepts/ideas the AI should weave into lessons where they fit — course-scoped, with `course_id`
NULL meaning "applies to every course".

### `group_courses.guided_access` (idea 7, `0029`) — the per-class access questionnaire

```text
ALTER TABLE group_courses ADD COLUMN guided_access JSONB;
```

A small, optional per-class questionnaire (VI → min font, short attention, reading age, EAL,
dyslexia-friendly, low typing). The raw answers live here; a deterministic builder derives
**cohort-level constraint lines** that ride `context[]` into the class-scoped generators
(`adapt_lesson` / `adapt_resources`). Sits on `group_courses` with the per-class teaching context, so
the September rollover carries it forward like the other per-class fields.

### `course_spec_points` + `lesson_plan_spec_points` (idea 10 slice 1, `0030`) — the coverage backbone

```text
course_spec_points(id, course_id FK ON DELETE CASCADE,
                   code, title, exam_weight INT NULL,
                   active BOOL DEFAULT true, display_order,
                   created_at, UNIQUE (course_id, code))      -- re-import upserts by code

lesson_plan_spec_points(lesson_plan_id FK ON DELETE CASCADE,
                        spec_point_id FK ON DELETE CASCADE,
                        source CHECK (teacher | ai) DEFAULT 'teacher',
                        PRIMARY KEY (lesson_plan_id, spec_point_id))   -- index on spec_point_id
```

The source-of-truth list of what a course **must cover** (pasted from the spec), with a mapping from
each lesson to the points it covers — so "what isn't yet covered" becomes a deterministic query
rather than an implicit guess. Reference/curriculum data only; no pupil identity ever attached.
**`cloneSchemeNewVersion` copies the mappings on a version bump**, or coverage would silently reset to
zero at every September rollover.

### `courses.exam_date` (idea 10 slice 2, `0031`) · `group_courses.scheme_auto_adapted` (`0032`) · `group_courses.covered_summary` (`0033`)

```text
ALTER TABLE courses       ADD COLUMN exam_date DATE;                              -- 0031
ALTER TABLE group_courses ADD COLUMN scheme_auto_adapted BOOLEAN NOT NULL DEFAULT false;  -- 0032
ALTER TABLE group_courses ADD COLUMN covered_summary TEXT;                        -- 0033
```

`exam_date` lets AI scheme authoring reserve revision time before it (and the coverage page show how
long is left); nullable, non-exam courses leave it blank. `scheme_auto_adapted` is a one-shot flag —
the background whole-scheme adapt fires automatically the first time a class has **both** a scheme and
some teaching context, and never re-fires on its own (the teacher re-runs it by hand). `covered_summary`
is a short "what this class has covered so far" prose summary, generated by the class-intake tool at
setup and fed to planning so the AI builds on prior learning. Both `group_courses` fields are
cohort-level prose only.

### `course_documents` (idea 9, `0034`) — official course documents

```text
course_documents(id, course_id FK ON DELETE CASCADE,
                 role CHECK (spec | examiners_report | past_paper | reference),
                 title, content TEXT DEFAULT '', char_count INT DEFAULT 0,
                 created_at)                          -- indexed by course_id
```

The extracted text of an uploaded spec / examiners' report / past paper, referenced when the AI
authors schemes/lessons for the course. Teacher-previewed/editable (extraction can be rough); only a
**capped slice** is ever sent to the model. Reference/curriculum data only — never pupil data.

### `lesson_reviews` (Wave 5, idea 8 lean cut, `0035` + `0036`) — the advisory AI reviewer's store

```text
lesson_reviews(id, lesson_plan_id FK ON DELETE CASCADE,
               group_course_id FK ON DELETE CASCADE,  -- NULL = master scope (v1 always NULL)
               verdict CHECK (keep | tweak | rework),
               findings JSONB DEFAULT '[]',           -- [{issue, fix}], worst first, max 3
               suggested_objectives, suggested_outline, rationale,
               model, prompt_version,
               status CHECK (open | applied | dismissed) DEFAULT 'open',
               created_at)

-- 0036: at most ONE open master review per lesson, enforced in the DB (race-proof)
CREATE UNIQUE INDEX lesson_reviews_one_open_idx ON lesson_reviews (lesson_plan_id)
  WHERE status = 'open' AND group_course_id IS NULL;
```

A review critiques a **not-yet-taught master lesson** against the spec / official documents and
proposes an improved version the teacher **Applies** (writes to the master via `updatePlanField`) or
**Dismisses** — the master is **never** mutated automatically. Only `open` rows are surfaced/badged.
The partial unique index makes the service's check-then-insert race-proof (`createReview` uses
`ON CONFLICT DO NOTHING`, so the loser of a race is a harmless skip); it replaced the plain index from
`0035`. `group_course_id` is reserved for a future per-class scope; v1 always writes NULL. See
[CHANGELOG](../CHANGELOG.md) "Wave 5".

### `processed_emails` (reliability, `0037`) — idempotent email intake

```text
processed_emails(dedup_key TEXT PRIMARY KEY, processed_at)
```

The poller writes the task/event **before** it sets the IMAP `\Seen` flag; if that flag-set fails (a
dropped connection) the message stays unseen and the next poll would re-import it as a duplicate. This
records a per-message dedup key (the email's `Message-ID`, or a content hash when absent — see
[lib/mime.ts](../app/src/lib/mime.ts) / [services/emailPoll.ts](../app/src/services/emailPoll.ts)) so
a re-seen message is skipped. Reference/log data only.

## Key modelling decisions (for discussion)

1. **Plan vs. occurrence are separate.** `lesson_plans` are reusable; `lesson_occurrences`
   are dated and hold what actually happened. This is what makes the record reusable for
   planning.
2. **Multiple courses per slot** is modelled twice: at the recurring level
   (`timetabled_lesson_courses`) and the dated level (`occurrence_courses`), each carrying
   its own plan and stopping point.
3. **Lessons-per-week lives on `group_courses`**, not the group, because a group doing two
   courses can meet a different number of times for each.
4. **Notes use nullable typed FKs**, not a generic polymorphic pair, to keep FK integrity.
5. **Pupil redaction is structural:** `pupils.ai_token` means the AI layer substitutes a
   stable placeholder; the mapping never leaves the database. See SECURITY_AND_PRIVACY.
6. **Free periods, duties, clubs and TA lessons are all just `timetabled_lessons`** with a
   `purpose` / non-self `staff_id`, so one timetable query renders everything — and break/lunch
   `club`/`open_room` rows mark those periods as *not* work windows.
7. **The app hosts resources** (single source of truth) with `resource_versions` history, so
   teacher and AI edits are reviewable and reversible — not links to scattered copies.
8. **Durable vs. year-specific split:** courses/schemes/plans/resources/notes are
   year-independent; `groups`/`timetabled_lessons`/`enrolments` carry `academic_year_id`.
   Rollover keeps the former and re-creates the latter.
9. **Focus surfacing is data, not guesswork:** `tasks.cognitive_load`, `context`, `due_rule`
   and `events` lead-times let the app pick the single next action for the moment.
10. **Actuals come from timers, not memory:** `time_entries` record real elapsed time
    (interruptible, one running at a time); `(estimate, actual, task_type)` history is the fuel
    for AI duration calibration.
11. **Captured info reuses `notes`** (`kind='captured'`) with an AI `category` + entity links,
    so "things I was told" resurface next to the pupil/class/date they concern.
12. **Safeguarding is a hard AI boundary:** `notes.safeguarding=true` items are withheld from
    every AI call (not just redacted) — enforced in the one LLM wrapper.
13. **"Current interest" is a flag + a learned signal:** `interest` on notes/tasks marks it
    explicitly; the AI infers a time-decaying interest profile to bias what surfaces (§5.18).

Open data questions (room for change) are tracked in [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).
