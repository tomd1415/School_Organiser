# Phase 14 — Hardening Phase 13: settle the planner, edit & preview before building on them

> **Status (2026-06-27): NOT BUILT — deferred, now folded into [Phase 15](PHASE_15_PLAN.md).** This plan
> was written on 2026-06-18 but never executed: the work that actually happened next was the *content-rich
> worksheets* (Phase 12), the *Rail & Stage UI rebuild*, and the *per-unit assessment subsystem*. None of
> 14.1–14.6 has landed — confirmed in code: there is no `resolvePlannerDrop` module (14.1), no
> cascade-overflow warning in [/planner/place](../app/src/routes/planner.ts) (14.2), and no click-to-place /
> ARIA path (14.3); the only planner test is [planner.int.test.ts](../app/tests/integration/planner.int.test.ts).
> The debt it describes is **still real and still the highest-priority hardening**, so it has been pulled
> verbatim into [Phase 15](PHASE_15_PLAN.md) §15.2. Keep this document as the detailed design for those
> items; track *status* in the Phase 15 plan.

> **Status (2026-06-18): planned.** Phase 13 shipped a large amount of new surface — per-class
> multi-slot delivery, the unified lesson card, the tri-state inline edit, the new-tab pupil preview,
> and the **drag-drop planner** ([/planner](../app/src/routes/planner.ts)) with insert/cascade, move,
> pull-forward, whole-unit drop, pin/lock, undo and the end-of-unit cue. The *server* side is
> integration-tested; the **client drag-and-drop wiring is not tested at all**, there is **silent data
> loss** at one cascade edge, and the planner is **unusable on a tablet or by keyboard** (HTML5
> drag-and-drop is mouse-only). Phase 14 pays that bill before anything is built on top — no new
> features, just making the new code trustworthy in daily use.

