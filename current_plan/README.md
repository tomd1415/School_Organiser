# Per-unit summative assessments — implementation plan (Phases 1–7)

This folder is the **working plan** for finishing the per-unit assessment feature. Phase 0 (schema +
repos + pure service + tests) is committed and green on `main`. Each file here is a self-contained,
build-ready plan for one remaining phase. Read this index first, then the phase you're building.

> Durable record of *what exists*: [docs/HANDOVER_2026-06-26.md](../docs/HANDOVER_2026-06-26.md) Part B.
> This folder is *what to build next*, in detail.

## The goal (v1 scope — confirmed)

AI generates a **summative assessment per unit** covering what **a chosen class has been taught** (+ a
few not-yet-taught questions). **GCSE groups → OCR J277 exam-style; KS3 → KS3-style.** Assessment is
**AI-marked, teacher-confirmed**, with **per-pupil + per-spec-point** results. A dedicated subsystem with
full `exam_questions`-grade question / part / mark-point / misconception modelling.

- Per-spec-point breakdown is **objective-only** at launch (defensible, deterministic).
- Launch widgets: `short_text` · `medium_text` · `extended_response` · `multiple_choice` · `tick_box` · `code`.
- Command-word / archetype are **free-text codes** (no controlled vocabulary enforced in v1).
- "Covered" = **a chosen class's** delivery; the resulting paper is assignable to other classes too.
- **Single attempt, no timer.** Marking runs on **Sonnet** (`plan` role); generation on **Opus** (`design` role).

## Phase map & dependency order

| Phase | File | Builds | Depends on |
|------:|------|--------|-----------|
| 1 | [phase-1-generation.md](phase-1-generation.md) | AI generation + teacher review/approve + **Mark ready** | Phase 0 |
| 2 | [phase-2-assignment.md](phase-2-assignment.md) | Assign to class + availability window | 1 |
| 3 | [phase-3-take-flow.md](phase-3-take-flow.md) | Pupil take-flow (list → start → answer → submit) | 2 |
| 4 | [phase-4-marking.md](phase-4-marking.md) | Objective auto-mark + AI open-mark + teacher confirm modal + queue | 3 |
| 5 | [phase-5-results-release.md](phase-5-results-release.md) | Results/analytics + teacher-controlled release | 4 |
| 6 | [phase-6-unit-integration.md](phase-6-unit-integration.md) | Schemes-spine "Assessments" panel + paths + gallery + CSS | 1–5 |
| 7 | [phase-7-verification.md](phase-7-verification.md) | Test matrix + privacy guards + e2e + end-to-end verification | 1–6 |

Phases 1→5 are a strict pipeline (each consumes the previous). Phase 6 (UI surfacing on the Schemes
spine) can begin once Phase 1 exists and grow as each later phase lands. Phase 7 is the final hardening.

## Phase-0 foundation you build on (already shipped)

- **Schema:** [migrations/0063_assessments.sql](../app/migrations/0063_assessments.sql) (assessment ·
  questions · parts · mark_points · misconceptions) +
  [0064_assessment_attempts.sql](../app/migrations/0064_assessment_attempts.sql) (classes/window · attempts
  (`is_test` partition) · answers (PII) · awarded_marks · spec-point results · mark queue).
- **Pure domain:** [services/assessment.ts](../app/src/services/assessment.ts) — `buildAssessmentTree`,
  `computeSpecPointResults` (objective-only), `scoreOfAttempt`, `isObjectivePart`; the row/tree types.
- **Authoring repo:** [repos/assessments.ts](../app/src/repos/assessments.ts) — `materialiseAssessment`
  (atomic insert of the whole draft tree, recomputes `marks_total`), `assessmentWithQuestions` (tree),
  `listAssessmentsForUnit`, `getAssessment`, `setAssessmentStatus`. The `MaterialiseInput` / `DraftQuestion`
  / `DraftPart` / `DraftMarkPoint` / `DraftMisconception` interfaces are **the contract the generator and
  validator must produce.**
- **Delivery repo:** [repos/assessmentAttempts.ts](../app/src/repos/assessmentAttempts.ts) — `assignToClass`,
  `getAssignment`, `listAssignmentsForAssessment`, `setReleased`, `startAttempt` (idempotent), `saveAnswer`
  (drops stale mark on change), `submitAttempt` (double-submit guard), `answersForMarking`, `writeAwardedMark`
  (upsert + history), `overrideMark`, `confirmMarksForAttempt` (skips `needs_review`), `upsertSpecPointResult`,
  `recomputeAttemptScore`, `enqueueAttemptMark` / `claimDueAttemptMarks` (durable queue), `wipeTestAttempts`.
