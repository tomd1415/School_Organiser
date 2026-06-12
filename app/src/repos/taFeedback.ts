// TA feedback: written from the read-only TA view, shown to the teacher on the lesson page,
// and folded into the per-class history the AI uses to adapt the next lesson.
import { pool } from '../db/pool';

export interface TaFeedbackRow {
  id: number;
  pupilsText: string;
  lessonText: string;
  safeguarding: boolean;
  createdAt: string;
}

export async function addTaFeedback(input: {
  occurrenceCourseId: number;
  pupilsText: string;
  lessonText: string;
  safeguarding: boolean;
}): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO ta_feedback (occurrence_course_id, pupils_text, lesson_text, safeguarding)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [input.occurrenceCourseId, input.pupilsText.slice(0, 4000), input.lessonText.slice(0, 4000), input.safeguarding],
  );
  return rows[0]!.id;
}

export async function listTaFeedback(occurrenceCourseId: number): Promise<TaFeedbackRow[]> {
  const { rows } = await pool.query<TaFeedbackRow>(
    `SELECT id, pupils_text AS "pupilsText", lesson_text AS "lessonText", safeguarding,
            to_char(created_at, 'HH24:MI') AS "createdAt"
     FROM ta_feedback WHERE occurrence_course_id = $1 ORDER BY created_at`,
    [occurrenceCourseId],
  );
  return rows;
}
