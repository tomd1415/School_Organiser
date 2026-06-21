// Club session records (migration 0060): a free-text note of what happened in a club on a date —
// "where everyone got up to" — so the teacher keeps continuity across weeks. Keyed by the club's
// timetabled slot + the date.
import { pool } from '../db/pool';

export interface ClubSession {
  date: string;
  record: string;
}

export async function getClubRecord(lessonId: number, date: string): Promise<string> {
  const { rows } = await pool.query<{ record: string }>(
    `SELECT record FROM club_sessions WHERE timetabled_lesson_id = $1 AND date = $2`,
    [lessonId, date],
  );
  return rows[0]?.record ?? '';
}

export async function setClubRecord(lessonId: number, date: string, record: string): Promise<void> {
  await pool.query(
    `INSERT INTO club_sessions (timetabled_lesson_id, date, record, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (timetabled_lesson_id, date) DO UPDATE SET record = EXCLUDED.record, updated_at = now()`,
    [lessonId, date, record],
  );
}

/** Past sessions for this club (most recent first, non-empty) — the running log of where things got to. */
export async function listClubHistory(lessonId: number, beforeDate: string, limit = 8): Promise<ClubSession[]> {
  const { rows } = await pool.query<ClubSession>(
    `SELECT to_char(date, 'YYYY-MM-DD') AS date, record FROM club_sessions
     WHERE timetabled_lesson_id = $1 AND date < $2 AND btrim(record) <> ''
     ORDER BY date DESC LIMIT $3`,
    [lessonId, beforeDate, limit],
  );
  return rows;
}
