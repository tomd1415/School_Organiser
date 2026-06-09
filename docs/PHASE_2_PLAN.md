# Phase 2 Build Plan — Tasks, Time, Events, Focus & Captured Info

Detailed, reviewable build plan for **Phase 2** of [ROADMAP.md](ROADMAP.md): *plan the day's work
and capture what actually happened*. Grounded in [SPECIFICATION.md](SPECIFICATION.md) (§5.5–5.18),
[DATA_MODEL.md](DATA_MODEL.md) (the P2 tables), [UX_FLOWS.md](UX_FLOWS.md) (§5, §6, §10, §11),
[ARCHITECTURE.md](ARCHITECTURE.md) (the services), and [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md)
(the pupil-data + safeguarding boundary). Phase 1 (the MVP) is complete; this builds on it.

**Done when** (from the roadmap): emails and tasks land in one place, get planned into your real
work windows, time gets logged (planned vs. actual), and the day has a *single next action* and an
end-of-day wind-down. Schemes/resources are Phase 3; **all** AI is Phase 4.

**Sequencing principle:** capture the work first, then plan it into time, then reduce it to one
action. Tasks are foundational (events, work blocks, timers, focus and captured items all link to
them), so they come first; the **AvailabilityService** and **FocusService** are the two testable
"hearts" of this phase, the way `ClockService` was for Phase 1.

---

## 0. What Phase 2 changes vs Phase 1

Phase 1 established the shape we keep: server-rendered HTML + HTMX, `routes → services → repos`,
pure services unit-tested, DB-backed work covered by `tests/integration` + an authenticated
screen-render test, `./start.sh`/`./stop.sh`, idempotent seed.

**New services** (`src/services/`): `TaskService`, `AvailabilityService`, `WorkBlockService`,
`EventService`, `TimerService`, `FocusService`, `EmailIntakeService`, `PrepService`.
**New repos** (`src/repos/`): `tasks`, `events`, `workBlocks`, `timeEntries`, `pupils`, `prep`,
`captured`, `tags`.
**New routes**: `tasks`, `time`, `focus`, `events`, `captured`, `pupils`. The **Now** screen and
the **lesson detail** accrete new sections (before-the-bell tasks, prep, work block, focus entry,
lesson timer).

**Reused as-is:** `ClockService` (due-rules + availability + "what's now"), `TimetableService`,
`lib/notesView.ts` (captured info *is* a note, `kind='captured'`), the HTMX autosave / out-of-band
"saved" pattern, the `n` shortcut, and the integration-test harness (login with the test password).

**Principle — manual now, AI in Phase 4.** Phase 2 builds the data and the *manual* workflow for
everything; Phase 4 layers AI on top without changing the schema. See §10. This keeps the
"useful without the AI" guarantee (SPEC §3.3) intact.

---

## 1. Build order (each row a reviewable commit/PR)

| # | Goal | Key files | Done when |
| --- | --- | --- | --- |
| **2.1 ✅** | **Schema** — all P2 tables + deferred FKs | `migrations/0003_phase2.sql` | done — 13 tables migrate clean; typecheck green |
| **2.2 ✅** | **Tasks** — capture, inbox & triage | `repos/tasks.ts`, `services/task.ts`, `lib/taskView.ts`, `routes/tasks.ts` | done — inbox/open/done; inline autosave triage (urgency/estimate/load/group/context); ＋new; nav |
| **2.3 ✅** | **`due_rule` + Now "before the next bell"** | `services/task.ts` (resolver), `routes/now.ts` | done — pure `resolveDueRule`/`beforeNextBell`; urgent + by-next-lesson + due-before-bell on Now |
| **2.4** | **Email paste-box → draft task** | `services/emailIntake.ts`, `routes/tasks.ts` | paste an email → draft task, source kept (`email_intake`) |
| **2.5** | **Events & deadlines** | `repos/events.ts`, `services/event.ts`, `routes/events.ts` | events/deadlines/exams + parental-contact log; lead-time reminders; "what's coming"; on Now |
| **2.6** | **Availability + work blocks** (plan vs actual / diverted) | `services/availability.ts`, `services/workblock.ts`, `repos/workBlocks.ts`, `routes/time.ts` | real work windows computed; plan a block; one-tap **diverted** keeps the plan; planned-vs-actual log |
| **2.7** | **Timers** | `services/timer.ts`, `repos/timeEntries.ts` | one timer at a time, interruptible; actuals accumulate; estimate-vs-actual report |
| **2.8** | **Prep checklists** (before the bell + start/end-of-day) | `repos/prep.ts`, `services/prep.ts` | per-lesson + daily checklists; recurring templates materialise per occurrence; undone shown on Now |
| **2.9** | **Focus mode + end-of-day wind-down** | `services/focus.ts`, `routes/focus.ts` | one next action (urgency/due/fit/load), shown as steps; morning/free/end-of-day; "go home" |
| **2.10** | **Captured info** ("things I've been told") | `repos/captured.ts`, `routes/captured.ts` | frictionless capture; manual category; resurfaces by entity/date; **safeguarding** flag |
| **2.11** | **Pupils, enrolments, mentions, tags** + **DPIA** | `repos/pupils.ts`, `routes/pupils.ts`, `docs/DPIA.md` | **DPIA written first**; pupils (+`ai_token`); outstanding-pupil mentions; note tags |
| **2.12** | **Task enrichment** — recurrence, sub-tasks, current-interest | `services/task.ts` | recurring + per-lesson tasks; manual sub-steps; one-tap current-interest |

