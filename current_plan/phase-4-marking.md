# Phase 4 — Marking (objective auto-mark + AI open-mark + teacher confirm + queue)

**Goal:** mark a submitted attempt — objective parts deterministically (instant, free), open parts via the
AI in **anonymous, slot-lettered, redacted** batches — then surface marks to the teacher in a confirm/adjust
modal with a moderation queue. Safeguarding-matched answers are **withheld from AI** and flagged. This phase
is a near-mirror of [services/marking.ts](../app/src/services/marking.ts) over the assessment tables.

## Outcome

A submitted attempt gets objective parts auto-marked immediately and open parts AI-marked (Sonnet) in the
background; the teacher sees a per-attempt marking view, adjusts/overrides, and confirms. `needs_review`
marks are never auto-confirmed. Per-spec-point objective results are computed at mark time. `disclosure=true`
answers also surface in the safeguarding register.

## Files to create / modify

| File | New? | Responsibility |
|------|------|----------------|
| `app/src/services/assessmentMarking.ts` | new | Orchestrate objective + open AI marking over an attempt (mirror `services/marking.ts`). |
| `app/src/services/assessmentMarkQueue.ts` | new | Durable queue worker (mirror `services/markingQueue.ts`). |
| `app/src/llm/schemas/markAssessmentAnswers.ts` | new | `zod/v4` schema for the AI marking batch (mirror `schemas/markAnswers.ts`). |
| `app/src/llm/prompts/markAssessmentAnswers.ts` | new | System / version / instruction / `Items()` (mirror `prompts/markAnswers.ts`). |
| `app/src/routes/assessmentMark.ts` | new | Teacher routes: mark now · the confirm/adjust modal · override · confirm-all. |
| `app/src/lib/assessmentMarkModalView.ts` | new | Pure view: per-attempt marking grid + per-answer adjust controls. |
| `app/src/llm/features.ts` | edit | Register `mark_assessment_answers` (role `plan` → **Sonnet**). |
| `app/src/server.ts` | edit | Register mark routes + start the assessment mark-queue sweeper (boot + tick). |
| `app/src/lib/paths.ts` | edit | Marking builders. |
| tests | new | Objective marking + slot-batch completeness + guard/gate + degrade + privacy guard. |

## Reused primitives (already exist)

- **Objective marking:** [lib/deterministicMarker.ts](../app/src/lib/deterministicMarker.ts) — `markField(points, answer)`
  → `FieldMark { marksAwarded, marksTotal, pointsHit, evidence }`; `isDeterministic(points)`; `MarkKind`.
- **Safety:** [lib/markSafetyGate.ts](../app/src/lib/markSafetyGate.ts) — `guardMatch(answer)` (→ withhold +
  flag), `gateMark(input)` → `GateVerdict { marksAwarded (clamped), needsReview, reasons }`, `CONFIDENCE_FLOOR`.
- **Pure attribution:** [services/assessment.ts](../app/src/services/assessment.ts) — `isObjectivePart`,
  `computeSpecPointResults(tree, awarded)` (objective-only), `scoreOfAttempt`.
- **Repo writes:** [repos/assessmentAttempts.ts](../app/src/repos/assessmentAttempts.ts) — `answersForMarking`,
  `writeAwardedMark` (upsert + history), `overrideMark`, `confirmMarksForAttempt` (skips `needs_review`),
  `upsertSpecPointResult`, `recomputeAttemptScore`, `enqueueAttemptMark`, `claimDueAttemptMarks`.

## Service — `services/assessmentMarking.ts`

Adapt `markObjective` / `markOpen` from `services/marking.ts` to the assessment shape. Marking is **per
attempt** (not per lesson-occurrence). Re-check the **`marksEnabled()`** DPIA gate inside every entry point
(defence-in-depth, like marking.ts), and **skip `is_test` attempts** from any real AI work.

**Resolve once:** `tree = assessmentWithQuestions(assessmentId)`; build `partById` and the part→mark-points
map; `answers = answersForMarking(attemptId)`; `partId → AssessmentPart`.

