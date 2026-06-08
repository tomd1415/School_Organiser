# Specification

What the School Organiser is, who it serves, and every capability it must have. This is the
canonical list of requirements; [DATA_MODEL.md](DATA_MODEL.md), [ARCHITECTURE.md](ARCHITECTURE.md)
and [UX_FLOWS.md](UX_FLOWS.md) describe *how* we satisfy it.

## 1. Problem statement

A computing teacher runs a complex, interrupt-driven day: six 50-minute lessons, multiple
courses (sometimes more than one inside a single lesson), classes that meet 1–3 times a week,
lessons taught by non-specialists that still need planning and oversight, a constant stream
of email-borne tasks, and a head full of "remember to…" that decays the moment the next class
walks in. Existing tools (timetable on paper, resources in folders, tasks in email, notes in
a notebook) are scattered, so context is lost between lessons and almost none of it is
reusable for planning.

The School Organiser unifies these into one fast, glanceable system that is most useful
*in the 30 seconds before and after a lesson*, and whose accumulated record becomes the raw
material for planning lessons and redesigning curriculum (with AI assistance).

## 2. Primary user & context

- **One user**: the teacher. (A read-or-write role for a TA/non-specialist is a possible
  later addition — see §5.8 and OPEN_QUESTIONS.)
- **Devices**: teacher desktop PC and teacher laptop, both on the school LAN. Occasionally a
  phone for quick capture (nice-to-have, not required).
- **Network**: internal Debian web server. No public internet exposure of the app itself;
  outbound HTTPS to an AI provider only.
- **Rhythm**: arrives 07:30–08:00, leaves ~19:00 (Tue 17:30, Wed 20:00 on staff-TTRPG weeks).
  The tool is opened many times a day for short bursts, not long sessions.
- **No slack in the school day**: a **lunchtime club every lunchtime** and **pupils in the room
  every break** mean break and lunch are *not* work time. The only non-teaching work windows are
  the **free periods, before school, and after school** (minus meetings, clubs and events). A
  core goal is to **protect those windows and help the teacher leave earlier**.
- **Executive load is the real enemy.** Mornings bring overwhelm or forgetting; free periods
  scatter across half-done jobs; deadlines (reports, EHCP paperwork, emails) get forgotten; by
  evening the teacher is exhausted. The tool must *reduce* decisions, not add them.

## 3. Design principles

1. **Glanceable first.** The default screen answers "what now, what next, what must I not
   forget" without a click. Everything else is one click from there.
2. **Capture must be frictionless.** Writing a lesson note or logging "what I actually did"
   must take seconds and never block on required fields. Speed beats structure.
3. **Useful without the AI.** Every core function works if the AI provider is down. AI is an
   accelerator on top of a complete manual system, never a dependency.
4. **The record is the asset.** Notes, outcomes and time logs are captured in a structure
   that can later be queried, summarised and fed into planning — not trapped in free text only.
5. **Pupil data is sacred.** Authenticated, backed up, and never sent to AI with names attached.
6. **Boring on purpose.** Standard HTTP, standard SQL, server-rendered HTML. One school, one
   user; no exotic infrastructure.
7. **Built to be edited.** "Large changes to lessons this year" is a stated goal, so courses,
   schemes of work and the timetable must be easy to restructure, version and re-sequence.
8. **Reduce cognitive load, especially at the edges of the day.** The tool can show **one next
   action at a time**, broken into steps, and surface only low-effort/urgent work when energy is
   low — actively helping the teacher finish and go home, not presenting a wall of everything.
9. **Durable content, disposable timetable.** Courses, schemes, resources and the note archive
   persist across years; the timetable and groups are re-entered each year. Everything worth
   keeping carries over automatically.

## 4. Glossary

