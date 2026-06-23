// Phase 10.24 — the per-pupil page data (Spec 5.7): a running notes thread, a marks-history summary,
// and a one-tap per-unit traffic-light. Teacher-only; none of this is ever sent to an AI as an
// individual (the cohort-only AI rule is unchanged).
import { pool } from '../db/pool';

export interface PupilNoteRow {
  id: number;
  body: string;
  rev: string;
  date: string;
}

/** This pupil's running notes (notes linked by pupil_id), newest first. */
export async function listPupilNotes(pupilId: number): Promise<PupilNoteRow[]> {
  const { rows } = await pool.query<PupilNoteRow>(
    `SELECT id, body,
            to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.US') AS rev,
            to_char(created_at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD') AS date
     FROM notes WHERE pupil_id = $1 AND kind = 'general' ORDER BY created_at DESC`,
    [pupilId],
  );
  return rows;
}

export interface MarkHistoryRow {
  date: string;
  course: string;
  awarded: number;
  total: number;
}

/** Confirmed marks per lesson for this pupil — their attainment trajectory, newest first. */
export async function pupilMarksHistory(pupilId: number, limit = 30): Promise<MarkHistoryRow[]> {
  const { rows } = await pool.query<MarkHistoryRow>(
    `SELECT to_char(o.date, 'YYYY-MM-DD') AS date, c.name AS course,
            sum(m.marks_awarded)::int AS awarded, sum(m.marks_total)::int AS total
     FROM pupil_marks m
     JOIN pupil_answers a ON a.id = m.pupil_answer_id
     JOIN occurrence_courses oc ON oc.id = a.occurrence_course_id
     JOIN lesson_occurrences o ON o.id = oc.occurrence_id
     JOIN group_courses gc ON gc.id = oc.group_course_id
     JOIN courses c ON c.id = gc.course_id
     WHERE a.pupil_id = $1 AND m.status = 'confirmed' AND NOT o.is_test /* TEST-LAB-GUARD */
     GROUP BY o.date, c.name, oc.id
     ORDER BY o.date DESC
     LIMIT $2`,
    [pupilId, limit],
  );
  return rows;
}

export type UnitSignal = 'behind' | 'on_track' | 'exceeding';
export interface PupilUnitRow {
  unitId: number;
  title: string;
  course: string;
  signal: UnitSignal | null;
}

/** The units of the pupil's enrolled courses' active schemes, with any set traffic-light. */
export async function pupilUnits(pupilId: number): Promise<PupilUnitRow[]> {
  const { rows } = await pool.query<PupilUnitRow>(
    `SELECT u.id AS "unitId", u.title, c.name AS course, sig.signal
     FROM enrolments e
     JOIN group_courses gc ON gc.group_id = e.group_id
     JOIN courses c ON c.id = gc.course_id
     JOIN schemes_of_work s ON s.course_id = c.id AND s.active
     JOIN units u ON u.scheme_id = s.id
     LEFT JOIN pupil_unit_signal sig ON sig.pupil_id = e.pupil_id AND sig.unit_id = u.id
     WHERE e.pupil_id = $1 AND e.active
     ORDER BY c.name, u.display_order, u.id`,
    [pupilId],
  );
  return rows;
}

export async function setUnitSignal(pupilId: number, unitId: number, signal: UnitSignal): Promise<void> {
  await pool.query(
    `INSERT INTO pupil_unit_signal (pupil_id, unit_id, signal, updated_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (pupil_id, unit_id) DO UPDATE SET signal = EXCLUDED.signal, updated_at = now()`,
    [pupilId, unitId, signal],
  );
}
