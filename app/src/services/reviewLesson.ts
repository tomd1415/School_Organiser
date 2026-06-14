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
import { createReview, hasOpenReviewForPlan } from '../repos/reviews';
import { PRICE_PENCE_PER_MTOK } from '../config/llm';
import type { ReviewVerdict } from '../repos/reviews';

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
