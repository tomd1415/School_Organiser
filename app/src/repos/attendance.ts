// Phase 17 — per-pupil, per-lesson-instance attendance (present / absent / left-early / extended-leave).
// Keyed on the occurrence_course like pupil_answers / pupil_done. PRIVACY: leave_reason is pupil-specific
// and must NEVER be threaded into any AI context (per CLAUDE.md) — it lives only in this register.
import { pool } from '../db/pool';

export type AttendanceStatus = 'present' | 'absent' | 'left_early' | 'extended_leave';

export interface AttendanceRow {
  pupilId: number;
  status: AttendanceStatus;
  leftEarlyMinutes: number | null;
  leaveReason: string | null;
  expectedReturn: string | null; // YYYY-MM-DD
}

/** Current attendance marks for a lesson instance, keyed by pupil (no row ⇒ not yet marked). */
export async function getLessonAttendance(occurrenceCourseId: number): Promise<Map<number, AttendanceRow>> {
  const { rows } = await pool.query<AttendanceRow>(
    `SELECT pupil_id AS "pupilId", status, left_early_minutes AS "leftEarlyMinutes",
            leave_reason AS "leaveReason", to_char(expected_return, 'YYYY-MM-DD') AS "expectedReturn"
     FROM lesson_attendance WHERE occurrence_course_id = $1`,
    [occurrenceCourseId],
  );
  return new Map(rows.map((r) => [r.pupilId, r]));
}

/** One pupil's mark for a lesson instance (null when not yet marked). */
export async function getPupilAttendance(occurrenceCourseId: number, pupilId: number): Promise<AttendanceRow | null> {
  const { rows } = await pool.query<AttendanceRow>(
    `SELECT pupil_id AS "pupilId", status, left_early_minutes AS "leftEarlyMinutes",
            leave_reason AS "leaveReason", to_char(expected_return, 'YYYY-MM-DD') AS "expectedReturn"
     FROM lesson_attendance WHERE occurrence_course_id = $1 AND pupil_id = $2`,
    [occurrenceCourseId, pupilId],
  );
  return rows[0] ?? null;
}

export interface SetAttendanceInput {
  occurrenceCourseId: number;
  pupilId: number;
  status: AttendanceStatus;
  leftEarlyMinutes?: number | null;
  leaveReason?: string | null;
  expectedReturn?: string | null;
}

/** Upsert one pupil's mark. Fields not relevant to the chosen status are nulled, so re-marking
 * (e.g. extended-leave → present) never leaves stale minutes / reason / return date behind. */
export async function setAttendance(input: SetAttendanceInput): Promise<void> {
  const minutes = input.status === 'left_early' ? input.leftEarlyMinutes ?? null : null;
  const reason = input.status === 'left_early' || input.status === 'extended_leave' ? input.leaveReason ?? null : null;
  const ret = input.status === 'extended_leave' ? input.expectedReturn ?? null : null;
  await pool.query(
    `INSERT INTO lesson_attendance (occurrence_course_id, pupil_id, status, left_early_minutes, leave_reason, expected_return, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6, now())
     ON CONFLICT (occurrence_course_id, pupil_id)
     DO UPDATE SET status = EXCLUDED.status, left_early_minutes = EXCLUDED.left_early_minutes,
                   leave_reason = EXCLUDED.leave_reason, expected_return = EXCLUDED.expected_return, updated_at = now()`,
    [input.occurrenceCourseId, input.pupilId, input.status, minutes, reason, ret],
  );
}

/** Default-everyone-present: insert a 'present' row for every enrolled pupil who is NOT already marked
 * (an existing absence / leave is left untouched). Self-contained over the occurrence's roster. */
export async function markAllPresent(occurrenceCourseId: number): Promise<void> {
  await pool.query(
    `INSERT INTO lesson_attendance (occurrence_course_id, pupil_id, status)
     SELECT oc.id, p.id, 'present'
     FROM occurrence_courses oc
     JOIN group_courses gc ON gc.id = oc.group_course_id
     JOIN enrolments e ON e.group_id = gc.group_id AND e.active
     JOIN pupils p ON p.id = e.pupil_id
     WHERE oc.id = $1
     ON CONFLICT (occurrence_course_id, pupil_id) DO NOTHING`,
    [occurrenceCourseId],
  );
}

export async function clearAttendance(occurrenceCourseId: number, pupilId: number): Promise<void> {
  await pool.query(`DELETE FROM lesson_attendance WHERE occurrence_course_id = $1 AND pupil_id = $2`, [occurrenceCourseId, pupilId]);
}
