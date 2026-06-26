// Phase 4 — mark a submitted attempt. Objective parts mark deterministically (instant, free); open parts go
// to the AI (Sonnet) in ANONYMOUS, slot-lettered, redacted batches via the one wrapper. Safeguarding-matched
// answers are WITHHELD from AI entirely and flagged (disclosure). Per-spec-point objective results are
// recomputed at mark time. Re-checks the marksEnabled() DPIA gate at every entry point and never marks a
// Test-Lab attempt. A near-mirror of services/marking.ts over the assessment tables.
import { assessmentWithQuestions } from '../repos/assessments';
import {
  answersForMarking,
  awardedForAttempt,
  getAttempt,
  markedAnswerIds,
  recomputeAttemptScore,
  upsertSpecPointResult,
  writeAwardedMark,
  type AnswerForMarking,
} from '../repos/assessmentAttempts';
import { computeSpecPointResults, isObjectivePart, type AssessmentPart, type AssessmentTree } from './assessment';
import { markField, type MarkPoint } from '../lib/deterministicMarker';
import { gateMark, guardMatch } from '../lib/markSafetyGate';
import { marksEnabled } from '../auth/marksGate';
import { isCompleteBatch } from './marking';
import { callLLMStructured } from '../llm/client';
import { modelForFeature } from '../repos/settings';
import { markAssessmentAnswersSchema } from '../llm/schemas/markAssessmentAnswers';
import {
  MARK_ASSESSMENT_ANSWERS_INSTRUCTION,
  MARK_ASSESSMENT_ANSWERS_SYSTEM,
  MARK_ASSESSMENT_ANSWERS_VERSION,
  markAssessmentAnswersItems,
} from '../llm/prompts/markAssessmentAnswers';

interface Resolved {
  assessmentId: number;
  tree: AssessmentTree;
  partById: Map<number, AssessmentPart>;
}

/** A mark point as the deterministic marker wants it: `expected` is the creditworthy answer text. */
const toMarkPoints = (mps: AssessmentPart['markPoints']): MarkPoint[] =>
  mps.map((m) => ({ id: m.id, kind: m.kind, expected: m.text, alternatives: m.acceptedAlternatives, marks: m.marks, required: m.isRequired }));

async function resolveAttempt(attemptId: number): Promise<{ resolved: Resolved; isTest: boolean } | null> {
  const attempt = await getAttempt(attemptId);
  if (!attempt) return null;
  const tree = await assessmentWithQuestions(attempt.assessmentId);
  if (!tree) return null;
  const partById = new Map<number, AssessmentPart>();
  for (const q of tree.questions) for (const p of q.parts) partById.set(p.id, p);
  return { resolved: { assessmentId: attempt.assessmentId, tree, partById }, isTest: attempt.isTest };
}

export interface ObjectiveResult {
  marked: number;
  openAnswers: number;
}

/** Mark every not-yet-marked OBJECTIVE answer deterministically. Idempotent (skips already-marked answers,
 *  so a teacher override is never clobbered). Never marks a Test-Lab attempt; gated by marksEnabled(). */
export async function markAttemptObjective(attemptId: number): Promise<ObjectiveResult> {
  if (!(await marksEnabled())) return { marked: 0, openAnswers: 0 };
  const r = await resolveAttempt(attemptId);
  if (!r || r.isTest) return { marked: 0, openAnswers: 0 };
  const done = await markedAnswerIds(attemptId);
  const answers = await answersForMarking(attemptId);
  let marked = 0;
  let openAnswers = 0;
  for (const a of answers) {
    if (done.has(a.answerId)) continue;
    const part = r.resolved.partById.get(a.partId);
    if (!part || part.markPoints.length === 0) continue;
    if (!isObjectivePart(part)) {
      openAnswers++;
      continue;
    }
    const fm = markField(toMarkPoints(part.markPoints), a.answerText);
    // The PART tariff is authoritative (the paper's marks), so clamp to it and store it as the total.
    const marksTotal = part.marks;
    const marksAwarded = Math.max(0, Math.min(marksTotal, fm.marksAwarded));
    await writeAwardedMark({
      answerId: a.answerId, marksAwarded, marksTotal, pointsHit: fm.pointsHit, evidence: fm.evidence,
      marker: 'auto', confidence: 1, status: 'suggested', needsReview: false, historyEntry: { auto: true },
    });
    marked++;
  }
  return { marked, openAnswers };
}

export interface OpenResult {
  status: 'ok' | 'unavailable' | 'nothing';
  marked: number;
  flagged: number;
  message?: string;
}

/** Mark the attempt's not-yet-marked OPEN answers with the AI — one anonymous batch per open part. A guard
 *  match withholds the answer from AI entirely (flagged disclosure). A part whose batch the AI can't complete
 *  is left unmarked + the caller re-arms (degrade writes nothing). Gated by marksEnabled(); skips test. */