**`markAttemptObjective(attemptId)`** — for each answer whose part `isObjectivePart`, convert the part's
mark-points to `deterministicMarker.MarkPoint[]` (the kinds line up — `tick/choice/exact/numeric/keyword`),
`markField(points, answer.answerText)`, `writeAwardedMark({ marker:'auto', confidence:1, status:'suggested',
needsReview:false, … })`. Skip already-marked answers (idempotent). Multiple-choice/tick widgets store the
pupil's structured value; ensure `saveAnswer` wrote it in the form `markField` expects (decide the encoding
in Phase 3 — e.g. the chosen option label, or `'x'` for a tick — and keep it consistent here).

**`markAttemptOpen(attemptId)`** — group **open** parts; for each part:
1. **Guard-screen** every answer with `guardMatch(answerText)`. A hit → `writeAwardedMark({ marksAwarded:0,
   marksTotal, marker:'auto', needsReview:true, disclosure:true, history:{guard:'withheld from AI'} })` and
   **never send it to AI**. (This is the safeguarding withhold.)
2. **Anonymous slots** A, B, C… for the clean answers; the `slot → answerId` map **stays server-side**
   (mirror `marking.ts` exactly). Send the part prompt + mark-points (expected text / marks / alternatives) +
   the slot answers via `callLLMStructured({ feature:'mark_assessment_answers', model: await
   modelForFeature('mark_assessment_answers','plan'), … context: markAssessmentAnswersItems({...}) }, schema)`.
3. **Accept the batch only if complete** — reuse the `isCompleteBatch(expectedSlots, returnedSlots)` rule
   (exact slot set, no missing/dup/unknown). A partial/garbled batch → leave unmarked, re-arm.
4. For each returned slot: `gateMark({ answer, marksAwarded, marksTotal, evidence, confidence })` → clamp +
   flag; `writeAwardedMark({ marker:'ai', confidence, status:'suggested', needsReview: verdict.needsReview,
   feedback, evidence, history:{ai:true, reasons} })`.
5. AI unavailable → return `unavailable` (leave unmarked, re-arm via the queue) — **degrade, write nothing**
   for that part.

**`markAttempt(attemptId)`** — objective then open; afterwards **recompute caches**:
`recomputeAttemptScore(attemptId)` and, for per-spec-point results, build the `AwardedForPart[]` from the
confirmed/suggested objective marks and call `computeSpecPointResults(tree, awarded)` → `upsertSpecPointResult`
for each spec point. (Per-spec-point is **objective-only** by design.)

## Queue worker — `services/assessmentMarkQueue.ts`

Mirror [services/markingQueue.ts](../app/src/services/markingQueue.ts):
- `onAttemptSubmitted(attemptId)` — skip test attempts + `marksEnabled()` off; run objective inline (instant);
  in `NODE_ENV==='test'` run open inline (AI off → no-op); else `enqueueAttemptMark(attemptId, DEBOUNCE_MS)`.
- `runDueAttemptMarks()` — `claimDueAttemptMarks()` → for each, `markAttemptOpen` (+ recompute); on
  `unavailable`/throw, `enqueueAttemptMark(attemptId, RETRY_MS)` (re-arm; idempotent). Wire a **boot sweep +
  periodic tick** in `server.ts` next to `runDueMarkJobs`.

Phase 3's `submitAttempt` route calls `onAttemptSubmitted`.

## Schema + prompt (mirror the lesson marker)

