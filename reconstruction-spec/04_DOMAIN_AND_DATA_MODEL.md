# Domain and data model

## 1. Modelling goals

The target model should preserve current behaviour with fewer historical seams. Use PostgreSQL constraints for identity, uniqueness, exclusivity, and state invariants. Keep files outside the database but make file and database lifecycle one logical operation.

All timestamps are `timestamptz`; school dates are `date`; period times are `time`; IDs are `bigint` or UUID consistently. Store one `school_timezone` setting and perform date resolution through a single clock service.

## 2. Target domain modules

1. Identity and settings
2. Academic structure and schedule
3. Curriculum and delivery
4. Resources and authored documents
5. Teacher work management
6. Notes, captures, and safeguarding
7. Pupil access and work
8. Assessment and progress
9. AI audit and background jobs
10. Retention, export, and file lifecycle

## 3. Recommended target tables

### 3.1 Identity and settings

#### `users`

Teacher and named TA accounts. Fields: `id`, `role teacher|ta`, `display_name`, `password_hash`, `staff_id`, `active`, `session_epoch`, `created_at`, `updated_at`.

Constraints: exactly one active teacher in v1; unique normalised login identity if usernames are introduced. Do not retain a shared TA password in the clean model.

#### `settings`

`key`, `value_json`, `secret_ciphertext`, `updated_at`. Non-secrets use validated JSON. Secrets are envelope-encrypted with a key supplied outside the database, or environment-managed and absent from this table.

#### `audit_events`

Security/admin events such as login lock, access-switch changes, mark release, disposal, export, and destructive import. Fields: actor, action, object type/id, redacted detail JSON, timestamp, request correlation ID.

### 3.2 Academic structure

#### `academic_years`

`id`, `name`, `start_date`, `end_date`, `is_current`, timestamps. Partial unique index ensures one current year. Check `start_date <= end_date`.

#### `calendar_ranges`

Replaces narrowly named term rows. `academic_year_id`, `name`, `kind term|half_term|holiday|inset`, `start_date`, `end_date`. Exclusion/validation prevents impossible ranges where required.

#### `periods`

Year-scoped weekday slots: `academic_year_id`, `weekday 1..7`, `order`, `kind`, `label`, `lesson_index`, `start_time`, `end_time`, `teachable`. Unique `(year, weekday, order)`; check start < end.

#### `staff`, `rooms`, `courses`, `groups`

Keep current concepts. Groups remain year-scoped and may reference `predecessor_group_id`. Courses are durable across years and include teaching context, qualification metadata, exam date, and colour.

#### `group_courses`

`group_id`, `course_id`, active, lessons/week, class context, ability midpoint, guided-access JSON, marking policy, covered summary, auto-adapt state. Unique `(group, course)`.

#### `enrolments`

`pupil_id`, `group_id`, `active`, dates. Prefer a unique active pair or explicit membership periods if historical moves must be represented without mutating rows.

#### `timetable_slots`

Recurring schedule item: period, staff, purpose, group, room, optional start/end override, active, notes. Unique `(period, staff)` for the single-teacher design.

#### `timetable_slot_courses`

Links a timetable slot to one or more group courses. Unique pair.

#### `schedule_exceptions`

Use one table only. `date`, nullable `timetable_slot_id` for whole-day, `kind cancelled|free|room_change|cover|off_timetable`, optional new room/staff, note. Add a uniqueness policy preventing contradictory exceptions for the same target/date, or model an explicit precedence and validate it.

#### `club_session_records`

`timetable_slot_id`, `date`, `record`, timestamps; primary key pair.

### 3.3 Curriculum and delivery

#### `schemes`

`course_id`, title, version, status draft|active|archived, labels, timestamps. Unique `(course, version)` and partial unique one active per course.

#### `units`

Scheme, title, display order, source metadata, timestamps.

#### `lesson_plans`

Unit/course, title, order, objectives, outline, duration, kit needed, active, timestamps. Course is retained for plans outside a unit and validation.

#### `lesson_adaptations`

Unique `(group_course, lesson_plan)`. Nullable objective/outline overrides plus note. Add explicit overrides for any other locally editable fields rather than overloading empty strings.

#### `lesson_adaptation_revisions`

