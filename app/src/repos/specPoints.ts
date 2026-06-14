// Phase 11 idea 10 (slice 1) — SQL for the spec-coverage backbone. course_spec_points = what a course
// must cover; lesson_plan_spec_points = which lessons cover which points; schemeCoverage = the
// deterministic "covered / not yet" map. Reference data only — no pupil identity.
import { pool } from '../db/pool';
import type { ParsedSpecPoint } from '../lib/specImport';

export interface SpecPointRow {
  id: number;
  code: string;
  title: string;
  active: boolean;
}

export interface CoverageRow {
  id: number;
  code: string;
  title: string;
  covered: boolean;
}

export interface SchemeLessonRow {
  id: number;
  title: string;
  unitTitle: string;
}

/** Upsert pasted points by (course_id, code); re-import refreshes titles/order and re-activates. */
export async function importSpecPoints(courseId: number, parsed: ParsedSpecPoint[]): Promise<number> {
  let order = 0;
  for (const p of parsed) {
    order += 1;
    await pool.query(
      `INSERT INTO course_spec_points (course_id, code, title, display_order, active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (course_id, code) DO UPDATE SET title = EXCLUDED.title, display_order = EXCLUDED.display_order, active = true`,
      [courseId, p.code, p.title, order],
    );
  }
  return parsed.length;
}

export async function listSpecPoints(courseId: number, includeArchived = false): Promise<SpecPointRow[]> {
  const { rows } = await pool.query<SpecPointRow>(
    `SELECT id, code, title, active FROM course_spec_points
     WHERE course_id = $1 ${includeArchived ? '' : 'AND active'} ORDER BY display_order, id`,
    [courseId],
  );
  return rows;
}

export async function setSpecPointActive(id: number, active: boolean): Promise<void> {
  await pool.query(`UPDATE course_spec_points SET active = $2 WHERE id = $1`, [id, active]);
}

export async function getPlanSpecPointIds(planId: number): Promise<number[]> {
  const { rows } = await pool.query<{ spec_point_id: number }>(
    `SELECT spec_point_id FROM lesson_plan_spec_points WHERE lesson_plan_id = $1`,
    [planId],
  );
  return rows.map((r) => r.spec_point_id);
}

/** Map / unmap one (lesson, spec point). The point must belong to the lesson's course. */
export async function setPlanSpecPoint(planId: number, pointId: number, on: boolean): Promise<void> {
  if (on) {
    await pool.query(
      `INSERT INTO lesson_plan_spec_points (lesson_plan_id, spec_point_id, source)
       SELECT $1, $2, 'teacher'
       WHERE EXISTS (
         SELECT 1 FROM lesson_plans lp JOIN course_spec_points sp ON sp.course_id = lp.course_id
         WHERE lp.id = $1 AND sp.id = $2)
       ON CONFLICT DO NOTHING`,
      [planId, pointId],
    );
  } else {
    await pool.query(`DELETE FROM lesson_plan_spec_points WHERE lesson_plan_id = $1 AND spec_point_id = $2`, [planId, pointId]);
  }
}

/** Every active spec point of the scheme's course, with whether ANY lesson in the scheme covers it. */
export async function schemeCoverage(schemeId: number): Promise<CoverageRow[]> {
  const { rows } = await pool.query<CoverageRow>(
    `SELECT sp.id, sp.code, sp.title,
            EXISTS (
              SELECT 1 FROM lesson_plan_spec_points m
              JOIN lesson_plans lp ON lp.id = m.lesson_plan_id
              JOIN units u ON u.id = lp.unit_id
              WHERE m.spec_point_id = sp.id AND u.scheme_id = $1
            ) AS covered
     FROM course_spec_points sp
     WHERE sp.active AND sp.course_id = (SELECT course_id FROM schemes_of_work WHERE id = $1)
     ORDER BY sp.display_order, sp.id`,
    [schemeId],
  );
  return rows;
}

export async function getPlanCourse(planId: number): Promise<number | null> {
  const { rows } = await pool.query<{ courseId: number }>(`SELECT course_id AS "courseId" FROM lesson_plans WHERE id = $1`, [planId]);
  return rows[0]?.courseId ?? null;
}

// idea 10 slice 2 — per-course exam date (revision-boundary anchor).
export async function getCourseExamDate(courseId: number): Promise<string | null> {
  const { rows } = await pool.query<{ d: string | null }>(`SELECT to_char(exam_date, 'YYYY-MM-DD') AS d FROM courses WHERE id = $1`, [courseId]);
  return rows[0]?.d ?? null;
}

export async function setCourseExamDate(courseId: number, iso: string | null): Promise<void> {
  await pool.query(`UPDATE courses SET exam_date = $2 WHERE id = $1`, [courseId, iso]);
}

// idea 10 slice 2 — the scheme's lessons with objectives, for the AI gap-filler to match points to.
export async function schemeLessonsDetailed(schemeId: number): Promise<Array<{ id: number; title: string; objectives: string | null }>> {
  const { rows } = await pool.query<{ id: number; title: string; objectives: string | null }>(
    `SELECT lp.id, lp.title, lp.objectives FROM lesson_plans lp JOIN units u ON u.id = lp.unit_id
     WHERE u.scheme_id = $1 ORDER BY u.display_order, lp.display_order, lp.id`,
    [schemeId],
  );
  return rows;
}

export async function schemeLessons(schemeId: number): Promise<SchemeLessonRow[]> {
  const { rows } = await pool.query<SchemeLessonRow>(
    `SELECT lp.id, lp.title, u.title AS "unitTitle"
     FROM lesson_plans lp JOIN units u ON u.id = lp.unit_id
     WHERE u.scheme_id = $1 ORDER BY u.display_order, lp.display_order, lp.id`,
    [schemeId],
  );
  return rows;
}
