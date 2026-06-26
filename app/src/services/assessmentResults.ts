// Phase 5 — compose teacher results + the GATED, confirmed-only pupil results. The pupil visibility gate is
// the headline privacy property here (mirrors marking.ts pupilLessonResults): a pupil sees ONLY confirmed
// marks, and only once released (or instantly if the class is on `instant`); never mark-points / model
// answers / unconfirmed marks. Pure-ish composition over the analytics + delivery repos.
import { getAssessment } from '../repos/assessments';
import { getPupilAttempt, listAssignmentsForAssessment, pupilAssignmentFor, setReleased, type AssignmentRow } from '../repos/assessmentAttempts';
import {
  perPupilForAssessment,
  pupilConfirmedMarks,
  pupilConfirmedSpecPoints,
  specPointMasteryForAssessment,
  type PupilResultRow,
  type SpecPointMastery,
} from '../repos/assessmentAnalytics';

export interface TeacherResults {
  assessmentId: number;
  title: string;
  marksTotal: number;
  perPupil: PupilResultRow[];
  specPoints: SpecPointMastery[];
  assignments: AssignmentRow[];
}

export async function teacherResults(assessmentId: number): Promise<TeacherResults | null> {
  const a = await getAssessment(assessmentId);
  if (!a) return null;
  const [perPupil, specPoints, assignments] = await Promise.all([
    perPupilForAssessment(assessmentId),
    specPointMasteryForAssessment(assessmentId),
    listAssignmentsForAssessment(assessmentId),
  ]);
  return { assessmentId, title: a.title, marksTotal: a.marksTotal, perPupil, specPoints, assignments };
}

/** The pupil-visibility gate (pure → unit-tested): results are visible only for a SUBMITTED attempt, and —
 *  unless the class is on `instant` — only once released. (Confirmed-vs-suggested is enforced separately by
 *  the confirmed-only DB read.) */
export function resultsVisible(resultsMode: 'instant' | 'on_release', releasedAt: string | null, attemptStatus: 'in_progress' | 'submitted' | null): boolean {
  if (attemptStatus !== 'submitted') return false;
  if (resultsMode === 'on_release' && releasedAt == null) return false;
  return true;
}

export interface PupilResults {
  title: string;
  awarded: number;
  total: number;
  items: Array<{ label: string; awarded: number; total: number; feedback: string }>;
  specPoints: Array<{ code: string; title: string; awarded: number; total: number }>;
}

/** The pupil's visible results, or null when nothing is visible yet (held back, no attempt, or not
 *  submitted). Confirmed marks ONLY; on_release held until released; instant shows confirmed at once. */
export async function pupilResults(pupilId: number, assessmentId: number): Promise<PupilResults | null> {
  const a = await getAssessment(assessmentId);
  if (!a) return null;
  const asg = await pupilAssignmentFor(assessmentId, pupilId);
  if (!asg) return null;
  const attempt = await getPupilAttempt(assessmentId, pupilId, false);
  if (!resultsVisible(asg.resultsMode, asg.releasedAt, attempt?.status ?? null)) return null; // held / not submitted
  if (!attempt) return null;
  // Both reads are CONFIRMED-only — a pupil never sees an unconfirmed/suggested mark (per-part OR per-spec-point).
  const [marks, sp] = await Promise.all([pupilConfirmedMarks(attempt.id), pupilConfirmedSpecPoints(attempt.id)]);
  const items = marks.map((m) => ({ label: `Q${m.qOrder + 1}${m.partLabel}: ${m.prompt}`, awarded: m.marksAwarded, total: m.marksTotal, feedback: m.feedback }));
  return {
    title: a.title,
    awarded: items.reduce((s, i) => s + i.awarded, 0),
    total: items.reduce((s, i) => s + i.total, 0),
    items,
    specPoints: sp.map((s) => ({ code: s.code, title: s.title, awarded: s.awarded, total: s.total })),
  };
}

/** Release (or un-release) results to a class. */
export async function releaseFor(assessmentId: number, groupCourseId: number, released: boolean): Promise<void> {
  await setReleased(assessmentId, groupCourseId, released);
}
