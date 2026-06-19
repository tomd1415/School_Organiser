// Wave 6.1 — source data for the cover-pack generator: the class + the lesson's objectives/outline for
// an occurrence-course, so the AI can build self-contained cover work when the teacher is absent.
import { pool } from '../db/pool';

export interface CoverPackSource {
  date: string; // 'YYYY-MM-DD'
  className: string;
  yearGroup: string | null;
  planTitle: string | null;
  objectives: string | null;
  outline: string | null;
}

export async function coverPackSource(occurrenceCourseId: number): Promise<CoverPackSource | null> {
  const { rows } = await pool.query<CoverPackSource>(
    `SELECT to_char(o.date, 'YYYY-MM-DD') AS date, g.name AS "className", g.year_group AS "yearGroup",
            lp.title AS "planTitle", lp.objectives, lp.outline
       FROM occurrence_courses oc
       JOIN lesson_occurrences o ON o.id = oc.occurrence_id
       JOIN group_courses gc ON gc.id = oc.group_course_id
       JOIN groups g ON g.id = gc.group_id
       LEFT JOIN lesson_plans lp ON lp.id = oc.lesson_plan_id
      WHERE oc.id = $1`,
    [occurrenceCourseId],
  );
  return rows[0] ?? null;
}
