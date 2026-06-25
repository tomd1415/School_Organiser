// SQL for notes, follow-ups and the per-course stopping point.
import { pool, type Executor } from '../db/pool';
import type { FollowupItem } from '../lib/notesView';

export interface NewNoteInput {
  kind: string;
  occurrenceId?: number | null;
  courseId?: number | null;
  groupId?: number | null;
  pupilId?: number | null; // 10.24: a running note about one pupil (per-pupil page)
}

// 10.10: an opaque optimistic-concurrency token = the note's updated_at, formatted identically on
// write and read so the client can echo back exactly what it last saw (microsecond precision).
const REV = `to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.US')`;

export async function createNote(input: NewNoteInput, db: Executor = pool): Promise<{ id: number; rev: string }> {
  const { rows } = await db.query<{ id: number; rev: string }>(
    `INSERT INTO notes (kind, body, occurrence_id, course_id, group_id, pupil_id)
     VALUES ($1, '', $2, $3, $4, $5) RETURNING id, ${REV} AS rev`,
    [input.kind, input.occurrenceId ?? null, input.courseId ?? null, input.groupId ?? null, input.pupilId ?? null],
  );
  const row = rows[0];
  if (!row) throw new Error('failed to create note');
  return row;
}

/** Autosave a note body. With `expectedRev`, refuses (ok:false) if the note changed elsewhere since
 *  the client loaded it — a stale tab can't silently clobber a newer edit. Returns the NEW rev on
 *  success so the client advances its token. Without `expectedRev`, the plain last-write-wins update
 *  (used by surfaces that haven't adopted the guard yet). */
export async function updateNoteBody(id: number, body: string, expectedRev?: string, db: Executor = pool): Promise<{ ok: boolean; rev: string | null }> {
  const guard = expectedRev != null ? ` AND ${REV} = $3` : '';
  const params = expectedRev != null ? [id, body, expectedRev] : [id, body];
  const { rows } = await db.query<{ rev: string }>(
    `UPDATE notes SET body = $2, updated_at = now() WHERE id = $1${guard} RETURNING ${REV} AS rev`,
    params,
  );
  return rows[0] ? { ok: true, rev: rows[0].rev } : { ok: false, rev: null };
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
  rev: string;
  courseName: string | null;
  groupName: string | null;
  pupilName: string | null;
  safeguarding: boolean;
}

// Which entity a general note links to (drives the knowledge-base kind badge + filter chips, SPEC §2).
export type NoteLink = 'course' | 'group' | 'pupil' | 'general';

export async function listGeneralNotes(filter: { courseId?: number; groupId?: number; q?: string; link?: NoteLink }): Promise<NoteListRow[]> {
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
  if (filter.q && filter.q.trim()) {
    params.push(`%${filter.q.trim()}%`);
    conds.push(`n.body ILIKE $${params.length}`);
  }
  // Filter by which entity the note links to (the knowledge-base kind chips). Exclusive by priority
  // pupil > group > course so each note has exactly one kind — matching the badge + the chip counts.
  if (filter.link === 'pupil') conds.push(`n.pupil_id IS NOT NULL`);
  else if (filter.link === 'group') conds.push(`n.group_id IS NOT NULL AND n.pupil_id IS NULL`);
  else if (filter.link === 'course') conds.push(`n.course_id IS NOT NULL AND n.group_id IS NULL AND n.pupil_id IS NULL`);
  else if (filter.link === 'general') conds.push(`n.course_id IS NULL AND n.group_id IS NULL AND n.pupil_id IS NULL`);
  const { rows } = await pool.query<NoteListRow>(
    `SELECT n.id, n.body, n.safeguarding,
            to_char(n.created_at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD') AS date,
            to_char(n.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.US') AS rev,
            c.name AS "courseName", g.name AS "groupName", p.display_name AS "pupilName"
     FROM notes n
     LEFT JOIN courses c ON c.id = n.course_id
     LEFT JOIN groups g  ON g.id = n.group_id
     LEFT JOIN pupils p  ON p.id = n.pupil_id
     WHERE ${conds.join(' AND ')}
     ORDER BY n.created_at DESC`,
    params,
  );
  return rows;
}
