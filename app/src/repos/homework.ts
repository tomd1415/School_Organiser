// Phase 16B — homework as data. Thin SQL: flag/clear a lesson's worksheet as homework, the pupil's
// outstanding list (behind the gate), and the teacher's not-yet-submitted chase. Occurrence scans carry
// NOT lo.is_test (Test-Lab guard); single-occurrence reads are by id.
import { pool } from '../db/pool';

/** Flag (or update) a lesson's worksheet as homework due at `dueAtIso`. */
export async function setHomework(occurrenceCourseId: number, dueAtIso: string): Promise<void> {
  await pool.query(
    `INSERT INTO homework (occurrence_course_id, due_at) VALUES ($1, $2)
     ON CONFLICT (occurrence_course_id) DO UPDATE SET due_at = EXCLUDED.due_at`,
    [occurrenceCourseId, dueAtIso],
  );
}

export async function clearHomework(occurrenceCourseId: number): Promise<void> {
  await pool.query(`DELETE FROM homework WHERE occurrence_course_id = $1`, [occurrenceCourseId]);
}

export async function getHomework(occurrenceCourseId: number): Promise<{ dueAt: string; released: boolean } | null> {
  const { rows } = await pool.query<{ due_at: string; released: boolean }>(
    `SELECT due_at, released FROM homework WHERE occurrence_course_id = $1`,
    [occurrenceCourseId],
  );
  return rows[0] ? { dueAt: rows[0].due_at, released: rows[0].released } : null;
}

export async function setHomeworkReleased(occurrenceCourseId: number, released: boolean): Promise<void> {
  await pool.query(`UPDATE homework SET released = $2 WHERE occurrence_course_id = $1`, [occurrenceCourseId, released]);
}

export interface PupilHomeworkRow {
  occurrenceCourseId: number;
  dueAt: string;
  lessonDate: string;
  course: string;
}

/** A pupil's OUTSTANDING homework — flagged, enrolled in the class, not yet submitted (no pupil_done row). */
export async function listPupilHomework(pupilId: number): Promise<PupilHomeworkRow[]> {
  const { rows } = await pool.query<PupilHomeworkRow>(
    `SELECT hw.occurrence_course_id AS "occurrenceCourseId", to_char(hw.due_at, 'YYYY-MM-DD') AS "dueAt",
            to_char(lo.date, 'YYYY-MM-DD') AS "lessonDate", co.name AS course
     FROM homework hw
     JOIN occurrence_courses oc ON oc.id = hw.occurrence_course_id
     JOIN lesson_occurrences  lo ON lo.id = oc.occurrence_id AND NOT lo.is_test
     JOIN group_courses gc ON gc.id = oc.group_course_id
     JOIN courses co       ON co.id = gc.course_id
     JOIN enrolments en    ON en.group_id = gc.group_id AND en.active AND en.pupil_id = $1
     WHERE NOT EXISTS (SELECT 1 FROM pupil_done d WHERE d.pupil_id = $1 AND d.occurrence_course_id = hw.occurrence_course_id)
     ORDER BY hw.due_at`,
    [pupilId],
  );
  return rows;
}

export interface OccurrenceOption {
  occurrenceCourseId: number;
  date: string;
  label: string;
  planTitle: string | null;
  isHomework: boolean;
}

/** Recent planned lessons (with a bound plan) the teacher can flag as homework — for the set-homework picker. */
export async function recentOccurrencesForHomework(limit = 40): Promise<OccurrenceOption[]> {
  const { rows } = await pool.query<OccurrenceOption>(
    `SELECT oc.id AS "occurrenceCourseId", to_char(lo.date, 'YYYY-MM-DD') AS date,
            g.name || ' · ' || co.name AS label, lp.title AS "planTitle",
            (hw.occurrence_course_id IS NOT NULL) AS "isHomework"
     FROM occurrence_courses oc
     JOIN lesson_occurrences lo ON lo.id = oc.occurrence_id AND NOT lo.is_test
     JOIN group_courses gc ON gc.id = oc.group_course_id
     JOIN groups  g  ON g.id = gc.group_id
     JOIN courses co ON co.id = gc.course_id
     LEFT JOIN lesson_plans lp ON lp.id = oc.lesson_plan_id
     LEFT JOIN homework hw ON hw.occurrence_course_id = oc.id
     WHERE oc.lesson_plan_id IS NOT NULL
     ORDER BY lo.date DESC
     LIMIT $1`,
    [limit],
  );
  return rows;
}

export interface HomeworkChaseRow {
  occurrenceCourseId: number;
  dueAt: string;
  lessonDate: string;
  className: string;
  notDone: number;
  total: number;
}

/** The teacher's chase list: each homework with how many enrolled pupils have NOT yet submitted it. */
export async function listHomeworkChase(): Promise<HomeworkChaseRow[]> {
  const { rows } = await pool.query<HomeworkChaseRow>(
    `SELECT hw.occurrence_course_id AS "occurrenceCourseId", to_char(hw.due_at, 'YYYY-MM-DD') AS "dueAt",
            to_char(lo.date, 'YYYY-MM-DD') AS "lessonDate", g.name || ' · ' || co.name AS "className",
            count(p.id) FILTER (WHERE d.pupil_id IS NULL)::int AS "notDone",
            count(p.id)::int AS total
     FROM homework hw
     JOIN occurrence_courses oc ON oc.id = hw.occurrence_course_id
     JOIN lesson_occurrences  lo ON lo.id = oc.occurrence_id AND NOT lo.is_test
     JOIN group_courses gc ON gc.id = oc.group_course_id
     JOIN groups  g  ON g.id = gc.group_id
     JOIN courses co ON co.id = gc.course_id
     JOIN enrolments en ON en.group_id = gc.group_id AND en.active
     JOIN pupils p ON p.id = en.pupil_id
     LEFT JOIN pupil_done d ON d.pupil_id = p.id AND d.occurrence_course_id = hw.occurrence_course_id
     GROUP BY hw.occurrence_course_id, hw.due_at, lo.date, g.name, co.name
     ORDER BY hw.due_at`,
  );
  return rows;
}
