# Phase 6 — Unit integration on the Schemes spine + paths + gallery + CSS

**Goal:** give the whole feature a **home in the existing UI**. Each unit on the Schemes "Spine" gains a lazy
**"Assessments"** section listing its assessments (status, marks, assigned classes) with the generate / review
/ assign / results entry points built in Phases 1–5. Formalise all `paths.ts` builders + their guard
assertions, add `/ui-gallery` fixtures for every assessment view, and add the CSS. Ends with a **Playwright**
gallery-render check.

> This phase can start as soon as Phase 1 exists (an "Assessments" panel that just lists + offers "Generate")
> and grow a row of actions as Phases 2–5 land. Treat it as the integration seam, built incrementally.

## Outcome

The teacher never has to know an assessment URL: from a unit on the Schemes spine they expand "Assessments",
see what exists, and jump to generate/review/assign/mark/results. Every assessment view previews in the
gallery with no DB. `pathsGuard` + `pathsBuilders` tests stay green.

## Files to create / modify

| File | New? | Responsibility |
|------|------|----------------|
| `app/src/lib/schemeView.ts` (or wherever `renderUnit` lives) | edit | Add a lazy `<details>` "Assessments" block per unit. |
| `app/src/routes/schemes.ts` | edit | A lazy-load endpoint returning the unit's assessments panel (HTMX). |
| `app/src/lib/assessmentUnitPanelView.ts` | new | Pure view: the per-unit assessments list + action row. |
| `app/src/lib/paths.ts` | edit | **All** assessment route builders (consolidated, final set). |
| `app/tests/pathsBuilders.test.ts` | edit | An assertion per new builder (the oracle). |
| `app/src/lib/uiFixtures.ts` | edit | Fixtures for every assessment view (review, take list/page, mark modal, results, unit panel). |
| `app/src/routes/uiGallery.ts` | edit | Register the new gallery entries. |
| `app/public/styles-base-widgets.css` | edit | Structure/layout for the new components. |
| `app/public/styles.css` | edit | Dark-theme rules under `body[data-shell="next"]`. |
| tests | edit/new | `pathsGuard` stays green; gallery-render Playwright check; unit-panel render test. |

## `renderUnit` "Assessments" `<details>`

- Find where the Spine renders a unit (`renderUnit`/equivalent in the scheme view). Add a collapsed
  `<details>` "Assessments" whose body lazy-loads via HTMX from a new schemes route
  (`GET /schemes/unit/:unitId/assessments`) so the spine stays cheap to render.
- The lazy endpoint calls `listAssessmentsForUnit(unitId)` ([repos/assessments.ts](../app/src/repos/assessments.ts)
  → `AssessmentSummary { id, title, style, status, marksTotal, questionCount, assignedClasses }`) and renders
  `assessmentUnitPanelView`.

## View — `lib/assessmentUnitPanelView.ts`

- A compact list: each assessment's title, style badge (KS3/GCSE), status chip (draft/ready/archived), marks,
  question count, assigned-classes count, and a row of actions wired to Phases 1–5:
  - **Generate** (opens the class picker → Phase 1 generate route).
  - **Review/Edit** (Phase 1 review view) — draft only editable.
  - **Assign** (Phase 2) — ready only.
  - **Results** (Phase 5) — once attempts exist.
- Empty state: "No assessments yet — Generate one for a class." All URLs via `paths.ts`. Keep it pure.

## `paths.ts` — consolidate the full builder set (+ oracle)

Add a dedicated "Assessments" section to [lib/paths.ts](../app/src/lib/paths.ts). Likely builders (final names
to settle as the routes land):

```
unitAssessments(unitId)                         GET  /schemes/unit/:unitId/assessments     (lazy panel)
assessmentGenerate(unitId)                      POST /units/:unitId/assessments/generate
assessment(id)                                  GET  /assessments/:id                       (review)
assessmentReady(id)                             POST /assessments/:id/ready
assessmentAssign(id)                            POST /assessments/:id/assign
assessmentAssignWindow(id, gcId)                POST /assessments/:id/assign/:gcId/window
assessmentUnassign(id, gcId)                    POST /assessments/:id/unassign/:gcId
assessmentResults(id)                           GET  /assessments/:id/results
assessmentRelease(id, gcId)                     POST /assessments/:id/release/:gcId
assessmentAttemptMarks(id, attemptId)           GET  /assessments/:id/attempts/:attemptId/marks
assessmentMarkAnswer(id, attemptId, answerId)   POST .../answers/:answerId/override
assessmentMarkConfirm(id, attemptId)            POST .../confirm
assessmentMarkNow(id, attemptId)                POST .../mark
meAssessments()                                 GET  /me/assessments
meAssessment(id)                                GET  /me/assessments/:id
meAssessmentAnswer(id)                          POST /me/assessments/:id/answer
meAssessmentSubmit(id)                           POST /me/assessments/:id/submit
meAssessmentResults(id)                         GET  /me/assessments/:id/results
```

- **Each builder needs an assertion in `tests/pathsBuilders.test.ts`** (the builder oracle) and **every
  `*View.ts` must reference routes only via these builders** (`tests/pathsGuard.test.ts` enforces it on each
  view file — add views to whatever its scan covers). For query-string routes follow the existing `&amp;`
  HTML-attribute convention in `paths.ts`.
- As each earlier phase is built, add its builders here rather than inline literals — Phase 6 just guarantees
  the **complete, guard-passing** set.

## Gallery fixtures + CSS

- Add a `uiFixtures.ts` fixture for **every** assessment view (review draft, review+assignments, take list,
  take page, mark modal incl. flagged/disclosure states, teacher results, pupil results, unit panel empty +
  populated). Register them in `routes/uiGallery.ts`. The gallery renders views **with no DB**, so fixtures
  must be self-contained `AssessmentTree`/results objects.
- CSS: structure/layout (grids, chips, the take widgets, the marking grid, the heatmap) in
  `styles-base-widgets.css`; dark-theme colours under `body[data-shell="next"]` in `styles.css`. Follow the
  catalogue comment atop `styles.css`. Declare page width per view via `nextShell({ width })` (review/mark =
  `working`; results = `wide`; take = pupil light theme).

## Privacy & degrade

- Gallery fixtures are **synthetic** — never seed them from real pupil data. The take-page fixture must use
  the **PII-safe** take projection (no mark-points/model answers), matching Phase 3.
- The lazy unit panel reads only cohort/curriculum data; no AI, no pupil identity.

## Tests (this phase must add)

1. **`pathsGuard` stays green** — no raw route literals slipped into any assessment `*View.ts`.
2. **`pathsBuilders` oracle** — an assertion per new builder.
3. **Unit-panel render** (pure): `assessmentUnitPanelView` over a fixture renders the list + actions + empty
   state, all links via `paths`.
4. **Playwright gallery render** — load `/ui-gallery`, assert each new assessment fixture renders without error
   (and the take-page fixture shows no mark-point/model-answer string).

## Definition of done

- [ ] Gate green; `pathsGuard` + `pathsBuilders` green with the full builder set; Playwright gallery render green.
- [ ] Each unit on the Spine exposes a lazy "Assessments" panel with working generate/review/assign/results
      entry points.
- [ ] Every assessment view previews in `/ui-gallery` from a self-contained fixture (no DB).
- [ ] CSS lives in the right files (structure vs dark theme); widths declared via `nextShell`.

## Open decisions

- Whether "Assessments" is a per-**unit** `<details>` only, or also a course-level overview. Plan: per-unit
  (matches the data model — one paper per unit), with the Pupils-cohort surfacing (Phase 5) as the cross-class view.
