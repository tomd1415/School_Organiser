// Phase 8.4–8.7: the work itself. Answers (per field, version-pinned), self-declared Done,
// per-course differentiation levels, and the pupil's lesson feedback. Everything keyed so the
// teacher's review aligns with exactly the slice the pupil saw.
import { pool } from '../db/pool';

export type Level = 'support' | 'core' | 'challenge';

// ── differentiation level, per pupil per course (no row ⇒ core) ────────────────────────────────
export async function getPupilLevel(pupilId: number, groupCourseId: number): Promise<Level> {
  const { rows } = await pool.query<{ level: Level }>(
    `SELECT level FROM pupil_levels WHERE pupil_id = $1 AND group_course_id = $2`,
    [pupilId, groupCourseId],
  );
  return rows[0]?.level ?? 'core';
}

export async function setPupilLevel(pupilId: number, groupCourseId: number, level: Level): Promise<void> {
  await pool.query(
    `INSERT INTO pupil_levels (pupil_id, group_course_id, level, updated_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (pupil_id, group_course_id) DO UPDATE SET level = EXCLUDED.level, updated_at = now()`,
    [pupilId, groupCourseId, level],
  );
}

export async function levelsForGroupCourse(groupCourseId: number): Promise<Map<number, Level>> {
  const { rows } = await pool.query<{ pupilId: number; level: Level }>(
    `SELECT pupil_id AS "pupilId", level FROM pupil_levels WHERE group_course_id = $1`,
    [groupCourseId],
  );
  return new Map(rows.map((r) => [r.pupilId, r.level]));
}

// ── answers ────────────────────────────────────────────────────────────────────────────────────
export interface SavedAnswer {
  fieldKey: string;
  value: string;
}

export async function getAnswers(pupilId: number, occurrenceCourseId: number): Promise<Map<string, string>> {
  const { rows } = await pool.query<SavedAnswer>(
    `SELECT field_key AS "fieldKey", value FROM pupil_answers
     WHERE pupil_id = $1 AND occurrence_course_id = $2`,
    [pupilId, occurrenceCourseId],
  );
  return new Map(rows.map((r) => [r.fieldKey, r.value]));
}

export async function saveAnswer(args: {
  pupilId: number;
  occurrenceCourseId: number;
  resourceId: number | null;
  versionNo: number | null;
  fieldKey: string;
  value: string;
}): Promise<void> {
  // Keyed on the lesson instance, not the worksheet resource (survives a master↔adapted /
  // re-version flip). Only clear seen_by_teacher when the value actually CHANGED, so a pupil
  // re-blurring an unchanged field doesn't spuriously re-flag it as new to the teacher.
  await pool.query(
    `INSERT INTO pupil_answers (pupil_id, occurrence_course_id, resource_id, version_no, field_key, value, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (pupil_id, occurrence_course_id, field_key)
     DO UPDATE SET value = EXCLUDED.value, resource_id = EXCLUDED.resource_id, version_no = EXCLUDED.version_no,
                   seen_by_teacher = CASE WHEN pupil_answers.value IS DISTINCT FROM EXCLUDED.value THEN false ELSE pupil_answers.seen_by_teacher END,
                   updated_at = now()`,
    [args.pupilId, args.occurrenceCourseId, args.resourceId, args.versionNo, args.fieldKey, args.value],
  );
}

export async function markAnswersSeen(occurrenceCourseId: number, pupilId?: number): Promise<void> {
  if (pupilId != null) {
    await pool.query(`UPDATE pupil_answers SET seen_by_teacher = true WHERE occurrence_course_id = $1 AND pupil_id = $2`, [occurrenceCourseId, pupilId]);
  } else {
    await pool.query(`UPDATE pupil_answers SET seen_by_teacher = true WHERE occurrence_course_id = $1`, [occurrenceCourseId]);
  }
}

// ── Done ✓ (self-declared) ───────────────────────────────────────────────────────────────────
export async function setDone(pupilId: number, occurrenceCourseId: number, done: boolean): Promise<void> {
  if (done) {
    await pool.query(
      `INSERT INTO pupil_done (pupil_id, occurrence_course_id, done_at) VALUES ($1, $2, now())
       ON CONFLICT (pupil_id, occurrence_course_id) DO UPDATE SET done_at = now()`,
      [pupilId, occurrenceCourseId],
    );
  } else {
    await pool.query(`DELETE FROM pupil_done WHERE pupil_id = $1 AND occurrence_course_id = $2`, [pupilId, occurrenceCourseId]);
  }
}

export async function isDone(pupilId: number, occurrenceCourseId: number): Promise<boolean> {
  const { rows } = await pool.query<{ n: number }>(
    `SELECT count(*)::int n FROM pupil_done WHERE pupil_id = $1 AND occurrence_course_id = $2`,
    [pupilId, occurrenceCourseId],
  );
  return (rows[0]?.n ?? 0) > 0;
}

// ── the review grid: per-pupil rollup for one occurrence-course ───────────────────────────────
export interface PupilWorkRow {
  pupilId: number;
  displayName: string;
  level: Level;
  filled: number; // non-empty answer fields
  lastSaved: string | null;
  done: boolean;
  unseen: number; // answers not yet marked seen
  rating: number | null;
}