**Standing constraints** (unchanged): single-teacher; server-rendered HTML + vendored HTMX;
`routes → services (pure) → repos`; tests never call the real AI. **The AI boundary is untouched** —
none of this work sends anything to an AI service (it's delivery/UI/perf), so the redaction/withholding/
audit wrapper is out of scope here. Migrations only if 14.4 genuinely needs an index.

---

## Why this, not new features

Phase 13 was a big, fast build. Three concrete risks are outstanding:

1. **The drag-drop is untested.** `/planner/place` (the ops) has integration tests, but the inline
   `DRAG_SCRIPT` that decides *which op a drop becomes* — tray→insert, cell→move, unit→unit,
   button→pull/lock/unlock/undo — has zero coverage. A one-line regression there is invisible.
2. **Silent data loss.** `cascadeInsert` drops the last occupant off the end when the window has no
   trailing gap; the route extends with a buffer but **never tells the teacher** if a lesson still falls
   off. The Phase 13 plan's own rule was "no silent caps — log what was dropped." It currently doesn't.
3. **Touch & keyboard can't plan.** HTML5 drag-and-drop doesn't fire on touch and is keyboard-
   inaccessible. A tablet at the desk, or keyboard-only use, simply can't move a lesson.

Everything below is a reviewable, tested slice that ends with the suite green
(`npm test` + `npm run test:integration` + `npm run typecheck`).

---

## Build order

### 14.1 — Test the one untested layer: the drop-resolution logic *(S–M)*

The correctness of a drop lives in two places — the **decision** (what op a gesture becomes) and the
**execution** (`/planner/place`, already tested). Cover the decision:

- **Extract** the drop-resolution branching out of the inline `DRAG_SCRIPT` string into a tiny **pure
  module** (`resolvePlannerDrop({ dragPlan, dragUnit, fromDate, fromTll, target })` → `{ op, params }`),
  and unit-test every gesture: tray-lesson→empty (insert), tray-lesson→occupied (insert/cascade),
  placed→placed (move), unit→slot (unit), ✕ (pull), 🔓/🔒 (lock/unlock), ↶ (undo), and the
  drop-on-`pl-none`/no-drag no-ops. The page script becomes a thin adapter that calls it.
- **Decide on a browser smoke.** There is currently **no Playwright/E2E harness** in `app/` (the sibling
  `exam_questions` / `report-gen` projects have one). Option (a): add a *single* Playwright dev-dep + one
  happy-path smoke per gesture against a seeded DB. Option (b): skip the browser and rely on the pure
  decision tests + the existing endpoint tests. **Recommend (b) for now** (the app deliberately avoids
  extra npm deps on the school line; the real logic is the pure module + the tested route) and revisit
  (a) if a DnD regression ever slips through.

### 14.2 — No silent data loss in the planner *(M)*

- **Cascade overflow warning.** When an insert/cascade or a whole-unit drop would push a lesson past the
  end of the plannable window/year, detect it in `/planner/place` and return a clear message (mirror
  `/map/shift`'s year-end overflow text), so the teacher knows a lesson fell off and can re-place it —
  instead of it vanishing. Extend the buffer first; only warn when it's genuinely past the year end.
- **Undo affordances.** Disable the **↶ Undo** button when there's nothing to undo (it's always shown
  today), and make the one-step/in-memory/per-class limit honest — either reflect it in the UI tooltip
  or persist the last snapshot if cheap. Confirm undo after switching class and after a reload behaves
  sanely.
- **Boundary tests.** Cascades that run into half-term / year-end; re-lay overwrite; a locked lesson at
  the window edge; an empty-tray ("all placed") and no-slots / no-scheme class.

### 14.3 — Touch & keyboard: a non-drag placement path *(M)*

Make the planner usable without a mouse, reusing the tested endpoints:

- **Click-to-place fallback.** Tap/click a tray lesson (or a placed lesson) to "pick up" — a clear
  picked-up state — then tap a target slot to drop; same `/planner/place` ops back it. Works on touch
  and by keyboard (Enter/Space to pick up and drop, arrow/Tab to move focus).
- **ARIA** roles/labels on the grid and tray; focus-visible styles; the lock/✕/undo controls reachable
  and labelled. (This is also a genuine SEND/accessibility improvement, in the spirit of Phase 10.)

### 14.4 — Performance on a full year *(M; migration only if an index is needed)*

- **Kill the `applyPlacements` N+1.** Today each changed position does `findOrCreateOccurrence` +
  `getOccurrenceCourses` + `setOccurrenceCoursePlan` — a deep cascade or whole-unit drop fans out into
  many round-trips. Resolve occurrences for the whole change-set in one query, set plans in one, keeping
  the pure cascade maths untouched.
- **Profile the window queries.** `classPlacements` / `classSchedule` over the 16-week view + buffer, and
  `unitIdByPlan` — confirm they scale on a full-year, 3-slot class; add an index on the
  `occurrence_courses ↔ lesson_occurrences` join only if profiling shows it's needed.

### 14.5 — Settle the rest of Phase 13 *(S–M)*

- **Pupil preview (13.4):** autosave robustness near the 200 k-char cap, CSRF/expiry, master-vs-local
  save-target correctness, and the no-worksheet / no-slides states. Assert the `gc=0` master fallthrough
  can **never** create a local class adaptation.
- **Inline edit (13.3):** a regression test for the adaptation-clobber guard (`upsertAdaptation` only when
  none exists), and that returning to View reflects an edit without a refresh.
- **Resource grouping (13.6):** odd/empty `source`, a resource that is both `image` kind and
  `ai_generated`, and very long lists.
- **Unified-card no-refresh (13.2):** confirm bind/generate updates in place on **both** the Schemes card
  and the timetable card.

### 14.6 — Regression net + docs *(S)*

Fill any remaining coverage gaps on the new repos/services (`classPlacements`, `applyPlacements`,
`setPlannerLock`, `unitIdByPlan`, the `upcomingClassSlots` boundaries), keep the suite green, and update
[CHANGELOG.md](../CHANGELOG.md) + the docs index.

---

## Sequencing & risk

**14.2 first** — silent data loss is the highest-severity gap and it's small. Then **14.1** (lock the
drop logic behind tests) and **14.3** (touch/keyboard — the biggest real-use gap for a tablet at the
desk). **14.4** when there's enough planned data to feel the N+1. **14.5 / 14.6** fold in alongside. No
new pupil-data categories, no AI calls, and the maths in [services/delivery.ts](../app/src/services/delivery.ts)
stays exactly as-is (it's already unit-tested) — Phase 14 only hardens the layers around it.

## Out of scope (still parked, for later phases)

Homework setting & tracking, cover-lesson packs, exam-board key dates, the cohort dashboard / prep
packs, multi-provider LLM, and the parental-contact/behaviour log — all viable Phase 15+ candidates, but
deliberately held until the Phase 13 surface is solid. The multi-teacher v2 rearchitecture stays
unnumbered and parked (gated on real-use proof + a fresh whole-school DPIA).
