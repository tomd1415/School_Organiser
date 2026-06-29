# Noted bugs — 29 June 2026 (developer worklist)

Reworked from the raw use-session notes into actionable, code-grounded tickets. Each item gives the
**symptom** (what the teacher saw), a **diagnosis** (what the code actually does, with `file:line`),
a tightened **problem statement**, and **proposed solutions** with a recommendation.

Items are independent; tackle in any order. Two of the six (#3, #5) are likely small wiring fixes;
the rest are net-new features. Bug #5 may not be a bug at all — read its diagnosis first.

Suggested order by value/effort: **#3 → #2 → #6 → #1 → #4 → #5**.

---

## 1. Mark that a whole class is away for a lesson (from the timetable)

**Symptom:** "There should be an easy way to mark that whole classes will not be present in lessons
(somewhere in the timetable)."

**Diagnosis — the data model already exists; the affordance is missing.**
The `lesson_exceptions` table ([migrations/0014_exceptions.sql](../app/migrations/0014_exceptions.sql))
already models per-date deviations from the recurring weekly timetable. As of
[migrations/0044_exception_free_kind.sql](../app/migrations/0044_exception_free_kind.sql) the
allowed kinds are `cancelled`, `room_change`, `cover`, `off_timetable`, `free` — and the `0044`
migration comment defines `free` as *"the class is away (trip/exam) so I don't teach this slot."*
That is essentially this request, but today it is reached **one lesson at a time** through the lesson
cockpit's exception form (`renderExceptions()` and the `POST /lesson/exception` handler in
[app/src/routes/lesson.ts](../app/src/routes/lesson.ts)). There is:

- no entry point **from the timetable grid** ([app/src/routes/timetable.ts](../app/src/routes/timetable.ts)),
  where the teacher actually thinks "this class is away";
- no **bulk** action — a trip spanning several periods or days means repeating the form per slot;
- no **group-scoped** exception. An exception row targets a `timetabled_lesson_id` (or a whole day
  when null), never a `group_id`, so "Year 6 is on a trip Thursday" can't be expressed as one fact
  that fans out across every Year-6 slot that day.

**Problem statement:** Give the teacher a timetable-level action to mark one or more classes away
for one or more dates, writing the existing `free` exception to every affected timetabled slot, and
render those slots as "away" in the grid.

**Proposed solutions:**

- **Option A (recommended) — timetable-driven bulk write, no schema change.** Add a "Mark class away"
  control to the timetable view. It collects `{ groupId | timetabledLessonIds[], dateFrom, dateTo,
  note }`, resolves which timetabled slots that group has in range (the grid already knows this), and
  calls the existing `addException()` ([app/src/repos/exceptions.ts](../app/src/repos/exceptions.ts))
  once per slot with `kind='free'`. Reuses all existing rendering of `free` exceptions. New: a
  `POST /timetable/class-away` route, a small form/modal in the timetable view, a `paths.ts` builder.
  Lowest risk; ships the teacher's mental model without touching the schema.

- **Option B — first-class group exceptions (schema change).** `ALTER TABLE lesson_exceptions ADD
  COLUMN group_id BIGINT REFERENCES groups(id)`; allow `timetabled_lesson_id` to be null when
  `group_id` is set. Then "Year 6 away Thursday" is **one** rowSchool_Organiser, and the timetable resolves it at
  render time by matching each cell's group. Cleaner conceptually and cheaper to undo (delete one
  row), but touches the exception repo, the `describeException()`/`indexDayExceptions()` services
  ([app/src/services/exceptions.ts](../app/src/services/exceptions.ts)), and every read path that
  currently assumes exceptions are lesson-scoped. More surface area to get right.

