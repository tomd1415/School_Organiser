# Phase 5 — Results / analytics + teacher-controlled release

**Goal:** turn confirmed marks into views — per-pupil results, per-spec-point breakdown, cohort mastery — and
let the teacher **release** results to pupils (instant vs on-release, mirroring lesson marking). Pupils see
**only confirmed** marks, and only once released (or instantly if the class is on `instant`). Surface
assessment outcomes in the existing **Pupils cohort** analytics. All cohort reads exclude `is_test`.

## Outcome

Teacher opens an assessment's results → per-pupil scores + per-spec-point heatmap + cohort mastery → presses
**Release** (per class) → pupils see their confirmed marks + feedback (+ per-spec-point breakdown if shown).
The Pupils cohort screen gains an "assessments" signal.

## Files to create / modify

| File | New? | Responsibility |
|------|------|----------------|
| `app/src/repos/assessmentAnalytics.ts` | new | Cohort + per-spec-point + per-pupil aggregate reads (all `WHERE NOT is_test`). |
| `app/src/services/assessmentResults.ts` | new | Compose teacher results + the **pupil-visible** results (confirmed + released gate). |
| `app/src/lib/assessmentResultsView.ts` | new | Pure views: teacher results dashboard + pupil results panel. |
| `app/src/routes/assessmentMark.ts` (or new `assessmentResults.ts`) | edit/new | Results page + per-class Release toggle. |
| `app/src/routes/assessmentTake.ts` | edit | Pupil "my results" view once released. |
| `app/src/lib/pupilsView.ts` / cohort view | edit | Surface assessment outcomes in the Pupils cohort. |
| `app/src/lib/paths.ts` | edit | Results + release builders. |
| tests | new | Aggregation (pure + integration), release gate, `is_test` exclusion, pupil-visibility. |

## Reused primitives

- [repos/assessmentAttempts.ts](../app/src/repos/assessmentAttempts.ts): `setReleased(assessmentId,
  groupCourseId, released)`, `getAssignment` (has `resultsMode` + `releasedAt`), the
  `assessment_spec_point_results` cache (written in Phase 4).
- [services/assessment.ts](../app/src/services/assessment.ts): `scoreOfAttempt`, `computeSpecPointResults`
  (already used at mark time; reuse for any on-the-fly recompute).
- The lesson-marking **release model** to mirror: `results_mode 'instant' | 'on_release'` + `released_at`
  (the same column names exist on `assessment_classes`); pupil visibility = "confirmed marks only; held until
  release unless instant" — see `services/marking.ts pupilLessonResults`.

## Repo — `repos/assessmentAnalytics.ts` (all reads `WHERE NOT is_test`)

- **Per-pupil for an assessment** (teacher view): each pupil's attempt status, `score_awarded/score_total`,
  count of `needs_review`/`disclosure` flags. Join `assessment_attempts` (NOT is_test) × pupils ×
  awarded marks.
- **Per-spec-point cohort mastery:** aggregate `assessment_spec_point_results` across the class →
  `{ specPointId, code, title, awarded, total, pct, nPupils }`. (Objective-only by design — note it in the UI.)
- **Per-pupil per-spec-point** (for the pupil breakdown): that pupil's `assessment_spec_point_results`.
- **Cohort signal for the Pupils screen:** latest assessment %/mastery per pupil for the course (to feed the
  existing cohort analytics: level chips / completion % already there).
- Keep each as a focused SQL read returning a typed row; **never** select test attempts.

## Service — `services/assessmentResults.ts`

- **`teacherResults(assessmentId)`** — compose the per-pupil table + per-spec-point cohort mastery +
  per-assignment release state (from `listAssignmentsForAssessment`). Teacher sees everything (incl.
  suggested/unconfirmed counts, flags).
- **`pupilResults(pupilId, assessmentId)`** — the **gated, confirmed-only** view (mirror
  `marking.ts pupilLessonResults`):
  - resolve the pupil's assignment; if `resultsMode === 'on_release' && releasedAt == null` → return `null`
    (held back).
  - return only **confirmed** awarded marks (status `confirmed`), per-part feedback, the attempt score, and —
    if you choose to show it — the per-spec-point breakdown. **Never** include mark-points/model answers.
- **`releaseFor(assessmentId, groupCourseId, released)`** → `setReleased(...)` (per class).

## Routes

- `GET /assessments/:id/results` → `teacherResults` → `assessmentResultsView.teacher(...)`. Width `wide`.
- `POST /assessments/:id/release/:gcId` (CSRF) → `releaseFor(...)` → re-render the release control.
- `GET /me/assessments/:id/results` (pupil gate) → `pupilResults(pupilId, id)`; null → "results not released
  yet" panel; else the pupil results panel (confirmed marks + feedback + optional spec-point breakdown).
- Pupils-cohort route: extend the existing cohort read to include the assessment signal.

## Views — `lib/assessmentResultsView.ts`

- **Teacher dashboard:** per-pupil score table (sortable), per-spec-point mastery heatmap (RAG by %), flags
  column linking to the Phase-4 marking modal, per-class Release toggle showing `instant`/`on_release` +
  released state. All URLs via `paths.ts`.
- **Pupil panel:** their score, per-part feedback, per-spec-point breakdown (if shown) — confirmed only.
- Extend the **Pupils cohort** view (the existing class chips / level chips / completion % / ATL trend) with
  an assessment-mastery chip/column. Keep it cohort-level (no per-pupil identity sent anywhere — this is all
  on-server rendering for the teacher).
- Add `uiFixtures.ts` fixtures (teacher dashboard, pupil panel, cohort-with-assessment).

## Privacy & degrade

- **Pupil visibility gate:** confirmed-only + released-or-instant. A `needs_review`/suggested mark is **never**
  visible to a pupil. Unit-test the gate.
- **`is_test` exclusion:** every analytics read filters `WHERE NOT is_test` — test-lab attempts never pollute
  cohort numbers. Test it explicitly.
- **No AI** in this phase → nothing leaves; per-spec-point analytics are objective-only and computed at mark
  time, so they're deterministic and defensible.
- **Degrade:** results render from whatever is confirmed; an unmarked/partly-marked attempt simply shows fewer
  confirmed marks — never an error.

## Tests (this phase must add)

1. **Pure — pupil-visibility gate** (`tests/assessmentResults.test.ts`): `on_release` + not released → null;
   released → confirmed marks only; `instant` → confirmed marks immediately; suggested/`needs_review` excluded.
2. **Integration — aggregation + `is_test` exclusion** (`tests/integration/assessmentAnalytics.int.test.ts`):
   seed a real + a test attempt with marks; assert per-pupil + per-spec-point + cohort reads include the real
   one and **exclude** the test one; release flips pupil visibility.
3. **Integration — release flow**: `releaseFor` sets/clears `released_at`; pupil `pupilResults` respects it.

## Definition of done

- [ ] Gate green incl. new pure + integration suites.
- [ ] Teacher sees per-pupil + per-spec-point + cohort results; Release per class works (instant vs on-release).
- [ ] Pupils see only confirmed marks, only when released (or instantly); never mark-points/model answers.
- [ ] Cohort analytics exclude `is_test`; Pupils-cohort screen surfaces an assessment signal.
- [ ] New paths + `pathsBuilders.test.ts`; results views have gallery fixtures.

## Open decisions

- Whether pupils see the **per-spec-point** breakdown or just the overall score + per-part feedback (plan:
  overall + per-part feedback first; spec-point breakdown behind the same `showScores`-style toggle).
- Cohort mastery metric: mean % vs RAG thresholds (plan: RAG by % band, matching the existing cohort chips).
