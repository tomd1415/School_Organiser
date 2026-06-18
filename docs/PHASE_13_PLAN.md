# Phase 13 — Multi-lesson weeks, one consistent lesson view, inline editing & a drag-drop planner

> **Status (2026-06-18): in progress.** ✅ **13.1** (per-class multi-slot delivery — point 1 fixed at
> the data/lay-down layer); ✅ **point 4** (outline + "tap where you are" combined into one component;
> tapping disabled while editing); ✅ the **no-refresh** half of point 2 (binding a plan now OOB-refreshes
> the plan details + tracker + resources; the Schemes resource slot eager-loads when open); ✅ **13.3**
> (tri-state edit toggle on the lesson card — 👁 View · ✏ This class (adaptation) · ✏ Master). Suite
> green throughout (458 unit / 271 integration). **Remaining:** the Schemes-page *card reuse* half of
> point 2, **13.4** (pupil preview new-tab + edit), **13.5** (drag-drop planner with insert & cascade).
>
> Six teacher requests, several interdependent. Decisions captured from the teacher (the questions
> asked before this plan):
>
> 1. **Multi-lesson-per-week classes** (GCSE/Post-16 = 3 slots/week) → **sequence a unit's lessons
>    across ALL the class's weekly slots in date order** (not one-per-week-per-slot). Delivery becomes
>    per-**class** (group_course), not per-single-slot.
> 2. **Consistency** → **reuse the timetable lesson view everywhere** (the Schemes page shows the same
>    lesson card), and fix the lazy-load so plan/resources/preview appear **without a refresh**.
> 3. **Inline edit** → a **tri-state toggle: off (default, read-only) · local-only (this class's
>    adaptation) · master (the master lesson)**.
> 4. **Combine** the "tap where you are" tracker **into the outline**; disable the tapping when the
>    edit toggle is on (local or master).
> 5. **Preview as pupil** → opens in a **new tab**, renders **exactly** as the pupil sees it, with the
>    same **off/local/master** edit toggle for the slides/worksheet, **persistent for the class**.
> 6. **Planner** → a **new full planner page**: pick a class, see a timeline (weeks · days · half-terms)
>    with the class's slots and a tray of units/lessons, and **drag lessons into slots**.

**Standing constraints** (unchanged): no pupil name to any AI service; per-class content is cohort-level
prose; server-rendered HTML + vendored HTMX; `routes → services (pure) → repos`; tests never call the
real AI. Migrations only where a new column/table is genuinely needed.

---

## Build order (each a reviewable, tested slice)

### 13.1 — Foundation: per-class multi-slot delivery *(enables 13.4/13.5; migration-free)*

Today delivery binds a lesson to one `(timetabled_lesson × group_course)` slot and lays a unit
one-lesson-per-week into a single slot. Make it **class-centric across all the class's weekly slots**.

- **`classSlots(groupCourseId)`** (repo) — the group_course's weekly teaching slots (timetabled_lesson
  id + weekday + slot_order + period label).
- **`upcomingClassSlots(slots, fromDate, count, terms)`** (pure service) — merge all the class's weekly
  slots into ONE date-ordered stream of `{ date, timetabledLessonId }`, holiday-aware. This is the
  spine: lesson *i* of a unit goes to stream position *i* (so 3 slots/week ⇒ 3 lessons/week).
- **`layLessonsAcrossClass(groupCourseId, lessons, stream)`** (repo) — bind each lesson to
  `occurrence(stream[i].timetabledLessonId, date)` for this group_course (reuses findOrCreate +
  setOccurrenceCoursePlan).
- **`classSchedule(groupCourseId, from, to)`** (repo) — all bound occurrences across ALL the class's
  slots, date-ordered (the map/planner data source; generalises `slotSchedule`).
- Re-point **convert lay-down (5.7)** and the **map** at the class stream; keep a single-slot path only
  where it still makes sense. Pure date-merge logic is fully unit-tested.

### 13.2 — One lesson card + lazy-load fix + combined outline/tracker *(points 2, 4)*

