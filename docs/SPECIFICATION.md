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
| **Current interest** | A tap-to-set flag on any item; the system learns what you're focused on now and biases what it surfaces. |

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
  (e.g. needs-computer, quick-win) so the right work surfaces at the right time of day. The **AI
  suggests these first; you can override; it learns from your corrections.**
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
- **(M, cross-cutting)** Every AI call goes through one wrapper that **redacts pupil names**,
  **withholds safeguarding-flagged content entirely**, records the prompt/version/response, and
  is provider-swappable (default **Anthropic Claude**).

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
- **(M)** **Exam dates** and key assessment dates as events, with lead-time reminders.
- **(S)** A **parental-contact log** — calls/emails I **owe** and have **made** (who, when, why)
  — so promised contact and "forms to fill in" stop being forgotten (from the bad-day list).
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
- **(M)** A **start-of-day and end-of-day checklist** (recurring daily) — the morning set-up
  routine and the evening "before I leave" sweep (ties to the end-of-day wind-down, §5.12).
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
- **(M)** **Safeguarding-flagged** items are highlighted and **withheld from all AI processing
  once flagged** — never sent to the AI, not just name-redacted. The categoriser suggests the
  flag; you can also set it by hand.

### 5.18 Current interest

- **(M)** Mark any item — a task, note, captured snippet, course or project — as a **current
  interest**, in one tap.
- **(S)** The system **learns your current interests** over time (what you mark, open, time and
  return to) and **biases what it surfaces**: focus mode, captured-info resurfacing and AI
  context lean toward what you're actually focused on now.
- **(S)** Interests are **time-aware** — they fade as your attention moves on, so the bias
  follows you rather than ossifying.

### 5.19 Master schemes & per-group adaptation (Phase 5 — built)

*§5.19–§5.24 were added with Phase 5 (curriculum delivery — see PHASE_5_PLAN.md) and shipped.*

- **(M)** As the teacher, I keep **one canonical (master) scheme per course**; each group that
  studies it stores only its **differences** from the master — per-field overrides of a lesson's
  objectives/outline plus an adaptation note. No override ⇒ the group teaches the master.
- **(M)** On the lesson screen I see the master content and **this group's version** together,
  edit the group's version in place (autosaved; the first edit creates the override), and can
  **reset to master** at any time.
- **(M)** Every change to a group's adaptation — mine or the AI's — is appended to that group's
  **change log**, openable from the lesson.
- **(S)** A per-course **teaching context** (cohort + pedagogy prose; never an identified pupil)
  is stored once and auto-prepended to every AI planning call; an optional **per-class layer**
  adds what is specific to that group (§5.22).

### 5.20 Convert a downloaded unit (Phase 5 — built)

- **(M)** I pick a **downloaded unit** (an imported folder of lesson subfolders, found by
  search) and the **AI converts it** into a SEND-adapted master unit on the course's scheme — a
  titled unit with objectives and an outline per lesson — guided by the course teaching context
  and the kit list (§5.24).
- **(M)** The downloaded source files are untouched and are **linked to the new unit** as
  provenance.
- **(S)** While converting I can pick a group's weekly slot, so the unit is **laid into the
  calendar in the same action** (§5.21) and I land on the curriculum map to review it.

### 5.21 Lay a unit into the calendar (Phase 5 — built)

- **(M)** I assign a **unit to a group's weekly slot**: each lesson is bound, in order, to that
  slot's upcoming dated occurrences — one per school week, **holidays skipped automatically**.
- **(M)** **Bulk fill-and-assign**: convert a downloaded unit *and* lay it into a chosen slot in
  one action (§5.20); a short lay-down never rolls back the conversion.
- **(S)** Re-laying a unit overwrites those future weeks; past occurrences are never rewritten.

### 5.22 The delivery feedback loop (Phase 5 — built)

- **(M)** **Adapt from recent lessons**: from the lesson screen, the AI rewrites **this group's
  version** of a lesson from the group's recent record (stopping points + lesson notes), the
  course and per-class teaching contexts, and the kit list. The master is never touched; the
  change log records the change as the AI's.
- **(M)** **Suggest a master improvement**: where a group's adaptation has proved better, the AI
  proposes folding it back into the **master** — shown as a proposal with a rationale and
  **applied only on my approval**, after which every group starts from the improved master
  (per-group adaptations still apply).
- **(M, cross-cutting)** Both run through the one AI wrapper (§5.10): pupil names redacted,
  safeguarding-flagged notes withheld entirely, every call audited.

### 5.23 Curriculum map & carry-over (Phase 5 — built)

