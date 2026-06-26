# Phase 3 — Pupil take-flow (list → start → answer → submit)

**Goal:** the pupil-facing surface where a pupil sees assessments assigned to their class, starts the one
attempt, answers part-by-part with autosave, and submits. Behind the **pupil gate**, in the **light theme**,
with the **`is_test`** partition for Test-Lab previews. **Correct answers / mark-points / model answers never
reach the pupil.** This is the first phase with a **Playwright** smoke.

## Outcome

Pupil signs in → "Assessments" lists what's assigned + currently available → opens one → answers each part
(autosaved) → submits → sees a "submitted, awaiting marking" confirmation. One attempt only; resuming an
in-progress attempt restores saved answers.

## Files to create / modify

| File | New? | Responsibility |
|------|------|----------------|
| `app/src/routes/assessmentTake.ts` | new | Pupil routes: list · start · answer (autosave) · submit. Pupil gate + CSRF. |
| `app/src/lib/assessmentTakeView.ts` | new | Pure views: the available-list, the take page (PII-safe — no answers/mark-points). |
| `app/src/services/assessmentTake.ts` | new | Availability/auth logic + a **PII-safe take tree** projection. |
| `app/src/lib/paths.ts` | edit | Take-flow builders (list / take / answer / submit). |
| `app/src/server.ts` | edit | `registerAssessmentTakeRoutes(app)`. |
| tests | new | Pure PII-safe projection test + integration take lifecycle + **Playwright** smoke. |

## Pupil gate & theme (mirror existing pupil surface)

- Mirror [routes/me.ts](../app/src/routes/me.ts): it imports `requirePupil(req, reply)` and
  `pupilAccessEnabled` from `routes/pupilAuth.ts`. Real pupils need the **DPIA access gate ON** and pass the
  clock gate; the **fictitious test pupil bypasses** both and drives `is_test = true` attempts. Reuse
  `pupilLayout` (light theme) from `pupilAuth`. Mutations use `app.csrfProtection` (as `/me/answer` does).