Immutable snapshot/event: adaptation, changed fields JSON, author type/id, summary, timestamp.

#### `lesson_occurrences`

Unique `(timetable_slot, date)`. Status, taught-by, week metadata, created time. Occurrence creation is intentional and idempotent.

#### `occurrence_sections`

Current `occurrence_courses`: unique `(occurrence, group_course)`, bound plan, stopping point, progress step, planner lock, current slide, slide lock, marks release timestamp.

#### `delivery_bindings`

Optional simplification: future plan placement can be a direct unique `(group_course, timetable_slot, date) → plan` table rather than materialising full occurrences. When the date is actually opened/taught, copy/reference it into `occurrence_sections`. This eliminates ghost occurrences and makes planner writes cheaper. If introduced, define one authoritative resolution rule and migration path.

#### `spec_points`, `lesson_spec_points`, `course_documents`, `lesson_reviews`

Preserve current concepts. Course document content is extracted text plus original resource reference, not an uncontrolled duplicate file.

### 3.4 Resources

#### `resources`

Metadata only: title, kind, source, MIME, external URL, attribution, unit/year tags, AI-editable, active, current version, timestamps.

#### `resource_versions`

Unique `(resource, version_no)`. Opaque storage path, byte size, checksum, author, change note, created time. Lock resource on append.

#### `resource_links`

Prefer typed `target_type` + `target_id` only if application-level referential checks are guaranteed. For strict SQL integrity, retain nullable FK columns with a one-target check. Include adaptation target. Unique links prevent duplicate attachments.

#### `file_deletion_jobs`

Storage path, reason, status, attempts, lease, last error/time. This is a general outbox for files that must disappear after transaction commit.

### 3.5 Teacher work management

#### `tasks`

Title/detail/source, due time/rule, urgency, estimate, status, links, parent, cognitive load, context, recurrence source, task type, interest timestamp, completed time, timestamps. Use check constraints/enums.

#### `recurrence_definitions`

Task template plus structured pattern JSON, active, lead days, cursor date/minute. Do not store recurrence as an unvalidated free-text mini-language in the target.

#### `recurrence_instances`

Definition, due slot key, task ID. Unique `(definition, due_slot_key)` gives durable idempotency.

#### `period_tasks`

Unique `(date, timetable_slot, task)`.

#### `work_blocks`

Date/times or period, planned task/note, actual task/note, status, timestamps.

#### `time_entries`

Kind, task/occurrence link, start/end/seconds, source, note. Partial unique one running timer globally.

#### `events`

Kind, title/detail, date/times, all-day, affects availability, due, lead days, links, status.

#### `checklist_templates`, `checklist_items`

Unify lesson prep and day checklists using scope/type/ref/date, text, order, source, done. Keep a template ID when materialised.

### 3.6 Notes, capture, and safeguarding

#### `notes`

Kind, body, optional occurrence/group/course/pupil/task/event links, category, resurface date, archived, safeguarding, interest timestamp, timestamps.

#### `note_followups`, `note_mentions`, `tags`, `note_tags`

Preserve current optional structure. Mention rows MUST not be the only method used to scrub identity from free text.

#### `ta_feedback`

Occurrence section, author account, pupil/lesson text, safeguarding, timestamp.

#### `safeguarding_cases`

Use a stable source reference plus source type, handling status, action note, actor, timestamps. A flagged source should create/update a register entry transactionally or the register should query all flagged source tables through a tested union.

### 3.7 Pupils and access

#### `pupils`

Display name, unique AI token, active, test flag, session epoch, timestamps. No DOB/contact/diagnosis unless a separately approved requirement adds them.

#### `pupil_credentials`

Pupil ID, password/PIN hash only, enabled, failure count, lock timestamp, updated time. Do not retain plaintext PIN.

#### `pupil_devices`

Pupil, token hash, label, expiry, last use, created time.

#### `pupil_levels`

Unique `(pupil, group_course)`, support/core/challenge, updated time.

#### `pupil_answers`

Pupil, occurrence section, resource/version provenance, stable field key, value or file reference, seen flag, timestamps. Unique `(pupil, occurrence_section, resource/version, field_key)` or a deliberately documented replacement rule.

For images, prefer a separate `pupil_answer_files` row with MIME, size, storage path, checksum, and answer ID rather than `value='img:path'`.

