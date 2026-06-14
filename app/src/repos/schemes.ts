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

// Per-course cohort/pedagogy guidance the AI layer auto-prepends to every request (4.4.1).
export async function getCourseTeachingContext(courseId: number): Promise<string | null> {
  const { rows } = await pool.query<{ teaching_context: string | null }>(
    `SELECT teaching_context FROM courses WHERE id = $1`,
    [courseId],
  );
  return rows[0]?.teaching_context ?? null;
}

export async function setCourseTeachingContext(courseId: number, text: string): Promise<void> {
  await pool.query(`UPDATE courses SET teaching_context = $2 WHERE id = $1`, [courseId, text]);
}

export interface SchemeListRow {
  id: number;
  courseId: number;
  courseName: string;
  title: string;
  version: number;
  active: boolean;
  labels: string | null;
  units: number;
  plans: number;
}

// Every scheme across all courses, with counts — for the "all schemes" overview / management.
export async function listAllSchemes(): Promise<SchemeListRow[]> {
  const { rows } = await pool.query<SchemeListRow>(
    `SELECT s.id, s.course_id AS "courseId", c.name AS "courseName", s.title, s.version, s.active, s.labels,
            (SELECT count(*)::int FROM units u WHERE u.scheme_id = s.id) AS units,
            (SELECT count(*)::int FROM lesson_plans lp JOIN units u ON u.id = lp.unit_id WHERE u.scheme_id = s.id) AS plans
     FROM schemes_of_work s JOIN courses c ON c.id = s.course_id
     ORDER BY c.name, s.version`,
  );
  return rows;
}

export async function setSchemeLabels(id: number, labels: string): Promise<void> {
  const clean = labels.split(',').map((l) => l.trim()).filter(Boolean).join(', ');
  await pool.query(`UPDATE schemes_of_work SET labels = $2 WHERE id = $1`, [id, clean || null]);
}