---

## 2. Migration `0003_phase2.sql` — schema

The P2 subset of [DATA_MODEL.md](DATA_MODEL.md) (full columns there). Same conventions as `0002`.
**Tables to create:**

- `tasks` — the hub. `source CHECK (manual,email,note,event,recurring)`; `urgency CHECK
  (urgent_today,by_next_lesson,this_week,someday)`; `status CHECK (inbox,triaged,scheduled,
  in_progress,done,dropped)`; nullable FKs `group_id/course_id/occurrence_id/pupil_id/event_id/
  email_intake_id`; self-FK `parent_task_id`; `due_at`, `due_rule`, `estimate_min`,
  `cognitive_load CHECK (low,medium,high)`, `context`, `recurrence`, `task_type`, `actual_seconds`,
  `interest`, `completed_at`.
- `events` — `kind CHECK (parents_evening,ehcp_review,report_deadline,exam,data_drop,inset,trip,
  open_evening,meeting,parent_contact,other)`; `date`, `start_at/end_at`, `all_day`,
  `affects_availability`, `due_at`, `lead_days`, `pupil_id/group_id/course_id`, `status`.
- `work_blocks` — `date`, `start_at/end_at`, `period_definition_id`, `planned_task_id`,
  `planned_note`, `actual_task_id`, `actual_note`, `status CHECK (planned,done,diverted)`.
- `time_entries` — `kind CHECK (task,lesson,activity,other)`, `task_id`, `occurrence_id`,
  `started_at`, `ended_at NULL`, `seconds NULL`, `source CHECK (timer,manual)`, `note`. **Plus**
  `CREATE UNIQUE INDEX one_running_timer ON time_entries ((1)) WHERE ended_at IS NULL` — at most
  one running timer.
- `email_intake` — `received_at`, `from_addr`, `subject`, `body`, `raw_path`, `processed`,
  `created_task_id`.
- `prep_templates` — `scope CHECK (global,group_course,timetabled_lesson)`, `ref_id`, `text`,
  `display_order`, `active`. `occurrence_prep` — `occurrence_id`, `text`, `done`, `source CHECK
  (template,manual)`, `template_id`.
- `pupils` — `display_name` (local only), `ai_token` (the `PUPIL_n` redaction placeholder), `active`.
- `enrolments` — `pupil_id`, `group_id`, `active`, `UNIQUE (pupil_id, group_id)`.
- `note_pupil_mentions` — `note_id`, `pupil_id`, `text`, `resolved`.
- `tags` (`name UNIQUE`) + `note_tags` (`PK (note_id, tag_id)`).
- `schedule_exceptions` (deferred from P1) — `date`, `scope CHECK (whole_day,period,lesson)`,
  `period_definition_id`, `timetabled_lesson_id`, `kind CHECK (cancelled,room_change,cover,
  off_timetable,event)`, `new_room_id`, `cover_staff_id`, `detail`.

