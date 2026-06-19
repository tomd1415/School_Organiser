// Phase 9 data access: mark schemes + points, pupil marks, teacher comments, per-class marking
// settings, and the release act. Keyed off worksheet resources / pupil answers / occurrences —
// never "the teacher" — so multi-teacher adds ownership on top later (PHASE_9_PLAN §13).
import { pool } from '../db/pool';
import type { MarkKind, MarkPoint } from '../lib/deterministicMarker';

// ── Mark schemes ─────────────────────────────────────────────────────────────────────────────
export interface SchemePoint extends MarkPoint {
  fieldKey: string;
  displayOrder: number;
}

export interface MarkScheme {
  id: number;
  resourceId: number;
  versionNo: number;
  source: 'generated' | 'derived' | 'teacher';
  status: 'draft' | 'ready';
}

/** The scheme for a worksheet resource version, with its points (ordered). Null if none yet. */
export async function getScheme(resourceId: number, versionNo: number): Promise<{ scheme: MarkScheme; points: SchemePoint[] } | null> {
  const { rows } = await pool.query<MarkScheme>(
    `SELECT id, resource_id AS "resourceId", version_no AS "versionNo", source, status
     FROM mark_schemes WHERE resource_id = $1 AND version_no = $2`,
    [resourceId, versionNo],
  );
  const scheme = rows[0];
  if (!scheme) return null;
  const { rows: points } = await pool.query<SchemePoint>(
    `SELECT id, field_key AS "fieldKey", kind, expected, alternatives, marks, required, display_order AS "displayOrder"
     FROM mark_scheme_points WHERE mark_scheme_id = $1 ORDER BY display_order, id`,
    [scheme.id],
  );
  return { scheme, points };
}

export interface NewPoint {
  fieldKey: string;
  kind: MarkKind;
  expected: string;
  alternatives: string[];
  marks: number;
  required: boolean;
}

/** Replace a worksheet version's scheme wholesale (delete + reinsert points in a txn). */
export async function upsertScheme(
  resourceId: number,
  versionNo: number,
  source: 'generated' | 'derived' | 'teacher',
  status: 'draft' | 'ready',
  points: NewPoint[],
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO mark_schemes (resource_id, version_no, source, status, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (resource_id, version_no)
       DO UPDATE SET source = EXCLUDED.source, status = EXCLUDED.status, updated_at = now()
       RETURNING id`,
      [resourceId, versionNo, source, status],
    );
    const schemeId = rows[0]!.id;
    await client.query(`DELETE FROM mark_scheme_points WHERE mark_scheme_id = $1`, [schemeId]);
    let order = 0;
    for (const p of points) {
      await client.query(
        `INSERT INTO mark_scheme_points (mark_scheme_id, field_key, kind, expected, alternatives, marks, required, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [schemeId, p.fieldKey, p.kind, p.expected, p.alternatives, p.marks, p.required, order++],
      );
    }
    await client.query('COMMIT');
    return schemeId;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function setSchemeStatus(schemeId: number, status: 'draft' | 'ready'): Promise<void> {
  await pool.query(`UPDATE mark_schemes SET status = $2, updated_at = now() WHERE id = $1`, [schemeId, status]);
}

/** Inline-edit one mark point field from the scheme editor. */
export async function updateSchemePoint(pointId: number, field: 'kind' | 'expected' | 'alternatives' | 'marks', value: string): Promise<void> {
  if (field === 'kind') {
    const k = value.toLowerCase().trim();
    if (!['tick', 'choice', 'exact', 'numeric', 'keyword', 'open'].includes(k)) return;
    await pool.query(`UPDATE mark_scheme_points SET kind = $2 WHERE id = $1`, [pointId, k]);
  } else if (field === 'marks') {
    const n = Math.max(0, Math.min(10, Math.round(Number(value) || 0)));
    await pool.query(`UPDATE mark_scheme_points SET marks = $2 WHERE id = $1`, [pointId, n]);
  } else if (field === 'alternatives') {
    const alts = value.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 20);
    await pool.query(`UPDATE mark_scheme_points SET alternatives = $2 WHERE id = $1`, [pointId, alts]);
  } else {
    await pool.query(`UPDATE mark_scheme_points SET expected = $2 WHERE id = $1`, [pointId, value.slice(0, 2000)]);
  }
}

