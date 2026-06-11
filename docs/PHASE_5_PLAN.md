# Phase 5 — Curriculum delivery: master schemes, per-group adaptation & the calendar

> **Status (2026-06-11): 5.1–5.6 built.** Schema + adaptation layer (5.1/5.2), unit conversion
> (5.3), calendar lay-down (5.4), the feedback loop in both directions (5.5, incl. apply-to-master),
> and the curriculum map (5.6 — `/map`). Remaining: 5.7 bulk fill-and-assign in one action (the
> pieces exist: convert → lay down), and the 5.8 stretches (content-based conversion, per-group
> teaching-context, pacing/carry-over, cross-group compare).

The leap from "the app holds plans" to "the app runs the curriculum". A downloaded Teach Computing
unit becomes a **SEND-adapted master scheme**; the master is delivered to each group's weekly lesson
slot; each group **adapts the lessons as they're taught**, with a per-group change log; and the
notes you already capture **feed back** to keep improving both the group's lessons and the master.

**Decided (2026-06-10):**
- **Model: master scheme + per-group adaptations.** One canonical scheme per course; each group
  stores only its *differences* (overrides) plus a change log. (Not a full copy per group.)
- **Plan-first**: this document is for review before any code.

Builds directly on what already exists (verified against the live schema):
- A group's **weekly lesson slot** is a `timetabled_lessons` row → its course is reachable via
  `timetabled_lesson_courses → group_courses → courses`. *7ARO already has Tue→Computing Curriculum
  and Wed→Computer Skills.* So "assign each scheme to one weekly lesson" is largely **already wired**.
- A specific dated lesson is a `lesson_occurrences` row; `occurrence_courses(occurrence_id,
  group_course_id, lesson_plan_id, stopping_point)` already **binds a master lesson plan to one
  group's dated occurrence**, and already records a per-occurrence stopping point.