#### `pupil_completion`, `pupil_feedback`, `pupil_comments`, `pupil_profiles`, `pupil_unit_signals`, `pupil_atl`

Preserve current concepts and composite uniqueness. ATL score check 1..4. Feedback rating check 1..4.

### 3.8 Assessment

#### `mark_schemes`, `mark_scheme_points`

Scheme tied to worksheet resource/version and source/status. Point tied to stable field key with kind, expected text, alternatives, marks, required, order, optional level-band JSON.

#### `pupil_marks`

One per answer. Awarded/total, hit point IDs, verified evidence, marker, confidence, status, review flag/reasons, feedback, immutable history or separate revision table, timestamps.

#### `marking_jobs`

Occurrence section, job kind, due time, lease/status/attempts/error. Replaces a minimal queue with a reusable durable job record.

### 3.9 AI and jobs

#### `ai_calls`

Feature, provider, model, prompt version, redacted request, response, tokens, estimated/actual cost, status reserved|ok|error|blocked, error summary, lease/reconcile timestamps. Never store unredacted input.

#### `job_runs`

Job key, scheduled slot, status, lease owner/expiry, attempt, started/completed time, redacted result/error. Unique `(job_key, scheduled_slot)`. Use for email polling, recurring generation, brief, review sweep, deletion, and any future scheduler.

#### `processed_external_messages`

Mailbox/message dedup key, state processing|complete, lease, destination type/id, timestamps. Complete destination write and state in one transaction where possible.

### 3.10 Retention

#### `pupil_disposals`

Non-identifying token, action, per-table/file counts, timestamp, actor. No pupil name.

#### `exports`

Optional ephemeral export job metadata: subject type/token, file path, expiry, checksum, status. Auto-delete generated archives.

## 4. Key database invariants

The migration suite MUST prove:

- one current academic year;
- one active scheme per course;
- unique scheme version per course;
- one running timer;
- one occurrence per timetable slot/date;
- one occurrence section per occurrence/group-course;
- one adaptation per class/plan;
- one active answer identity per pupil/section/version/key;
- one mark per answer;
- one open lesson review per plan/scope;
- one recurrence instance per definition/slot;
- one period-task association;
- one club record per slot/date;
- valid enum/range checks;
- resource link has exactly one target;
- class/day planner writes serialise;
- migrations serialise.

## 5. Transactions and outboxes

Operations that MUST be atomic:

- first-run claim;
- password/PIN change with epoch bump/device revoke;
- scheme clone and activation;
- adaptation update plus history;
- planner placement set;
- resource metadata plus first version/current pointer;
- version append/current pointer;
- pupil answer update plus stale-mark invalidation;
- marking confirmation/override history;
- marks release audit;
- recurring task plus instance/cursor;
- email destination plus completion;
- pupil disposal database changes plus durable file-deletion jobs.

Files cannot participate in a PostgreSQL transaction. Use stage → DB transaction → atomic publish/cleanup, or a durable outbox with idempotent retry. Document the chosen failure direction for every file operation.

## 6. Legacy-to-target mapping

| Current concept | Target action |
|---|---|
| `schedule_exceptions` + `lesson_exceptions` | Merge into one `schedule_exceptions` model after precedence validation |
| `staff` + `ta_accounts` | Keep staff identity; move credentials to `users` |
| settings string values | Migrate to validated JSON; encrypt secrets |
| recurrence pattern strings | Parse and migrate to structured pattern JSON |
| `pupil_answers.value='img:…'` | Split into answer + answer-file rows |
| `marking_queue` | Migrate to durable leased `marking_jobs` |
| in-memory daily reviewer claim | Migrate to `job_runs` lease |
| future materialised occurrences | Optionally migrate to `delivery_bindings`; preserve taught/history occurrences |
| `ui_shell`, experience legacy fields | Do not migrate obsolete UI implementation flags; retain only user-facing nav/preferences if useful |

## 7. Data migration acceptance

Migration is complete only after row-count reconciliation, FK/orphan checks, file checksum verification, sampled semantic comparison, current-year timetable comparison, active-scheme comparison, pupil answer/mark provenance validation, and a rollback rehearsal. The legacy database and resource volume remain read-only until the owner signs off the new system.