// ── Answers to mark ──────────────────────────────────────────────────────────────────────────
export interface MarkingAnswer {
  pupilAnswerId: number;
  pupilId: number;
  fieldKey: string;
  value: string;
  resourceId: number | null; // provenance: which worksheet resource this answer was given against
  versionNo: number | null; // …and which version, so it's only marked against ITS scheme (BUG-015)
}
/** Non-empty answers for a lesson instance — the marking inputs (objective + open). */
export async function answersForMarking(occurrenceCourseId: number): Promise<MarkingAnswer[]> {
  const { rows } = await pool.query<MarkingAnswer>(
    `SELECT id AS "pupilAnswerId", pupil_id AS "pupilId", field_key AS "fieldKey", value,
            resource_id AS "resourceId", version_no AS "versionNo"
     FROM pupil_answers WHERE occurrence_course_id = $1 AND value <> '' ORDER BY field_key, id`,
    [occurrenceCourseId],
  );
  return rows;
}

/** The group_course + bound plan for an occurrence-course (to resolve its worksheet + scheme). */
export async function occCoursePlan(occurrenceCourseId: number): Promise<{ groupCourseId: number; lessonPlanId: number | null } | null> {
  const { rows } = await pool.query<{ groupCourseId: number; lessonPlanId: number | null }>(
    `SELECT group_course_id AS "groupCourseId", lesson_plan_id AS "lessonPlanId" FROM occurrence_courses WHERE id = $1`,
    [occurrenceCourseId],
  );
  return rows[0] ?? null;
}

/** Answer ids whose mark is LOCKED — confirmed by the teacher or a teacher override. A re-run
 *  (e.g. after fixing the scheme) skips only these and re-marks the rest, so a corrected scheme
 *  takes effect on still-suggested marks via writeMark's ON CONFLICT. */
export async function alreadyMarkedAnswerIds(occurrenceCourseId: number): Promise<Set<number>> {
  const { rows } = await pool.query<{ id: number }>(
    `SELECT m.pupil_answer_id AS id FROM pupil_marks m
     JOIN pupil_answers a ON a.id = m.pupil_answer_id
     WHERE a.occurrence_course_id = $1 AND (m.status = 'confirmed' OR m.marker = 'teacher')`,
    [occurrenceCourseId],
  );
  return new Set(rows.map((r) => r.id));
}

// ── Marks ────────────────────────────────────────────────────────────────────────────────────
export interface MarkWrite {
  pupilAnswerId: number;
  marksAwarded: number;
  marksTotal: number;
  pointsHit: number[];
  evidence: string[];
  marker: 'auto' | 'ai' | 'teacher';
  confidence: number | null;
  status: 'suggested' | 'confirmed';
  needsReview: boolean;
  feedback: string;
  disclosure?: boolean; // 10.4: a guard-matched (safeguarding) answer — flagged distinctly
  historyAppend?: unknown;
}

/** Insert or replace the mark for one answer. Appends to the JSONB history audit trail. */
export async function writeMark(m: MarkWrite): Promise<void> {
  await pool.query(
    `INSERT INTO pupil_marks (pupil_answer_id, marks_awarded, marks_total, points_hit, evidence, marker, confidence, status, needs_review, feedback, disclosure, history, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())
     ON CONFLICT (pupil_answer_id) DO UPDATE SET
       marks_awarded = EXCLUDED.marks_awarded, marks_total = EXCLUDED.marks_total, points_hit = EXCLUDED.points_hit,
       evidence = EXCLUDED.evidence, marker = EXCLUDED.marker, confidence = EXCLUDED.confidence,
       status = EXCLUDED.status, needs_review = EXCLUDED.needs_review, feedback = EXCLUDED.feedback,
       disclosure = EXCLUDED.disclosure, history = pupil_marks.history || EXCLUDED.history, updated_at = now()`,
    [
      m.pupilAnswerId, m.marksAwarded, m.marksTotal, m.pointsHit, m.evidence, m.marker, m.confidence,
      m.status, m.needsReview, m.feedback, m.disclosure ?? false, JSON.stringify(m.historyAppend != null ? [m.historyAppend] : []),
    ],
  );
}

export interface PupilMarkRow {
  pupilAnswerId: number;
  fieldKey: string;
  value: string;
  marksAwarded: number;
  marksTotal: number;
  marker: string;
  confidence: number | null;
  status: string;
  needsReview: boolean;
  feedback: string;
}

