// ATL (attitude to learning) scores: a 1–4 value per pupil per lesson (occurrence_course). Written from
// the marking modal or the live class grid (upsert), read one-at-a-time for the modal and whole-class
// for the grid. Score is bounded 1–4 by the DB CHECK; callers also validate before writing.
import { pool } from '../db/pool';

/** Set (or update) a pupil's ATL for one lesson. `score` must be 1–4. */
export async function setPupilAtl(pupilId: number, occurrenceCourseId: number, score: number): Promise<void> {
  await pool.query(
    `INSERT INTO pupil_atl (pupil_id, occurrence_course_id, score, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (pupil_id, occurrence_course_id)
       DO UPDATE SET score = EXCLUDED.score, updated_at = now()`,
    [pupilId, occurrenceCourseId, score],
  );
}

/** One pupil's ATL for a lesson, or null if not recorded. */
export async function getPupilAtl(pupilId: number, occurrenceCourseId: number): Promise<number | null> {
  const { rows } = await pool.query<{ score: number }>(
    `SELECT score FROM pupil_atl WHERE pupil_id = $1 AND occurrence_course_id = $2`,
    [pupilId, occurrenceCourseId],
  );
  return rows[0]?.score ?? null;
}

/** Every recorded ATL for a lesson's class: pupil_id → score. */
export async function getClassAtl(occurrenceCourseId: number): Promise<Map<number, number>> {
  const { rows } = await pool.query<{ pupilId: number; score: number }>(
    `SELECT pupil_id AS "pupilId", score FROM pupil_atl WHERE occurrence_course_id = $1`,
    [occurrenceCourseId],
  );
  return new Map(rows.map((r) => [r.pupilId, r.score]));
}
