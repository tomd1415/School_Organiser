// Wave 7.1 — data for the morning brief. Coverage-at-risk: per exam scheme, how much of the course's
// spec is covered (mirrors specPoints.schemeCoverage's EXISTS test). Empty until /coverage has spec
// points + a course exam_date, so the brief stays dormant until there's something to warn about.
import { pool } from '../db/pool';

export interface CoverageCourseRow {
  schemeId: number;
  courseName: string;
  examDate: string | null; // 'YYYY-MM-DD'
  covered: number;
  total: number;
}

export async function coverageAtRisk(): Promise<CoverageCourseRow[]> {
  const { rows } = await pool.query<CoverageCourseRow>(
    `SELECT s.id AS "schemeId", c.name AS "courseName", to_char(c.exam_date,'YYYY-MM-DD') AS "examDate",
            count(*)::int AS total,
            count(*) FILTER (WHERE EXISTS (
              SELECT 1 FROM lesson_plan_spec_points m
              JOIN lesson_plans lp ON lp.id = m.lesson_plan_id
              JOIN units u ON u.id = lp.unit_id
              WHERE m.spec_point_id = sp.id AND u.scheme_id = s.id))::int AS covered
       FROM schemes_of_work s
       JOIN courses c ON c.id = s.course_id
       JOIN course_spec_points sp ON sp.course_id = c.id AND sp.active
      WHERE c.exam_date IS NOT NULL
      GROUP BY s.id, c.name, c.exam_date
      ORDER BY c.exam_date`,
  );
  return rows;
}