/** Every mark for one pupil's work on a lesson instance (joined to the answer text + field). */
export async function marksForPupil(pupilId: number, occurrenceCourseId: number): Promise<PupilMarkRow[]> {
  const { rows } = await pool.query<PupilMarkRow>(
    `SELECT a.id AS "pupilAnswerId", a.field_key AS "fieldKey", a.value,
            m.marks_awarded AS "marksAwarded", m.marks_total AS "marksTotal", m.marker, m.confidence,
            m.status, m.needs_review AS "needsReview", m.feedback
     FROM pupil_answers a JOIN pupil_marks m ON m.pupil_answer_id = a.id
     WHERE a.pupil_id = $1 AND a.occurrence_course_id = $2
     ORDER BY a.field_key`,
    [pupilId, occurrenceCourseId],
  );
  return rows;
}

/** A pupil's CONFIRMED marks for a lesson (what they may be shown). */
export async function confirmedMarksForPupil(pupilId: number, occurrenceCourseId: number): Promise<PupilMarkRow[]> {
  const { rows } = await pool.query<PupilMarkRow>(
    `SELECT a.id AS "pupilAnswerId", a.field_key AS "fieldKey", a.value,
            m.marks_awarded AS "marksAwarded", m.marks_total AS "marksTotal", m.marker, m.confidence,
            m.status, m.needs_review AS "needsReview", m.feedback
     FROM pupil_answers a JOIN pupil_marks m ON m.pupil_answer_id = a.id
     WHERE a.pupil_id = $1 AND a.occurrence_course_id = $2 AND m.status = 'confirmed'
     ORDER BY a.field_key`,
    [pupilId, occurrenceCourseId],
  );
  return rows;
}

/** A compact per-pupil mark summary for the review grid: total awarded/total, and #needs-review. */
export interface MarkSummary {
  pupilId: number;
  awarded: number;
  total: number;
  confirmedAwarded: number; // sums over CONFIRMED marks only — the defensible "attainment" figure
  confirmedTotal: number;
  marked: number;
  suggested: number; // unconfirmed
  needsReview: number;
}
export async function markSummaries(occurrenceCourseId: number): Promise<Map<number, MarkSummary>> {
  const { rows } = await pool.query<MarkSummary>(
    `SELECT a.pupil_id AS "pupilId",
            COALESCE(sum(m.marks_awarded), 0)::int AS awarded,
            COALESCE(sum(m.marks_total), 0)::int AS total,
            COALESCE(sum(m.marks_awarded) FILTER (WHERE m.status = 'confirmed'), 0)::int AS "confirmedAwarded",
            COALESCE(sum(m.marks_total) FILTER (WHERE m.status = 'confirmed'), 0)::int AS "confirmedTotal",
            count(m.*)::int AS marked,
            count(*) FILTER (WHERE m.status = 'suggested')::int AS suggested,
            count(*) FILTER (WHERE m.needs_review)::int AS "needsReview"
     FROM pupil_answers a JOIN pupil_marks m ON m.pupil_answer_id = a.id
     WHERE a.occurrence_course_id = $1
     GROUP BY a.pupil_id`,
    [occurrenceCourseId],
  );
  return new Map(rows.map((r) => [r.pupilId, r]));
}

/** Confirm a pupil's confident marks. needs_review rows are NEVER bulk-confirmed — a flagged mark
 *  (guard-withheld, low-confidence, hallucinated-evidence) requires an explicit per-row override
 *  before it can reach the pupil. */
export async function confirmMarksForPupil(pupilId: number, occurrenceCourseId: number): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE pupil_marks m SET status = 'confirmed', updated_at = now()
     FROM pupil_answers a
     WHERE m.pupil_answer_id = a.id AND a.pupil_id = $1 AND a.occurrence_course_id = $2
       AND m.status = 'suggested' AND NOT m.needs_review`,
    [pupilId, occurrenceCourseId],
  );
  return rowCount ?? 0;
}

export async function confirmAllConfident(occurrenceCourseId: number): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE pupil_marks m SET status = 'confirmed', updated_at = now()
     FROM pupil_answers a
     WHERE m.pupil_answer_id = a.id AND a.occurrence_course_id = $1 AND m.status = 'suggested' AND NOT m.needs_review`,
    [occurrenceCourseId],
  );
  return rowCount ?? 0;
}

/** Teacher overrides a single mark (records the prior value in history, marks it confirmed+teacher).
 *  Scoped to the authorised pupil + occurrence-course so a forged answer id can't be edited. */
