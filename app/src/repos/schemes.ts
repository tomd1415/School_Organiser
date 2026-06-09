// SQL for schemes of work → units → lesson plans.
import { pool } from '../db/pool';
import type { PlanRow, SchemeHeader, UnitRow } from '../services/scheme';

export interface CourseOpt {
  id: number;
  name: string;
}

export async function listCourses(): Promise<CourseOpt[]> {
  const { rows } = await pool.query<CourseOpt>(`SELECT id, name FROM courses WHERE active ORDER BY name`);
  return rows;
}

const SCHEME_COLS = `s.id, s.course_id AS "courseId", c.name AS "courseName", s.title, s.version, s.active`;

export async function getScheme(id: number): Promise<SchemeHeader | null> {
  const { rows } = await pool.query<SchemeHeader>(
    `SELECT ${SCHEME_COLS} FROM schemes_of_work s JOIN courses c ON c.id = s.course_id WHERE s.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listSchemeVersions(courseId: number): Promise<SchemeHeader[]> {
  const { rows } = await pool.query<SchemeHeader>(
    `SELECT ${SCHEME_COLS} FROM schemes_of_work s JOIN courses c ON c.id = s.course_id
     WHERE s.course_id = $1 ORDER BY s.active DESC, s.version DESC`,
    [courseId],
  );
  return rows;
}

export async function getActiveScheme(courseId: number): Promise<SchemeHeader | null> {
  const { rows } = await pool.query<{ id: number }>(
    `SELECT id FROM schemes_of_work WHERE course_id = $1 AND active ORDER BY version DESC LIMIT 1`,
    [courseId],
  );
  return rows[0] ? getScheme(rows[0].id) : null;
}

export async function createScheme(courseId: number): Promise<number | null> {
  const course = await pool.query<{ name: string }>(`SELECT name FROM courses WHERE id = $1`, [courseId]);
  if (!course.rows[0]) return null;
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO schemes_of_work (course_id, title) VALUES ($1, $2) RETURNING id`,
    [courseId, `${course.rows[0].name} — Scheme of Work`],
  );
  return rows[0]?.id ?? null;
}

export async function listUnits(schemeId: number): Promise<UnitRow[]> {
  const { rows } = await pool.query<UnitRow>(
    `SELECT id, title, display_order AS "displayOrder" FROM units WHERE scheme_id = $1 ORDER BY display_order, id`,
    [schemeId],
  );
  return rows;
}

export async function listPlansForScheme(schemeId: number): Promise<PlanRow[]> {
  const { rows } = await pool.query<PlanRow>(
    `SELECT lp.id, lp.unit_id AS "unitId", lp.title, lp.objectives, lp.outline,
            lp.duration_min AS "durationMin", lp.display_order AS "displayOrder"
     FROM lesson_plans lp JOIN units u ON u.id = lp.unit_id
     WHERE u.scheme_id = $1`,
    [schemeId],
  );
  return rows;
}

export async function addUnit(schemeId: number, title: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO units (scheme_id, title, display_order)
     VALUES ($1, $2, COALESCE((SELECT max(display_order) + 1 FROM units WHERE scheme_id = $1), 0))
     RETURNING id`,
    [schemeId, title],
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('failed to add unit');
  return id;
}

export async function addPlan(unitId: number, title: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO lesson_plans (unit_id, course_id, title, display_order)
     SELECT $1, s.course_id, $2, COALESCE((SELECT max(display_order) + 1 FROM lesson_plans WHERE unit_id = $1), 0)
     FROM units u JOIN schemes_of_work s ON s.id = u.scheme_id WHERE u.id = $1
     RETURNING id`,
    [unitId, title],
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('failed to add plan (unknown unit?)');
  return id;
}

const UNIT_COLS: Record<string, string> = { title: 'title' };
const PLAN_COLS: Record<string, string> = { title: 'title', objectives: 'objectives', outline: 'outline', duration_min: 'duration_min' };

export async function updateUnitField(id: number, field: string, value: string | null): Promise<boolean> {
  const col = UNIT_COLS[field];
  if (!col) return false;
  await pool.query(`UPDATE units SET ${col} = $2 WHERE id = $1`, [id, value === '' ? null : value]);
  return true;
}

export async function updatePlanField(id: number, field: string, value: string | null): Promise<boolean> {
  const col = PLAN_COLS[field];
  if (!col) return false;
  let v: string | number | null = value === '' ? null : value;
  if (field === 'duration_min' && v !== null) {
    const n = Number(v);
    v = Number.isFinite(n) ? n : null;
  }
  await pool.query(`UPDATE lesson_plans SET ${col} = $2, updated_at = now() WHERE id = $1`, [id, v]);
  return true;
}