- The pupil's class = their enrolment's `group_course` for the assessment's course; the take routes resolve
  `groupCourseId` from the signed-in pupil (mirror how `/me` resolves the pupil's lesson context).

## Service — `services/assessmentTake.ts`

- **`availableForPupil(pupilId)`** → the assessments assigned to the pupil's class(es) that are **ready** and
  **within the window now** (`available_from <= now AND (available_until IS NULL OR now <= available_until)`),
  with each one's attempt status (`not_started` / `in_progress` / `submitted`). Joins
  `assessment_classes` × the pupil's `group_courses` × `assessment_attempts` (filtered to this pupil). Add a
  small repo read for this if one doesn't fit the existing helpers.
- **`canTake(assessmentId, pupilId)`** → resolves `getAssignment(assessmentId, groupCourseId)`, checks
  ready + window + that the attempt isn't already `submitted`. Returns the `groupCourseId` or a reason.
- **`takeTree(assessmentId)`** — **the PII-safe projection.** Take `assessmentWithQuestions(id)` and **strip
  everything the pupil must not see**: `markPoints`, `misconceptions`, `modelAnswer` (question + part),
  `partConfig` is kept ONLY for the option labels of choice/tick widgets (the options the pupil picks from).
  Return questions → parts with `{ partLabel, prompt, responseType, options? , marks }` and the question
  `stem` only. **This projection is the single chokepoint** that guarantees no answer key leaks — make it a
  pure function and unit-test it (assert no mark-point/model-answer field survives).
- **Start / save / submit** wrap the existing repo functions:
  - `startAttempt(assessmentId, pupilId, groupCourseId, isTest)` (idempotent — resumes; one real attempt).
  - `saveAnswer(attemptId, partId, value)` (autosave; drops a stale mark on change — already handled).
  - `submitAttempt(attemptId)` (double-submit guarded) → on success **enqueue marking**
    (`enqueueAttemptMark(attemptId)`; Phase 4 drains it). In tests / Test-Lab, do **not** queue real AI work.

## Routes — `routes/assessmentTake.ts`

- `GET /me/assessments` → `availableForPupil` → `assessmentTakeView.list(...)`.
- `GET /me/assessments/:id` → `canTake` guard → `startAttempt` (resume/create) → render the take page from
  `takeTree(...)` + the pupil's saved answers (so an in-progress attempt restores). Submitted → show the
  "awaiting results / results" confirmation instead of the form.
- `POST /me/assessments/:id/answer` (body: `partId`, `value`) → `saveAnswer`; respond with a tiny
  "saved ✓" fragment (HTMX autosave, like `/me/answer`).
- `POST /me/assessments/:id/submit` → `submitAttempt` → enqueue marking → confirmation page.
- All behind `requirePupil` + `pupilAccessEnabled` (test pupil bypass); mutations CSRF-protected.

## View — `lib/assessmentTakeView.ts` (pure, light theme, PII-safe)

- **List view:** cards for each available assessment (title, marks, status chip, "Start"/"Resume"/"Submitted").
- **Take view:** one block per question (stem) → parts, each rendering the right widget for `responseType`:
  `short_text`/`medium_text` → text input/area; `extended_response` → large textarea; `multiple_choice` →
  radios from `options`; `tick_box` → checkboxes; `code` → monospace textarea. Autosave each on change (HTMX
  POST to the answer route). A clear **Submit** with a confirm ("you can't change answers after submitting").
- **Never render** mark-points, model answers, misconceptions, correctness, or marks-per-point. (`marks`
  tariff per part is fine to show — it's on the question paper.) URLs via `paths.ts`. Reading-help bar +
  light theme consistent with `/me`. Add `uiFixtures.ts` fixtures (list + take page).

## Privacy & degrade (critical this phase)

- **Answer key never reaches the pupil:** enforced by the `takeTree` projection + a unit test asserting the
  stripped shape. This is the headline privacy property of the phase.
- **No AI is called in the take-flow.** Submission only **enqueues** marking; the actual AI pass is Phase 4
  (and is itself redacted/slot-lettered). So the take-flow can't leak names to AI by construction.
- **`is_test`:** the test pupil's attempts are `is_test = true` and excluded from cohort reads; submitting a
  test attempt must not enqueue real marking (guard like `markingQueue.onPupilDone`'s test check).
- **Degrade:** if marking can't be enqueued/the AI is off, submission still succeeds and the attempt sits
  `submitted` awaiting marking — never block a pupil's submit on AI.

## Tests (this phase must add)

1. **Pure — PII-safe projection** (`tests/assessmentTakeView.test.ts` or `assessmentTake.test.ts`): feed a
   full `AssessmentTree` (with mark-points, model answers, misconceptions) through `takeTree`; assert the
   result contains stems/prompts/options but **no** `markPoints`, `modelAnswer`, `misconceptions`, `kind`, or
   `acceptedAlternatives` anywhere (walk the object). Also render the take view and assert the HTML doesn't
   contain a model-answer/mark-point string.
2. **Integration — take lifecycle** (`tests/integration/assessmentTake.int.test.ts`): assign a ready paper,
   `startAttempt` (idempotent), `saveAnswer` for a couple of parts, `submitAttempt` (and double-submit
   guarded), confirm answers persisted and a `submitted` attempt exists; assert a test attempt is separate
   and not queued for real marking.
3. **Playwright smoke** (`app/tests/e2e/…assessment-take…spec.ts`): as the **test pupil**, open the
   assessments list, start, answer, submit, and see the confirmation — asserting the page **never shows** a
   mark-point/model-answer. (First take-flow E2E.)

## Definition of done

- [ ] Gate green incl. the new pure + integration tests; **Playwright** take-flow smoke green (dev stack up).
- [ ] A pupil can list → start → answer (autosaved) → submit; resume restores saved answers; one attempt only.
- [ ] The take surface provably never exposes answers/mark-points/model answers (projection test + E2E assert).
- [ ] Submitting enqueues marking (real pupils) and does not (test pupil); submit never blocks on AI.
- [ ] New paths + `pathsBuilders.test.ts`; take views have gallery fixtures; routes registered in `server.ts`.

## Open decisions

- Whether to show the per-part **marks tariff** to pupils (plan: yes — it's standard on a question paper).
- Navigation: one long page vs paginated per-question (plan: one page, autosave — simplest, matches `/me`).
- Re-open policy after submit (plan: locked; teacher can't currently re-open in v1 — note as a future option).
