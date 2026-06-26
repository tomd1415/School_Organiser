// Phase 5 — assessment analytics reads. EVERY read filters `WHERE NOT is_test` so Test-Lab attempts never
// pollute cohort numbers. No pupil identity leaves the server; these feed teacher-rendered dashboards and the
// gated pupil results view only.
import { pool } from '../db/pool';

export interface PupilResultRow {
  attemptId: number;
  pupilId: number;
  status: 'in_progress' | 'submitted';
  scoreAwarded: number;
  scoreTotal: number;
  needsReview: number;
  disclosure: number;
  confirmed: number;
  marksCount: number;
}

/** Per-pupil summary for one assessment (teacher view): score + flag counts. Real attempts only. */
export async function perPupilForAssessment(assessmentId: number): Promise<PupilResultRow[]> {
  const { rows } = await pool.query<PupilResultRow>(
    `SELECT at.id AS "attemptId", at.pupil_id AS "pupilId", at.status,
            at.score_awarded AS "scoreAwarded", at.score_total AS "scoreTotal",
            count(*) FILTER (WHERE am.needs_review)::int AS "needsReview",
            count(*) FILTER (WHERE am.disclosure)::int AS "disclosure",
            count(*) FILTER (WHERE am.status = 'confirmed')::int AS "confirmed",
            count(am.answer_id)::int AS "marksCount"
     FROM assessment_attempts at
     LEFT JOIN assessment_answers ans ON ans.attempt_id = at.id
     LEFT JOIN assessment_awarded_marks am ON am.answer_id = ans.id
     WHERE at.assessment_id = $1 AND NOT at.is_test
     GROUP BY at.id, at.pupil_id, at.status, at.score_awarded, at.score_total
     ORDER BY at.pupil_id`,
    [assessmentId],
  );
  return rows;
}

export interface SpecPointMastery {
  specPointId: number;
  code: string;
  title: string;
  awarded: number;
  total: number;
  pct: number | null;
  nPupils: number;
}

/** Per-spec-point cohort mastery for one assessment, aggregated across real attempts (objective-only by
 *  design — that's what the spec-point cache holds). */
export async function specPointMasteryForAssessment(assessmentId: number): Promise<SpecPointMastery[]> {
  const { rows } = await pool.query<Omit<SpecPointMastery, 'pct'>>(
    `SELECT sp.id AS "specPointId", sp.code, sp.title,
            sum(r.marks_awarded)::int AS awarded, sum(r.marks_total)::int AS total,
            count(DISTINCT r.attempt_id)::int AS "nPupils"
     FROM assessment_spec_point_results r
     JOIN assessment_attempts at ON at.id = r.attempt_id AND at.assessment_id = $1 AND NOT at.is_test
     JOIN course_spec_points sp ON sp.id = r.spec_point_id
     GROUP BY sp.id, sp.code, sp.title
     ORDER BY sp.display_order, sp.id`,
    [assessmentId],
  );
  return rows.map((r) => ({ ...r, pct: r.total > 0 ? Math.round((100 * r.awarded) / r.total) : null }));
}

export interface PupilSpecPoint {
  code: string;
  title: string;
  awarded: number;
  total: number;
}

/** One attempt's per-spec-point results (the pupil's own breakdown). */
export async function pupilSpecPoints(attemptId: number): Promise<PupilSpecPoint[]> {
  const { rows } = await pool.query<PupilSpecPoint>(
    `SELECT sp.code, sp.title, r.marks_awarded AS awarded, r.marks_total AS total
     FROM assessment_spec_point_results r JOIN course_spec_points sp ON sp.id = r.spec_point_id
     WHERE r.attempt_id = $1 ORDER BY sp.display_order, sp.id`,
    [attemptId],
  );
  return rows;
}

export interface PupilConfirmedMark {
  qOrder: number;
  partLabel: string;
  prompt: string;
  marksAwarded: number;
  marksTotal: number;
  feedback: string;
}

/** The pupil's CONFIRMED awarded marks for an attempt (with per-part feedback) — the only marks a pupil may
 *  ever see. Never includes mark-points / model answers / correctness for unconfirmed work. */
export async function pupilConfirmedMarks(attemptId: number): Promise<PupilConfirmedMark[]> {
  const { rows } = await pool.query<PupilConfirmedMark>(
    `SELECT q.display_order AS "qOrder", p.part_label AS "partLabel", p.prompt,
            am.marks_awarded AS "marksAwarded", am.marks_total AS "marksTotal", am.feedback
     FROM assessment_awarded_marks am
     JOIN assessment_answers ans ON ans.id = am.answer_id
     JOIN assessment_question_parts p ON p.id = ans.part_id
     JOIN assessment_questions q ON q.id = p.question_id
     WHERE ans.attempt_id = $1 AND am.status = 'confirmed'
     ORDER BY q.display_order, p.display_order`,
    [attemptId],
  );
  return rows;
}

/** group_course id → class (group) name, for labelling the teacher dashboard / release controls. */
export async function classNamesFor(ids: number[]): Promise<Map<number, string>> {
  if (!ids.length) return new Map();
  const { rows } = await pool.query<{ id: number; name: string | null }>(
    `SELECT gc.id, g.name FROM group_courses gc JOIN groups g ON g.id = gc.group_id WHERE gc.id = ANY($1)`,
    [ids],
  );
  return new Map(rows.map((r) => [r.id, r.name ?? `class #${r.id}`]));
}

/** Per-pupil average assessment % for a class — the cohort signal on the Pupils screen. Real, submitted
 *  attempts only. Returns a pupilId → percent map (pupils with no scored attempt are absent). */
export async function assessmentSignalForClass(groupCourseId: number): Promise<Map<number, number>> {
  const { rows } = await pool.query<{ pupilId: number; pct: number }>(
    `SELECT at.pupil_id AS "pupilId",
            round(avg(CASE WHEN at.score_total > 0 THEN 100.0 * at.score_awarded / at.score_total END))::int AS pct
     FROM assessment_attempts at
     WHERE at.group_course_id = $1 AND NOT at.is_test AND at.status = 'submitted' AND at.score_total > 0
     GROUP BY at.pupil_id`,
    [groupCourseId],
  );
  return new Map(rows.map((r) => [r.pupilId, r.pct]));
}