- Extract the **lesson card** (objectives · outline-with-progress · adaptation · resources · generate ·
  preview) into **one renderer** used by BOTH the timetable lesson page and the Schemes page, so they
  look and behave identically.
- **Lazy-load fix:** the `hx-trigger="toggle … once"` resource slot doesn't refresh after generation and
  needs a page reload to show. Load eagerly / re-trigger after generate / drop the stale `once`.
- **Combine** `renderTracker` ("tap where you are") **into the outline**: one component showing the
  outline steps with the stopping-point tappable inline; tapping is **disabled when editing**.

### 13.3 — Tri-state inline edit toggle (off · local · master) *(point 3)*

- A 3-position control on the lesson card. **Off** = read-only (default). **Local** = inline-edit fields
  → writes this class's **adaptation** (`upsertAdaptation`; master untouched). **Master** = inline-edit
  → writes the **master** (`updatePlanField`).
- Editable inline: title (master only), objectives, outline, duration, kit. A clear banner shows which
  layer is being edited; the tracker tapping is suppressed while on.

### 13.4 — Pupil preview in a new tab, with off/local/master edit *(point 5)*

- A teacher route that renders the **exact pupil view** (reuse `/me`'s renderer) for a chosen
  class+lesson, opened in a **new tab**, at a chosen level.
- The same **off/local/master** toggle lets the teacher inline-edit the **slides/worksheet** (reusing
  the block/markdown editor); **local** saves the class's adapted resource, **master** the master
  resource. Persists for the class.

### 13.5 — New planner page (drag-drop class timeline) *(point 6)*

- **`/planner`** — pick a class → a timeline: **weeks** down, the class's **slots** across (multi/week),
  **half-term** dividers; a **tray** of the course's units/lessons not yet placed; **drag a lesson into
  a slot** (or drag to reorder), persisting via the 13.1 binding. Holiday-aware, "today and future only"
  (history fixed). Built to be genuinely easy to use; consumes the 13.1 class stream.

**Placement operations** (how a drop resolves + the helpers that make planning fast):

- **Insert & cascade ("all move along one")** *(teacher-requested)* — dropping a lesson onto an occupied
  future slot can **push** the occupant and everything after it forward one position along the class's
  merged slot stream (holiday-aware; never rewriting past weeks). A **`cascadeInsert(groupCourseId,
  date, planId)`** delivery primitive: rebuild the bound tail from the target onward, shifted by one.
  The drop offers the choice — **insert/push · swap · replace** — with insert/push as the default for an
  occupied target.
- **Drag a whole unit** onto a starting slot → lays all its lessons sequentially from there across the
  class's slots (reuses 13.1 `layLessonsAcrossClass`), so a unit can be placed in one gesture.
- **Pull-forward / close a gap** — remove or cancel a lesson and optionally **pull the rest forward** to
  fill the gap (the inverse of insert & cascade), so a cancelled lesson doesn't leave a hole.
- **Lock a lesson to its date** — pin an assessment/fixed event so cascades flow **around** it rather
  than shifting it (a small per-occurrence "locked" flag).
- **Undo the last placement** — a one-step undo for a drag/insert/cascade, since a cascade touches many
  bindings and a misdrop should be cheap to reverse.
- **Holiday/exception-aware timeline** — show INSET / half-term / cover / cancelled days inline and
  un-droppable, so you never plan into a non-teaching day; a clear **"today" line** with past = locked.
- **Empty-slot & end-of-unit cues** — highlight future slots with nothing planned and mark where a unit
  ends, so gaps and "what's next" are obvious at a glance.

These build on the 13.1 stream; `cascadeInsert` / pull-forward generalise the existing `moveBinding`
(swap) and the 5.9 carry-over ("↻ continue next week"), which is the same shift-the-tail family.

---

## Sequencing & risk

13.1 first (everything sits on it). 13.2 next (the shared card is where 13.3's edit toggle and 13.4's
preview button live). 13.3, 13.4, then the big 13.5 planner last. Each slice ends with the suite green
(`npm test` + `npm run test:integration` + `npm run typecheck`); AI-touching paths get a throwaway live
smoke as usual. No new pupil-data categories; the per-class edits use the existing adaptation tables.
