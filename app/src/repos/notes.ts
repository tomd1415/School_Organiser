// SQL for notes, follow-ups and the per-course stopping point.
import { pool } from '../db/pool';
import type { FollowupItem } from '../lib/notesView';

export interface NewNoteInput {
  kind: string;
  occurrenceId?: number | null;
  courseId?: number | null;
  groupId?: number | null;
}

export async function createNote(input: NewNoteInput): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO notes (kind, body, occurrence_id, course_id, group_id)
     VALUES ($1, '', $2, $3, $4) RETURNING id`,
    [input.kind, input.occurrenceId ?? null, input.courseId ?? null, input.groupId ?? null],
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('failed to create note');
  return id;
}

export async function updateNoteBody(id: number, body: string): Promise<void> {
  await pool.query(`UPDATE notes SET body = $2, updated_at = now() WHERE id = $1`, [id, body]);
}

export async function deleteNote(id: number): Promise<void> {
  await pool.query(`DELETE FROM notes WHERE id = $1`, [id]);
}

export async function addFollowup(noteId: number, text: string): Promise<FollowupItem> {
  const { rows } = await pool.query<FollowupItem>(
    `INSERT INTO note_followups (note_id, text) VALUES ($1, $2) RETURNING id, text, done`,
    [noteId, text],
  );
  const row = rows[0];
  if (!row) throw new Error('failed to add follow-up');
  return row;
}

export async function toggleFollowup(id: number): Promise<FollowupItem | null> {
  const { rows } = await pool.query<FollowupItem>(
    `UPDATE note_followups SET done = NOT done WHERE id = $1 RETURNING id, text, done`,
    [id],
  );
  return rows[0] ?? null;
}

export async function setOccurrenceCourseStopping(occurrenceCourseId: number, stopping: string): Promise<void> {
  await pool.query(`UPDATE occurrence_courses SET stopping_point = $2 WHERE id = $1`, [
    occurrenceCourseId,
    stopping === '' ? null : stopping,
  ]);
}

export interface OccurrenceFollowup extends FollowupItem {
  noteId: number;
}

export async function getFollowupsForOccurrence(occurrenceId: number): Promise<OccurrenceFollowup[]> {
  const { rows } = await pool.query<OccurrenceFollowup>(
    `SELECT f.note_id AS "noteId", f.id, f.text, f.done
     FROM note_followups f
     JOIN notes n ON n.id = f.note_id
     WHERE n.occurrence_id = $1
     ORDER BY f.id`,
    [occurrenceId],
  );
  return rows;
}

export interface NoteListRow {
  id: number;
  body: string;
  date: string;
  courseName: string | null;
  groupName: string | null;
}

export async function listGeneralNotes(filter: { courseId?: number; groupId?: number }): Promise<NoteListRow[]> {
  const conds = [`n.kind = 'general'`];
  const params: unknown[] = [];
  if (filter.courseId) {
    params.push(filter.courseId);
    conds.push(`n.course_id = $${params.length}`);
  }
  if (filter.groupId) {
    params.push(filter.groupId);
    conds.push(`n.group_id = $${params.length}`);
  }
  const { rows } = await pool.query<NoteListRow>(
    `SELECT n.id, n.body,
            to_char(n.created_at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD') AS date,
            c.name AS "courseName", g.name AS "groupName"
     FROM notes n
     LEFT JOIN courses c ON c.id = n.course_id
     LEFT JOIN groups g  ON g.id = n.group_id
     WHERE ${conds.join(' AND ')}
     ORDER BY n.created_at DESC`,
    params,
  );
  return rows;
}