- `schemas/markAssessmentAnswers.ts` — like [schemas/markAnswers.ts](../app/src/llm/schemas/markAnswers.ts):
  `{ results: [{ slot, marksAwarded, confidence, evidence, feedback }] }`. Keep `evidence` a verbatim quote
  (the gate checks it's a real substring). Reuse/copy the existing `markAnswers` shape — it already fits.
- `prompts/markAssessmentAnswers.ts` — `MARK_ASSESSMENT_ANSWERS_VERSION = 'mark_assessment_answers@1'`,
  a system prompt for marking a **summative exam answer** against its mark scheme + misconceptions, and an
  `Items({ question, marksTotal, markPoints:[{expected,marks,alternatives}], misconceptions:[{label,description}],
  slots:[{slot,answer}] })` builder. **All answer text + mark scheme go in `context[]`.** Include
  misconceptions to sharpen marking. **Never** put the pupil's answer in `system`.

## Teacher confirm/adjust — `routes/assessmentMark.ts` + `lib/assessmentMarkModalView.ts`

- `POST /assessments/:id/attempts/:attemptId/mark` → `markAttempt(...)` (manual "mark now" trigger).
- `GET /assessments/:id/attempts/:attemptId/marks` → render the marking grid: per question/part, the pupil's
  answer (teacher sees full PII — they're the teacher), the suggested mark + marker badge (auto/ai/teacher),
  confidence, evidence, flags (`needs_review`, `disclosure`), an editable mark + feedback.
- `POST …/answers/:answerId/override` → `overrideMark(answerId, marks, feedback)` (→ teacher, confirmed).
- `POST …/confirm` → `confirmMarksForAttempt(attemptId)` (skips `needs_review`) → recompute.
- A **moderation queue** view: attempts with any `needs_review` / `disclosure` marks, worst first.
- Mirror the existing [lib/markModalView.ts](../app/src/lib/markModalView.ts) markup conventions (and the
  recent main-branch additions: comment field + status span). Width `working`. Add gallery fixtures.

## Safeguarding register integration

`disclosure=true` awarded marks must surface in the safeguarding register (like lesson marking's 10.4). Add a
read that unions assessment `disclosure` marks into the register's source, or call the existing safeguarding
repo at flag time — match how lesson marking does it (`repos/safeguarding.ts`).

## Privacy & degrade (critical this phase)

- **Only redacted, slot-lettered answers go to AI**, via `context[]`; the slot→answer map never leaves the
  server. The wrapper's egress assert + audit are the backstop. **Privacy guard test required** (below).
- **Safeguarding answers withheld entirely** (`guardMatch` → `disclosure=true`, never sent).
- **`marksEnabled()`** re-checked in every marking entry point; `is_test` attempts never AI-marked.
- **Degrade writes nothing** for any part the AI couldn't mark — it's left unmarked + re-armed; the teacher
  can mark by hand. A failed/garbled batch is rejected wholesale (no partial write).

## Tests (this phase must add)

1. **Pure — objective marking over a part** (extend `tests/assessmentService.test.ts` or new): mark-point
   kinds map to `markField` correctly; objective vs open classification via `isObjectivePart`.
2. **Pure — slot-batch completeness** (`tests/assessmentMarking.test.ts`): reuse/port `isCompleteBatch`
   (missing/dup/unknown/extra slot rejected; exact set accepted).
3. **Pure — guard + gate**: a guard phrase → withheld/flagged; `gateMark` clamps over-total, flags low
   confidence + hallucinated evidence.
4. **Integration — mark lifecycle** (`tests/integration/assessmentMarking.int.test.ts`, AI off): objective
   parts auto-mark; open parts left unmarked when AI off; `confirmMarksForAttempt` skips `needs_review`;
   `recomputeAttemptScore` + `computeSpecPointResults`→`upsertSpecPointResult` populate caches; a
   `disclosure` answer is flagged and not sent.
5. **Privacy guard** (pure): build the marking call's `context[]` for slot answers and assert the answer text
   appears **only** in `context[]` (never `system`), and the prompt carries no pupil name (slots are letters).
6. **Degrade-writes-nothing** (integration): open pass with AI off marks no open answers and re-arms the queue.

## Definition of done

- [ ] Gate green incl. the new pure + integration suites; Playwright (Phase 3 take-flow) still green.
- [ ] Submitted attempts auto-mark objective instantly; open parts AI-mark on the queue (Sonnet) and degrade
      cleanly when AI is off; `needs_review` never auto-confirmed; per-spec-point objective results populated.
- [ ] Teacher can review, adjust/override, and confirm; safeguarding-flagged answers withheld + surfaced.
- [ ] One **throwaway** smoke confirms a real AI marking batch end-to-end (anonymous slots), cleans up, deleted.
- [ ] `mark_assessment_answers` registered (Sonnet); queue sweeper started in `server.ts`; paths + fixtures added.

## Open decisions

- Marking **trigger**: auto-on-submit (queue) vs teacher-initiated only. Plan: auto-queue on submit + a manual
  "mark now" button (mirrors lesson marking's `on_done`/manual options).
- Structured-widget answer **encoding** for `markField` (multiple_choice/tick_box) — fix it in Phase 3 and
  document it here so objective marking reads it correctly.
