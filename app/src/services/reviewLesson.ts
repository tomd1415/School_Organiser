// Phase 11 Wave 5 (idea 8, lean cut) — the advisory lesson reviewer. Critiques a NOT-YET-TAUGHT master
// lesson against the spec / official documents and stores the result for the teacher to Apply or
// Dismiss; it never mutates the master. Off by default (aiReviewEnabled), Sonnet by default (push to
// Opus per-feature in Settings), and the per-unit sweep self-stops at the cap and skips lessons that
// already have an open review — so it cannot run up the budget. Everything goes through the one wrapper.
import { callLLMStructured } from '../llm/client';
import { lessonReviewSchema } from '../llm/schemas/lessonReview';
import { LESSON_REVIEW_INSTRUCTION, LESSON_REVIEW_SYSTEM, LESSON_REVIEW_VERSION, reviewLessonItems } from '../llm/prompts/lessonReview';
import { courseDocItems } from '../llm/prompts/courseDocs';
import { standingPrefItems } from './standingPrefs';
import { conceptItemsFor } from './teachingConcepts';
import { aiReviewEnabled, modelForFeature } from '../repos/settings';
import { getPlanContext, getPlanRow, listPlansForUnit } from '../repos/schemes';
import { getPlanSpecPointIds, listSpecPoints } from '../repos/specPoints';
import { listCourseDocsWithContent } from '../repos/courseDocs';
import { createReview, hasOpenReviewForPlan, randomReviewableLessonId } from '../repos/reviews';
import { reviewSchemeSchema } from '../llm/schemas/reviewScheme';
import { REVIEW_SCHEME_INSTRUCTION, REVIEW_SCHEME_SYSTEM, REVIEW_SCHEME_VERSION, reviewSchemeItems } from '../llm/prompts/reviewScheme';
import { getUnitForReview } from '../repos/schemes';
import { PRICE_PENCE_PER_MTOK } from '../config/llm';
import type { ReviewFinding, ReviewVerdict } from '../repos/reviews';

export type ReviewStatus = 'ok' | 'skip' | 'blocked' | 'unavailable' | 'error' | 'notfound' | 'disabled';
export interface ReviewOutcome {
  status: ReviewStatus;
  verdict?: ReviewVerdict;
  reviewId?: number;
  message?: string;
}

const REVIEW_DOC_CAP = 4000; // per official doc — a slice is enough to judge alignment and keeps cost down
const REVIEW_MAX_DOCS = 4; // cap how many docs feed the reviewer, so input (and cost) can't balloon
const REVIEW_MAX_OUTPUT_TOK = 4000; // the call's max_tokens AND the estimate's output term — kept equal
// For the pre-call cap guard, the estimate must be a CONSERVATIVE UPPER bound so overMonthlyCap errs
// toward refusing and a single (Opus) call can't overshoot. Input bound: REVIEW_MAX_DOCS × REVIEW_DOC_CAP
// (~4k tokens) plus standing prefs, concepts and the lesson fields all sit comfortably under this.
const EST_INPUT_TOK = 24000;

function estimateReviewCostPence(model: string): number {
  const p = PRICE_PENCE_PER_MTOK[model] ?? { input: 240, output: 1200 };
  return Number(((EST_INPUT_TOK * p.input + REVIEW_MAX_OUTPUT_TOK * p.output) / 1_000_000).toFixed(2));
}

/** Review ONE master lesson. Skips when the reviewer is off, the lesson is empty, or it already has an
 *  open review. Stores the result (master scope) and returns its id + verdict. */
