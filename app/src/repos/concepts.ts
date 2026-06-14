// Phase 11 idea 1.1 — SQL for the teaching-concepts library. Thin functions over pg, mirroring the
// kit/equipment repo. A concept is cohort/curriculum prose (e.g. "use the CPU-as-office analogy");
// never about an individual pupil. course_id NULL = applies to every course.
import { pool } from '../db/pool';

export interface ConceptRow {
  id: number;
  courseId: number | null;
  courseName: string | null;
  title: string;
  body: string | null;
  tags: string | null;
  active: boolean;
}

const COLS = `c.id, c.course_id AS "courseId", co.name AS "courseName", c.title, c.body, c.tags, c.active`;

export async function listConcepts(includeArchived = false): Promise<ConceptRow[]> {
  const { rows } = await pool.query<ConceptRow>(
    `SELECT ${COLS} FROM teaching_concepts c LEFT JOIN courses co ON co.id = c.course_id
     ${includeArchived ? '' : 'WHERE c.active'} ORDER BY (c.course_id IS NOT NULL), co.name, c.title, c.id`,
  );
  return rows;
}

/** Active concepts that apply to a lesson on this course: the course's own + the global (NULL) ones. */
export async function listActiveConceptsForCourse(courseId: number | null): Promise<ConceptRow[]> {
  const { rows } = await pool.query<ConceptRow>(
    `SELECT ${COLS} FROM teaching_concepts c LEFT JOIN courses co ON co.id = c.course_id
     WHERE c.active AND (c.course_id IS NULL${courseId == null ? '' : ' OR c.course_id = $1'})
     ORDER BY (c.course_id IS NOT NULL), c.title, c.id`,
    courseId == null ? [] : [courseId],
  );
  return rows;
}

export async function createConcept(title: string, courseId: number | null): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO teaching_concepts (title, course_id) VALUES ($1, $2) RETURNING id`,
    [title.slice(0, 300), courseId],
  );
  return rows[0]!.id;
}

const FIELDS: Record<string, string> = { title: 'title', body: 'body', tags: 'tags' };

/** Autosave one whitelisted field. Empty → NULL (except title, which must stay non-empty). */
export async function updateConceptField(id: number, field: string, value: string): Promise<boolean> {
  const col = FIELDS[field];
  if (!col) return false;
  const trimmed = value.trim();
  if (col === 'title' && trimmed === '') return false;
  const v: string | null = trimmed === '' ? null : trimmed.slice(0, 4000);
  await pool.query(`UPDATE teaching_concepts SET ${col} = $2, updated_at = now() WHERE id = $1`, [id, v]);
  return true;
}

export async function setConceptCourse(id: number, courseId: number | null): Promise<void> {
  await pool.query(`UPDATE teaching_concepts SET course_id = $2, updated_at = now() WHERE id = $1`, [id, courseId]);
}

export async function setConceptActive(id: number, active: boolean): Promise<void> {
  await pool.query(`UPDATE teaching_concepts SET active = $2, updated_at = now() WHERE id = $1`, [id, active]);
}
