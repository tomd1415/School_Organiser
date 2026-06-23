// SQL for dated lesson occurrences. Occurrences are created lazily — the first
// time a slot's detail is opened — and are idempotent on (timetabled_lesson, date).
import { pool, type Executor } from '../db/pool';
import { materialiseOccurrencePrep } from './prep';
import type { LastStop, NoteView, OccurrenceCourseRow, OccurrenceHeader } from '../services/occurrence';

// Security (additional review): a TA may only file feedback on an occurrence-course for a lesson they
// may see — their own (named) or one happening today. Mirrors taMayAccessResource's lesson scope.
export async function taMayAccessOccurrenceCourse(occurrenceCourseId: number, taStaffId: number): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM occurrence_courses oc
     JOIN lesson_occurrences lo ON lo.id = oc.occurrence_id
     JOIN timetabled_lessons tl ON tl.id = lo.timetabled_lesson_id
     WHERE oc.id = $1 AND (($2 > 0 AND tl.staff_id = $2) OR lo.date = CURRENT_DATE)
     LIMIT 1`,
    [occurrenceCourseId, taStaffId],
  );
  return rows.length > 0;
}

/** How many class-lessons the teacher has actually taught (recorded a stopping point or progress for)
 *  — the signal behind the earned "unlock advanced tools" nudge. */
export async function countTaughtLessons(): Promise<number> {
  // TEST-LAB-GUARD: a Test Lab run can set stopping_point/progress_step, so exclude is_test occurrences
  // from the "lessons taught" signal behind the advanced-tools nudge.
  const { rows } = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM occurrence_courses oc
     JOIN lesson_occurrences o ON o.id = oc.occurrence_id
     WHERE (oc.stopping_point IS NOT NULL OR oc.progress_step IS NOT NULL) AND NOT o.is_test`,
  );
  return rows[0]?.n ?? 0;
}

/** True if this occurrence-course belongs to a Test Lab (is_test) occurrence. */
export async function occurrenceCourseIsTest(occurrenceCourseId: number): Promise<boolean> {
  const { rows } = await pool.query<{ t: boolean }>(
    `SELECT o.is_test AS t FROM occurrence_courses oc
     JOIN lesson_occurrences o ON o.id = oc.occurrence_id
     WHERE oc.id = $1`,
    [occurrenceCourseId],
  );
  return rows[0]?.t === true;
}

/** Find-or-create the occurrence for a slot on a date, and materialise its courses. `isTest` selects the
 *  sandboxed Test Lab partition — real callers leave it false and always hit the real occurrence. */
