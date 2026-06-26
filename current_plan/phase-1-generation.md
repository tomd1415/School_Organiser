# Phase 1 — AI generation + teacher review/approve + "Mark ready"

**Goal:** from a unit + a chosen class, build a *blueprint* (which spec points that class has been taught,
plus a few it hasn't), ask the AI for a full exam-style paper, validate it, and persist it as a **draft**
assessment. Then let the teacher review/edit it and flip it to **ready**. Must degrade cleanly with AI off
(writing nothing). This is the foundation every later phase consumes.

## Outcome

Teacher opens a unit → "Generate assessment for class X" → a draft paper appears (questions → parts →
mark-points → misconceptions, marks computed) → teacher tweaks → **Mark ready**. Status `draft → ready`.

## Files to create / modify

| File | New? | Responsibility |
|------|------|----------------|
| `app/src/services/assessmentBlueprint.ts` | new | **Pure-ish** — assemble covered/uncovered spec points + exam style for (unit, class). |
| `app/src/llm/schemas/generateAssessment.ts` | new | `zod/v4` output schema for the generated paper (ports the Phase-0 `DraftQuestion` shape). |
| `app/src/llm/prompts/generateAssessment.ts` | new | `GENERATE_ASSESSMENT_SYSTEM`, `_VERSION`, instruction + `Items()` (context) builders. |
| `app/src/services/assessmentValidate.ts` | new | **Pure** validator: AI output + blueprint → `DraftQuestion[]` (clamped/normalised) or errors. |
| `app/src/services/assessmentGen.ts` | new | Orchestrate: blueprint → `callLLMStructured` → validate → `materialiseAssessment` (draft). |
| `app/src/routes/assessments.ts` | new | Teacher routes: generate · view/edit draft · Mark ready · (list per unit). |
| `app/src/lib/assessmentReviewView.ts` | new | Pure view: render the draft paper for teacher review/edit. |
| `app/src/lib/paths.ts` | edit | Add assessment route builders (see Phase 6 for the full set; add what this phase uses). |
| `app/src/llm/features.ts` | edit | Register `generate_assessment` (role `design`, Opus). |
| `app/src/server.ts` | edit | `registerAssessmentRoutes(app)`. |
| tests (see below) | new | Pure unit tests + degrade-writes-nothing integration test + privacy guard. |

## 1. Blueprint — `services/assessmentBlueprint.ts`

Determines **what to ask the AI to assess**. No AI here; DB reads + pure assembly (split a pure
`assembleBlueprint(...)` core from the DB-reading `blueprintForUnit(...)` wrapper so the weighting logic is
unit-testable without a DB).

**Verified data sources** (all already exist):
- `getUnitForReview(unitId)` → `{ unitTitle, courseId, courseName, lessons[] }` ([repos/schemes.ts](../app/src/repos/schemes.ts)).
- `schemeIdForUnit(unitId)` → `number | null` (repos/schemes.ts).
- `listSpecPoints(courseId)` → `SpecPointRow[] { id, code, title, active }` ([repos/specPoints.ts](../app/src/repos/specPoints.ts)).
- `schemeCoverage(schemeId)` → `CoverageRow[] { id, code, title, covered, coveringPlanId, coveringPlanTitle }`.
- `classSchedule(groupCourseId, fromDate, toDate)` → `ClassScheduleEntry[]` (has `lessonPlanId | null`, `date`) ([repos/delivery.ts](../app/src/repos/delivery.ts)).
- `getPlanSpecPointIds(planId)` → `number[]` (spec points a lesson covers).
- `examProfileForCourse(courseId, today, groupCourseId?)` → `ExamProfile { stage, weighting, monthsToExam, label }` ([services/examProfile.ts](../app/src/services/examProfile.ts)).

**"Covered by this class"** = union of `getPlanSpecPointIds(lessonPlanId)` over every `classSchedule` entry
whose `lessonPlanId != null` and (optionally) whose date ≤ today, intersected with the course's spec points.
**Uncovered** = course spec points − covered. (Decide the date window: default `fromDate` = the class's first
delivery, `toDate` = today; the route can let the teacher pick "up to date" vs "whole unit".)

```ts
export interface BlueprintSpecPoint { id: number; code: string; title: string; covered: boolean }
export interface AssessmentBlueprint {
  unitId: number; schemeId: number; courseId: number;
  unitTitle: string; courseName: string;
  style: 'ks3' | 'gcse';            // from examProfile.stage (gcse/exam-soon/building → gcse-ish; foundational → ks3)
  examBoard: string | null;         // 'OCR J277' when gcse, else null
  examProfileLabel: string;         // examProfile.label — drops into the prompt
  specPoints: BlueprintSpecPoint[]; // covered + uncovered, flagged
  coveredCount: number; uncoveredCount: number;
  groupCourseId: number;            // the class the blueprint was built from (persisted in blueprint JSON)
}
export async function blueprintForUnit(unitId: number, groupCourseId: number, today: Date, opts?: {...}): Promise<AssessmentBlueprint | null>
```

- Map `ExamProfile.stage` → `style`: `foundational → 'ks3'`, everything else → `'gcse'`. `examBoard` =
  `'OCR J277'` when `style==='gcse'` (the only board in v1), else `null`.
- Persist the whole blueprint (covered/uncovered ids, weights, `groupCourseId`, `generatedAt`) into the
  `assessments.blueprint` JSONB at materialise time — the schema comment already reserves these keys.
- **Edge cases:** unit with **zero covered** spec points (brand-new class) → still allow generation but make
  the paper mostly "uncovered/diagnostic"; surface a note in the route. No spec points at all on the course →
  KS3-style generic paper from lesson titles/objectives (`unit.lessons[].objectives`), `specPointId = null`
  on every question. Return `null` only when the unit itself can't be resolved.

## 2. Output schema — `llm/schemas/generateAssessment.ts`

A `zod/v4` object whose shape mirrors the Phase-0 `DraftQuestion` contract in
[repos/assessments.ts](../app/src/repos/assessments.ts) (so the validator maps near-1:1 into
`materialiseAssessment`). Use `.describe(...)` heavily (the SDK surfaces these to the model). Sketch:

```ts
import * as z from 'zod/v4';
const RESPONSE_TYPES = ['short_text','medium_text','extended_response','multiple_choice','tick_box','code'] as const;
const MARK_KINDS = ['tick','choice','exact','numeric','keyword','open'] as const; // = deterministicMarker.MarkKind

export const generateAssessmentSchema = z.object({
  questions: z.array(z.object({
    specPointCode: z.string().nullable().describe('the EXACT spec-point code this question targets, from the provided list; null only for a general/KS3 question'),
    isUncovered: z.boolean().describe('true if this targets a NOT-yet-taught spec point (a stretch question)'),
    commandWord: z.string().nullable().describe('command word, e.g. "state","describe","explain","analyse"; null for KS3'),
    archetype: z.string().nullable().describe('a short archetype code, free text'),
    difficultyBand: z.number().int().min(1).max(9).nullable(),
    difficultyStep: z.number().int().min(1).max(3).nullable(),
    stem: z.string().describe('the question stem/context shared by its parts'),
    modelAnswer: z.string().nullable(),
    parts: z.array(z.object({
      partLabel: z.string().describe('"a","b","i"…'),
      prompt: z.string(),
      marks: z.number().int().min(0).max(20),
      responseType: z.enum(RESPONSE_TYPES),
      options: z.array(z.string()).describe('choices for multiple_choice/tick_box; [] otherwise'),
      modelAnswer: z.string().nullable(),
      markPoints: z.array(z.object({
        text: z.string(), marks: z.number().int().min(0).max(20),
        required: z.boolean(),
        acceptedAlternatives: z.array(z.string()),
        kind: z.enum(MARK_KINDS).describe('objective kinds auto-mark; "open" is AI-marked'),
      })).describe('discrete markable atoms; ≥1 per part; Σ marks should equal the part marks'),
      misconceptions: z.array(z.object({ label: z.string(), description: z.string() })),
    })).min(1),
  })).min(1),
});
export type GeneratedAssessment = z.infer<typeof generateAssessmentSchema>;
```

> Keep `options` as a required array (model returns `[]`); the validator folds it into `partConfig`. Reuse
> `normaliseMarkKind` from [schemas/markScheme.ts](../app/src/llm/schemas/markScheme.ts) if you accept a
> looser string instead of `z.enum` for `kind`.

## 3. Prompt — `llm/prompts/generateAssessment.ts`

Export, mirroring `prompts/markScheme.ts` / `prompts/authorScheme.ts`:
- `GENERATE_ASSESSMENT_VERSION = 'generate_assessment@1'` — **already referenced** by
  [tests/assessmentService.test.ts](../app/tests/assessmentService.test.ts), so use this exact label.
- `GENERATE_ASSESSMENT_SYSTEM` — "You are an experienced UK secondary Computing teacher writing a
  **summative end-of-unit assessment**…". Encode: weight questions to the **covered** spec points; include
  a **few** questions on the flagged **uncovered** points (clearly stretch); for **GCSE** style, write
  **OCR J277 exam-style** questions (command words, mark tariffs, realistic mark schemes) — for **KS3**,
  simpler recall/apply; every question must tag the **exact** spec-point code from the supplied list (or
  null); each part must have ≥1 mark point whose marks sum to the part's marks; provide a model answer per
  part; list common misconceptions. **Never reference an individual pupil by name** (belt-and-braces — the
  inputs carry none). Consider appending `PEDAGOGY_GUIDANCE` (as `authorScheme` does) for KS3.
- `generateAssessmentInstruction(b: AssessmentBlueprint, opts)` — "Course / unit / exam profile; write N
  questions (≈ marks target M); here is the spread of covered vs uncovered…". Make question count / total
  marks tunable (route passes them; default e.g. 8–12 questions).
- `generateAssessmentItems(b)` → `RedactableItem[]` — the **covered** spec-point list, the **uncovered**
  list, the unit's lesson titles/objectives, the exam-profile label. **All factual inputs go here**, never
  in `system`. (No pupil data is ever in scope, but routing through `context[]` keeps the egress assert/audit.)

## 4. Validator — `services/assessmentValidate.ts` (pure)

AI output is *suggestive*, not trusted. Map `GeneratedAssessment` + blueprint → `DraftQuestion[]` (the
`materialiseAssessment` input), enforcing invariants. Pure → fully unit-tested. Rules:
- Resolve `specPointCode` → `specPointId` against the blueprint's code→id map (drop/null unknown codes;
  never invent ids). `isUncovered` must agree with the blueprint's `covered` flag — trust the blueprint,
  override the model.
