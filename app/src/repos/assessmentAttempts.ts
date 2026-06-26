// Assessment delivery repo: class assignment + availability, pupil attempts, answers (PII), awarded marks
// (mirrors pupil_marks: upsert + history, confirm-never-when-needs-review, override), per-spec-point results,
// and the durable mark queue. is_test partitions Test Lab attempts. Mirrors repos/marking.ts + pupilWork.
import { pool, withTransaction } from '../db/pool';

export interface AssignmentRow {
  id: number;
  assessmentId: number;
  groupCourseId: number;
  availableFrom: string | null;
  availableUntil: string | null;
  resultsMode: 'instant' | 'on_release';
  releasedAt: string | null;
}
// Render the timestamptz columns as UTC ISO strings (matching AssignmentRow's `string | null`) — node-pg
// would otherwise hand back Date objects, which the views/services treat as strings. The window GATE
// (available_from <= now) is done in SQL on the raw columns elsewhere, so display-formatting here is safe.
const TS = (col: string, alias: string): string => `to_char(${col} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "${alias}"`;
const ASSIGN_COLS =
  `id, assessment_id AS "assessmentId", group_course_id AS "groupCourseId", ${TS('available_from', 'availableFrom')},
   ${TS('available_until', 'availableUntil')}, results_mode AS "resultsMode", ${TS('released_at', 'releasedAt')}`;

export async function assignToClass(
  assessmentId: number,
  groupCourseId: number,
  opts: { availableFrom?: string | null; availableUntil?: string | null; resultsMode?: 'instant' | 'on_release' } = {},
): Promise<void> {
  await pool.query(
    `INSERT INTO assessment_classes (assessment_id, group_course_id, available_from, available_until, results_mode)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (assessment_id, group_course_id)
       DO UPDATE SET available_from = EXCLUDED.available_from, available_until = EXCLUDED.available_until, results_mode = EXCLUDED.results_mode`,
    [assessmentId, groupCourseId, opts.availableFrom ?? null, opts.availableUntil ?? null, opts.resultsMode ?? 'on_release'],
  );
}
export async function unassign(assessmentId: number, groupCourseId: number): Promise<void> {
  await pool.query(`DELETE FROM assessment_classes WHERE assessment_id = $1 AND group_course_id = $2`, [assessmentId, groupCourseId]);
}
export async function listAssignmentsForAssessment(assessmentId: number): Promise<AssignmentRow[]> {
  const { rows } = await pool.query<AssignmentRow>(`SELECT ${ASSIGN_COLS} FROM assessment_classes WHERE assessment_id = $1 ORDER BY assigned_at`, [assessmentId]);
  return rows;
}
/** Assignments visible to a class for a given assessment (used by the pupil list + take auth). */
export async function getAssignment(assessmentId: number, groupCourseId: number): Promise<AssignmentRow | null> {
  const { rows } = await pool.query<AssignmentRow>(`SELECT ${ASSIGN_COLS} FROM assessment_classes WHERE assessment_id = $1 AND group_course_id = $2`, [assessmentId, groupCourseId]);
  return rows[0] ?? null;
}
export async function setReleased(assessmentId: number, groupCourseId: number, released: boolean): Promise<void> {
  await pool.query(`UPDATE assessment_classes SET released_at = ${released ? 'now()' : 'NULL'} WHERE assessment_id = $1 AND group_course_id = $2`, [assessmentId, groupCourseId]);
}

// ── Phase 3: pupil-facing availability reads (a pupil's class = their active enrolment's group_course) ──

export interface AvailableAssessment {
  id: number;
  title: string;
  style: 'ks3' | 'gcse';
  marksTotal: number;
  groupCourseId: number;
  resultsMode: 'instant' | 'on_release';
  releasedAt: string | null;
  attemptStatus: 'not_started' | 'in_progress' | 'submitted';
}

/** Assessments assigned to a pupil's class(es) that are READY and OPEN now, with this pupil's attempt
 *  status. `isTest` selects which attempt partition to read (real vs Test-Lab). */