**Deferred FKs to wire up now** (Phase 1 left these as plain `BIGINT` placeholders): add FK
constraints `notes.pupil_id → pupils`, `notes.task_id → tasks`, `notes.event_id → events`,
`note_followups.becomes_task_id → tasks`. (`occurrence_courses.lesson_plan_id` stays a placeholder
until Phase 3.)

**Indexes:** `tasks(status)`, `tasks(due_at)`, partial `tasks(group_id) WHERE group_id IS NOT
NULL`, `work_blocks(date)`, `time_entries(task_id)`, `events(date)`, `occurrence_prep(occurrence_id)`.

---

## 3. The services

Pure logic in services (unit-tested, no DB); SQL in repos. The two **pure hearts** are
`AvailabilityService` and `FocusService`.

- **`TaskService`** — create/triage/schedule/complete/drop; **`resolveDueRule`** (pure, §4);
  recurrence materialisation; sub-task helpers.
- **`AvailabilityService`** (pure, §5) — given a date, return the real **work windows** by
  subtracting teaching, coffee, break, lunch, clubs, meetings and availability-affecting events
  from the day.
- **`WorkBlockService`** — plan a block in a window; the **diverted** path (preserve
  `planned_task_id`, record `actual_*`); the planned-vs-actual day/week log.
- **`EventService`** — events/deadlines/exams + parental-contact log; **lead-time** → "due soon"
  + optional **prep-task generation** (`tasks.event_id`); `affects_availability` removes a window.
- **`TimerService`** (§7) — start/stop/pause/resume with the **one-running** invariant;
  accumulate `tasks.actual_seconds`; the estimate-vs-actual report.
- **`FocusService`** (pure, §6) — rank candidate tasks for *now* and return the **single** best,
  in three modes (morning / free-period / end-of-day) + the wind-down.
- **`EmailIntakeService`** — parse a pasted email (subject/first line → title, body → detail) into
  a draft task linked to an `email_intake` row.
- **`PrepService`** — materialise `prep_templates` into `occurrence_prep` when an occurrence is
  created; toggle items; the daily start/end-of-day checklist.

---

## 4. `due_rule` + the clock

A task's due time is either a hard `due_at` **or** a `due_rule` resolved against the live
timetable — reusing Phase 1's `ClockService`/`TimetableService`. Rule form (DATA_MODEL):
`before_next_lesson:<group_id>`.

**`resolveDueRule(rule, now, ctx)` (pure):** parse the rule → find the **next occurrence of that
group's lesson** at/after `now` (scan teachable periods forward across school days, matching the
group) → the due instant is that lesson's start. Returns `{ dueAt, lessonRef }` or null.

This powers the Now screen's **"BEFORE THE NEXT BELL"** list (urgent-today + anything due before
the next lesson) and the focus ranking. **Test cases** (table-driven, pure): due before today's
next lesson with the group · group not taught again today → next school day · `urgent_today` always
surfaces · `this_week`/`someday` never surface as "before the bell".

---

## 5. Work windows & the diverted path (`AvailabilityService`)

The only work windows are **free periods, before-school and after-school** — **never** break or
lunch (club + pupils in the room), and **not** the 07:30 coffee slot. (SPEC §5.6, §2.)

**`computeWindows(date, ctx)` (pure):** start from the day's `period_definitions`; keep slots that
are `purpose='free'` (from `timetabled_lessons`) or `slot_type ∈ (before_school, after_school)`;
**drop** `Coffee`, `break`, `lunch`, any `purpose ∈ (teaching,form,club,open_room,duty,meeting)`,
and subtract each `events` span where `affects_availability` **plus a 10-minute tidy-up buffer
after it** (the teacher walks back to U1) — e.g. Thu staff meeting 15:45–16:45 blocks 15:45–16:55,
Wed taxi 15:30–16:00 blocks 15:30–16:10. Returns the available spans with their minutes.
**Test cases:** a normal day (3 frees + before/after), an after-school-commitment day (window
shortened by the commitment + 10 min), a non-school day (none), coffee/break/lunch always excluded.

**Work blocks** attach a task to a window span. **The diverted path** (SPEC §5.6, UX §6) is the
one-tap "I did something else": set `status='diverted'` + `actual_note`/`actual_task_id` while
keeping `planned_task_id`. The day/week **time log** rolls up planned vs. actual.

---

## 6. `FocusService` — one thing now (the heart)