export async function overrideMark(pupilAnswerId: number, pupilId: number, occurrenceCourseId: number, marksAwarded: number, feedback: string | null): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE pupil_marks SET
       history = history || jsonb_build_object('override', true, 'prevAwarded', marks_awarded, 'at', now()),
       marks_awarded = LEAST($4, marks_total), marker = 'teacher', status = 'confirmed', needs_review = false,
       feedback = COALESCE($5, feedback), updated_at = now()
     WHERE pupil_answer_id = $1
       AND EXISTS (SELECT 1 FROM pupil_answers a WHERE a.id = $1 AND a.pupil_id = $2 AND a.occurrence_course_id = $3)`,
    [pupilAnswerId, pupilId, occurrenceCourseId, marksAwarded, feedback],
  );
  return rowCount ?? 0;
}

/** Per-field mark stats for the class (full / partial / zero counts) — for the marks-aware summary. */
export interface FieldStat {
  fieldKey: string;
  full: number;
  partial: number;
  zero: number;
}
// 10.22 — the marking backlog across recent classes: lessons with suggested marks to confirm, or
// confirmed marks not yet released. Surfaced on Now so unconfirmed AI marks can't pile up unseen.
export interface MarksBacklogRow {
  occurrenceCourseId: number;
  courseName: string;
  groupName: string;
  date: string;
  lessonId: number;
  suggested: number;
  needsReview: number;
  unreleased: boolean;
}
export async function marksBacklog(): Promise<MarksBacklogRow[]> {
  const { rows } = await pool.query<MarksBacklogRow>(
    `SELECT oc.id AS "occurrenceCourseId", c.name AS "courseName", g.name AS "groupName",
            to_char(o.date, 'YYYY-MM-DD') AS date, o.timetabled_lesson_id AS "lessonId",
            count(*) FILTER (WHERE m.status = 'suggested')::int AS suggested,
            count(*) FILTER (WHERE m.needs_review)::int AS "needsReview",
            (oc.marks_released_at IS NULL AND count(*) FILTER (WHERE m.status = 'confirmed') > 0) AS unreleased
     FROM occurrence_courses oc
     JOIN lesson_occurrences o ON o.id = oc.occurrence_id
     JOIN group_courses gc ON gc.id = oc.group_course_id
     JOIN groups g ON g.id = gc.group_id
     JOIN courses c ON c.id = gc.course_id
     JOIN pupil_answers a ON a.occurrence_course_id = oc.id
     JOIN pupil_marks m ON m.pupil_answer_id = a.id
     WHERE o.date >= (now() - interval '21 days')::date
     GROUP BY oc.id, c.name, g.name, o.date, o.timetabled_lesson_id, oc.marks_released_at
     HAVING count(*) FILTER (WHERE m.status = 'suggested') > 0
         OR (oc.marks_released_at IS NULL AND count(*) FILTER (WHERE m.status = 'confirmed') > 0)
     ORDER BY o.date DESC
     LIMIT 12`,
  );
  return rows;
}

/** 10.15 — the group-course's recent occurrence-courses that actually have marks, newest first.
 *  Source of "what this class got wrong recently" for retrieval-practice starters + adapt context. */
export async function recentMarkedOccurrenceCourses(groupCourseId: number, limit: number): Promise<number[]> {
  const { rows } = await pool.query<{ id: number }>(
    `SELECT oc.id FROM occurrence_courses oc
     JOIN lesson_occurrences o ON o.id = oc.occurrence_id
     WHERE oc.group_course_id = $1
       AND EXISTS (SELECT 1 FROM pupil_answers a JOIN pupil_marks m ON m.pupil_answer_id = a.id WHERE a.occurrence_course_id = oc.id)
     ORDER BY o.date DESC, oc.id DESC
     LIMIT $2`,
    [groupCourseId, limit],
  );
  return rows.map((r) => r.id);
}

export async function markStatsByField(occurrenceCourseId: number): Promise<FieldStat[]> {
  const { rows } = await pool.query<FieldStat>(
    `SELECT a.field_key AS "fieldKey",
            count(*) FILTER (WHERE m.marks_total > 0 AND m.marks_awarded >= m.marks_total)::int AS full,
            count(*) FILTER (WHERE m.marks_awarded > 0 AND m.marks_awarded < m.marks_total)::int AS partial,
            count(*) FILTER (WHERE m.marks_awarded = 0)::int AS zero
     FROM pupil_answers a JOIN pupil_marks m ON m.pupil_answer_id = a.id
     WHERE a.occurrence_course_id = $1
     GROUP BY a.field_key`,
    [occurrenceCourseId],
  );
  return rows;
}

// ── Teacher comment back ─────────────────────────────────────────────────────────────────────
export async function getComment(pupilId: number, occurrenceCourseId: number): Promise<string> {
  const { rows } = await pool.query<{ comment: string }>(
    `SELECT comment FROM pupil_lesson_comments WHERE pupil_id = $1 AND occurrence_course_id = $2`,
    [pupilId, occurrenceCourseId],
  );
  return rows[0]?.comment ?? '';
}
export async function setComment(pupilId: number, occurrenceCourseId: number, comment: string): Promise<void> {
  await pool.query(
    `INSERT INTO pupil_lesson_comments (pupil_id, occurrence_course_id, comment, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (pupil_id, occurrence_course_id) DO UPDATE SET comment = EXCLUDED.comment, updated_at = now()`,
    [pupilId, occurrenceCourseId, comment],
  );
}

// ── Per-class marking settings + release ─────────────────────────────────────────────────────
export interface MarkingSettings {
  markingTrigger: 'on_done' | 'manual';
  resultsMode: 'instant' | 'on_release';
  showScores: boolean;
  devicesEnabled: boolean;
}
export async function getMarkingSettings(groupCourseId: number): Promise<MarkingSettings> {
  const { rows } = await pool.query<MarkingSettings>(
    `SELECT marking_trigger AS "markingTrigger", results_mode AS "resultsMode",
            show_scores AS "showScores", devices_enabled AS "devicesEnabled"
     FROM group_courses WHERE id = $1`,
    [groupCourseId],
  );
  return rows[0] ?? { markingTrigger: 'on_done', resultsMode: 'instant', showScores: false, devicesEnabled: false };
}
export async function setMarkingSetting(groupCourseId: number, key: keyof MarkingSettings, value: string | boolean): Promise<void> {
  const col = { markingTrigger: 'marking_trigger', resultsMode: 'results_mode', showScores: 'show_scores', devicesEnabled: 'devices_enabled' }[key];
  await pool.query(`UPDATE group_courses SET ${col} = $2 WHERE id = $1`, [groupCourseId, value]);
}

export async function releaseMarks(occurrenceCourseId: number, release: boolean): Promise<void> {
  await pool.query(`UPDATE occurrence_courses SET marks_released_at = $2 WHERE id = $1`, [occurrenceCourseId, release ? new Date() : null]);
}
export async function marksReleasedAt(occurrenceCourseId: number): Promise<Date | null> {
  const { rows } = await pool.query<{ at: Date | null }>(`SELECT marks_released_at AS at FROM occurrence_courses WHERE id = $1`, [occurrenceCourseId]);
  return rows[0]?.at ?? null;
}

// ── 10.9 Durable open-marking queue ────────────────────────────────────────────────────────────
/** Queue (or push forward) the open-marking job for an occurrence-course; due `delayMs` from now.
 *  A fresh "Done" tap re-arms the same row, so finishers batch behind the last one. */
export async function enqueueOpenMark(occurrenceCourseId: number, delayMs: number): Promise<void> {
  await pool.query(
    `INSERT INTO marking_queue (occurrence_course_id, due_at)
     VALUES ($1, now() + ($2::bigint) * interval '1 millisecond')
     ON CONFLICT (occurrence_course_id) DO UPDATE SET due_at = EXCLUDED.due_at`,
    [occurrenceCourseId, delayMs],
  );
}

/** Atomically claim every job that is now due (DELETE … RETURNING), so a job runs once even with
 *  overlapping sweeps. Returns the occurrence-course ids to mark. */
export async function claimDueMarkJobs(): Promise<number[]> {
  const { rows } = await pool.query<{ occurrenceCourseId: number }>(
    `DELETE FROM marking_queue WHERE due_at <= now() RETURNING occurrence_course_id AS "occurrenceCourseId"`,
  );
  return rows.map((r) => r.occurrenceCourseId);
}

/** Drop a job (e.g. the class switched to manual marking, or the oc was removed). */
export async function dequeueOpenMark(occurrenceCourseId: number): Promise<void> {
  await pool.query(`DELETE FROM marking_queue WHERE occurrence_course_id = $1`, [occurrenceCourseId]);
}

/** Drop every pending open-mark job for a whole class — used when it switches to manual marking,
 *  so finishers queued just before the switch don't still get an automatic AI pass. */
export async function dequeueOpenMarkForGroupCourse(groupCourseId: number): Promise<void> {
  await pool.query(`DELETE FROM marking_queue WHERE occurrence_course_id IN (SELECT id FROM occurrence_courses WHERE group_course_id = $1)`, [groupCourseId]);
}