// Delete a scheme and everything under it, handling the FKs: occurrence_courses.lesson_plan_id is
// NO ACTION (null it first); lesson_plans.unit_id is SET NULL on a unit delete (so delete the plans
// explicitly to avoid orphans); units cascade from the scheme; resource_links cascade from plans.
export async function deleteScheme(id: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE occurrence_courses SET lesson_plan_id = NULL
       WHERE lesson_plan_id IN (SELECT lp.id FROM lesson_plans lp JOIN units u ON u.id = lp.unit_id WHERE u.scheme_id = $1)`,
      [id],
    );
    await client.query(`DELETE FROM lesson_plans WHERE unit_id IN (SELECT id FROM units WHERE scheme_id = $1)`, [id]);
    await client.query(`DELETE FROM schemes_of_work WHERE id = $1`, [id]); // units cascade
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// Move a scheme to another course: repoint the scheme + its plans' course_id, and rename the title
// only if it still uses the old course's default pattern (so custom titles are preserved).
export async function moveSchemeToCourse(id: number, courseId: number): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const s = await client.query<{ title: string; oldCourse: string }>(
      `SELECT s.title, c.name AS "oldCourse" FROM schemes_of_work s JOIN courses c ON c.id = s.course_id WHERE s.id = $1`,
      [id],
    );
    const target = await client.query<{ name: string }>(`SELECT name FROM courses WHERE id = $1`, [courseId]);
    if (!s.rows[0] || !target.rows[0]) {
      await client.query('ROLLBACK');
      return false;
    }
    const wasDefault = s.rows[0].title === `${s.rows[0].oldCourse} — Scheme of Work`;
    const newTitle = wasDefault ? `${target.rows[0].name} — Scheme of Work` : s.rows[0].title;
    await client.query(`UPDATE schemes_of_work SET course_id = $2, title = $3 WHERE id = $1`, [id, courseId, newTitle]);
    await client.query(`UPDATE lesson_plans SET course_id = $2 WHERE unit_id IN (SELECT id FROM units WHERE scheme_id = $1)`, [id, courseId]);
    await client.query('COMMIT');
    return true;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

const SCHEME_COLS = `s.id, s.course_id AS "courseId", c.name AS "courseName", s.title, s.version, s.active, s.labels`;

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

export interface AuthoredUnit {
  title: string;
  lessons: string[];
}

// Create a whole scheme (scheme + units + lesson plans) atomically from an AI-authored skeleton.
// Returns the new scheme id, or null if the course is gone. All-or-nothing (one transaction).
export async function materialiseScheme(courseId: number, title: string, units: AuthoredUnit[]): Promise<number | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const course = await client.query<{ name: string }>(`SELECT name FROM courses WHERE id = $1`, [courseId]);
    if (!course.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    const s = await client.query<{ id: number }>(
      `INSERT INTO schemes_of_work (course_id, title) VALUES ($1, $2) RETURNING id`,
      [courseId, title || `${course.rows[0].name} — Scheme of Work`],
    );
    const schemeId = s.rows[0]!.id;
    let uOrder = 0;
    for (const u of units) {
      const ur = await client.query<{ id: number }>(
        `INSERT INTO units (scheme_id, title, display_order) VALUES ($1, $2, $3) RETURNING id`,
        [schemeId, u.title.slice(0, 200), uOrder++],
      );
      const unitId = ur.rows[0]!.id;
      let pOrder = 0;
      for (const lesson of u.lessons) {
        await client.query(
          `INSERT INTO lesson_plans (unit_id, course_id, title, display_order) VALUES ($1, $2, $3, $4)`,
          [unitId, courseId, lesson.slice(0, 200), pOrder++],
        );
      }
    }
    await client.query('COMMIT');
    return schemeId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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

// ── 10.27 File-based scheme sharing — export one scheme to JSON, import it into another instance.
// No pupil data, no cross-instance network: a colleague shares a file. Carries the full content
// (units + lessons with objectives + outline), not just titles.
export interface SchemeExport {
  version: 1;
  schemeTitle: string;
  courseName: string;
  units: Array<{ title: string; lessons: Array<{ title: string; objectives: string | null; outline: string | null }> }>;
}

export async function exportScheme(schemeId: number): Promise<SchemeExport | null> {
  const s = await pool.query<{ title: string; courseName: string }>(
    `SELECT s.title, c.name AS "courseName" FROM schemes_of_work s JOIN courses c ON c.id = s.course_id WHERE s.id = $1`,
    [schemeId],
  );
  if (!s.rows[0]) return null;
  const [units, plans] = await Promise.all([listUnits(schemeId), listPlansForScheme(schemeId)]);
  const plansByUnit = new Map<number, PlanRow[]>();
  for (const p of plans) {
    if (p.unitId == null) continue;
    const arr = plansByUnit.get(p.unitId);
    if (arr) arr.push(p);
    else plansByUnit.set(p.unitId, [p]);
  }
  return {
    version: 1,
    schemeTitle: s.rows[0].title,
    courseName: s.rows[0].courseName,
    units: units.map((u) => ({
      title: u.title,
      lessons: (plansByUnit.get(u.id) ?? [])
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((p) => ({ title: p.title, objectives: p.objectives, outline: p.outline })),
    })),
  };
}

/** Import a shared scheme into a course (creates scheme + units + plans with their content). */
export async function importScheme(courseId: number, data: SchemeExport): Promise<number | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const course = await client.query<{ name: string }>(`SELECT name FROM courses WHERE id = $1`, [courseId]);
    if (!course.rows[0]) { await client.query('ROLLBACK'); return null; }
    const s = await client.query<{ id: number }>(
      `INSERT INTO schemes_of_work (course_id, title) VALUES ($1, $2) RETURNING id`,
      [courseId, (data.schemeTitle || `${course.rows[0].name} — Scheme of Work`).slice(0, 200)],
    );
    const schemeId = s.rows[0]!.id;
    let uOrder = 0;
    for (const u of data.units ?? []) {
      const ur = await client.query<{ id: number }>(
        `INSERT INTO units (scheme_id, title, display_order) VALUES ($1, $2, $3) RETURNING id`,
        [schemeId, (u.title ?? 'Unit').slice(0, 200), uOrder++],
      );
      const unitId = ur.rows[0]!.id;
      let pOrder = 0;
      for (const lesson of u.lessons ?? []) {
        await client.query(
          `INSERT INTO lesson_plans (unit_id, course_id, title, objectives, outline, display_order) VALUES ($1, $2, $3, $4, $5, $6)`,
          [unitId, courseId, (lesson.title ?? 'Lesson').slice(0, 200), lesson.objectives ?? null, lesson.outline ?? null, pOrder++],
        );
      }
    }
    await client.query('COMMIT');
    return schemeId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// 5.3: append a converted unit (full lessons, objectives + outline) to an existing scheme,
// atomically. Returns the new unit id, or null if the scheme is gone.
export async function materialiseUnit(
  schemeId: number,
  title: string,
  lessons: Array<{ title: string; objectives: string; outline: string }>,
): Promise<number | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const s = await client.query<{ course_id: number }>(`SELECT course_id FROM schemes_of_work WHERE id = $1`, [schemeId]);
    if (!s.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    const courseId = s.rows[0].course_id;
    const u = await client.query<{ id: number }>(
      `INSERT INTO units (scheme_id, title, display_order)
       VALUES ($1, $2, COALESCE((SELECT max(display_order) + 1 FROM units WHERE scheme_id = $1), 0))
       RETURNING id`,
      [schemeId, title.slice(0, 200)],
    );
    const unitId = u.rows[0]!.id;
    let order = 0;
    for (const l of lessons) {
      await client.query(
        `INSERT INTO lesson_plans (unit_id, course_id, title, display_order, objectives, outline)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [unitId, courseId, l.title.slice(0, 200), order++, l.objectives, l.outline],
      );
    }
    await client.query('COMMIT');
    return unitId;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** A unit's lessons in teaching order — used to lay a unit into the calendar (5.4). */
