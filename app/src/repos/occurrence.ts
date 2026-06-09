// SQL for dated lesson occurrences. Occurrences are created lazily — the first
// time a slot's detail is opened — and are idempotent on (timetabled_lesson, date).
import { pool } from '../db/pool';
import { materialiseOccurrencePrep } from './prep';
import type { LastStop, NoteView, OccurrenceCourseRow, OccurrenceHeader } from '../services/occurrence';

/** Find-or-create the occurrence for a slot on a date, and materialise its courses. */
export async function findOrCreateOccurrence(lessonId: number, date: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO lesson_occurrences (timetabled_lesson_id, date) VALUES ($1, $2)
     ON CONFLICT (timetabled_lesson_id, date)
       DO UPDATE SET timetabled_lesson_id = EXCLUDED.timetabled_lesson_id
     RETURNING id`,
    [lessonId, date],
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('failed to find or create occurrence');

  // One occurrence_course per course in the slot (splits → several). Idempotent.
  await pool.query(
    `INSERT INTO occurrence_courses (occurrence_id, group_course_id)
     SELECT $1, tlc.group_course_id
     FROM timetabled_lesson_courses tlc
     WHERE tlc.timetabled_lesson_id = $2
     ON CONFLICT (occurrence_id, group_course_id) DO NOTHING`,
    [id, lessonId],
  );
  await materialiseOccurrencePrep(id);
  return id;
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
    `SELECT oc.id AS "occurrenceCourseId", oc.group_course_id AS "groupCourseId",
            c.name AS "courseName", c.colour,
            oc.stopping_point AS "stoppingPoint", oc.lesson_plan_id AS "lessonPlanId"
     FROM occurrence_courses oc
     JOIN group_courses gc ON gc.id = oc.group_course_id
     JOIN courses c        ON c.id  = gc.course_id
     WHERE oc.occurrence_id = $1
     ORDER BY c.name`,
    [occurrenceId],
  );
  return rows;
}

/** The most recent prior occurrence's stopping point, per course (for "last time"). */
export async function getLastStoppingPoints(lessonId: number, beforeDate: string): Promise<LastStop[]> {
  const { rows } = await pool.query<LastStop>(
    `SELECT DISTINCT ON (oc.group_course_id)
            oc.group_course_id AS "groupCourseId", oc.stopping_point AS "stoppingPoint",
            to_char(o.date, 'YYYY-MM-DD') AS date
     FROM lesson_occurrences o
     JOIN occurrence_courses oc ON oc.occurrence_id = o.id
     WHERE o.timetabled_lesson_id = $1 AND o.date < $2::date
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
            course_id AS "courseId"
     FROM notes
     WHERE occurrence_id = $1
     ORDER BY created_at`,
    [occurrenceId],
  );
  return rows;
}