The antidote to morning overwhelm and free-period scatter (SPEC §5.12): from all live tasks, show
**one**. Pure and table-tested.

**`pickNext(candidates, now, mode, windowMinutes, energy, ctx)` (pure):** score each task by
**urgency** (urgent_today ≫ by_next_lesson ≫ this_week ≫ someday), **due proximity** (resolved
`due_at`/`due_rule`), **fit** (`estimate_min ≤ windowMinutes`), **cognitive-load vs. energy**, and
a light **current-interest** bias. Return the top one + its sub-steps.

**Three modes** tune the weights: `morning` ("what first"), `free_period` ("commit to one, time
it"), `end_of_day` (**only** low-load/urgent; everything heavier parked). **Wind-down:** when no
urgent/quick item remains in end-of-day mode → "✅ you're done — go home" (protects the
leave-earlier goal). "Too big → break down" creates manual sub-steps now (AI breakdown in P4).

**Test cases** (table-driven): morning picks the high-urgency heavy job; a 20-min free period
won't surface a 90-min task; end-of-day hides high-load work; wind-down returns "done" when the
queue is only someday/this-week; current-interest breaks ties.

---

## 7. Timers (`TimerService`)

SPEC §5.16. **One timer at a time**, enforced by the partial unique index plus app logic: starting
a task stops any running entry first. **Interruptions are first-class** — pause writes `ended_at`
+ `seconds`; resume opens a new entry; the total accumulates across sittings into
`tasks.actual_seconds`. A **lesson timer** on Now shows elapsed/remaining for the current period
(from `ClockService`, no DB write). The **estimate-vs-actual report** groups by `task_type`. The
captured `(estimate_min, actual_seconds, task_type, cognitive_load)` history is the fuel for the
**Phase 4** AI calibration (no AI here).

---

## 8. Screens & routes

Server-rendered + HTMX, CSRF via the same `hx-headers` pattern, per-route Zod.

| Screen (SPEC/UX) | Route(s) | Notes |
| --- | --- | --- |
| **Now** enrichment (§5.2) | extend `/`, `/now/clock` | "Before the next bell" (urgent + by-next-lesson + undone prep), free-period **work block** + "what I actually did", **focus** entry, **lesson timer** |
| **Tasks** (§5.5, UX §5) | `/tasks`, `POST /tasks…`, paste-email | inbox / today / scheduled / done; quick-capture; triage (urgency, estimate, load, context, links) |
| **Time planner** (§5.6, UX §6) | `/time`, `/time/report` | the day's windows + blocks; one-tap plan / done / **diverted**; weekly planned-vs-actual roll-up |
| **Focus** (§5.12, UX §10) | `/focus`, `/focus/winddown` | one next action as steps; done-and-next; "too big → break down"; end-of-day "go home" |
| **Events** (§5.13) | `/events`, deadline/event/contact forms | "what's coming" (events + deadlines + by-next-lesson); parental-contact log; countdowns |
| **Captured** (§5.17, UX §11) | `/captured` | one-line capture; filed list; set/override category; **safeguarding** highlight; promote to task/event |
| **Pupils** (§5.7) | `/pupils`, pupil detail | roster per group; outstanding-pupil mentions from lesson notes; enrolments |

---

## 9. Pupils, safeguarding & the DPIA gate

Phase 2 is the first phase to hold **pupil names**, so it is gated by
[SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md):

- **Write `docs/DPIA.md` first** (mirrors `exam_questions/DPIA.md`) — *before* any real name is
  entered. This is a hard gate on 2.11.
- `pupils.display_name` is **local only**; `pupils.ai_token` (`PUPIL_n`) is the stable placeholder
  the **Phase 4** LLM wrapper will substitute — names never leave the building attached to an identity.
- **Safeguarding boundary established here:** `notes.safeguarding` / captured items flagged
  safeguarding are **highlighted** and earmarked to be **withheld entirely from AI** (never sent,
  not merely redacted). The flag and UI land in Phase 2; the *enforcement* lives in the single LLM
  wrapper in Phase 4. Marking the boundary in the data now means Phase 4 cannot leak it.
- Start with **freeform mentions** (`note_pupil_mentions`); a roster import is optional later.

---

## 10. Manual now, AI in Phase 4 (explicit)

To keep Phase 2 AI-free, these are **manual/heuristic** here and become AI in Phase 4 — same
columns, no re-migration:

| Capability | Phase 2 (manual) | Phase 4 (AI) |
| --- | --- | --- |
| Cognitive-load / context tags | you set them | AI suggests, learns from your overrides |
| Captured-info category + entities | you pick a category | AI categorises + extracts + links |
| Task breakdown (sub-steps) | you split it | "too big → break down" via AI |
| Estimate calibration | timers capture actuals | AI predicts from history |
| Current interest | one-tap flag | learned, time-decaying profile biases surfacing |

---

## 11. Test strategy

- **Pure unit (priority):** `resolveDueRule`, `AvailabilityService.computeWindows`,
  `FocusService.pickNext`, the timer-accumulation maths — all table-driven, no DB. These are the
  Phase-2 equivalents of the ClockService tests.
- **Integration (dev DB):** task create/triage/complete; work-block **divert** preserves the plan;
  timer **one-running** invariant (starting stops the previous); event → prep-task; template →
  `occurrence_prep` materialisation; captured promote-to-task. Self-cleaning on far-future dates.
- **Authenticated screen render:** extend `tests/integration/screens.int.test.ts` to cover
  `/tasks`, `/time`, `/focus`, `/events`, `/captured`, `/pupils` (login → 200 → key markers).
- **Regression guards:** a task with a `due_rule` pointing at a group that isn't taught again
  resolves to the next school day, not "now"; break/lunch/coffee never appear as work windows.

---

## 12. Confirmations needed (teacher inputs)

Gathered up-front or at the relevant increment — none block starting 2.1/2.2:

1. **`due_rule` set** — confirm: "by next lesson with group X", a hard date/time, "by end of day".
   Any others (e.g. "before the next time I see this group's *course*")?
2. **After-school commitments — ANSWERED:** **none** are workable, and a **10-min tidy-up buffer
   after each** is also blocked (back to U1). Tue club 15:30–17:00; Wed taxi 15:30–16:00; Wed
   staff-TTRPG 17:00–20:00 **fortnightly** (anchor date still needed); Thu staff meeting 15:45–16:45
   (sometimes →17:45); Fri club 15:30–17:00. Seed as recurring `events` (`affects_availability=true`).
3. **Wednesday taxi-number duty — ANSWERED:** 15:30–16:00.
4. **Prep templates to seed** — global (e.g. "Assign resources to MS Teams"), per-course, per-lesson.
5. **Start-of-day / end-of-day checklist items** — the morning set-up and the "before I leave" sweep.
6. **Parental-contact log fields** — who · when · medium (call/email) · why · **owed vs. done**.
7. **Target leave times** for the wind-down — ~19:00 most days, **Tue 17:30**, **Wed 20:00** on
   staff-TTRPG weeks (already in `settings`; confirm).
8. **Email paste** — parse sender/subject heuristically, or just body → task title + detail?
9. **DPIA + pupil data** — when will real names be entered? (decides when 2.11 unlocks.)
10. **Exam/key dates** — which boards/dates to seed as events with lead-time reminders.

---

## 13. Out of scope for Phase 2 (deferred, by design)

- **Phase 3:** schemes of work, units, lesson plans, the hosted/versioned **resource store** and
  bulk-import — so the lesson "Plan" and "Resources" stay placeholders until then.
- **Phase 4:** **all** AI (planning drafts, summaries, curriculum redesign, the LLM wrapper +
  redaction enforcement, categorisation, estimate calibration, the learned interest profile).
- **Phase 5:** global search, saved filters, the academic-year **rollover UI**, deeper MS Teams,
  IMAP email v2, a TA read/feedback login, print queue.
- **Never:** a full markbook / reporting-to-parents / MIS replacement; pupil-facing features.

---

## 14. Recommended first slice

Ship **2.1 + 2.2 + 2.3** together — the schema, the **task loop** (capture → inbox → triage →
done), and its **Now integration** (urgent + by-next-lesson "before the next bell"). That's
immediately useful on top of the MVP and is the foundation everything else in Phase 2 links to
(events, work blocks, timers, focus and captured items all reference tasks). 2.4–2.12 then follow
as independent, each-shippable commits, with **AvailabilityService** (2.6) and **FocusService**
(2.9) as the two pure, heavily-tested cores.
