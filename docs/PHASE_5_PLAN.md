# Phase 5 — Curriculum delivery: master schemes, per-group adaptation & the calendar

> **Status (2026-06-11, evening): 5.1–5.8 built; 5.9 partly built.** Schema + adaptation layer
> (5.1/5.2), unit conversion (5.3), calendar lay-down (5.4), the feedback loop in both directions
> (5.5), the curriculum map (5.6 — `/map`), **5.7 bulk fill-and-assign** (optional assign on the
> convert panel → lands on the map; live-verified end-to-end), and **5.8 the equipment inventory**
> (`/kit` + panel on Schemes + injected into all six AI planning features; injection verified in
> the audit log). From 5.9: **pacing/carry-over** ("↻ continue next week" on the map) and the
> **per-class teaching-context** (adds to the course default; used when adapting for that class)
> are done. Remaining 5.9: content-based conversion, cross-group compare, kit-per-lesson,
> CSV-import/convert-de-dup niceties.

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
| **5.3 ✅** | **Convert a downloaded unit → master lessons (AI)** — pick a source unit → adapted master scheme/unit, source files linked | the "convert what I downloaded" ask | M |
| **5.4 ✅** | **Lay a unit into the calendar** — assign a unit to a group's weekly slot; bind lessons to upcoming occurrences, holiday-aware | the "assign to the week it applies to" ask | M |
| **5.5 ✅** | **AI per-group adaptation + feedback loop** — "adapt this/next lesson for THIS group" from its notes; "suggest a master improvement" (apply-on-accept) | the "keep updating as we go" ask | M |
| **5.6 ✅** | **Medium-term plan / curriculum-map view** (`/map`) — per group, a term calendar of which lesson lands which week | makes the plan visible | M |
| **5.7 ✅** | **Bulk: fill a whole unit + assign for a group, in one action** — convert → materialise → lay into the weeks → land on the map (detail: §13) | the "ideal world" ask | M |
| **5.8 ✅** | **Equipment & hardware inventory** (`/kit`) — what's in the room, how many work, where; visible while planning and injected into every AI planning feature (detail: §14) | "refer to it during planning at any stage" (added 2026-06-11) | M |
| **5.9 ◐** | *(stretch)* ✅ pacing/carry-over, ✅ per-class teaching-context; remaining: content-based conversion, cross-group compare, kit-per-lesson, niceties (detail: §15) | refinements | L |

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
- **Stretch (5.9)**: extract the actual text from the source slides/worksheets (docx/pptx/pdf) and feed
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
  over-runs per its stopping point pushes the rest back) is a refinement (5.9); v1 is straight
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

*(2026-06-11: these are now scheduled — the first and third landed with 5.5b/5.3; the rest are
itemised under 5.9, see §15. The equipment inventory joined the plan as 5.8, see §14.)*

- **Promote a good adaptation to the master** — ✅ landed as 5.5b ("suggest a master improvement",
  applied only on accept).
- **Per-group teaching-context** — teaching-context is per-course today; add an optional per-group
  override (7ARO vs 7JMI differ), auto-injected when adapting for that group. *(→ 5.9)*
- **Source provenance on every converted lesson** — ✅ landed with 5.3 (`resource_links.unit_id`).
- **Pacing & carry-over** — stopping point < planned ⇒ continue next week; absence/INSET aware. *(→ 5.9)*
- **Cross-group compare** — see how the same master lesson diverged across groups. *(→ 5.9)*

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
- **Confirmed (2026-06-11):** the **equipment inventory** joins Phase 5 as slice 5.8 — kit must be
  visible while planning *and* injected into every AI planning feature (§14).
- **Proposed (2026-06-11), for 5.7:** "fill a whole unit + assign" **auto-binds** to the calendar
  (the assign step is optional on the same form; leaving it blank = convert-only as today), then
  lands on the **curriculum map** as the review surface. A short-laid or skipped assign never rolls
  back the converted unit — it stays on the scheme and the result says what happened (§13).
- **Open (technical):** content-based conversion needs **text extraction** from Office files. Options:
  reuse the Gotenberg sidecar (convert→PDF→text), add a docx/pptx parser, or start title/structure-only
  (5.3 ✅) and add extraction in 5.9. **Recommend: structure-only stands; decide extraction before 5.9
  (current lean: docx via a parser, pptx via zip+XML, pdf via pdftotext — see §15).**
- **Open (product):** should per-group teaching-context land in 5.9 or wait for a real divergence
  between groups to justify it?
- **Open (model):** explicit `slot_scheme` pin (§2) vs derive from the slot→course chain — derive
  won in 5.4–5.6 (no pin needed so far); add the pin only if version-pinning per group is needed.

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

---