- Schemes → units → lesson plans, the AI wrapper (redaction/withholding/audit), per-course
  **teaching-context**, and resource **provenance** (a unit's source files via `resource_links.unit_id`).

---

## 0. What Phase 5 changes vs 1–4

- A **master lesson plan** stays canonical; a thin **per-group adaptation** layer overrides it where a
  group needs something different, and **every change is logged per group**.
- Source material flips: AI **converts an existing (downloaded) unit** into adapted lessons, instead
  of authoring from a blank brief (4.4) — reusing the teaching-context and linking the source files.
- The plan meets the **calendar**: a unit is laid down across a group's upcoming weekly occurrences,
  **holiday-aware**, one lesson per week.
- A **feedback loop**: the stopping point + lesson notes drive "adapt the next lesson for this group"
  and "improve the master for next time".

---

## 1. Build order (each slice a reviewable commit/PR)

| # | Slice | Why / depends on | Size |
|---|---|---|---|
| **5.1 ✅** | **Schema `0010`** — `lesson_adaptations` + `lesson_adaptation_history` (slot→scheme pin deferred to 5.4) | foundation for everything | S |
| **5.2 ✅** | **Per-group adaptation layer (manual)** — on the lesson screen, resolve master vs this group's override, edit it, see the change log | the core model, usable without AI | M |
| **5.3** | **Convert a downloaded unit → master lessons (AI)** — pick a source unit → adapted master scheme/unit, source files linked | the "convert what I downloaded" ask | M |
| **5.4** | **Lay a unit into the calendar** — assign a unit to a group's weekly slot; bind lessons to upcoming occurrences, holiday-aware | the "assign to the week it applies to" ask | M |
| **5.5** | **AI per-group adaptation + feedback loop** — "adapt this/next lesson for THIS group" from its notes; "suggest a master improvement" | the "keep updating as we go" ask | M |
| **5.6** | **Medium-term plan / curriculum-map view** — per group, a term calendar of which lesson lands which week | makes the plan visible | M |
| **5.7** | **Bulk: fill a whole unit + assign for a group, on request** — one unit at a time, reviewable | the "ideal world" ask | M |
| **5.8** | *(stretch)* content-based conversion (extract resource text), promote-adaptation-to-master, per-group teaching-context, pacing/carry-over | refinements | L |

Strict order; 5.1→5.2 are the model, 5.3/5.4 the content+calendar, 5.5 the loop. Each AI slice reuses
the wrapper, so the redaction/withholding/audit boundary is inherited unchanged.

---

## 2. Data model — migration `0010`

```
lesson_adaptations            -- one group's override of one master lesson
  id              BIGSERIAL PK
  group_course_id BIGINT REFERENCES group_courses(id)   -- which group's delivery
  lesson_plan_id  BIGINT REFERENCES lesson_plans(id)    -- which master lesson
  objectives      TEXT          -- NULL ⇒ inherit master
  outline         TEXT          -- NULL ⇒ inherit master
  adaptation_note TEXT          -- "shortened, added a visual, split over 2 weeks"
  updated_at      TIMESTAMPTZ
  UNIQUE (group_course_id, lesson_plan_id)

lesson_adaptation_history     -- the per-group change log (append-only)
  id              BIGSERIAL PK
  adaptation_id   BIGINT REFERENCES lesson_adaptations(id) ON DELETE CASCADE
  objectives      TEXT
  outline         TEXT
  adaptation_note TEXT
  change_summary  TEXT          -- "AI adapted from last lesson's notes" / "teacher edit"
  author          TEXT          -- 'teacher' | 'ai'
  created_at      TIMESTAMPTZ
```

Optional, if we want to pin a version / track position explicitly rather than derive it:
```
slot_scheme                   -- which scheme a group's weekly slot follows
  timetabled_lesson_id BIGINT REFERENCES timetabled_lessons(id) UNIQUE
  scheme_id            BIGINT REFERENCES schemes_of_work(id)
  start_date           DATE
```
Otherwise the slot→`group_course`→course→active-scheme chain already implies it, and "current
position" is derivable from the latest bound `occurrence_courses` for the slot.

**Resolution rule:** a group's effective lesson = its `lesson_adaptations` row where present, else the
master `lesson_plans` row. The lesson screen and any export use this everywhere.

---

## 3. Master + per-group adaptation (5.1–5.2)

- The lesson screen is already group-scoped (an occurrence belongs to one group via
  `occurrence_courses.group_course_id`). For that group + the bound master lesson, show the **effective
  lesson** (override or master), with: *"adapted for this group"* vs *"as master"*, an **edit** that
  writes a `lesson_adaptations` row (and a history entry), a **"reset to master"**, and the **change
  log**. The master editor stays in `/schemes` and remains the canonical source.
- `repos`: `getEffectiveLesson(groupCourseId, lessonPlanId)`, `upsertAdaptation(...)` (writes history),
  `listAdaptationHistory(...)`, `resetAdaptation(...)`. All pure-SQL, fully unit/integration testable.

---

## 4. Convert a downloaded unit → master lessons (5.3)

- **Source**: a Teach Computing unit you imported. Units of *resources* are identifiable by their
  import provenance (the original folder path recorded on each resource version), or by you selecting
  the resources. v1 converts from the **unit's lesson structure** (titles/objectives) + teaching-context
  → adapted master lessons (like 4.4, seeded from the real unit). Linking the source files to the new
  unit uses the existing `resource_links.unit_id`.
- **Stretch (5.8)**: extract the actual text from the source slides/worksheets (docx/pptx/pdf) and feed
  it in, so the adaptation reworks the *real* content, not just the titles. (Needs a text-extraction
  step — Gotenberg/LibreOffice or a parser. Flagged as the main open technical question — see §10.)
- Output materialises as a master scheme/unit (reuse `materialiseScheme`), reviewable, then assignable.

---

## 5. Lay a unit into the calendar (5.4)

- Given a group's weekly slot (`timetabled_lessons`) and a unit, compute the **upcoming dated
  occurrences** of that slot — weekly, **skipping non-teaching weeks** (term dates + INSET, which the
  ClockService already knows) — and **bind each unit lesson** to the next occurrence in order
  (`occurrence_courses.lesson_plan_id`, via `findOrCreateOccurrence`).
- This produces the week-by-week plan for that group's slot. **Pacing/carry-over** (a lesson that
  over-runs per its stopping point pushes the rest back) is a refinement (5.8); v1 is straight
  sequential with an easy "re-lay from here".