export async function availableAssessmentsForPupil(pupilId: number, isTest: boolean): Promise<AvailableAssessment[]> {
  const { rows } = await pool.query<AvailableAssessment>(
    `SELECT a.id, a.title, a.style, a.marks_total AS "marksTotal", ac.group_course_id AS "groupCourseId",
            ac.results_mode AS "resultsMode",
            to_char(ac.released_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "releasedAt",
            COALESCE(at.status, 'not_started') AS "attemptStatus"
     FROM assessment_classes ac
     JOIN assessments a       ON a.id = ac.assessment_id AND a.status = 'ready'
     JOIN group_courses gc    ON gc.id = ac.group_course_id AND gc.active
     JOIN enrolments e        ON e.group_id = gc.group_id AND e.active AND e.pupil_id = $1
     LEFT JOIN assessment_attempts at ON at.assessment_id = a.id AND at.pupil_id = $1 AND at.is_test = $2
     WHERE (ac.available_from IS NULL OR ac.available_from <= now())
       AND (ac.available_until IS NULL OR now() <= ac.available_until)
     ORDER BY a.title`,
    [pupilId, isTest],
  );
  return rows;
}

export interface PupilAssignment {
  groupCourseId: number;
  status: string; // the assessment status
  available: boolean; // ready AND within the window now
  resultsMode: 'instant' | 'on_release';
  releasedAt: string | null;
}

/** The pupil's assignment for ONE assessment (their enrolled class that it's assigned to), with whether
 *  it's open now. Null if the pupil's class isn't assigned this assessment. */
export async function pupilAssignmentFor(assessmentId: number, pupilId: number): Promise<PupilAssignment | null> {
  const { rows } = await pool.query<PupilAssignment>(
    `SELECT ac.group_course_id AS "groupCourseId", a.status,
            (a.status = 'ready'
              AND (ac.available_from IS NULL OR ac.available_from <= now())
              AND (ac.available_until IS NULL OR now() <= ac.available_until)) AS available,
            ac.results_mode AS "resultsMode",
            to_char(ac.released_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "releasedAt"
     FROM assessment_classes ac
     JOIN assessments a    ON a.id = ac.assessment_id
     JOIN group_courses gc ON gc.id = ac.group_course_id AND gc.active
     JOIN enrolments e     ON e.group_id = gc.group_id AND e.active AND e.pupil_id = $2
     WHERE ac.assessment_id = $1
     ORDER BY ac.assigned_at
     LIMIT 1`,
    [assessmentId, pupilId],
  );
  return rows[0] ?? null;
}

