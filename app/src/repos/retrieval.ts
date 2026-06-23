// Wave 7.3 — spaced retrieval. The dated taught-history per class (occurrence dates + their lesson
// plan objectives) is the source for a "recall what we did N weeks ago" recap. AI-free.
import { pool } from '../db/pool';

export interface PastLesson {
  date: string; // 'YYYY-MM-DD'
  title: string | null;
  objectives: string | null;
}

/** A class (group_course) + the occurrence date for an occurrence-course — resolves the lazy panel. */
export async function ocClassAndDate(occurrenceCourseId: number): Promise<{ groupCourseId: number; date: string } | null> {
  const { rows } = await pool.query<{ groupCourseId: number; date: string }>(
    `SELECT oc.group_course_id AS "groupCourseId", to_char(o.date, 'YYYY-MM-DD') AS date
       FROM occurrence_courses oc
       JOIN lesson_occurrences o ON o.id = oc.occurrence_id
      WHERE oc.id = $1`,
    [occurrenceCourseId],
  );
  return rows[0] ?? null;
}

/** What this class was taught before `beforeDate`, newest first (only lessons that carry objectives). */
export async function pastLessonsForClass(groupCourseId: number, beforeDate: string): Promise<PastLesson[]> {
  const { rows } = await pool.query<PastLesson>(
    `SELECT to_char(o.date, 'YYYY-MM-DD') AS date, lp.title, lp.objectives
       FROM lesson_occurrences o
       JOIN occurrence_courses oc ON oc.occurrence_id = o.id
       JOIN lesson_plans lp ON lp.id = oc.lesson_plan_id
      WHERE oc.group_course_id = $1 AND o.date < $2::date AND NOT o.is_test /* TEST-LAB-GUARD */
        AND coalesce(lp.objectives, '') <> ''
      ORDER BY o.date DESC`,
    [groupCourseId, beforeDate],
  );
  return rows;
}
