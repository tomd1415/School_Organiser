// Phase 6.7: dated exceptions over the weekly pattern. Display-level for now — the clock and
// availability still follow the pattern (deeper integration is on the post-phase list).
import { pool } from '../db/pool';

export interface ExceptionRow {
  id: number;
  date: string;
  timetabledLessonId: number | null;
  kind: string;
  roomName: string | null;
  staffName: string | null;
  note: string | null;
}

const COLS = `e.id, to_char(e.date,'YYYY-MM-DD') AS date, e.timetabled_lesson_id AS "timetabledLessonId",
              e.kind, r.name AS "roomName", s.name AS "staffName", e.note`;
const JOINS = `FROM lesson_exceptions e
               LEFT JOIN rooms r ON r.id = e.room_id
               LEFT JOIN staff s ON s.id = e.staff_id`;

export async function listExceptionsBetween(from: string, to: string): Promise<ExceptionRow[]> {
  const { rows } = await pool.query<ExceptionRow>(
    `SELECT ${COLS} ${JOINS} WHERE e.date BETWEEN $1 AND $2 ORDER BY e.date, e.id`,
    [from, to],
  );
  return rows;
}

export async function listExceptionsFor(date: string, lessonId: number): Promise<ExceptionRow[]> {
  const { rows } = await pool.query<ExceptionRow>(
    `SELECT ${COLS} ${JOINS} WHERE e.date = $1 AND (e.timetabled_lesson_id = $2 OR e.timetabled_lesson_id IS NULL) ORDER BY e.id`,
    [date, lessonId],
  );
  return rows;
}

export async function addException(input: {
  date: string;
  timetabledLessonId: number | null;
  kind: string;
  roomId: number | null;
  staffId: number | null;
  note: string | null;
}): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO lesson_exceptions (date, timetabled_lesson_id, kind, room_id, staff_id, note)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [input.date, input.timetabledLessonId, input.kind, input.roomId, input.staffId, input.note],
  );
  return rows[0]!.id;
}

export async function deleteException(id: number): Promise<void> {
  await pool.query(`DELETE FROM lesson_exceptions WHERE id = $1`, [id]);
}