---

## 6. The feedback loop (5.5)

- After teaching, an occurrence carries the **stopping point** + **lesson notes** for that group. Two
  AI actions, both through the wrapper (redacted, audited):
  1. **"Adapt the next lesson for this group"** — uses this group's recent notes/stopping point →
     writes/updates the next lesson's `lesson_adaptations` (with a logged `change_summary`).
  2. **"Suggest a master improvement"** — proposes an edit to the *master* lesson for next time;
     you accept → it updates the master (a new scheme version keeps history).
- This is the engine behind "convert it once and keep updating as we go".

---

## 7. Views (5.6)

- **Medium-term plan / curriculum map** — per group (or per slot): a term calendar listing each
  upcoming week → the lesson bound to it (effective: adapted or master), its status (planned / taught /
  carried over), and a link to the lesson. Makes "assigned to the lessons in the week it applies to"
  visible and editable (drag/shift later).
- The per-group lesson screen (5.2) is the day-to-day surface.

---

## 8. Further features worth adding (same line)

- **Promote a good adaptation to the master** — a tweak that worked for one group, pushed up into the
  canonical lesson (as a master edit / new version).
- **Per-group teaching-context** — teaching-context is per-course today; add an optional per-group
  override (7ARO vs 7JMI differ), auto-injected when adapting for that group.
- **Source provenance on every converted lesson** — link the original resource(s) so you keep both the
  Teach Computing source and your adapted plan side by side.
- **Pacing & carry-over** — stopping point < planned ⇒ continue next week; absence/INSET aware.
- **Cross-group compare** — see how the same master lesson diverged across groups.

---

## 9. Test strategy

- The **resolution rule** (override-else-master) and adaptation/history writes: pure unit +
  integration tests (no AI). The calendar lay-down: integration test on a real slot with seeded term
  dates, asserting holidays are skipped and the binding order is correct.
- AI slices (5.3/5.5/5.7): schema-mapping unit tests + full-route **degrade** tests (no key), then a
  throwaway **live** verification each, as in Phase 4. No real API calls in the suites.
- A test that adapting **never** mutates the master, and resetting restores the master exactly.

---

## 10. Decisions & open questions

- **Confirmed:** master + per-group adaptations; plan-first.
- **Open (technical):** content-based conversion needs **text extraction** from Office files. Options:
  reuse the Gotenberg sidecar (convert→PDF→text), add a docx/pptx parser, or start title/structure-only
  (5.3) and add extraction in 5.8. **Recommend: start structure-only; decide extraction before 5.8.**
- **Open (product):** should per-group teaching-context land in Phase 5 (§8) or wait? Should "fill a
  whole unit + assign" (5.7) auto-bind to the calendar, or stop at "lessons drafted, you assign"?
- **Open (model):** explicit `slot_scheme` pin (§2) vs derive from the slot→course chain — recommend
  derive for v1, add the pin only if version-pinning per group is needed.

---

## 11. Out of scope for Phase 5

- Pupil-facing delivery / pupils completing work in-app (that's the separate pupil-facing project that
  deferred 2.11).
- Full drag-and-drop calendar editing (v1 lays down + lets you re-lay/shift simply).
- Auto-generating brand-new resources per adapted lesson at scale (4.7 covers on-demand generation).

---

## 12. Recommended first slice

**5.1 + 5.2** — the schema and the **manual** per-group adaptation layer on the lesson screen
(override-else-master + change log). It's the model made real, immediately useful with zero AI, and
everything else (convert, calendar, feedback loop) hangs off it. Then **5.3** (convert a unit) and
**5.4** (lay it into the calendar) deliver the headline workflow.