- Clamp marks (`Math.max/min`), coerce `kind` via `normaliseMarkKind`, restrict `responseType` to the launch
  widget set (unknown → `medium_text`). Fold `options` into `partConfig` (`{ options }`) only for
  `multiple_choice`/`tick_box`; null otherwise.
- Per part: require ≥1 mark point; if mark-point marks don't sum to the part marks, **trust the part marks**
  (the materialiser computes question/assessment totals from part marks anyway).
- Drop empty questions/parts; cap counts (e.g. ≤ 40 questions) so a runaway generation can't bloat the DB.
- Return `{ questions: DraftQuestion[]; warnings: string[] }`. Zero usable questions → caller treats as a
  failed generation (writes nothing).

## 5. Orchestrator — `services/assessmentGen.ts`

```ts
export interface GenResult { ok: boolean; message: string; assessmentId?: number; warnings?: string[] }
export async function generateAssessment(unitId: number, groupCourseId: number, opts?: {...}): Promise<GenResult>
```

Flow (mirror `services/marking.ts deriveScheme`):
1. `blueprint = await blueprintForUnit(unitId, groupCourseId, new Date(), opts)`; null → `{ ok:false, … }`.
2. `callLLMStructured({ feature:'generate_assessment', model: await modelForFeature('generate_assessment','design'), promptVersion: GENERATE_ASSESSMENT_VERSION, system: GENERATE_ASSESSMENT_SYSTEM, context: generateAssessmentItems(blueprint), instruction: generateAssessmentInstruction(blueprint, opts), maxTokens: 16000 }, generateAssessmentSchema)`.
3. `if (result.status !== 'ok' || !result.data) return { ok:false, message: result.message ?? 'AI could not generate right now.' }` — **degrade: write nothing.**
4. `const { questions, warnings } = validateGenerated(result.data, blueprint)`; empty → `{ ok:false, … }`.
5. `const id = await materialiseAssessment({ unitId, schemeId: blueprint.schemeId, courseId: blueprint.courseId, title: \`${blueprint.unitTitle} — end-of-unit assessment\`, style: blueprint.style, examBoard: blueprint.examBoard, blueprint: { coveredSpecPointIds, uncoveredSpecPointIds, groupCourseId, generatedAt: new Date().toISOString() }, sourceType:'ai_generated', promptVersion: GENERATE_ASSESSMENT_VERSION, questions })`.
6. Return `{ ok:true, assessmentId:id, warnings, message: 'Draft assessment created — review it, then Mark ready.' }`.