## 13. Detailed plan — 5.7 Bulk: fill a whole unit + assign, in one action *(added 2026-06-11; ✅ built same day — live-verified end-to-end, assign validated before any AI spend)*

**The ask:** *"in an ideal world it would fill in all of the Computing Curriculum lessons for KS3
and GCSE groups (one unit at a time) when requested and assign to lessons for the whole unit."*
Both halves exist (5.3 convert, 5.4 lay-down); 5.7 chains them into one click and lands you on the
review surface.

### 13.1 Flow

1. On the Schemes page, the existing **📥 Convert a downloaded unit** panel gains an optional
   **"…and lay into a group's calendar"** block: a slot picker (the same slot options 5.4 uses,
   restricted to slots that teach this course) and a **start from** date (defaults to today).
   Leave it blank → exactly today's behaviour (convert only).
2. Submit → AI converts the unit (unchanged 5.3 path: structure + teaching-context — and once 5.8
   lands, the kit list) → lessons materialise as a new unit on the course's scheme → source files
   linked → **if a slot was chosen**, each lesson is bound to that slot's upcoming school weeks
   (unchanged 5.4 path: holiday-aware, fits-what-fits, re-lay overwrites).
3. Redirect lands on **`/map?slot=…`** — the curriculum map shows the freshly filled weeks
   immediately: week → lesson → open. That *is* the review step; every lesson stays editable
   (master on Schemes, per-group on the lesson screen), and re-laying from Schemes remains cheap.

### 13.2 Semantics & failure modes (decided)

- **AI degrade** (no key / cap / refusal) → nothing written anywhere (5.3 behaviour stands).
- **Assign skipped** → converted unit on the scheme, no bindings; the panel says so.
- **Assign short** (term ends before the unit does) → lays what fits and says how many are left
  (5.4 behaviour); the rest lay down later with "re-lay from here" or a fresh lay-down.
- **Never roll back the conversion** because the lay-down fell short — the unit is valuable on its
  own and deleting AI output a teacher hasn't seen would be surprising.
- **Idempotence**: re-running converts a *new* unit (titles may repeat); the teacher deletes
  unwanted units with the existing unit ✕. (De-duplicating by source folder is a 5.9 nicety.)

### 13.3 Implementation sketch (mostly glue)

- `POST /schemes/course/:id/convert` accepts optional `slot` (`lessonId:groupCourseId`, validated
  against `listSlotsForCourse` exactly as 5.4 does) + `start` (date). After `materialiseUnit` +
  source links: `listPlansForUnit` → `upcomingSlotDates(weekday, start, n, terms)` →
  `layLessonsIntoSlot` → `HX-Redirect: /map?slot=…`. No new tables, no new AI prompt.
- A small shortcut on the Map page — *"fill this slot from a downloaded unit →"* — deep-links to
  the Schemes panel with the slot pre-selected (nicety, do last).

### 13.4 Tests

- Route validation: slot must teach the course; bad date rejected; convert-only path unchanged
  (existing tests keep passing).
- Degrade: combined request with no key writes **no unit and no bindings**.
- The 5.3 + 5.4 pieces keep their own coverage (8 + 5 tests already green); the chained happy path
  gets **one live verification** (convert a real small unit into a far-future-starting slot pick?
  no — into a real slot, then delete the unit + nulled bindings in cleanup, as the smoke scripts do).

**Size: M** (a form block, ~30 route lines, tests). No migration.

---

## 14. Detailed plan — 5.8 Equipment & hardware inventory *(added 2026-06-11; ✅ built same day — kit-list injection verified in the audited request)*

**The ask:** *"keep an inventory of the hardware and equipment that I have in the class for use in
lessons so it can be referred to during planning at any stage."* Two halves, both required:
**(a)** I can see and maintain the kit list while planning; **(b)** every AI planning feature knows
what's actually in the room, so practical suggestions fit the kit we own (16 micro:bits, not a
wishlist).

### 14.1 Data model — migration `0011_equipment.sql`