export async function reviewLessonMaster(lp: number): Promise<ReviewOutcome> {
  if (!(await aiReviewEnabled())) return { status: 'disabled', message: 'The AI reviewer is off — enable it in Settings → AI.' };
  if (await hasOpenReviewForPlan(lp)) return { status: 'skip', message: 'This lesson already has an open review — apply or dismiss it first.' };

  const [ctx, row] = await Promise.all([getPlanContext(lp), getPlanRow(lp)]);
  if (!ctx || !row) return { status: 'notfound', message: 'Lesson not found.' };
  if (!(row.objectives ?? '').trim() && !(row.outline ?? '').trim()) {
    return { status: 'skip', message: 'Write or ✨draft the objectives/outline first — there is nothing to review yet.' };
  }

  const [pointIds, allPoints, docs] = await Promise.all([
    getPlanSpecPointIds(lp),
    listSpecPoints(ctx.courseId),
    listCourseDocsWithContent(ctx.courseId),
  ]);
  const idSet = new Set(pointIds);
  const labels = allPoints.filter((p) => idSet.has(p.id)).map((p) => (p.code === p.title ? p.title : `${p.code} ${p.title}`));

  const model = await modelForFeature('review_lesson', 'plan');
  const result = await callLLMStructured(
    {
      feature: 'review_lesson',
      model,
      promptVersion: LESSON_REVIEW_VERSION,
      system: LESSON_REVIEW_SYSTEM,
      estimatedCostPence: estimateReviewCostPence(model),
      context: [
        ...(await standingPrefItems()),
        ...(await conceptItemsFor(ctx.courseId)),
        ...courseDocItems(docs.slice(0, REVIEW_MAX_DOCS).map((d) => ({ role: d.role, title: d.title, content: d.content })), REVIEW_DOC_CAP),
        ...reviewLessonItems(
          ctx.courseName,
          ctx.unitTitle,
          { title: ctx.planTitle, objectives: row.objectives, outline: row.outline },
          labels,
        ),
      ],
      instruction: LESSON_REVIEW_INSTRUCTION,
      maxTokens: REVIEW_MAX_OUTPUT_TOK,
    },
    lessonReviewSchema,
  );
  if (result.status === 'blocked') return { status: 'blocked', message: result.message };
  if (result.status === 'unavailable') return { status: 'unavailable', message: result.message };
  if (result.status !== 'ok' || !result.data) return { status: 'error', message: result.message };

  const d = result.data;
  const reviewId = await createReview({
    lessonPlanId: lp,
    groupCourseId: null,
    verdict: d.verdict,
    findings: d.findings.slice(0, 3),
    suggestedObjectives: d.suggestedObjectives.trim() || null,
    suggestedOutline: d.suggestedOutline.trim() || null,
    rationale: d.rationale.trim() || null,
    model,
    promptVersion: LESSON_REVIEW_VERSION,
  });
  // null = a concurrent request already created the open review (partial unique index) — treat as skip.
  if (reviewId === null) return { status: 'skip', message: 'This lesson already has an open review.' };
  return { status: 'ok', verdict: d.verdict, reviewId };
}

// E1 — spot-check: review ONE random not-yet-reviewed lesson from across the whole curriculum, so the
// teacher catches issues without reviewing everything. Gated + cost-capped exactly like a single review.
export interface SpotCheckResult extends ReviewOutcome {
  lessonPlanId?: number;
  lessonTitle?: string;
}
export async function spotCheckCurriculum(): Promise<SpotCheckResult> {
  if (!(await aiReviewEnabled())) return { status: 'disabled', message: 'The AI reviewer is off — enable it in Settings → AI.' };
  const id = await randomReviewableLessonId();
  if (id == null) return { status: 'skip', message: 'No lesson to spot-check — every written lesson already has an open review, or none have objectives/outline yet.' };
  const row = await getPlanRow(id);
  const o = await reviewLessonMaster(id);
  return { ...o, lessonPlanId: id, lessonTitle: row?.title };
}