- **Tests:** [tests/assessmentService.test.ts](../app/tests/assessmentService.test.ts) (DB-free) +
  [tests/integration/assessmentsRepo.test.ts](../app/tests/integration/assessmentsRepo.test.ts) (DB).

## Architecture & conventions (apply in every phase)

- **Layering:** `routes → services (pure) → repos (thin SQL over pg)`. Keep AI/branching in services;
  keep SQL in repos; keep routes thin (parse → call service → render view).
- **One AI wrapper:** every AI call goes through [llm/client.ts](../app/src/llm/client.ts) `callLLM` /
  `callLLMStructured`. Feature inputs go in the wrapper's **`context[]`** (so they inherit redaction /
  withholding / audit), **never** in the `system` string. Pick the model with
  `modelForFeature(<key>, <role>)` and register the feature key in [llm/features.ts](../app/src/llm/features.ts).
- **Prompts/schemas are versioned modules:** `llm/prompts/<feature>.ts` (export `*_SYSTEM`, `*_VERSION`,
  an `*Instruction(...)` builder, and an `*Items(...)` → `RedactableItem[]` builder) +
  `llm/schemas/<feature>.ts` (a `zod/v4` object for `callLLMStructured`). Mirror
  [prompts/markScheme.ts](../app/src/llm/prompts/markScheme.ts) /
  [schemas/markScheme.ts](../app/src/llm/schemas/markScheme.ts).
- **Routes** register in [server.ts](../app/src/server.ts) via `registerXRoutes(app)`. Mutating routes use
  `{ preHandler: app.csrfProtection }`. Teacher routes sit behind the normal teacher gate; pupil routes
  behind the pupil gate (`requirePupil` + `pupilAccessEnabled`, see [routes/me.ts](../app/src/routes/me.ts)).
- **Views** are pure `data → HTML` in `lib/*View.ts`. **All route URLs come from
  [lib/paths.ts](../app/src/lib/paths.ts)** — add a builder there (+ an assertion in
  `tests/pathsBuilders.test.ts`); `tests/pathsGuard.test.ts` enforces no raw literals in `*View.ts`.
  Declare page width via `nextShell({ width })`. Add a `lib/uiFixtures.ts` fixture + preview at `/ui-gallery`
  for each new view. CSS: structure in `styles-base-widgets.css`, dark theme in `styles.css`'s
  `body[data-shell="next"]` block.
- **Durable work queues** mirror [services/markingQueue.ts](../app/src/services/markingQueue.ts): a boot
  sweep + periodic tick in `server.ts` drain a DB-backed queue; jobs re-arm on transient AI outage.

## Privacy NON-NEGOTIABLES (carry through every phase)

1. **No pupil name to AI, ever.** Generation is cohort/spec-point content (no pupil identity in the
   `assessments`/questions tables at all). Marking sends only **redacted, slot-lettered** answers via the
   wrapper's `context[]`; the slot→pupil map stays server-side (mirror [services/marking.ts](../app/src/services/marking.ts)).
2. **Safeguarding-flagged answers are withheld entirely** (`guardMatch` → store flagged with
   `disclosure=true`, never sent to AI). They also surface in the safeguarding register.
3. **Inputs in `context[]`, never `system`** — so they inherit redaction/withholding/audit.
4. **`is_test` partition:** all cohort/analytics reads filter `WHERE NOT is_test`; `wipeTestAttempts`
   clears Test-Lab runs.
5. **Tests never call the real provider** (the integration config forces an empty key). Verify AI behaviour
   only with a throwaway, self-cleaning dev smoke script `app/scripts/X-smoke.ts`, deleted afterwards.
6. **Degrade cleanly with AI off:** an unavailable/blocked/error wrapper result must **write nothing** and
   return a teacher-actionable message — never a half-built draft or a silent failure.

## Definition of done — the gate (run for every phase)

```bash
cd app && npm run typecheck          # clean
cd app && npm test                   # unit (DB-free) — green, incl. new pure tests
cd app && npm run test:integration   # DB-backed (AI forced off) — green, incl. new repo/degrade tests
npx playwright test                  # E2E (dev stack up) — from Phase 3 onward
```

Each phase plan ends with its own **Definition of done** checklist (the gate above **plus** the specific
tests, degrade test, and privacy guard that phase must add). The standing rule from `CLAUDE.md` holds:
**the user commits between sessions — do not commit or push unless asked.**