Recommend **A** now (it's the missing UI over an existing feature); revisit **B** only if repeated
multi-slot trips make the fan-out rows annoying to manage.

---

## 2. Inbox queue does not live-update as items are added

**Symptom:** "The inbox queue does not automatically update as things are added. It only updates when
the page is refreshed."

**Diagnosis — confirmed: the card has no live-update mechanism.**
The inbox queue on the Now screen is rendered by `renderInboxQueueCard()`
([app/src/lib/nowView.ts:522](../app/src/lib/nowView.ts#L522)), populated once at page load from
`listForResurfacing()` in the `GET /` handler ([app/src/routes/now.ts](../app/src/routes/now.ts)).
Its root `<section class="card inbox-queue-card">` has **no** `hx-get` / `hx-trigger` / `hx-swap`,
and there is **no fragment route** to re-fetch it. The only HTMX on the card is on the per-item action
buttons (`hx-post` to archive / convert-to-task), which mutate single rows but never re-poll the list.
So an item captured elsewhere (e.g. `POST /capture-quick`) is invisible here until a full reload.

Contrast the timeline card directly above it, which **does** self-poll via the `NOW_TIMELINE_OPEN`
pattern ([app/src/lib/nowView.ts:406](../app/src/lib/nowView.ts#L406)):
`hx-get="/now/timeline" hx-trigger="every 30s" hx-swap="outerHTML" hx-target="this"`.

**Problem statement:** The inbox card needs the same self-polling treatment as the timeline card, plus
a fragment endpoint that returns its fresh HTML.

**Proposed solution (recommended):** Mirror the timeline pattern exactly.

1. Add a fragment route `GET /now/inbox-queue` in [app/src/routes/now.ts](../app/src/routes/now.ts)
   that re-runs the same query and returns `renderInboxQueueCard(...)` (the route already does this for
   `/now/timeline` at line 235 — copy it).
2. Add `nowInboxQueue()` to [app/src/lib/paths.ts](../app/src/lib/paths.ts) next to `nowTimeline()`.
3. Put `id="now-inbox-queue" hx-get="${paths.nowInboxQueue()}" hx-trigger="every 30s"
   hx-swap="outerHTML" hx-target="this"` on the card's root `<section>`.

**Critical gotcha (documented in the codebase):** use `hx-swap="outerHTML"` and `hx-target="this"`,
and keep the polling attributes on the **swapped-in** element. The comment at
[nowView.ts:401-405](../app/src/lib/nowView.ts#L401-L405) warns that an attribute-less replacement
de-registers the timer and freezes the card after one tick. Also note the inbox card has interactive
buttons but no text inputs, so a 30s outer-swap won't clobber in-progress typing — but verify the
swap doesn't fight an in-flight per-item `hx-post` (consider `hx-sync` or a slightly longer interval).

---

## 3. "Now" screen — the *current lesson* card never updates (but the timetable does)

**Symptom:** "The section of the 'now' screen that shows the current lesson [doesn't update] when it
should. The 'today's timetable' section updates perfectly."

**Diagnosis — confirmed, same root cause as #2, and the user's observation is the key clue.**
`renderCurrentCard()` ([app/src/lib/nowView.ts:173](../app/src/lib/nowView.ts#L173)) emits a
`<div class="now-card">` with **no** HTMX polling attributes and there is **no** fragment route to
refresh it. It's rendered once at page load (`GET /` in [now.ts](../app/src/routes/now.ts)) and then
goes stale — so when a lesson ends and the next begins, the "Now" card keeps showing the old lesson
until a manual reload.

The timetable card *does* update precisely because it self-polls (the `NOW_TIMELINE_OPEN` pattern,
[nowView.ts:406](../app/src/lib/nowView.ts#L406)) and has a `/now/timeline` fragment route. The
current-lesson card was simply never wired into that mechanism. (Note: a `GET /now/clock` fragment
route *does* already exist at [now.ts:211](../app/src/routes/now.ts#L211) for the clock — proof the
polling infrastructure is established and easy to extend.)

**Problem statement:** Give the current-lesson card a self-polling wrapper and a fragment endpoint
that recomputes "what is on now" from the current time, so the card advances across lesson boundaries
without a reload.

**Proposed solution (recommended):** Same three-step pattern as #2.

1. Add `GET /now/current` in [now.ts](../app/src/routes/now.ts) that recomputes the `NowState`
   (current minutes / weekday — the timeline route already does this) and returns `renderCurrentCard(...)`.
2. Add `nowCurrent()` to [paths.ts](../app/src/lib/paths.ts).
3. Wrap the card in a self-replacing poller: give it a stable `id`, `hx-get="${paths.nowCurrent()}"`,
   `hx-trigger="every 30s"`, `hx-swap="outerHTML"`, `hx-target="this"`.

**Watch-outs:**
- The current card contains a **"Quick note" form** (`now-notes`, `renderCurrentCard()` line ~200). A
  30s outer-swap will **wipe half-typed note text**. The timeline card sidesteps this because it has no
  inputs (see the explicit warning at [nowView.ts:404-405](../app/src/lib/nowView.ts#L404-L405)).
  Either (a) wrap only the *lesson-identity* portion in the poller and leave the note form outside it,
  or (b) gate the swap with `hx-sync`/`hx-trigger="every 30s [document.activeElement... ]"` so it
  pauses while the note field is focused. Option (a) is cleaner.
- Decide the swap boundary so the "active lesson" computation stays consistent with the timeline's
  `state.minutes` logic (reuse the same `NowState` builder rather than duplicating the time math).

---

## 4. Mark pupils present/absent and record extended leave during a lesson

**Symptom:** "I need to be able to mark pupils as present and absent and note when they had to leave
the lesson for an extended period."

**Diagnosis — no attendance model School_Organiserexists.** Pupils, enrolment, and groups are modelled
([app/src/repos/pupils.ts](../app/src/repos/pupils.ts): `pupils`, `enrolments`, `groups`,
`group_courses`), and there are several **per-lesson per-pupil** tables — but they cover *work and
feedback*, not *attendance*: `pupil_lesson_feedback`, `pupil_lesson_comments`, `pupil_answers`,
`pupil_marks`, `pupil_done` (all keyed by `occurrence_course_id`). A lesson instance is an
`occurrence_courses` row (one per course within the lesson); there is **no per-pupil attendance row**
on it. The free-text `notes` table has `pupil_id` + `occurrence_id` columns, so today the only way to
record "left early / off sick" is an unstructured note — not queryable, not a register.

**Problem statement:** Add structured per-pupil, per-lesson-instance attendance — present / absent /
left-early (with minutes or a leave time) / extended-leave (reason + expected-return date) — surfaced
as a quick-mark roster inside the lesson cockpit, and persisted against the `occurrence_courses` row.

**Proposed solution (recommended):** New table + repo + cockpit panel, following the existing
per-lesson-pupil pattern.

1. **Migration** `0XXX_lesson_attendance.sql`:
   ```sql
   CREATE TABLE lesson_attendance (
     id                    BIGSERIAL PRIMARY KEY,
     occurrence_course_id  BIGINT NOT NULL REFERENCES occurrence_courses(id) ON DELETE CASCADE,
     pupil_id              BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
     status                TEXT   NOT NULL CHECK (status IN
                             ('present','absent','left_early','extended_leave')),
     left_early_minutes    INT,        -- when status='left_early'
     leave_reason          TEXT,       -- free text, e.g. 'medical appointment'
     expected_return       DATE,       -- when status='extended_leave'
     created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
     UNIQUE (occurrence_course_id, pupil_id)
   );
   ```
2. **Repo** `app/src/repos/attendance.ts`: `getLessonAttendance(occId)`, `setAttendance(...)`,
   `clearAttendance(occId, pupilId)`. Mirror the shape of [app/src/repos/pupilWork.ts](../app/src/repos/pupilWork.ts).
3. **Routes** in [app/src/routes/lesson.ts](../app/src/routes/lesson.ts): a bulk default-everyone-present
   action plus a per-pupil toggle that returns just that pupil's row (HTMX `outerHTML` swap), exactly
   like the marking flow ([app/src/routes/markModal.ts](../app/src/routes/markModal.ts)).
4. **View** `app/src/lib/attendanceView.ts`: roster grid — name → [Present][Absent][Left early]; the
   left-early / extended-leave options reveal the minutes / reason / return-date fields. Embed it as a
   cockpit card via `renderLessonCockpit()` in [app/src/lib/lessonView.ts](../app/src/lib/lessonView.ts).

**Design decisions to confirm with the teacher before building** (see *Open questions* at the bottom):
should an extended-leave entry **auto-mark the pupil absent in future lessons until `expected_return`**,
or is each lesson marked independently? That single answer changes whether attendance is purely
per-occurrence or needs a roll-forward read. **Privacy:** keep `leave_reason` out of any AI context —
it's pupil-specific and must never reach the LLM wrapper (per [CLAUDE.md](../CLAUDE.md)); it lives in
the register only.

---

## 5. "Adapt this lesson for class using AI" doesn't appear to work

**Symptom:** "The adapt this lesson for class using AI does not appear to work. I cannot remember
where this was from." — note the user is unsure they even found the live control.

**Diagnosis — the feature is implemented, tested, and most likely behaving *as designed*; the
"doesn't work" is probably one of two non-bug conditions.** The flow is intact end-to-end:

- **Trigger:** the cockpit "Adapt this lesson" card, which lazy-loads its controls via
  `hx-get="${paths.adaptControls(gc, lp)}"` (`/lesson/adapt/:gc/:lp`) on `load`
  ([app/src/lib/lessonView.ts](../app/src/lib/lessonView.ts), card ~line 664). The button is
  `✨ Adapt for this class (AI)`.
- **Run:** `POST /lesson/adapt/:gc/:lp/ai` → `adaptLessonForClass(gc, lp)`
  ([app/src/services/adaptLesson.ts:41](../app/src/services/adaptLesson.ts#L41)) → the single LLM
  wrapper `callLLMStructured()` → `upsertAdaptation()` on success, then re-renders the block.
- **Tests pass:** the gate and the no-key degrade are covered
  (`tests/integration/screens.int.test.ts`, `tests/integration/adaptations.int.test.ts`).

Two things produce a "nothing happened" experience that is **not** a code fault:

1. **The skip gate (most likely).** [adaptLesson.ts:54-55](../app/src/services/adaptLesson.ts#L54-L55):
   ```ts
   const hasClassContext = !!((groupCtx && groupCtx.trim()) || (covered && covered.trim())
                              || (ability && ability.trim()) || (guided && Object.keys(guided).length > 0));
   if (!hadHistory && !hasClassContext) return { status: 'skip', hadHistory };
   ```
   If the class has **no teaching history and no class context** (ability / covered / guided access /
   group context all empty), it returns `skip` and renders a "nothing to adapt from yet" message
   instead of calling the AI. By design — but it reads as "broken" if you don't know why.
2. **Discoverability.** The control sits behind a closed-by-default "🛠 Adapt & AI tools" disclosure
   in the cockpit (lessonView.ts ~line 256). This squares with the user not remembering where it was —
   they may never have opened the disclosure to reach the live button.

Other genuine-but-environmental returns: `unavailable` (no/empty `ANTHROPIC_API_KEY`), `blocked`
(monthly cost cap hit), `error` (API/parse failure) — each surfaces a degraded message from the
wrapper ([app/src/llm/client.ts](../app/src/llm/client.ts)).

**Problem statement:** This is probably **UX feedback + discoverability**, not a logic bug. Confirm
which condition the user actually hit before writing any code.

**Proposed actions:**

- **First, reproduce (no code):** open a lesson for a class that *has* teaching context or history,
  open the "🛠 Adapt & AI tools" disclosure, click `✨ Adapt for this class (AI)`, and check the
  server log + the `ai_audit` row. Confirm `ANTHROPIC_API_KEY` is set in `app/.env`. This will tell
  you whether it's `skip`, `unavailable`, `blocked`, or a real `error`.
- **If it was `skip`:** that's the gate doing its job. Improve the message so it's unmistakably
  *"can't adapt yet because this class has no history/context — add context here →"* with a link to
  the class-context editor, rather than a passive sentence.
- **If discoverability:** surface the button when the class *is* adaptable (open the disclosure by
  default, or lift the button out of it), so it isn't hidden behind power-user chrome.
- **Only if a real `error`/`unavailable` is observed** with a valid key and adaptable class: treat it
  as a genuine bug — capture the wrapper's status/message and the audit row and file a focused ticket.

---

## 6. Quick-peek pupil worksheets in a modal

**Symptom:** "There needs to be an easy way for the teacher to quickly bring up the pupil worksheets
so the teacher can quickly see what the pupils are about to do. I was thinking a modal would be good."

**Diagnosis — rendering exists; the fast modal path doesn't.** Worksheets resolve via
[app/src/services/worksheet.ts](../app/src/services/worksheet.ts) (`getLessonWorksheetMeta()` /
`getLessonWorksheet()` — class copy preferred, else master) and render through
`renderWorksheetPreview(gc, lp, level)` ([app/src/routes/lesson.ts](../app/src/routes/lesson.ts),
served by `GET /lesson/worksheet-preview`, builder `paths.worksheetPreview(gc, lp, level)`). Today the
only way in is a **closed-by-default `<details>` disclosure** ("👁 Quick peek — each ability level")
on the cockpit's Plan-tools card, with per-level tabs (🟢/🟡/🔴) swapping into an inline panel. From
the Now screen that's roughly **three clicks**: open lesson detail → expand Plan tools → pick a level.
There is no modal, and no link straight from the Now/timetable view.

The app **already has a reusable HTMX modal pattern** to copy — the marking modal:
- dialog markup in [app/src/lib/html.ts:112-114](../app/src/lib/html.ts#L112-L114)
  (`<dialog id="mark-modal"><div id="mark-modal-body">…`),
- open-attrs helper `markOpenAttrs(url)` in
  [app/src/routes/markModal.ts:46-50](../app/src/routes/markModal.ts#L46-L50), which sets
  `hx-get`/`hx-target`/`hx-swap` plus an `hx-on::after-request` that calls `dialog.showModal()`.

**Problem statement:** Add a one-click "view worksheets" modal, reachable from the Now/cockpit view,
whose body reuses the existing worksheet preview (with the three ability levels) — no new rendering
logic, just a modal wrapper and a trigger.

**Proposed solution (recommended):** Reuse the mark-modal infrastructure verbatim.

1. **Dialog:** add `<dialog id="worksheet-modal"><div id="worksheet-modal-body" aria-live="polite">`
   alongside the mark modal in [app/src/lib/html.ts](../app/src/lib/html.ts).
2. **Body route:** `GET /lesson/worksheet-modal?gc&lp&level` in
   [app/src/routes/lesson.ts](../app/src/routes/lesson.ts) returning the existing
   `renderWorksheetPreview(...)` wrapped in modal chrome (title + in-modal 🟢/🟡/🔴 tab switcher + a
   close button — copy the close button from the mark modal).
3. **Trigger:** a `📖 View worksheets` button that uses the `markOpenAttrs()`-style attributes
   targeting `#worksheet-modal-body`. Place it (a) on the cockpit Plan-tools card next to the existing
   disclosure, and ideally (b) on the **current-lesson card** on the Now screen so it's reachable in
   one click while teaching.
4. **Path builder:** `worksheetModal(gc, lp, level?)` in [app/src/lib/paths.ts](../app/src/lib/paths.ts)
   next to `worksheetPreview`.

This is purely additive (no change to worksheet resolution/rendering) and leans entirely on an
established pattern, so it's low-risk. Confirm the modal is sized to *read at a glance from the front
of the room* (large type, scrollable), since the point is a quick check of "what are pupils about to
do," not editing.

---

## Open questions for the teacher (block only where noted)

- **#1:** When a class is away, should the slot read as **"Away (trip/exam)"** specifically, or is the
  generic `free`/"no lesson" label fine? (Drives whether to add a new kind/label or reuse `free`.)
- **#4 (blocks the data model):** Does **extended leave auto-carry forward** (pupil shows absent in
  future lessons until the return date) or is every lesson marked independently? And do you want an
  attendance **summary** per pupil/term, or just the in-lesson register?
- **#4:** For "left for an extended period," do you want **minutes**, or an actual **left-at / returned-at
  time**? (Time is more faithful but needs two taps.)
- **#5:** Before any code — can you reproduce on a class that *has* context/history with the AI tools
  disclosure open? The result (skip vs. error vs. no-key) decides whether this is UX or a real bug.
- **#6:** Should the worksheet modal also be reachable straight from the **timetable** grid, or only
  from the Now screen and lesson cockpit?
