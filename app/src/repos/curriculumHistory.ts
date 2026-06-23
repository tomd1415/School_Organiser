// What came before, for the AI to build on when authoring/updating schemes: the course's
// existing schemes (all versions — they persist across years) and what each class currently
// taking the course has ALREADY covered, walked back through its predecessor chain.
// Deliberately token-light: titles and counts, hard caps everywhere.
import { pool } from '../db/pool';

export interface PriorScheme {
  title: string;
  version: number;
  active: boolean;
  unitTitles: string[];
}

export interface ClassCoverage {
  groupName: string;
  yearGroup: string | null;
  coveredCount: number;
  recentCovered: string[]; // most recent taught lesson titles, capped
}

export interface CurriculumHistory {
  priorSchemes: PriorScheme[];
  classCoverage: ClassCoverage[];
}

export async function getCourseCurriculumHistory(courseId: number): Promise<CurriculumHistory> {
  const schemes = await pool.query<{ id: number; title: string; version: number; active: boolean }>(
    `SELECT id, title, version, active FROM schemes_of_work
     WHERE course_id = $1 ORDER BY active DESC, version DESC LIMIT 4`,
    [courseId],
  );
  const priorSchemes: PriorScheme[] = [];
  for (const s of schemes.rows) {
    const units = await pool.query<{ title: string }>(
      `SELECT title FROM units WHERE scheme_id = $1 ORDER BY display_order, id LIMIT 12`,
      [s.id],
    );
    priorSchemes.push({ title: s.title, version: s.version, active: s.active, unitTitles: units.rows.map((u) => u.title) });
  }

  // The classes taking this course in the current year, each with its whole-chain coverage.
  const groups = await pool.query<{ groupId: number; groupName: string; yearGroup: string | null }>(
    `SELECT g.id AS "groupId", g.name AS "groupName", g.year_group AS "yearGroup"
     FROM group_courses gc
     JOIN groups g ON g.id = gc.group_id
     WHERE gc.course_id = $1 AND gc.active AND g.active
       AND g.academic_year_id = (SELECT id FROM academic_years WHERE is_current)
     ORDER BY g.name LIMIT 8`,
    [courseId],
  );
  const classCoverage: ClassCoverage[] = [];
  for (const g of groups.rows) {
    const cov = await pool.query<{ title: string; n: number }>(
      `WITH RECURSIVE chain AS (
         SELECT id FROM groups WHERE id = $1
         UNION ALL
         SELECT p.id FROM groups p JOIN chain c ON (SELECT predecessor_group_id FROM groups WHERE id = c.id) = p.id
       ),
       covered AS (
         SELECT lp.title, o.date
         FROM occurrence_courses oc
         JOIN lesson_occurrences o ON o.id = oc.occurrence_id
         JOIN group_courses gc ON gc.id = oc.group_course_id
         JOIN lesson_plans lp ON lp.id = oc.lesson_plan_id
         WHERE gc.group_id IN (SELECT id FROM chain) AND gc.course_id = $2 AND o.date <= CURRENT_DATE AND NOT o.is_test /* TEST-LAB-GUARD */
       )
       SELECT title, (SELECT count(*)::int FROM covered) AS n
       FROM covered ORDER BY date DESC LIMIT 10`,
      [g.groupId, courseId],
    );
    classCoverage.push({
      groupName: g.groupName,
      yearGroup: g.yearGroup,
      coveredCount: cov.rows[0]?.n ?? 0,
      recentCovered: cov.rows.map((r) => r.title),
    });
  }
  return { priorSchemes, classCoverage };
}