export async function pupilWorkRows(occurrenceCourseId: number, groupCourseId: number): Promise<PupilWorkRow[]> {
  const { rows } = await pool.query<PupilWorkRow>(
    `SELECT p.id AS "pupilId", p.display_name AS "displayName",
            COALESCE(pl.level, 'core') AS level,
            COALESCE((SELECT count(*)::int FROM pupil_answers a
                      WHERE a.occurrence_course_id = $1 AND a.pupil_id = p.id AND a.value <> ''
                        AND a.field_key NOT LIKE 'task.%'), 0) AS filled,  -- text answers only, to match m (tick-boxes excluded)
            (SELECT to_char(max(a.updated_at) AT TIME ZONE 'Europe/London', 'HH24:MI') FROM pupil_answers a
             WHERE a.occurrence_course_id = $1 AND a.pupil_id = p.id) AS "lastSaved",
            EXISTS (SELECT 1 FROM pupil_done d WHERE d.occurrence_course_id = $1 AND d.pupil_id = p.id) AS done,
            COALESCE((SELECT count(*)::int FROM pupil_answers a
                      WHERE a.occurrence_course_id = $1 AND a.pupil_id = p.id AND NOT a.seen_by_teacher AND a.value <> ''), 0) AS unseen,
            (SELECT f.rating FROM pupil_lesson_feedback f WHERE f.occurrence_course_id = $1 AND f.pupil_id = p.id) AS rating
     FROM group_courses gc
     JOIN enrolments e ON e.group_id = gc.group_id AND e.active
     JOIN pupils p ON p.id = e.pupil_id
     LEFT JOIN pupil_levels pl ON pl.pupil_id = p.id AND pl.group_course_id = $2
     WHERE gc.id = $2
     ORDER BY p.display_name`,
    [occurrenceCourseId, groupCourseId],
  );
  return rows;
}

// ── pupil lesson feedback (8.5) ──────────────────────────────────────────────────────────────
export interface PupilFeedback {
  rating: number | null;
  liked: string;
  disliked: string;
  comment: string;
}

export async function getPupilFeedback(pupilId: number, occurrenceCourseId: number): Promise<PupilFeedback | null> {
  const { rows } = await pool.query<PupilFeedback>(
    `SELECT rating, liked, disliked, comment FROM pupil_lesson_feedback WHERE pupil_id = $1 AND occurrence_course_id = $2`,
    [pupilId, occurrenceCourseId],
  );
  return rows[0] ?? null;
}

export async function upsertPupilFeedback(args: {
  pupilId: number;
  occurrenceCourseId: number;
  rating: number | null;
  liked: string;
  disliked: string;
  comment: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO pupil_lesson_feedback (pupil_id, occurrence_course_id, rating, liked, disliked, comment, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, now())
     ON CONFLICT (pupil_id, occurrence_course_id)
     DO UPDATE SET rating = EXCLUDED.rating, liked = EXCLUDED.liked, disliked = EXCLUDED.disliked,
                   comment = EXCLUDED.comment, updated_at = now()`,
    [args.pupilId, args.occurrenceCourseId, args.rating, args.liked, args.disliked, args.comment],
  );
}

// ── 8.7: the class's answers + feedback, redaction-ready for the AI summary ────────────────────
export interface ClassAnswerAgg {
  fieldKey: string;
  answers: string[]; // pupil answers (names never appear — these are typed responses)
}

export async function classAnswers(occurrenceCourseId: number): Promise<ClassAnswerAgg[]> {
  const { rows } = await pool.query<{ fieldKey: string; answers: string[] }>(
    `SELECT field_key AS "fieldKey", array_agg(value ORDER BY id) AS answers
     FROM pupil_answers WHERE occurrence_course_id = $1 AND value <> ''
     GROUP BY field_key ORDER BY field_key`,
    [occurrenceCourseId],
  );
  return rows;
}

export interface ClassFeedbackAgg {
  ratings: number[];
  liked: string[];
  disliked: string[];
  comments: string[];
}

export async function classFeedback(occurrenceCourseId: number): Promise<ClassFeedbackAgg> {
  const { rows } = await pool.query<{ rating: number | null; liked: string; disliked: string; comment: string }>(
    `SELECT rating, liked, disliked, comment FROM pupil_lesson_feedback WHERE occurrence_course_id = $1`,
    [occurrenceCourseId],
  );
  const ratings: number[] = [];
  const liked: string[] = [];
  const disliked: string[] = [];
  const comments: string[] = [];
  for (const r of rows) {
    if (r.rating != null) ratings.push(r.rating);
    for (const c of r.liked.split(',').map((s) => s.trim()).filter(Boolean)) liked.push(c);
    for (const c of r.disliked.split(',').map((s) => s.trim()).filter(Boolean)) disliked.push(c);
    if (r.comment.trim()) comments.push(r.comment.trim());
  }
  return { ratings, liked, disliked, comments };
}