export async function markAttemptOpen(attemptId: number): Promise<OpenResult> {
  if (!(await marksEnabled())) return { status: 'nothing', marked: 0, flagged: 0 };
  const r = await resolveAttempt(attemptId);
  if (!r || r.isTest) return { status: 'nothing', marked: 0, flagged: 0 };
  const done = await markedAnswerIds(attemptId);
  const answers = (await answersForMarking(attemptId)).filter((a) => !done.has(a.answerId));

  // Open answers, one part at a time (a part = one question; within an attempt it has one answer).
  const open: Array<{ answer: AnswerForMarking; part: AssessmentPart }> = [];
  for (const a of answers) {
    const part = r.resolved.partById.get(a.partId);
    if (!part || part.markPoints.length === 0 || isObjectivePart(part)) continue; // objective handled elsewhere
    open.push({ answer: a, part });
  }
  if (open.length === 0) return { status: 'nothing', marked: 0, flagged: 0 };

  let marked = 0;
  let flagged = 0;
  let aiDown = false;

  for (const { answer: a, part } of open) {
    const marksTotal = part.marks;

    // Safeguarding guard — a match is withheld from AI entirely and flagged for the teacher's eyes.
    const hit = guardMatch(a.answerText);
    if (hit) {
      await writeAwardedMark({
        answerId: a.answerId, marksAwarded: 0, marksTotal, pointsHit: [], evidence: [], marker: 'auto',
        confidence: null, status: 'suggested', needsReview: true, disclosure: true, feedback: '',
        historyEntry: { guard: 'withheld from AI — needs your eyes' },
      });
      flagged++;
      continue;
    }

    // One anonymous slot (the single answer); the slot→answer map never leaves the server.
    const slots = [{ slot: 'A', answer: a.answerText }];
    const result = await callLLMStructured(
      {
        feature: 'mark_assessment_answers',
        model: await modelForFeature('mark_assessment_answers', 'plan'),
        promptVersion: MARK_ASSESSMENT_ANSWERS_VERSION,
        system: MARK_ASSESSMENT_ANSWERS_SYSTEM,
        context: markAssessmentAnswersItems({
          question: part.prompt,
          marksTotal,
          markPoints: part.markPoints.map((mp) => ({ expected: mp.text, marks: mp.marks, alternatives: mp.acceptedAlternatives })),
          misconceptions: part.misconceptions.map((m) => ({ label: m.label, description: m.description })),
          slots,
        }),
        instruction: MARK_ASSESSMENT_ANSWERS_INSTRUCTION,
        maxTokens: 1200,
      },
      markAssessmentAnswersSchema,
    );
    if (result.status !== 'ok' || !result.data) {
      aiDown = true;
      continue; // leave this part unmarked; the queue re-arms / the teacher can mark by hand
    }
    // Accept the batch ONLY if it returns exactly the slot we sent (no missing/dup/unknown).
    if (!isCompleteBatch(slots.map((s) => s.slot), result.data.results.map((res) => res.slot))) {
      aiDown = true;
      continue;
    }
    const res = result.data.results[0]!;
    const verdict = gateMark({ answer: a.answerText, marksAwarded: res.marksAwarded, marksTotal, evidence: res.evidence, confidence: res.confidence });
    await writeAwardedMark({
      answerId: a.answerId, marksAwarded: verdict.marksAwarded, marksTotal, pointsHit: [], evidence: res.evidence ? [res.evidence] : [],
      marker: 'ai', confidence: res.confidence, status: 'suggested', needsReview: verdict.needsReview,
      feedback: res.feedback.slice(0, 200), historyEntry: { ai: true, reasons: verdict.reasons },
    });
    marked++;
    if (verdict.needsReview) flagged++;
  }

  if (aiDown) return { status: 'unavailable', marked, flagged, message: 'Some answers could not be marked — they are left for you.' };
  return { status: 'ok', marked, flagged };
}

/** Recompute the attempt's score cache + the per-spec-point objective results (objective-only by design). */
export async function recomputeCaches(attemptId: number, tree: AssessmentTree): Promise<void> {
  await recomputeAttemptScore(attemptId);
  const awarded = await awardedForAttempt(attemptId);
  const spec = computeSpecPointResults(tree, awarded);
  for (const [specPointId, v] of spec) await upsertSpecPointResult(attemptId, specPointId, v.awarded, v.total);
}

/** Resolve the attempt's tree and recompute its caches (score + per-spec-point). No-op for a test attempt. */
export async function recomputeAttempt(attemptId: number): Promise<void> {
  const r = await resolveAttempt(attemptId);
  if (!r || r.isTest) return;
  await recomputeCaches(attemptId, r.resolved.tree);
}

export interface MarkAttemptResult {
  objective: ObjectiveResult;
  open: OpenResult;
}

/** Mark an attempt end to end: objective (instant) then the open AI pass, recomputing caches after each. */
export async function markAttempt(attemptId: number): Promise<MarkAttemptResult> {
  const objective = await markAttemptObjective(attemptId);
  const r = await resolveAttempt(attemptId);
  if (r && !r.isTest) await recomputeCaches(attemptId, r.resolved.tree);
  const open = await markAttemptOpen(attemptId);
  if (r && !r.isTest) await recomputeCaches(attemptId, r.resolved.tree);
  return { objective, open };
}