> Generation is **design-heavy** → `design` role (Opus by default), like `author_scheme`. `maxTokens` is
> large (a full paper); set a conservative `estimatedCostPence` if you want the cap to pre-reserve it.

## 6. Route — `routes/assessments.ts` + `lib/assessmentReviewView.ts`

Behind the teacher gate. Mirror [routes/schemes.ts](../app/src/routes/schemes.ts) structure; register with
`registerAssessmentRoutes(app)` in `server.ts`. CSRF on every mutation (`{ preHandler: app.csrfProtection }`).

- `POST /units/:unitId/assessments/generate` (body: `groupCourseId`, optional question count / window) →
  `generateAssessment(...)` → redirect to the review page (or return an inline HTMX panel with the result /
  degrade message). Eligible classes for the picker come from `listSlotsForCourse(courseId)` deduped by
  `groupCourseId` (with `groupName`).
- `GET /assessments/:id` → `assessmentWithQuestions(id)` → `assessmentReviewView(tree, { editable: status==='draft' })`.
- `POST /assessments/:id/parts/:partId` etc. — **light editing** of stems/prompts/marks/mark-points. (Scope
  decision: a thin first cut can allow editing question/part text + marks + mark-point text/kind; full
  add/delete of questions can be a follow-up. Keep edits going through small repo helpers added here.)
