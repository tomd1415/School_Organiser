// Phase 11 idea 9 — SQL for the official course-document library (extracted text only; the original
// file isn't retained in v1). Reference data; never pupil data.
import { pool } from '../db/pool';

export const DOC_ROLES = ['spec', 'examiners_report', 'past_paper', 'reference'] as const;
export type DocRole = (typeof DOC_ROLES)[number];
export function isDocRole(r: string): r is DocRole {
  return (DOC_ROLES as readonly string[]).includes(r);
}

export interface CourseDocRow {
  id: number;
  role: DocRole;
  title: string;
  charCount: number;
  content?: string;
}

export async function addCourseDoc(courseId: number, role: DocRole, title: string, content: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO course_documents (course_id, role, title, content, char_count) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [courseId, role, title.slice(0, 200), content, content.length],
  );
  return rows[0]!.id;
}

export async function listCourseDocs(courseId: number): Promise<CourseDocRow[]> {
  const { rows } = await pool.query<CourseDocRow>(
    `SELECT id, role, title, char_count AS "charCount" FROM course_documents WHERE course_id = $1 ORDER BY role, id`,
    [courseId],
  );
  return rows;
}

/** Docs with their extracted text — for the AI builder. */
export async function listCourseDocsWithContent(courseId: number): Promise<Required<CourseDocRow>[]> {
  const { rows } = await pool.query<Required<CourseDocRow>>(
    `SELECT id, role, title, char_count AS "charCount", content FROM course_documents WHERE course_id = $1 ORDER BY role, id`,
    [courseId],
  );
  return rows;
}

export async function getCourseDoc(id: number): Promise<Required<CourseDocRow> | null> {
  const { rows } = await pool.query<Required<CourseDocRow>>(
    `SELECT id, role, title, char_count AS "charCount", content FROM course_documents WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getCourseDocCourse(id: number): Promise<number | null> {
  const { rows } = await pool.query<{ courseId: number }>(`SELECT course_id AS "courseId" FROM course_documents WHERE id = $1`, [id]);
  return rows[0]?.courseId ?? null;
}

export async function updateCourseDocContent(id: number, content: string): Promise<void> {
  await pool.query(`UPDATE course_documents SET content = $2, char_count = $3 WHERE id = $1`, [id, content, content.length]);
}

export async function deleteCourseDoc(id: number): Promise<void> {
  await pool.query(`DELETE FROM course_documents WHERE id = $1`, [id]);
}