```
equipment
  id            BIGSERIAL PK
  name          TEXT NOT NULL          -- "micro:bit v2", "Crumble kit", "ESP32 CYD", "VR headset"
  category      TEXT NOT NULL DEFAULT 'other'
                -- soft vocabulary, free text + suggestions:
                -- physical-computing | robotics | computers | peripherals | av | consumables | other
  qty_total     INT                    -- how many we own (NULL = "some / class set, uncounted")
  qty_working   INT                    -- how many currently usable; total − working = out of action
  location      TEXT                   -- "cupboard B top shelf", "trolley 2", "my desk drawer"
  notes         TEXT                   -- "needs 2×AAA each", "3 missing USB leads", "book via office"
  tags          TEXT                   -- comma labels, same pattern as scheme labels ("KS3", "GCSE")
  active        BOOLEAN NOT NULL DEFAULT true   -- archive, never delete (history stays meaningful)
  last_checked  DATE                   -- when I last counted / tested it
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

No links to lessons/courses in 5.8 (that's the 5.9 "kit needed per lesson" idea) — the inventory is
deliberately one flat, fast-to-maintain list.

### 14.2 The page — `/kit` ("Kit" in the nav, next to Map)

- Items **grouped by category**, each row inline-autosaving (name, qty total/working, location,
  notes, tags) with the usual *saved ✓* flash — same interaction as the scheme editor, no new
  concepts.
- **＋ add item**, **archive** toggle per row (+ a collapsed "show archived"), a search box that
  filters by name/notes/tags/category, and a one-click **"checked today"** stamp per row (sets
  `last_checked`) so a quick termly stock-take is painless.
- A subtle warning style when `qty_working < qty_total` (something's broken) or `last_checked` is
  over a term old (probably stale).

### 14.3 "Referred to during planning at any stage"

1. **Visible:** a read-only, collapsed **"🔧 Kit available"** panel on the Schemes page (right where
   authoring/converting/laying-down happens), listing active kit one line per item with working
   counts and locations, linking to `/kit` to edit.
2. **Injected into the AI:** a prompt helper `equipmentItems()` builds **one context item** from
   active rows, e.g.
   `EQUIPMENT AVAILABLE IN THE ROOM — plan practical work within this; if something needed isn't
   listed, say so explicitly: 16× micro:bit v2 (14 working — cupboard B) · Crumble kits ×12 ·
   ESP32 CYD ×8 (6 working) · class PCs ×14 · …`
   and is added to **every planning feature**: author scheme (4.4), draft lesson (4.3), generate
   resource (4.7), convert unit (5.3), adapt lesson (5.5a), improve master (5.5b). It travels via
   `context[]` like everything else, so it is audited and name-scanned by the standard boundary
   (kit is not personal data, but one boundary for all inputs stays the rule).
3. Empty inventory ⇒ **no item is injected** (prompts unchanged), so behaviour before data entry is
   identical to today.

### 14.4 Tests

- Repo round-trip (add/edit/archive/list-active) — integration.
- `equipmentItems()` formatting — unit: active-only, working-count rendering, NULL quantities
  ("class set"), empty list ⇒ no item.
- `/kit` renders + a row autosave — screens integration.
- One existing AI feature's context assembly asserts the kit item is present when inventory exists
  (prompt-builder unit test; no live call needed — the wrapper is already proven). One combined
  live verify when built (e.g. draft-lesson on a course while the inventory holds micro:bits, and
  see them used).

**Size: M** (S migration + S page + S injection across six call sites).
**Order: build 5.8 before 5.7 if practical lessons are next on the conversion list** — that way the
first bulk-filled unit already plans within the real kit. Otherwise 5.7 first is fine; the injection
retrofits cleanly.

---

## 15. 5.9 stretch detail *(renumbered from 5.8; added 2026-06-11)*

In likely build order, each independently shippable:

1. ✅ **Pacing & carry-over** *(built 2026-06-11)* — on the map, recent/today rows offer
   **"↻ continue next week"**: the unfinished lesson repeats at the slot's next occurrence and every
   later bound lesson shifts back one school week (holiday-aware). History is never rewritten — new
   bindings always start no earlier than today.
2. ✅ **Per-class teaching-context** *(built 2026-06-11)* — optional `group_courses`-level text,
   edited on the lesson screen's group section. **Adds to** the course context (labelled "FOR THIS
   CLASS SPECIFICALLY") rather than replacing it, so one line about a class never wipes the cohort
   essentials. Used when **adapting for that class**; deliberately *not* used by improve-master,
   which serves every class and gets the course context only.
3. **Content-based conversion** — extract real text from source files and feed it to convert/draft:
   docx via a parser (e.g. mammoth), pptx via zip + slide-XML text nodes, pdf via `pdftotext`
   where available. Cap per-lesson extract (~2–4k chars), store nothing new (extract on demand),
   and fall back to structure-only on any extraction failure. Decide the exact libraries when
   picked up (see §10).
4. **Kit-per-lesson linkage** — a "kit needed" line on lesson plans (free text or picked from the
   5.8 inventory), shown on the lesson screen and the map; later, a lay-down summary ("this unit's
   weeks need: micro:bits ×16, batteries").
5. **Cross-group compare** — one master lesson: master text + each group's adaptation side by side
   (read-only diff view), with "promote this group's version" pre-filling a 5.5b-style apply.
6. **Niceties:** convert de-dup by source folder ("you already converted this — convert again?"),
   CSV import for the kit list, map drag-to-shift instead of re-lay.