- `POST /assessments/:id/ready` → guard (≥1 question, every part has ≥1 mark point, `marks_total > 0`) →
  `setAssessmentStatus(id, 'ready')`. Disallow `ready` on an empty/invalid paper.
- `lib/assessmentReviewView.ts` — pure `tree → HTML`: questions with spec-point chips, covered/uncovered
  badges, per-part widget + marks, mark-points (kind badge: objective vs open), misconceptions, model
  answers (collapsible). All URLs via `paths.ts`. Width `working`. Add a `uiFixtures.ts` fixture (Phase 6
  formalises the gallery entry, but add the fixture now so the view is previewable).

## Privacy & degrade (this phase)

- No pupil identity is in scope at all here, but **all inputs still go through `context[]`** so the egress
  assert + audit run. Add an explicit **privacy guard test** (below).
- **Degrade writes nothing:** if the wrapper returns `unavailable`/`blocked`/`error`, no `assessments` row
  is created. The integration test asserts this against the AI-off config.

## Tests (this phase must add)

1. **Pure unit — blueprint assembly** (`tests/assessmentBlueprint.test.ts`): feed fake spec points + a fake
   "covered plan ids" set into the pure `assembleBlueprint(...)` core; assert covered/uncovered partition,
   `style` mapping from exam stage, `examBoard`. No DB.
2. **Pure unit — validator** (`tests/assessmentValidate.test.ts`): unknown spec-point code dropped/nulled;
   `isUncovered` overridden to match blueprint; marks clamped; bad `kind` normalised; widget restricted;
   options→partConfig only for choice/tick; empty question dropped; zero-usable → empty result.
3. **Integration — degrade writes nothing** (`tests/integration/assessmentGen.int.test.ts`): with AI forced
   off (default in test config), `generateAssessment(unitId, gcId)` returns `ok:false` and **no new
   `assessments` row** exists for the unit. (Build the unit/course/class fixture like the existing
   `assessmentsRepo.test.ts` `beforeAll`.)
4. **Privacy guard** (pure, `tests/assessmentGenPrivacy.test.ts`): build the prompt for a blueprint and
   assert the assembled `system` + `context[]` text contains **no pupil name** and that **all** factual
   inputs live in `context[]` (the `system` string is constant, carries no spec data). Belt-and-braces:
   assert `generateAssessmentItems(...)` returns the spec/lesson content and `instruction` carries no roster
   tokens. (Pattern: the wrapper's `containsRosterName` is the real guard; this test pins the call shape.)

## Definition of done

- [ ] `typecheck` clean; `npm test` green incl. the 3 new pure/privacy suites; `npm run test:integration`
      green incl. the degrade test.
- [ ] Generating against a real-ish unit (dev DB) produces a sensible draft; **Mark ready** flips status;
      an invalid/empty paper can't be marked ready.
- [ ] AI-off path writes nothing and shows a teacher-actionable message.
- [ ] One **throwaway** smoke (`app/scripts/X-smoke.ts`) confirms a live generation end-to-end against the
      real provider, cleans up its rows, then is **deleted**.
- [ ] `generate_assessment` registered in `llm/features.ts`; route registered in `server.ts`; new paths in
      `paths.ts` (+ `pathsBuilders.test.ts` assertions); review view has a `uiFixtures.ts` fixture.

## Open decisions to confirm with the teacher

- Default **question count / total marks** per paper (and whether GCSE vs KS3 differ).
- Coverage window: **"up to today"** vs **"the whole unit's planned spec points"** as the covered set.
- Editing depth in v1: text+marks+mark-points only, or full add/remove of questions.