- **(M)** A **curriculum map** per group + weekly slot: the recent weeks taught (with their
  stopping points), today, and the next school weeks (**holiday-aware**) — which lesson lands
  which week, with adapted-for-this-group marked and one click to the dated lesson or its master.
- **(M)** **Carry-over**: when a lesson didn't finish, one tap ("continue next week") repeats it
  at the slot's next occurrence and shifts every later lesson back one school week — holidays
  still skipped, and nothing before today is ever rebound.
- **(S)** The same carry-over sits on the lesson screen beside the stopping point, with a "term
  map for this class" link in the other direction.

### 5.24 Equipment inventory — "the kit" (Phase 5 — built)

- **(M)** I keep a flat **classroom kit list** — item, category, how many we **own** vs how many
  currently **work**, where it lives, notes and tags — maintained inline in seconds (autosave)
  and **archived, never deleted**.
- **(M)** I can **refer to it during planning at any stage**: a dedicated kit page plus a
  read-only panel on the schemes page.
- **(M)** The active list is **injected into every AI planning feature** (author a scheme, draft
  a lesson, convert a unit, adapt for a group, improve the master, generate a resource) so
  practical suggestions fit the hardware we actually own.
- **(S)** A one-tap "**checked today**" stock-take stamp; an item unchecked for over a term is
  flagged stale, and broken stock (working < owned) is highlighted.

### 5.25 In-app setup & the September rollover (built)

*§5.25–§5.29 shipped after Phase 5, with Phase 6 and the improvements that followed it (see
PHASE_6_PLAN.md).*

- **(M)** Everything the seed once hard-coded is **editable in-app**: a Setup area for the year
  & terms, the **day shape** (lesson times), rooms & staff, courses, and groups & pupils.
  **Day shapes and the timetable are year-scoped**, so next September is built as a **draft
  alongside the live year** and nothing changes until an explicit "make current".
- **(M)** A **September rollover wizard**: a completely new timetable every year with nothing
  carried over — except that **teaching-group knowledge follows the class** via a
  **predecessor chain** (7ARO → 8ARO), so a group keeps its identity across the annual rename
  without rewriting any history. Re-enterable and idempotent; the live year is untouched until
  the explicit "go live".
- **(M)** A brand-new instance opens an **onboarding wizard** (`/welcome`): create the teacher
  and password (stored in settings; the env var, where set, always wins), then a guided,
  tracked checklist through the Setup editors — supporting the long-run **fresh instance per
  teacher** (nothing flows between instances).

### 5.26 Calendar exceptions (built)

- **(M)** From the lesson screen I record that a **date deviates from the weekly pattern**: one
  lesson **cancelled**, a **room change**, **cover** (by whom), or a whole **off-timetable
  day** (trips, exam days, snow) — each with a note.
- **(M)** Exceptions show as **banners on the affected lesson**, ⚠ marks on the week grid and a
  count on the Now screen; removing one is one click. (Display-level for now — the clock and
  availability still follow the recurring pattern.)

### 5.27 Email intake & AI triage (built)

- **(M)** A **dedicated or forwarded mailbox** (never my main account; an Outlook rule forwards
  what matters) is **polled over IMAP** on a configurable cadence, with a "Poll now / test"
  button in Settings; only unread mail is imported, and **imported mail is marked read** — the
  mailbox's own flag is the dedup, so failures stay unseen for the next poll.
- **(M)** Each email is parsed (encoded subjects, multipart bodies, HTML-stripped fallback) and
  **AI-triaged to the single best home**: a **task** (with urgency, and the class matched from
  my group names), a dated **event** (kind + date), an **awareness** item (filed as Captured,
  §5.17, with category and safeguarding flag), or a general **note** — never dismissed, because
  a forwarded email always arrived for a reason.
- **(M)** The **key facts** — when, deadline, where, who, money, what to bring, contact — are
  extracted and shown as **colour-coded chips** in the task's "✉ what it says" disclosure, so
  the substance reads at a glance without the greetings and footers.
- **(M)** If the AI is unavailable the email still becomes a **plain inbox task** — intake never
  blocks — and every import keeps the raw email as provenance (§5.5). Triage runs through the
  one wrapper (§5.10): cheap model, names redacted, every call audited.

### 5.28 The in-lesson tracker & three-level differentiation (built)

- **(M)** An **in-lesson tracker** on the lesson screen: the (adapted) outline's steps as a
  tappable list — tap where we are (▶ current, ✓ done) and the same tap **writes the textual
  stopping point**, so "last time → resume", the curriculum map and the AI feedback loop all
  keep working off one record.
