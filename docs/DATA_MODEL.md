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

   academic_years · events · prep_templates · resource_versions · time_entries · settings · term_dates · schedule_exceptions · ai_calls   (cross-cutting)
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
| `recurrence` | TEXT NULL | rule, e.g. `weekly:fri`, `per_lesson:<group_course_id>` |
| `task_type` | TEXT NULL | grouping for calibration (e.g. `marking, email, resource_prep, admin`) |
| `actual_seconds` | INT NULL | accumulated from `time_entries` (cached for calibration) |
| `completed_at` | TIMESTAMPTZ NULL | |

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

### `settings` (P1)

| `key` TEXT PK · `value` TEXT |

Holds default arrival/leave times, the **target leave time** (for the end-of-day wind-down),
the AI provider/model, the resource **file-store path**, the current academic year, and the
fortnightly staff-TTRPG anchor date. No A/B teaching cycle — single repeating week.

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
| `kind` | TEXT | CHECK `parents_evening, ehcp_review, report_deadline, data_drop, inset, trip, open_evening, meeting, other` |
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

Open data questions (room for change) are tracked in [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).