export async function deleteUnit(id: number): Promise<void> {
  await pool.query(`DELETE FROM lesson_plans WHERE unit_id = $1`, [id]);
  await pool.query(`DELETE FROM units WHERE id = $1`, [id]);
}

export async function deletePlan(id: number): Promise<void> {
  await pool.query(`DELETE FROM lesson_plans WHERE id = $1`, [id]);
}

async function swapOrder(table: 'units' | 'lesson_plans', siblingFilter: string, id: number, dir: 'up' | 'down'): Promise<void> {
  const cur = await pool.query<{ display_order: number; sib: number }>(
    `SELECT display_order, ${siblingFilter} AS sib FROM ${table} WHERE id = $1`,
    [id],
  );
  const row = cur.rows[0];
  if (!row) return;
  const op = dir === 'up' ? '<' : '>';
  const order = dir === 'up' ? 'DESC' : 'ASC';
  const neighbour = await pool.query<{ id: number; display_order: number }>(
    `SELECT id, display_order FROM ${table}
     WHERE ${siblingFilter} = $1 AND display_order ${op} $2 ORDER BY display_order ${order} LIMIT 1`,
    [row.sib, row.display_order],
  );
  const n = neighbour.rows[0];
  if (!n) return;
  await pool.query(`UPDATE ${table} SET display_order = $2 WHERE id = $1`, [id, n.display_order]);
  await pool.query(`UPDATE ${table} SET display_order = $2 WHERE id = $1`, [n.id, row.display_order]);
}

export async function listCoursePlans(courseId: number): Promise<Array<{ id: number; title: string }>> {
  const { rows } = await pool.query<{ id: number; title: string }>(
    `SELECT id, title FROM lesson_plans WHERE course_id = $1 AND active ORDER BY display_order, id`,
    [courseId],
  );
  return rows;
}

export async function getLessonPlan(
  id: number,
): Promise<{ id: number; title: string; objectives: string | null; outline: string | null } | null> {
  const { rows } = await pool.query<{ id: number; title: string; objectives: string | null; outline: string | null }>(
    `SELECT id, title, objectives, outline FROM lesson_plans WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function schemeIdForUnit(unitId: number): Promise<number | null> {
  const { rows } = await pool.query<{ scheme_id: number }>(`SELECT scheme_id FROM units WHERE id = $1`, [unitId]);
  return rows[0]?.scheme_id ?? null;
}

export async function schemeIdForPlan(planId: number): Promise<number | null> {
  const { rows } = await pool.query<{ scheme_id: number }>(
    `SELECT u.scheme_id FROM lesson_plans lp JOIN units u ON u.id = lp.unit_id WHERE lp.id = $1`,
    [planId],
  );
  return rows[0]?.scheme_id ?? null;
}

export async function moveUnit(id: number, dir: 'up' | 'down'): Promise<void> {
  await swapOrder('units', 'scheme_id', id, dir);
}

export async function movePlan(id: number, dir: 'up' | 'down'): Promise<void> {
  await swapOrder('lesson_plans', 'unit_id', id, dir);
}

/** Clone a scheme to a new, inactive version (redraft while the old one keeps teaching). */
export async function cloneSchemeNewVersion(schemeId: number): Promise<number | null> {
  const head = await getScheme(schemeId);
  if (!head) return null;
  const nextVersion = head.version + 1;
  const created = await pool.query<{ id: number }>(
    `INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, $2, $3, false) RETURNING id`,
    [head.courseId, head.title, nextVersion],
  );
  const newSchemeId = created.rows[0]?.id;
  if (newSchemeId === undefined) return null;

  const units = await listUnits(schemeId);
  for (const u of units) {
    const nu = await pool.query<{ id: number }>(
      `INSERT INTO units (scheme_id, title, display_order) VALUES ($1, $2, $3) RETURNING id`,
      [newSchemeId, u.title, u.displayOrder],
    );
    const newUnitId = nu.rows[0]?.id;
    if (newUnitId === undefined) continue;
    await pool.query(
      `INSERT INTO lesson_plans (unit_id, course_id, title, display_order, objectives, outline, duration_min)
       SELECT $1, course_id, title, display_order, objectives, outline, duration_min
       FROM lesson_plans WHERE unit_id = $2`,
      [newUnitId, u.id],
    );
  }
  return newSchemeId;
}
