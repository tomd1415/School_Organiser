// Phase 3 — the pupil take-flow service. The headline privacy property lives here: `takeTree` is the SINGLE
// chokepoint that strips everything a pupil must never see (mark-points, model answers, misconceptions,
// mark-kinds, accepted alternatives) from the assessment tree, leaving only the question stems + part
// prompts + the choices to pick from. It's pure → unit-tested. Availability/auth is class + window based;
// submission only ENQUEUES marking (no AI in the take-flow), and never for a Test-Lab attempt.
import { assessmentWithQuestions } from '../repos/assessments';
import type { AssessmentTree } from '../services/assessment';
import { onAttemptSubmitted } from './assessmentMarkQueue';
import {
  availableAssessmentsForPupil,
  partBelongsToAssessment,
  pupilAssignmentFor,
  saveAnswer,
  savedAnswers,
  startAttempt,
  submitAttempt,
  type AttemptRow,
  type AvailableAssessment,
} from '../repos/assessmentAttempts';

// The launch widgets that carry pick-from options the pupil needs (kept in the projection); every other
// widget is free text.
const CHOICE_WIDGETS = new Set(['multiple_choice', 'tick_box']);

export interface TakePart {
  partId: number;
  partLabel: string;
  prompt: string;
  responseType: string;
  options: string[]; // only for choice/tick widgets; [] otherwise
  marks: number;
}
export interface TakeQuestion {
  questionId: number;
  stem: string;
  parts: TakePart[];
}
export interface TakePaper {
  id: number;
  title: string;
  style: string;
  marksTotal: number;
  questions: TakeQuestion[];
}

/** PII-safe projection — the ONLY shape the pupil surface ever renders. Strips mark-points, model answers,
 *  misconceptions, mark-kinds and accepted alternatives; keeps stems, prompts, the answer widget, the marks
 *  tariff, and (for choice/tick widgets only) the option labels to pick from. Pure → unit-tested. */
export function takeTree(tree: AssessmentTree): TakePaper {
  return {
    id: tree.id,
    title: tree.title,
    style: tree.style,
    marksTotal: tree.marksTotal,
    questions: tree.questions.map((q) => ({
      questionId: q.id,
      stem: q.stem,
      parts: q.parts.map((p) => {
        const opts =
          CHOICE_WIDGETS.has(p.expectedResponseType) && p.partConfig && typeof p.partConfig === 'object' && Array.isArray((p.partConfig as { options?: unknown }).options)
            ? ((p.partConfig as { options: unknown[] }).options.map((o) => String(o)))
            : [];
        return { partId: p.id, partLabel: p.partLabel, prompt: p.prompt, responseType: p.expectedResponseType, options: opts, marks: p.marks };
      }),
    })),
  };
}

export async function availableForPupil(pupilId: number, isTest: boolean): Promise<AvailableAssessment[]> {
  return availableAssessmentsForPupil(pupilId, isTest);
}

export interface CanTake {
  ok: boolean;
  groupCourseId?: number;
  status?: 'in_progress' | 'submitted' | 'available';
  reason?: string;
}

/** Can this pupil take this assessment now? Resolves their assigned class, checks ready + window. A
 *  submitted attempt is reported (the route shows the confirmation, not the form). */
export async function canTake(assessmentId: number, pupilId: number, isTest: boolean): Promise<CanTake> {
  const asg = await pupilAssignmentFor(assessmentId, pupilId);
  if (!asg) return { ok: false, reason: 'This assessment isn’t assigned to your class.' };
  if (!asg.available) return { ok: false, reason: 'This assessment isn’t available right now.' };
  const attempt = await startAttempt(assessmentId, pupilId, asg.groupCourseId, isTest);
  return { ok: true, groupCourseId: asg.groupCourseId, status: attempt.status === 'submitted' ? 'submitted' : 'in_progress' };
}

/** Start (or resume) the pupil's attempt + return the PII-safe paper and their saved answers. Null when the
 *  pupil can't take it (not assigned / closed). */
export async function startTake(
  assessmentId: number,
  pupilId: number,
  isTest: boolean,
): Promise<{ attempt: AttemptRow; paper: TakePaper; answers: Map<number, string> } | { error: string }> {
  const asg = await pupilAssignmentFor(assessmentId, pupilId);
  if (!asg) return { error: 'This assessment isn’t assigned to your class.' };
  if (!asg.available) return { error: 'This assessment isn’t available right now.' };
  const attempt = await startAttempt(assessmentId, pupilId, asg.groupCourseId, isTest);
  const tree = await assessmentWithQuestions(assessmentId);
  if (!tree) return { error: 'This assessment could not be loaded.' };
  const [answers] = await Promise.all([savedAnswers(attempt.id)]);
  return { attempt, paper: takeTree(tree), answers };
}

/** Autosave one part's answer. Verifies the part belongs to the assessment and the attempt is open. */
export async function answer(assessmentId: number, attempt: AttemptRow, partId: number, value: string): Promise<{ ok: boolean }> {
  if (attempt.status !== 'in_progress') return { ok: false };
  if (!(await partBelongsToAssessment(partId, assessmentId))) return { ok: false };
  await saveAnswer(attempt.id, partId, value);
  return { ok: true };
}

/** Submit the attempt (double-submit guarded), then run the post-submit marking hook (objective inline +
 *  queue the open AI pass) for a real pupil with marks enabled. Never blocks on AI; never marks a test attempt. */
export async function submit(attempt: AttemptRow): Promise<boolean> {
  const ok = await submitAttempt(attempt.id);
  if (ok) await onAttemptSubmitted(attempt.id, attempt.isTest).catch(() => {});
  return ok;
}
