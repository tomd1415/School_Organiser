# Phase 15 — Pay down the debt the fast builds left: settle the planner, assessments & the dark shell

> **Status (2026-06-27): planned.** The last stretch shipped three big surfaces in quick succession —
> **Phase 12** (content-rich worksheets), the **Rail & Stage UI rebuild**, and the **per-unit assessment
> subsystem** — and along the way the planned **Phase 14 planner-hardening was skipped entirely**. The
> result is a lot of new, lightly-tested surface and a few known-soft edges. Phase 15 makes the existing
> code trustworthy in daily use **before** any new feature wave (which is [Phase 16](PHASE_16_PLAN.md)).
> No new pupil-data categories; the AI boundary is unchanged except where 15.3 *adds* a guard or a smoke.

**Standing constraints** (unchanged): single-teacher; **no pupil name to any AI service** (roster→tokens,
egress assert, audit stores the redacted request — [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md));
**safeguarding-flagged content withheld from AI entirely**; per-class context is **cohort-level prose**;
feature inputs go in the wrapper's `context[]`, never `system`; server-rendered HTML + vendored HTMX;
`routes → services (pure) → repos`; **tests never call the real AI** (key forced empty in test config).
Migrations only where genuinely needed (15.2's lock-snapshot and 15.6's optional index are the only
candidates). Each slice ends with the suite green (`npm test` + `npm run test:integration` +
`npm run typecheck`).

---

## Why this, not new features

The recent builds were big and fast. The concrete risks now outstanding, in priority order:

1. **The drag-drop planner is barely tested and unsafe at the edges.** The only coverage is
   [planner.int.test.ts](../app/tests/integration/planner.int.test.ts) (the `/planner/place` *ops*). The
   client gesture→op resolution is untested, a cascade can **silently drop a lesson off the end of the
   year**, and the planner is **unusable by touch or keyboard**. This is exactly the bill
   [Phase 14](PHASE_14_PLAN.md) was written to pay and never did — it is pulled in here verbatim as 15.2.