- **(M)** A per-class **ability midpoint** (cohort-level prose, never a pupil) recorded beside
  the class teaching context — the anchor for **three-level differentiation by default**:
  every AI-planned lesson teaches whole-class, then offers 🟢 **Support**, 🟡 **Core** and 🔴
  **Challenge** tasks meeting the same objectives, Core pitched at the midpoint (the
  draft-lesson, lesson-resources, adapt-lesson and adapt-resources prompts alike).
- **(M)** Per-lesson **resource sets** — slides, worksheet, support sheet, answers — are
  generated and **linked to the plan** in one action, with **per-class adapted copies** linked
  to that class's adaptation; slides **present** full-screen one slide at a time, documents
  preview in-browser and **export to Word** for pupils to type into.

### 5.29 TA read/feedback access (built)

- **(M)** A TA logs in **on the normal login page** with a **separate TA password** I set (or
  disable) in Settings; the session is **deny-by-default** — only the TA view, log in/out and
  linked resources are reachable, everything else bounces back to it.
- **(M)** The TA lands on the **current lesson, read-only**: the class's **effective (adapted)
  plan**, formatted, with its linked and class-copy resources — plus a "**next lesson (if
  you're early)**" tab for today only. No notes, no pupil names, no navigation.
- **(M)** A **two-part feedback form** — how the pupils were / thoughts on the lesson — with a
  **safeguarding tick**: feedback lands on my lesson page and joins the group's recent history
  feeding "adapt from recent lessons" (§5.22); **flagged feedback is withheld from AI
  entirely**, and the TA is prompted to tell me in person too.

### 5.30 Auto-marking & results back to pupils (planned — Phase 9)

- **(M)** Every generated worksheet carries a **mark scheme as data** (per answer field:
  expected answer, accepted alternatives, marks) — emitted with the answers doc, editable by me.
- **(M)** **Objective answers mark themselves** (ticks, choices, exact/numeric/keyword) the
  moment I review — no AI involved; **open answers are AI-marked as suggestions**, batched per
  question with **no pupil identity attached**, evidence-quoted and confidence-flagged, with
  anything pattern-matched as sensitive **withheld from AI and shown straight to me**.
- **(M)** I **confirm or override** every suggestion from the review grid (one click for the
  confident ones), add a **comment back to each pupil** (AI-prefilled, my words by the time it
  ships), and **release** — only then does a pupil see big friendly ✓/✗, a "what went well /
  try this" line and my comment on their own screen. Ticks-only by default; never any
  class comparison.
- **(M)** Marks feed the loop: **per-question class success rates and misconceptions** join the
  class-work summary that adapt-next-lesson reads; a **printable answer pack** (questions,
  answers, class stats) supports going through it on the board; marks **export to CSV**.
- **(S)** A per-pupil **"what works for me" profile** (two lines, from feedback + marks history,
  tokenised before AI) on the review grid, suggesting level moves I apply with the usual chips.
- **(S)** **Retrieval-practice starters**: "open with 3 questions this class got wrong
  recently" offered when drafting/adapting lessons.

### 5.31 Stay signed in on classroom computers (planned — Phase 9)

- **(M)** A pupil who signed in once on **their own school Windows account** stays signed in on
  that computer: a revocable, term-bounded device cookie turns the next visit into a one-tap
  **"Continue as Alex 👋 / Not me"** screen — so Windows login effectively becomes app login.
- **(M)** I see each pupil's remembered devices and can revoke any or all; disabling the pupil
  or resetting their PIN revokes everything automatically. Off by default until the DPIA
  addendum is agreed.

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
- Pupil-facing features (this is the teacher's tool). A planned **pupil-facing resource/quiz
  site** (login, resources, answer questions, teacher marking — a summer project) is out of scope
  here and overlaps `exam_questions`; the hosted resource store is designed to stay compatible.
- Native mobile apps.

## 8. Known gaps / "things I've probably forgotten"

Several originally-forgotten needs are now **in scope** above: report/EHCP **deadlines** and
parents' evenings (§5.13), the **one-thing-at-a-time** focus and end-of-day wind-down (§5.12),
**MS Teams** assignment and prep checklists (§5.15), and **year rollover** (§5.14).

Still parked for discussion (see OPEN_QUESTIONS): cover-setting workflow, parental-contact log,
behaviour/detention log, homework setting & tracking, exam-board key dates, a print queue, and
deeper MS Teams / MIS / calendar integration. We'll pull these in by what actually hurts most.