export async function listPlansForUnit(unitId: number): Promise<Array<{ id: number; title: string }>> {
  const { rows } = await pool.query<{ id: number; title: string }>(
    `SELECT id, title FROM lesson_plans WHERE unit_id = $1 ORDER BY display_order, id`,
    [unitId],
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

export async function getPlanRow(id: number): Promise<PlanRow | null> {
  const { rows } = await pool.query<PlanRow>(
    `SELECT id, unit_id AS "unitId", title, objectives, outline,
            duration_min AS "durationMin", display_order AS "displayOrder"
     FROM lesson_plans WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export interface PlanContext {
  courseName: string;
  unitTitle: string;
  planTitle: string;
  siblingTitles: string[];
  teachingContext: string | null;
}

// Context for the AI draft-lesson feature: where this plan sits in the scheme + its siblings,
// plus the course's teaching-context (cohort/pedagogy guidance auto-applied to AI output).
export async function getPlanContext(id: number): Promise<PlanContext | null> {
  const { rows } = await pool.query<{ courseName: string; unitTitle: string; planTitle: string; teachingContext: string | null }>(
    `SELECT c.name AS "courseName", u.title AS "unitTitle", lp.title AS "planTitle",
            c.teaching_context AS "teachingContext"
     FROM lesson_plans lp
     JOIN units u ON u.id = lp.unit_id
     JOIN schemes_of_work s ON s.id = u.scheme_id
     JOIN courses c ON c.id = s.course_id
     WHERE lp.id = $1`,
    [id],
  );
  const head = rows[0];
  if (!head) return null;
  const sibs = await pool.query<{ title: string }>(
    `SELECT title FROM lesson_plans WHERE unit_id = (SELECT unit_id FROM lesson_plans WHERE id = $1)
     ORDER BY display_order, id`,
    [id],
  );
  return { ...head, siblingTitles: sibs.rows.map((r) => r.title) };
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