2. **The assessment subsystem has one open DoD item and thin real-world proof.** Per
   [CHANGELOG.md](../CHANGELOG.md) (2026-06-26) the **live-AI end-to-end smoke is still pending** (it needs
   the teacher's real key), and as the newest, largest subsystem it deserves a deliberate privacy + edge
   pass before pupils sit a real paper.
3. **The dark shell shipped with a button-colour cascade bug** (fixed 2026-06-27, see CHANGELOG), whose
   root cause — a bare `button[type="submit"]` force-filling *every* submit button teal — is still latent
   and will re-bite. Make the button system principled, not patched.
4. **Performance and a couple of self-healing residuals** (lesson-open query depth; the `applyPlacements`
   N+1) are measured-but-unaddressed audit notes that are cheap to close now.

---

## Build order (each a reviewable, tested slice)

### 15.1 — Make the dark-shell button system principled *(S)*

The 2026-06-27 fix stopped secondary submit buttons rendering invisible, but the underlying selector
`body[data-shell="next"] button[type="submit"]` still force-fills **every** submit button teal, so every
secondary/ghost submit needs a counter-rule. Invert it:

- **Scope the teal fill to explicit intent.** Drop the bare `button[type="submit"]` from the
  `.primary/.btn-primary` group in [styles.css](../app/public/styles.css); a button is primary only when it
  says so (`.primary`/`.btn-primary`). Audit the ~40 `<button type="submit">` call sites and add `.primary`
  to the genuine single-action CTAs (Generate, Lay down, Save key, …) so they *keep* the teal — a deliberate
  per-button decision, not a blanket rule.
- **Extend the guard.** Grow [btnSecondaryColor.test.ts](../app/tests/btnSecondaryColor.test.ts) into a
  small button-contract test: assert no rule force-fills bare `button[type="submit"]`, and that
  `.btn-secondary` / `.button.ghost` / `button.link` resolve to readable, non-CTA colours. Add a couple of
  the worst offenders as `/ui-gallery` fixtures so the colours are eyeballable in isolation.

### 15.2 — Planner hardening *(M–L; the whole of [Phase 14](PHASE_14_PLAN.md), pulled in)*

Execute Phase 14 as written. The detailed design lives there; the slices are:

- **15.2a — Test the untested layer (14.1).** Extract the drop-resolution branching out of the inline
  `DRAG_SCRIPT` into a pure `resolvePlannerDrop({ dragPlan, dragUnit, fromDate, fromTll, target })` →
  `{ op, params }`, and unit-test every gesture (tray→empty insert, tray→occupied insert/cascade,
  placed→placed move, unit→slot, ✕ pull, 🔓/🔒 lock/unlock, ↶ undo, `pl-none`/no-drag no-ops). The page
  script becomes a thin adapter. *(Stand by Phase 14's recommendation (b): rely on the pure module + the
  tested route rather than adding a Playwright dep — but if 15.2c lands a click-to-place path, one happy-path
  browser smoke per gesture becomes cheap and worth it.)*
- **15.2b — No silent data loss (14.2).** When an insert/cascade or whole-unit drop would push a lesson past
  the end of the plannable year, detect it in `/planner/place` and **return a clear message** (mirror
  `/map/shift`'s year-end overflow text) instead of vanishing the lesson; extend the buffer first, warn only
  when genuinely past year-end. Disable **↶ Undo** when there's nothing to undo and make the
  one-step/per-class limit honest (tooltip, or persist the last snapshot — the one possible small migration).
  Boundary tests: cascade into half-term/year-end, re-lay overwrite, locked lesson at the window edge,
  empty-tray and no-scheme class.
- **15.2c — Touch & keyboard (14.3).** A **click-to-place** fallback: tap a tray/placed lesson to "pick up"
  (clear picked-up state), tap a target to drop; same `/planner/place` ops. Enter/Space to pick up/drop,
  Tab/arrows to move focus; ARIA roles/labels on grid + tray; focus-visible styles. (Also a genuine
  SEND/accessibility win, in the spirit of Phase 10.)

### 15.3 — Assessment subsystem: finish the DoD and prove it safe *(M)*

- **Live-AI smoke (the open DoD item).** A throwaway, self-cleaning dev script
  (`app/scripts/assessment-smoke.ts`, deleted after) that, with the teacher's real key, runs **generate →
  validate → materialise (draft)** for one unit and **marks one open answer**, then asserts the audit row
  stored the **redacted** request and **no pupil name** egressed. Keep all test data out of real tables
  (clean up in `finally`); the test suites stay AI-free.
- **Privacy regression locks (make the guards permanent, not one-off).** Promote the Phase-7 checks into
  standing tests: the generation prompt carries no pupil name; marking sends only redacted, slot-lettered
  answers via `context[]` (never `system`); a `disclosure=true` answer is **withheld** and surfaces in the
  safeguarding register; every analytics read filters `WHERE NOT is_test`; the pupil take projection
  (`takeTree`) **never** carries mark-points/model-answers/misconceptions.
- **Edge & degrade pass.** AI-off degrades to *writing nothing* (assert it); a class with no covered
  spec-points; an assessment assigned to multiple eligible classes (dedupe by `group_course`); a `needs_review`
  open answer is never auto-confirmed; results held until release unless `instant`. `wipeTestAttempts`
  clears the Test-Lab cohort.

### 15.4 — Performance & self-healing residuals *(S–M; migration only if profiling demands)*

- **Kill the `applyPlacements` N+1.** A deep cascade / whole-unit drop currently fans out
  `findOrCreateOccurrence` + `getOccurrenceCourses` + `setOccurrenceCoursePlan` per position. Resolve
  occurrences for the whole change-set in one query and set plans in one, leaving the pure cascade maths in
  [services/delivery.ts](../app/src/services/delivery.ts) untouched.
- **Profile the window queries** (`classPlacements` / `classSchedule` over the 16-week view + buffer,
  `unitIdByPlan`) and the lesson-open lookups flagged in the audit (BUG-060). Add an index on the
  `occurrence_courses ↔ lesson_occurrences` join **only if** profiling on a full-year, 3-slot class shows
  it's needed.
- **Tidy the documented residuals**: the cosmetic stale `planner_locked`-on-crash flag (BUG-021) — confirm
  it self-corrects or clear it on boot; the daily AI-review-sweep crash note (BUG-048) — confirm the boot
  sweep re-runs it. These are accept-or-close, not big work.

### 15.5 — Small, ready resource follow-ons *(S each — pick up if time allows)*

From [NEXT_STEPS.md](NEXT_STEPS.md), the genuinely-ready, AI-free items:

- **External reference link on lessons/units** — a URL + note field so a CAS (or any) resource can be linked
  without copying it (licence-safe).
- **Finish the KS4/GCSE import** — units 9–16 still "to do" in [RESOURCE_INGEST.md](RESOURCE_INGEST.md)
  (data-entry + mapping, no new code shape).

### 15.6 — Regression net + docs *(S)*

Fill remaining coverage on the new repos/services touched above, keep the full gate green, and update
[CHANGELOG.md](../CHANGELOG.md) + the docs index. Verify the classic-shell flag removal is fully gone (no
`getUiShell`/`data-shell="classic"` paths remain) and drop any dead references.

---

## Sequencing & risk

**15.2b first** (silent data loss is the highest-severity gap and it's small), then **15.1** (the button
contract — small, stops the cascade re-biting and is visible to the teacher every day), then **15.2a/15.2c**
(lock the planner behind tests; touch/keyboard is the biggest real-use gap for a tablet at the desk), then
**15.3** (assessment proof — needs the teacher's key for the smoke, so it can run in parallel with the
above). **15.4** when there's enough planned data to feel the N+1. **15.5/15.6** fold in alongside. The
delivery maths in [services/delivery.ts](../app/src/services/delivery.ts) stays exactly as-is (already
unit-tested) — Phase 15 only hardens the layers around it.

## Out of scope (→ [Phase 16](PHASE_16_PLAN.md) or stays parked)

The *Stages & strands* progression model, the homework loop, pupil progress views, the class risk board,
richer worksheet block types, and the multi-provider LLM all wait for Phase 16+. The deploy/first-year-setup
items in NEXT_STEPS §A are **operator actions** (code is shipped). The multi-teacher v2 rearchitecture stays
unnumbered and parked (gated on real-use proof + a fresh whole-school DPIA).