// E2 — scheme-level review: a sequence-level second opinion on a whole unit (coherence, progression,
// coverage gaps). Advisory and NOT stored (it never rewrites a lesson) — gated + cost-capped like a
// single lesson review. Returns the findings for the route to render inline.
export interface SchemeReviewResult {
  status: ReviewStatus;
  verdict?: 'coherent' | 'tweak' | 'gaps';
  findings?: ReviewFinding[];
  rationale?: string;
  message?: string;
}
export async function reviewSchemeSequence(unitId: number): Promise<SchemeReviewResult> {
  if (!(await aiReviewEnabled())) return { status: 'disabled', message: 'The AI reviewer is off — enable it in Settings → AI.' };
  const unit = await getUnitForReview(unitId);
  if (!unit) return { status: 'notfound', message: 'Unit not found.' };
  const written = unit.lessons.filter((l) => (l.objectives ?? '').trim() !== '');
  if (written.length < 2) return { status: 'skip', message: 'Add objectives to at least two lessons first — there is no sequence to review yet.' };

  // Spec points across the whole unit (union of each lesson's mapped points).
  const idSets = await Promise.all(unit.lessons.map((l) => getPlanSpecPointIds(l.id)));
  const wantIds = new Set<number>(idSets.flat());
  const allPoints = await listSpecPoints(unit.courseId);
  const labels = allPoints.filter((p) => wantIds.has(p.id)).map((p) => (p.code === p.title ? p.title : `${p.code} ${p.title}`));
  const docs = await listCourseDocsWithContent(unit.courseId);

  const model = await modelForFeature('review_scheme', 'plan');
  const result = await callLLMStructured(
    {
      feature: 'review_scheme',
      model,
      promptVersion: REVIEW_SCHEME_VERSION,
      system: REVIEW_SCHEME_SYSTEM,
      estimatedCostPence: estimateReviewCostPence(model),
      context: [
        ...(await standingPrefItems()),
        ...(await conceptItemsFor(unit.courseId)),
        ...courseDocItems(docs.slice(0, REVIEW_MAX_DOCS).map((d) => ({ role: d.role, title: d.title, content: d.content })), REVIEW_DOC_CAP),
        ...reviewSchemeItems(unit.courseName, unit.unitTitle, unit.lessons, labels),
      ],
      instruction: REVIEW_SCHEME_INSTRUCTION,
      maxTokens: REVIEW_MAX_OUTPUT_TOK,
    },
    reviewSchemeSchema,
  );
  if (result.status === 'blocked') return { status: 'blocked', message: result.message };
  if (result.status === 'unavailable') return { status: 'unavailable', message: result.message };
  if (result.status !== 'ok' || !result.data) return { status: 'error', message: result.message };
  return { status: 'ok', verdict: result.data.verdict, findings: result.data.findings.slice(0, 5), rationale: result.data.rationale };
}

export interface UnitReviewResult {
  total: number;
  reviewed: number;
  skipped: number;
  stopped: boolean; // true if we stopped early (AI off mid-run / monthly cap reached)
  disabled: boolean; // true if the reviewer is switched off
}

/** Review every lesson of a unit — mirrors the resources-ai sweep: one call per lesson, self-stops at
 *  the £ cap or when AI is unavailable, and skips lessons that already have an open review. */
export async function reviewUnitMaster(unitId: number): Promise<UnitReviewResult> {
  if (!(await aiReviewEnabled())) return { total: 0, reviewed: 0, skipped: 0, stopped: false, disabled: true };
  const plans = await listPlansForUnit(unitId);
  let reviewed = 0;
  let skipped = 0;
  let stopped = false;
  for (const pl of plans) {
    const o = await reviewLessonMaster(pl.id);
    if (o.status === 'ok') reviewed += 1;
    else if (o.status === 'blocked' || o.status === 'unavailable' || o.status === 'disabled') {
      stopped = true; // cap reached / no key / the teacher switched the reviewer off mid-run — stop
      break;
    } else skipped += 1; // 'skip' (already reviewed / empty) / 'error' (transient) — keep going
  }
  return { total: plans.length, reviewed, skipped, stopped, disabled: false };
}

export interface SweepResult {
  reviewed: number;
  stopped: boolean; // hit the monthly cap, or the reviewer went unavailable mid-run
  disabled: boolean; // the reviewer is off (the default)
}

/** Wave 7.2 — the scheduled sweep: spot-check up to `maxLessons` not-yet-reviewed master lessons, one
 * AI review each. Mirrors reviewUnitMaster's stop-on-blocked loop; every call is budget-enforced by the
 * wrapper, and it stops the moment one is blocked (monthly cap) or unavailable (AI off). The caller
 * (the scheduled job) is responsible for the off-by-default gate and the once-a-day window. */
export async function sweepReviews(maxLessons: number): Promise<SweepResult> {
  if (maxLessons <= 0) return { reviewed: 0, stopped: false, disabled: false };
  if (!(await aiReviewEnabled())) return { reviewed: 0, stopped: false, disabled: true };
  let reviewed = 0;
  let stopped = false;
  for (let i = 0; i < maxLessons; i++) {
    const id = await randomReviewableLessonId();
    if (id == null) break; // nothing left needs reviewing
    const o = await reviewLessonMaster(id);
    if (o.status === 'ok') reviewed += 1;
    else if (o.status === 'blocked' || o.status === 'unavailable' || o.status === 'disabled') {
      stopped = true; // over the cap / no key / switched off mid-run — stop spending
      break;
    }
    // 'skip' / 'notfound' / 'error' on one lesson → move on to the next
  }
  return { reviewed, stopped, disabled: false };
}