| Term | Meaning in this app |
| --- | --- |
| **Period / slot** | A named time band in the day (e.g. *Lesson 3*, *Break*, *Morning briefing*). Fixed structure, same most days. |
| **Day shape** | The ordered set of periods for a given weekday (briefing only Mon/Wed/Thu; after-school varies). |
| **Group / class** | A set of pupils taught together, e.g. `9X/Cp1`. |
| **Course** | A subject/qualification of study, e.g. *OCR J277 GCSE CS*, *KS3 Year 8 Computing*. A group can study more than one. |
| **Timetabled lesson** | A recurring weekly assignment: *this group, this course(s), this room, this period, this teacher (me or another teacher/TA)*. Single repeating week. |
| **Lesson occurrence** | A single dated instance of a timetabled lesson (what happened on Tue 9 Sep). Holds notes & outcomes. |
| **Lesson plan** | A reusable plan within a scheme of work: objectives, activities, resources. An occurrence is taught *from* a plan. |
| **Scheme of work (SoW)** | The ordered sequence of lesson plans/units for a course. |
| **Resource** | A teaching file the app **hosts** (slide deck, worksheet, etc.) — uploaded once as the single source of truth, versioned, viewable/downloadable, AI-editable. Attached to a course/unit/plan/occurrence. |
| **Free period** | A timetabled lesson slot with no class — protected time for tasks. (Target: 3/week.) |
| **Non-specialist / cover lesson** | A timetabled lesson taught by a TA or other non-specialist that the teacher plans for and monitors. |
| **Task** | Something to do, possibly from an email, with a due time/urgency and an estimate. |
| **Work block** | A planned span of a **work window** (free period / before / after school) allocated to a task — with what was *planned* vs. what was *actually done*. |
| **Week A / Week B** | Not used — the school runs a single repeating week. (Only the staff TTRPG recurs fortnightly; modelled as an after-hours event.) |
| **Work window** | A non-teaching slot usable for tasks: a free period, before school, or after school. Break and lunch are **not** work windows (club + break-time pupils). |
| **Focus / next action** | A mode that shows a **single** recommended thing to do now, broken into steps — for mornings, free periods and end-of-day. |
| **Cognitive load** | A low/medium/high tag on a task, so heavy work is offered when fresh and light work when tired. |
| **Event** | A dated commitment beyond the normal timetable (parents' evening, INSET, trip, open evening, meeting) that can consume a work window. |
| **Deadline** | A due date with lead-time reminders (reports, EHCP review paperwork, data drops) that can spawn prep tasks. |
| **Prep checklist** | Per-lesson "before the bell" items (resources ready, **assigned to MS Teams**, starter set), some recurring across all lessons. |
| **Academic year** | The yearly container for the timetable, groups and enrolments; content (courses/schemes/resources/notes) carries over on rollover. |
| **Timer / time entry** | A timed work session auto-recorded against a task (or lesson); actuals accumulate across interruptions and feed estimate calibration. |
| **Captured info** | A snippet you were told but can't action yet ("the D12 projector is replaced over half term") — AI-categorised and resurfaced in context. |

## 5. Functional requirements

Written as user stories. **MoSCoW** priority in brackets: **(M)**ust / **(S)**hould /
**(C)**ould / **(W)**on't-yet. The roadmap groups these into phases.

### 5.1 Timetable & calendar

- **(M)** As the teacher, I see my weekly timetable as a grid (periods × days) with every
  band shown: before school, briefing, form, lessons 1–6, break, lunch, after-school.
- **(M)** The fixed period times are encoded once (08:30 briefing … 15:30 end) and day shapes
  vary correctly (briefing Mon/Wed/Thu; after-school per day).
- **(M)** Each teaching slot shows group, course(s), room, and who teaches it (me / named TA).
- **(M)** Free periods are visibly marked as protected task time.
- **(M)** Single repeating week (confirmed — no A/B teaching cycle). The only fortnightly item
  is the staff TTRPG, modelled as a recurring **after-hours event** anchored to a known date.
- **(S)** A **calendar overlay** of term dates, holidays, INSET days, and one-off changes
  (room moves, cover, trips, exams, off-timetable days) so a given date renders correctly.
- **(C)** Per-day "bookend" times (arrival, expected leave) shown for context.
- **(C)** Import/sync from the school MIS timetable export or iCal, rather than hand-entry.

### 5.2 The "Now" dashboard (the home screen)

- **(M)** On open, show the **current period** and the **next period** based on the live
  clock and weekday.
- **(M)** For the current (or next) *teaching* period, show: group, course(s), room, the
  lesson plan to be taught, its resources (one click to open), and a one-tap **note box**.
- **(M)** Show **urgent items due before the next lesson** (e.g. "set task for 9X before
  11:05", "print worksheets for Y10").
- **(S)** During a free period, show the work block planned for it and its task(s), with a
  one-tap "log what I actually did".
- **(S)** Show "where we got to last time" with this group (the stopping point + open
  follow-ups from the previous occurrence).
- **(C)** A countdown to the next bell.

### 5.3 Courses, schemes of work, lessons & resources

- **(M)** Maintain **courses**, each with a **scheme of work** (ordered units → lesson plans).
- **(M)** A **lesson plan** holds objectives, activities/outline, and its **resources**.
- **(M)** **The app hosts resources and is the single source of truth.** Resources are
  **uploaded** to the server and **viewed/downloaded** from it — replacing today's scattered
  copies. (Confirmed change from link-only; see ARCHITECTURE "Resource storage".)
- **(M)** Resources are **versioned**: every change keeps history and is reversible.
- **(S)** **The AI can create and update resources** in the store (e.g. generate or revise a
  worksheet), saved as a new version you can review or roll back — so the single source of truth
  stays current. *Which formats the AI can edit directly is open — OPEN_QUESTIONS Q14.*
- **(S)** **Bulk-import** the existing scattered copies into the store, flagging likely
  duplicates so you can consolidate to one canonical copy.
- **(M)** From any lesson occurrence, view/download the plan and all its resources in one click.
- **(M)** A single timetabled lesson can run **more than one course at once** — e.g. the
  **post-16 room with three courses**, or the **Year 10 class with one pupil on a different
  course**: track each course's plan, resources and notes independently within the slot.
- **(S)** Re-sequence / version a scheme of work easily (supports the planned "large changes").
- **(S)** In-browser **preview** of common formats (PDF/images directly; Office via a
  server-side render), with download always available. *Approach is OPEN_QUESTIONS Q14.*

### 5.4 Lesson notes & observations — *the most important feature*

- **(M)** From the Now screen or any occurrence, capture a note in **seconds**: free text,
  no required fields, autosaved.
- **(M)** Structured-but-optional quick fields on a lesson note, each skippable:
  - **Stopping point** — "where we got to".
  - **Follow-ups** — checklist items that become tasks (e.g. "re-teach loops to PUPIL").
  - **Pupils to chase / outstanding** — who didn't finish / needs attention.
  - **Plan changes** — "this lesson needs X changed next time" → feeds planning.
  - **Pupil progress notes** — short per-pupil observations.
- **(M)** Notes are timestamped and bound to the occurrence, group, and course.
- **(S)** Tag notes (e.g. `#behaviour`, `#assessment`, `#resource-broken`) for later recall.
- **(S)** "Plan changes" and "follow-ups" surface as actionable lists, not just buried text.
- **(C)** Quick capture by voice-to-text or a single keystroke from anywhere in the app.
- **(C)** Pin a recurring reminder to a group ("always check homework first 5 min").

### 5.5 Tasks & email intake

- **(M)** Capture tasks manually with title, optional detail, due (datetime **or** "by next
  lesson with group X"), urgency, and a time estimate.
- **(M)** A **task inbox / triage** view: unscheduled → triaged → scheduled → done.
- **(M)** An **urgent-today** and **by-next-lesson** list, surfaced on the Now screen.
- **(M)** Tasks can be linked to a group, course, lesson occurrence or pupil (e.g. "assign
  task to pupils before the lesson", "prepare resources for Y10 Thu").
- **(M)** **Ingest email into tasks** so emails stop being forgotten. Start with a paste box;
  IMAP later. The source email is kept and linked to the task. See OPEN_QUESTIONS.
- **(M)** Each task can carry a **cognitive-load** level (low / medium / high) and a **context**
  (e.g. needs-computer, quick-win) so the right work surfaces at the right time of day.
- **(M)** **Break a task into sub-steps** (a checklist), by hand or with AI help, so a daunting
  task collapses into one small next action.
- **(S)** **Recurring tasks** — weekly admin, and **per-lesson** items like "assign resources to
  **MS Teams**" that reappear for each lesson.

### 5.6 Time planning & actuals (the work log)

- **(M)** Assign a task to a **work block** within a **work window** — a free period, before
  school, or after school (**not** break or lunch: those are taken by break-time pupils and the
  lunchtime club). The app computes the real available windows from the timetable and events.
- **(M)** **Reality differs from the plan.** With one tap, record that I did *not* spend a
  block on its planned task, and capture **what I actually did** instead (free text and/or a
  different task), without losing the original plan.
- **(M)** A simple daily/weekly **time log** showing planned vs. actual.
- **(S)** Roll-up: where did my non-teaching time actually go this week? (reporting on actuals)
- **(C)** Nudge: unscheduled urgent tasks with no work block before their due time.

### 5.7 Pupils & progress

- **(S)** A roster per group (names stored locally, **never sent to AI**).
- **(S)** Lightweight per-pupil notes/progress, reachable from lesson notes ("outstanding
  pupils").
- **(C)** Simple progress signals per pupil per unit (e.g. on-track / behind / exceeding).
- **(W)** Full markbook / assessment grading — out of scope; this is not a markbook.

### 5.8 Non-specialist / TA-taught lessons

- **(M)** Mark a timetabled lesson as taught by a named non-specialist/other teacher (e.g. the
  **4 Year 7 lessons** taught by another teacher).
- **(M)** Plan those lessons (assign the lesson plan + resources the TA should use) and see
  them clearly flagged in the timetable and a dedicated "lessons I oversee" view.
- **(S)** Capture oversight notes against those occurrences ("check how 8B went with loops").
- **(C)** A TA-facing read view (or simple feedback capture) so the TA can report back.
  Requires a second login — see OPEN_QUESTIONS.

### 5.9 General notes / knowledge base

- **(M)** A place for general notes not tied to one lesson, **integrated** with the rest:
  a general note can link to a course, group, pupil or task.
- **(S)** Full-text search across all notes (lesson + general).
- **(C)** Lightweight wiki-style linking between notes.

### 5.10 AI assistance (planning & curriculum)

- **(S)** "Plan the next lesson" for a group/course: the AI drafts objectives/activities
  using the SoW position + recent lesson notes (stopping point, follow-ups, plan changes) —
  **with pupil names redacted to `PUPIL_NAME`**.
- **(S)** "Summarise this term for group X" from the accumulated notes.
- **(S)** **Curriculum redesign assistant**: given a course's current SoW + notes about what
  worked/didn't, propose a re-sequenced or redesigned scheme (supports the planned big changes).
- **(S)** **Author a new scheme from scratch with AI** — notably the unfinished KS3 *"Effective
  use of computers in school"* scheme — turning rough aims + Teach Computing context into draft
  units/lessons you refine. A concrete early win.
- **(C)** Semantic search over notes/resources (pgvector) — "find when I last taught
  recursion and how it went".
- **(S)** **Estimate calibration & info-filing**: the AI predicts task durations from your
  timed history (§5.16) and categorises captured info (§5.17).
- **(M, cross-cutting)** Every AI call goes through one wrapper that redacts pupil names,
  records the prompt/version/response, and is provider-swappable (OpenAI ↔ Gemini).

### 5.11 Search & recall (cross-cutting)

- **(S)** One search box that finds lessons, notes, tasks, resources and pupils.
- **(C)** Saved filters ("all broken-resource notes", "all follow-ups for Y10").

### 5.12 Focus mode — "one thing now"

- **(M)** A **focus mode** that shows **a single recommended next action**, not the whole list —
  chosen from what's urgent, due before the next lesson, fits the time available, and matches
  current energy. This is the antidote to morning overwhelm and free-period scatter.
- **(M)** The chosen action is shown **broken into steps**; complete-and-advance to the next.
- **(M)** Tuned for three pinch points: **morning** ("what do I do first"), **free period**
  ("commit to one thing, don't half-do five"), and **end of day** ("only low-load/urgent — then
  go home").
- **(S)** A free-period focus view hides everything else and can time the block.
- **(S)** An **end-of-day wind-down**: surface only quick/low-load urgent items, then a clear
  "you're done — go home" when nothing urgent remains, protecting the leave-earlier goal.

### 5.13 Events, deadlines & irregular commitments

- **(M)** Record **after-school and irregular events** — **parents' evenings**, INSET, trips,
  open evenings, one-offs — so they appear in the day, **consume the relevant work window**, and
  adjust the expected leave time.
- **(M)** Track **deadlines** with lead-time reminders — **reports**, **EHCP review paperwork**,
  data drops — so they stop being forgotten; a deadline shows a countdown and can spawn prep tasks.
- **(S)** **EHCP reviews** link to the pupil and carry their prep checklist/tasks.
- **(S)** A unified **"what's coming"** view blends events, deadlines and by-next-lesson tasks.

### 5.14 Academic-year rollover

- **(M)** The app is organised around an **academic year**. Durable content — courses, schemes of
  work, lesson plans, resources, and the note archive — **carries over automatically**; only the
  **timetable, groups and enrolments** are year-specific and re-entered or adjusted.
- **(M)** Rolling into next year **preserves everything** and archives the prior year (still
  viewable). Directly supports "I want this to continue next year with everything carrying over".

### 5.15 Lesson prep checklists

- **(M)** Each lesson can show a **"before the bell" checklist** on the Now screen — e.g.
  resources ready, **assigned to MS Teams**, starter set — so simple prep stops slipping.
- **(S)** Checklist items can be **recurring templates** (every lesson, or every lesson of a
  course) and are materialised per occurrence.
- **(S)** A per-class **MS Teams** link (and, later, deeper integration) makes "assign to Teams"
  one click. Depth of Teams integration is open (OPEN_QUESTIONS).

### 5.16 Timers & actual-duration calibration

- **(M)** A **lesson timer** on the Now screen (elapsed / remaining for the current period),
  plus an optional **activity timer** ("10 min on the starter").
- **(M)** **Task timers**: starting a task (the "start" in focus mode, or marking it in
  progress) **auto-starts a timer**; finishing, pausing or switching stops it. **One timer runs
  at a time.**
- **(M)** **Interruptions are first-class** — one tap pauses (a pupil needs you) and resumes
  later; the total accumulates across sittings, so real elapsed time is captured, not guessed.
- **(M)** Each task records **actual time to complete** alongside its original **estimate**.
- **(S)** **The AI calibrates estimates** from history: from a task's type/tags/cognitive-load
  and past estimate-vs-actual data it predicts how long similar jobs really take and improves
  future estimates. (Durations + metadata only; no pupil names.)
- **(S)** A **time report** of estimate vs actual by task type — where the time really goes and
  which jobs you systematically under/over-estimate.
- **(C)** Auto-stop a running task timer when a lesson begins.

### 5.17 Captured info — "things I've been told"

- **(M)** A **frictionless capture box** for information given to you that you can't action yet
  and don't know when you'll need ("the D12 projector is replaced over half term", "PUPIL is
  leaving at Easter").
- **(M)** **The AI files it**: suggests a **category** (e.g. pupil · room/logistics ·
  admin/deadline · curriculum · CPD · safeguarding-sensitive), extracts entities
  (pupil/group/room/date) and **links** it so it **resurfaces in context** — when you open that
  pupil/class, or as the relevant date nears.
- **(S)** Captured items can be **promoted to a task or an event/deadline** when actionable, or
  archived. You can always **override** the AI's category/links.
- **(S)** A **searchable, browsable store** by category/tag/date, with a periodic "still
  relevant?" review so it doesn't rot.
- **(C)** **Safeguarding-flagged** items get a clear marker (your private tool, but such
  information deserves care).

## 6. Non-functional requirements

- **Performance.** Now screen and note-save feel instant on the LAN (<150 ms perceived).
- **Reliability & backups.** Notes are irreplaceable. Automated nightly DB backup, tested
  restore, and integration with the school's existing off-site regime. Survives a server reboot.
- **Availability.** Single-node is fine. Must come back up cleanly after power loss.
- **Security & privacy.** Authenticated access; pupil data handled per
  [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md); names never leave the building attached
  to identities; AI calls audited. A DPIA is maintained (mirrors `exam_questions/DPIA.md`).
- **Usability.** Glanceable, keyboard-friendly, works on desktop + laptop screens; readable
  on a phone for capture.
- **Maintainability.** One language on the server; documented dev loop; same conventions as
  `exam_questions` so knowledge transfers.
- **Data portability.** Everything exportable (notes, tasks, SoW) — no lock-in to this app.

## 7. Explicitly out of scope (for now)

- Public/internet-facing access or multi-teacher tenancy.
- A full markbook, reporting-to-parents, or MIS replacement.
- Pupil-facing features (this is the teacher's tool; pupil revision lives in `exam_questions`).
- Native mobile apps.

## 8. Known gaps / "things I've probably forgotten"

Several originally-forgotten needs are now **in scope** above: report/EHCP **deadlines** and
parents' evenings (§5.13), the **one-thing-at-a-time** focus and end-of-day wind-down (§5.12),
**MS Teams** assignment and prep checklists (§5.15), and **year rollover** (§5.14).

Still parked for discussion (see OPEN_QUESTIONS): cover-setting workflow, parental-contact log,
behaviour/detention log, homework setting & tracking, exam-board key dates, a print queue, and
deeper MS Teams / MIS / calendar integration. We'll pull these in by what actually hurts most.