export async function findOrCreateOccurrence(lessonId: number, date: string, isTest = false): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO lesson_occurrences (timetabled_lesson_id, date, is_test) VALUES ($1, $2, $3)
     ON CONFLICT (timetabled_lesson_id, date, is_test)
       DO UPDATE SET timetabled_lesson_id = EXCLUDED.timetabled_lesson_id
     RETURNING id`,
    [lessonId, date, isTest],
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('failed to find or create occurrence');

  // One occurrence_course per ACTIVE course in the slot (splits → several). Idempotent.
  // BUG-023: a deactivated group_course must not keep materialising new occurrences — already-created
  // (historic) ones are left untouched, but a slot opened after deactivation no longer revives it.
  await pool.query(
    `INSERT INTO occurrence_courses (occurrence_id, group_course_id)
     SELECT $1, tlc.group_course_id
     FROM timetabled_lesson_courses tlc
     JOIN group_courses gc ON gc.id = tlc.group_course_id
     WHERE tlc.timetabled_lesson_id = $2 AND gc.active
     ON CONFLICT (occurrence_id, group_course_id) DO NOTHING`,
    [id, lessonId],
  );
  await materialiseOccurrencePrep(id);
  return id;
}

/** Read-only: the occurrence id for a slot+date if it already exists (no write, no prep
 * materialisation, no row lock) — for hot read paths like the pupil surface. */
export async function findOccurrence(lessonId: number, date: string, isTest = false): Promise<number | null> {
  const { rows } = await pool.query<{ id: number }>(
    `SELECT id FROM lesson_occurrences WHERE timetabled_lesson_id = $1 AND date = $2 AND is_test = $3`,
    [lessonId, date, isTest],
  );
  return rows[0]?.id ?? null;
}

export async function getOccurrenceHeader(occurrenceId: number): Promise<OccurrenceHeader | null> {
  const { rows } = await pool.query<OccurrenceHeader>(
    `SELECT o.id AS "occurrenceId", tl.id AS "lessonId",
            to_char(o.date, 'YYYY-MM-DD') AS date, o.status,
            tl.purpose, p.label AS "periodLabel", p.lesson_index AS "lessonIndex",
            to_char(p.start_time, 'HH24:MI') AS start, to_char(p.end_time, 'HH24:MI') AS "end",
            g.name AS "groupName", s.is_self AS "isSelf", s.name AS "staffName", r.name AS "roomName"
     FROM lesson_occurrences o
     JOIN timetabled_lessons tl ON tl.id = o.timetabled_lesson_id
     JOIN period_definitions p  ON p.id  = tl.period_definition_id
     JOIN staff s               ON s.id  = tl.staff_id
     LEFT JOIN groups g         ON g.id  = tl.group_id
     LEFT JOIN rooms r          ON r.id  = tl.room_id
     WHERE o.id = $1`,
    [occurrenceId],
  );
  return rows[0] ?? null;
}

export async function getOccurrenceCourses(occurrenceId: number): Promise<OccurrenceCourseRow[]> {
  const { rows } = await pool.query<OccurrenceCourseRow>(
    `SELECT oc.id AS "occurrenceCourseId", oc.group_course_id AS "groupCourseId", gc.course_id AS "courseId",
            c.name AS "courseName", c.colour,
            oc.stopping_point AS "stoppingPoint", oc.progress_step AS "progressStep", oc.lesson_plan_id AS "lessonPlanId",
            lp.title AS "planTitle", lp.objectives AS "planObjectives", lp.outline AS "planOutline",
            lp.kit_needed AS "planKitNeeded"
     FROM occurrence_courses oc
     JOIN group_courses gc ON gc.id = oc.group_course_id
     JOIN courses c        ON c.id  = gc.course_id
     LEFT JOIN lesson_plans lp ON lp.id = oc.lesson_plan_id
     WHERE oc.occurrence_id = $1
     ORDER BY c.name`,
    [occurrenceId],
  );
  return rows;
}

export async function setOccurrenceCoursePlan(occurrenceCourseId: number, planId: number | null, db: Executor = pool): Promise<void> {
  await db.query(`UPDATE occurrence_courses SET lesson_plan_id = $2 WHERE id = $1`, [occurrenceCourseId, planId]);
}

/** The in-lesson marker: which step we're on, also written as the textual stopping point so the
 * existing "last time → resume" machinery picks it up unchanged. */
export async function setOccurrenceProgress(occurrenceCourseId: number, step: number, label: string): Promise<void> {
  await pool.query(`UPDATE occurrence_courses SET progress_step = $2, stopping_point = $3 WHERE id = $1`, [
    occurrenceCourseId,
    step,
    label.slice(0, 200),
  ]);
}

/** The most recent prior occurrence's stopping point, per course (for "last time"). */
export async function getLastStoppingPoints(lessonId: number, beforeDate: string): Promise<LastStop[]> {
  const { rows } = await pool.query<LastStop>(
    `SELECT DISTINCT ON (oc.group_course_id)
            oc.group_course_id AS "groupCourseId", oc.stopping_point AS "stoppingPoint",
            to_char(o.date, 'YYYY-MM-DD') AS date
     FROM lesson_occurrences o
     JOIN occurrence_courses oc ON oc.occurrence_id = o.id
     WHERE o.timetabled_lesson_id = $1 AND o.date < $2::date AND NOT o.is_test
       AND oc.stopping_point IS NOT NULL AND oc.stopping_point <> ''
     ORDER BY oc.group_course_id, o.date DESC`,
    [lessonId, beforeDate],
  );
  return rows;
}

export async function getOccurrenceNotes(occurrenceId: number): Promise<NoteView[]> {
  const { rows } = await pool.query<NoteView>(
    `SELECT id, body, stopping_point AS "stoppingPoint",
            to_char(created_at AT TIME ZONE 'Europe/London', 'HH24:MI') AS time,
            course_id AS "courseId", category, safeguarding
     FROM notes
     WHERE occurrence_id = $1
     ORDER BY created_at`,
    [occurrenceId],
  );
  return rows;
}