/** Guard: does this part belong to this assessment? (so a pupil can't save against another paper's part). */
export async function partBelongsToAssessment(partId: number, assessmentId: number): Promise<boolean> {
  const { rows } = await pool.query<{ ok: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM assessment_question_parts p
       JOIN assessment_questions q ON q.id = p.question_id
       WHERE p.id = $1 AND q.assessment_id = $2) AS ok`,
    [partId, assessmentId],
  );
  return rows[0]?.ok ?? false;
}

/** The pupil's saved answers for an attempt, as a partId → answer_text map (to restore an in-progress take). */
export async function savedAnswers(attemptId: number): Promise<Map<number, string>> {
  const { rows } = await pool.query<{ partId: number; answerText: string }>(
    `SELECT part_id AS "partId", answer_text AS "answerText" FROM assessment_answers WHERE attempt_id = $1`,
    [attemptId],
  );
  return new Map(rows.map((r) => [r.partId, r.answerText]));
}

export interface AttemptRow {
  id: number;
  assessmentId: number;
  pupilId: number;
  groupCourseId: number;
  status: 'in_progress' | 'submitted';
  isTest: boolean;
  scoreAwarded: number;
  scoreTotal: number;
}
const ATTEMPT_COLS =
  `id, assessment_id AS "assessmentId", pupil_id AS "pupilId", group_course_id AS "groupCourseId",
   status, is_test AS "isTest", score_awarded AS "scoreAwarded", score_total AS "scoreTotal"`;

/** Resume the pupil's existing attempt, else create one. Idempotent (one real attempt enforced by index). */
export async function startAttempt(assessmentId: number, pupilId: number, groupCourseId: number, isTest: boolean): Promise<AttemptRow> {
  const existing = await pool.query<AttemptRow>(
    `SELECT ${ATTEMPT_COLS} FROM assessment_attempts WHERE assessment_id = $1 AND pupil_id = $2 AND is_test = $3 ORDER BY id DESC LIMIT 1`,
    [assessmentId, pupilId, isTest],
  );
  if (existing.rows[0]) return existing.rows[0];
  const { rows } = await pool.query<AttemptRow>(
    `INSERT INTO assessment_attempts (assessment_id, pupil_id, group_course_id, is_test) VALUES ($1,$2,$3,$4) RETURNING ${ATTEMPT_COLS}`,
    [assessmentId, pupilId, groupCourseId, isTest],
  );
  return rows[0]!;
}
export async function getAttempt(attemptId: number): Promise<AttemptRow | null> {
  const { rows } = await pool.query<AttemptRow>(`SELECT ${ATTEMPT_COLS} FROM assessment_attempts WHERE id = $1`, [attemptId]);
  return rows[0] ?? null;
}

/** The pupil's existing attempt for an assessment (no create) — for autosave/submit, which must act on the
 *  attempt opened when the take page loaded, never start a fresh one. */
export async function getPupilAttempt(assessmentId: number, pupilId: number, isTest: boolean): Promise<AttemptRow | null> {
  const { rows } = await pool.query<AttemptRow>(
    `SELECT ${ATTEMPT_COLS} FROM assessment_attempts WHERE assessment_id = $1 AND pupil_id = $2 AND is_test = $3 ORDER BY id DESC LIMIT 1`,
    [assessmentId, pupilId, isTest],
  );
  return rows[0] ?? null;
}

/** Upsert one part's answer. On a real CHANGE, drop a stale awarded mark for that answer (mirror
 * pupilWork.saveAnswer / BUG-004): read the prior row FOR UPDATE, upsert, then delete the mark if it changed. */
export async function saveAnswer(attemptId: number, partId: number, value: string): Promise<void> {
  await withTransaction(async (db) => {
    const prev = await db.query<{ id: number; answer_text: string }>(
      `SELECT id, answer_text FROM assessment_answers WHERE attempt_id = $1 AND part_id = $2 FOR UPDATE`,
      [attemptId, partId],
    );
    await db.query(
      `INSERT INTO assessment_answers (attempt_id, part_id, answer_text) VALUES ($1,$2,$3)
       ON CONFLICT (attempt_id, part_id) DO UPDATE SET answer_text = EXCLUDED.answer_text, updated_at = now()`,
      [attemptId, partId, value],
    );
    if (prev.rows[0] && prev.rows[0].answer_text !== value) {
      await db.query(`DELETE FROM assessment_awarded_marks WHERE answer_id = $1`, [prev.rows[0].id]);
    }
  });
}

/** Freeze the attempt. Returns false if it was not in_progress (double-submit guard). */
export async function submitAttempt(attemptId: number): Promise<boolean> {
  const r = await pool.query(`UPDATE assessment_attempts SET status = 'submitted', submitted_at = now() WHERE id = $1 AND status = 'in_progress'`, [attemptId]);
  return (r.rowCount ?? 0) > 0;
}

export interface AnswerForMarking { answerId: number; partId: number; answerText: string }
export async function answersForMarking(attemptId: number): Promise<AnswerForMarking[]> {
  const { rows } = await pool.query<AnswerForMarking>(
    `SELECT id AS "answerId", part_id AS "partId", answer_text AS "answerText" FROM assessment_answers WHERE attempt_id = $1`, [attemptId]);
  return rows;
}

// ── Phase 4: marking reads ─────────────────────────────────────────────────────────────────────────

/** answerIds of this attempt that already carry a mark (so marking passes skip them — never clobbering a
 *  teacher override or re-marking a confirmed answer). */
export async function markedAnswerIds(attemptId: number): Promise<Set<number>> {
  const { rows } = await pool.query<{ answer_id: number }>(
    `SELECT am.answer_id FROM assessment_awarded_marks am JOIN assessment_answers ans ON ans.id = am.answer_id WHERE ans.attempt_id = $1`,
    [attemptId],
  );
  return new Set(rows.map((r) => r.answer_id));
}

/** Every awarded mark of an attempt, keyed by part — feeds computeSpecPointResults (objective attribution). */
export async function awardedForAttempt(attemptId: number): Promise<Array<{ partId: number; marksAwarded: number; marksTotal: number }>> {
  const { rows } = await pool.query<{ partId: number; marksAwarded: number; marksTotal: number }>(
    `SELECT ans.part_id AS "partId", am.marks_awarded AS "marksAwarded", am.marks_total AS "marksTotal"
     FROM assessment_awarded_marks am JOIN assessment_answers ans ON ans.id = am.answer_id WHERE ans.attempt_id = $1`,
    [attemptId],
  );
  return rows;
}

export interface MarkingRow {
  qOrder: number;
  stem: string;
  partId: number;
  partLabel: string;
  prompt: string;
  partMarks: number;
  responseType: string;
  specPointId: number | null;
  answerId: number | null;
  answerText: string | null;
  marksAwarded: number | null;
  marksTotal: number | null;
  marker: 'auto' | 'ai' | 'teacher' | null;
  confidence: number | null;
  status: 'suggested' | 'confirmed' | null;
  needsReview: boolean | null;
  disclosure: boolean | null;
  feedback: string | null;
  evidence: string[] | null;
}

/** Every part of an attempt's paper with the pupil's answer + its mark (if any) — the teacher marking grid.
 *  The teacher sees full PII (their own pupils); nothing here goes to AI. */
export async function attemptMarkingRows(attemptId: number): Promise<MarkingRow[]> {
  const { rows } = await pool.query<MarkingRow>(
    `SELECT q.display_order AS "qOrder", q.stem, p.id AS "partId", p.part_label AS "partLabel", p.prompt,
            p.marks AS "partMarks", p.expected_response_type AS "responseType", q.spec_point_id AS "specPointId",
            ans.id AS "answerId", ans.answer_text AS "answerText",
            am.marks_awarded AS "marksAwarded", am.marks_total AS "marksTotal", am.marker, am.confidence,
            am.status, am.needs_review AS "needsReview", am.disclosure, am.feedback, am.evidence
     FROM assessment_questions q
     JOIN assessment_question_parts p ON p.question_id = q.id
     LEFT JOIN assessment_answers ans ON ans.part_id = p.id AND ans.attempt_id = $1
     LEFT JOIN assessment_awarded_marks am ON am.answer_id = ans.id
     WHERE q.assessment_id = (SELECT assessment_id FROM assessment_attempts WHERE id = $1)
     ORDER BY q.display_order, p.display_order`,
    [attemptId],
  );
  return rows;
}

export interface ReviewQueueRow {
  attemptId: number;
  assessmentId: number;
  assessmentTitle: string;
  pupilId: number;
  needsReview: number;
  disclosure: number;
}

/** Submitted attempts with any needs_review / disclosure marks — the moderation queue, worst first. Real
 *  attempts only (cohort/teacher view excludes Test-Lab). */
export async function attemptsNeedingReview(): Promise<ReviewQueueRow[]> {
  const { rows } = await pool.query<ReviewQueueRow>(
    `SELECT at.id AS "attemptId", at.assessment_id AS "assessmentId", a.title AS "assessmentTitle", at.pupil_id AS "pupilId",
            count(*) FILTER (WHERE am.needs_review)::int AS "needsReview",
            count(*) FILTER (WHERE am.disclosure)::int AS "disclosure"
     FROM assessment_attempts at
     JOIN assessments a ON a.id = at.assessment_id
     JOIN assessment_answers ans ON ans.attempt_id = at.id
     JOIN assessment_awarded_marks am ON am.answer_id = ans.id
     WHERE NOT at.is_test AND (am.needs_review OR am.disclosure)
     GROUP BY at.id, at.assessment_id, a.title, at.pupil_id
     ORDER BY count(*) FILTER (WHERE am.disclosure) DESC, count(*) FILTER (WHERE am.needs_review) DESC`,
  );
  return rows;
}

export interface AwardWrite {
  answerId: number;
  marksAwarded: number;
  marksTotal: number;
  pointsHit?: number[];
  evidence?: string[];
  marker: 'auto' | 'ai' | 'teacher';
  confidence?: number | null;
  status?: 'suggested' | 'confirmed';
  needsReview?: boolean;
  disclosure?: boolean;
  feedback?: string;
  historyEntry?: unknown; // appended to history[]
}
/** Upsert an awarded mark (+ append a history entry), mirroring repos/marking.ts writeMark. */
export async function writeAwardedMark(m: AwardWrite): Promise<void> {
  await pool.query(
    `INSERT INTO assessment_awarded_marks
       (answer_id, marks_awarded, marks_total, points_hit, evidence, marker, confidence, status, needs_review, disclosure, feedback, history)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, CASE WHEN $12::jsonb IS NULL THEN '[]'::jsonb ELSE jsonb_build_array($12::jsonb) END)
     ON CONFLICT (answer_id) DO UPDATE SET
       marks_awarded = EXCLUDED.marks_awarded, marks_total = EXCLUDED.marks_total, points_hit = EXCLUDED.points_hit,
       evidence = EXCLUDED.evidence, marker = EXCLUDED.marker, confidence = EXCLUDED.confidence, status = EXCLUDED.status,
       needs_review = EXCLUDED.needs_review, disclosure = EXCLUDED.disclosure, feedback = EXCLUDED.feedback,
       history = assessment_awarded_marks.history || (CASE WHEN $12::jsonb IS NULL THEN '[]'::jsonb ELSE jsonb_build_array($12::jsonb) END),
       updated_at = now()`,
    [m.answerId, m.marksAwarded, m.marksTotal, m.pointsHit ?? [], m.evidence ?? [], m.marker, m.confidence ?? null,
     m.status ?? 'suggested', m.needsReview ?? false, m.disclosure ?? false, m.feedback ?? '',
     m.historyEntry == null ? null : JSON.stringify(m.historyEntry)],
  );
}

/** Teacher override one answer's mark → marker='teacher', confirmed, history-logged. */
export async function overrideMark(answerId: number, marksAwarded: number, feedback: string | null): Promise<void> {
  await pool.query(
    `UPDATE assessment_awarded_marks
     SET marks_awarded = $2, marker = 'teacher', status = 'confirmed', needs_review = false,
         feedback = COALESCE($3, feedback),
         history = history || jsonb_build_array(jsonb_build_object('at', now(), 'by', 'teacher', 'marks', $2)),
         updated_at = now()
     WHERE answer_id = $1`,
    [answerId, marksAwarded, feedback],
  );
}
/** Confirm all of an attempt's suggested marks — NEVER confirms ones flagged needs_review (mirror marking.ts). */
export async function confirmMarksForAttempt(attemptId: number): Promise<number> {
  const r = await pool.query(
    `UPDATE assessment_awarded_marks am SET status = 'confirmed', updated_at = now()
     FROM assessment_answers ans
     WHERE ans.id = am.answer_id AND ans.attempt_id = $1 AND am.status = 'suggested' AND NOT am.needs_review`,
    [attemptId],
  );
  return r.rowCount ?? 0;
}

export async function upsertSpecPointResult(attemptId: number, specPointId: number, awarded: number, total: number): Promise<void> {
  await pool.query(
    `INSERT INTO assessment_spec_point_results (attempt_id, spec_point_id, marks_awarded, marks_total) VALUES ($1,$2,$3,$4)
     ON CONFLICT (attempt_id, spec_point_id) DO UPDATE SET marks_awarded = EXCLUDED.marks_awarded, marks_total = EXCLUDED.marks_total`,
    [attemptId, specPointId, awarded, total],
  );
}

/** Recompute the attempt's score cache: awarded = Σ awarded marks; total = the whole paper's marks_total. */
export async function recomputeAttemptScore(attemptId: number): Promise<void> {
  await pool.query(
    `UPDATE assessment_attempts at SET
       score_awarded = COALESCE((SELECT sum(am.marks_awarded) FROM assessment_awarded_marks am
                                 JOIN assessment_answers ans ON ans.id = am.answer_id WHERE ans.attempt_id = at.id), 0),
       score_total = COALESCE((SELECT marks_total FROM assessments WHERE id = at.assessment_id), 0)
     WHERE at.id = $1`,
    [attemptId],
  );
}

// Durable AI-marking queue (mirrors repos/marking.ts enqueueOpenMark / claimDueMarkJobs).
export async function enqueueAttemptMark(attemptId: number, delayMs = 0): Promise<void> {
  await pool.query(
    `INSERT INTO assessment_mark_queue (attempt_id, due_at) VALUES ($1, now() + ($2 || ' milliseconds')::interval)
     ON CONFLICT (attempt_id) DO UPDATE SET due_at = LEAST(assessment_mark_queue.due_at, EXCLUDED.due_at)`,
    [attemptId, String(delayMs)],
  );
}
export async function claimDueAttemptMarks(): Promise<number[]> {
  const { rows } = await pool.query<{ attempt_id: number }>(
    `DELETE FROM assessment_mark_queue WHERE attempt_id IN (SELECT attempt_id FROM assessment_mark_queue WHERE due_at <= now() FOR UPDATE SKIP LOCKED) RETURNING attempt_id`,
  );
  return rows.map((r) => r.attempt_id);
}

/** Test Lab cleanup: remove all is_test attempts (cascades to answers/marks/results). */
export async function wipeTestAttempts(): Promise<number> {
  const r = await pool.query(`DELETE FROM assessment_attempts WHERE is_test`);
  return r.rowCount ?? 0;
}
