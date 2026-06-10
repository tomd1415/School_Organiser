// Phase 5.1: per-group adaptation of master lessons. The master lesson_plans row stays canonical;
// a group stores only its overrides. Resolution: a group's effective lesson = its adaptation where
// present, else the master. Every change is logged (lesson_adaptation_history).
import { pool } from '../db/pool';

export interface MasterContent {
  objectives: string | null;
  outline: string | null;
}

export interface EffectiveLesson {
  adapted: boolean;
  objectives: string | null;
  outline: string | null;
  adaptationNote: string | null;
  adaptationId: number | null;
}

export async function getAdaptation(
  groupCourseId: number,
  lessonPlanId: number,
): Promise<{ id: number; objectives: string | null; outline: string | null; adaptationNote: string | null } | null> {
  const { rows } = await pool.query<{ id: number; objectives: string | null; outline: string | null; adaptationNote: string | null }>(
    `SELECT id, objectives, outline, adaptation_note AS "adaptationNote"
     FROM lesson_adaptations WHERE group_course_id = $1 AND lesson_plan_id = $2`,
    [groupCourseId, lessonPlanId],
  );
  return rows[0] ?? null;
}

/** The group's effective lesson — its override where present, else the master (the resolution rule). */
export async function getEffectiveLesson(
  groupCourseId: number,
  lessonPlanId: number,
  master: MasterContent,
): Promise<EffectiveLesson> {
  const a = await getAdaptation(groupCourseId, lessonPlanId);
  if (!a) {
    return { adapted: false, objectives: master.objectives, outline: master.outline, adaptationNote: null, adaptationId: null };
  }
  return {
    adapted: true,
    objectives: a.objectives ?? master.objectives,
    outline: a.outline ?? master.outline,
    adaptationNote: a.adaptationNote,
    adaptationId: a.id,
  };
}

export interface AdaptationInput {
  groupCourseId: number;
  lessonPlanId: number;
  objectives: string | null;
  outline: string | null;
  adaptationNote: string | null;
  changeSummary: string;
  author?: 'teacher' | 'ai';
}

/** Create or update a group's adaptation, appending a history row. Never touches the master. */
export async function upsertAdaptation(input: AdaptationInput): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO lesson_adaptations (group_course_id, lesson_plan_id, objectives, outline, adaptation_note, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (group_course_id, lesson_plan_id)
       DO UPDATE SET objectives = EXCLUDED.objectives, outline = EXCLUDED.outline,
                     adaptation_note = EXCLUDED.adaptation_note, updated_at = now()
       RETURNING id`,
      [input.groupCourseId, input.lessonPlanId, input.objectives, input.outline, input.adaptationNote],
    );
    const id = rows[0]!.id;
    await client.query(
      `INSERT INTO lesson_adaptation_history (adaptation_id, objectives, outline, adaptation_note, change_summary, author)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, input.objectives, input.outline, input.adaptationNote, input.changeSummary, input.author ?? 'teacher'],
    );
    await client.query('COMMIT');
    return id;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export interface HistoryRow {
  id: number;
  changeSummary: string | null;
  author: string;
  createdAt: string;
}

export async function listAdaptationHistory(adaptationId: number): Promise<HistoryRow[]> {
  const { rows } = await pool.query<HistoryRow>(
    `SELECT id, change_summary AS "changeSummary", author, to_char(created_at, 'YYYY-MM-DD HH24:MI') AS "createdAt"
     FROM lesson_adaptation_history WHERE adaptation_id = $1 ORDER BY created_at DESC, id DESC`,
    [adaptationId],
  );
  return rows;
}

/** Reset a group's lesson to the master (deletes the override; history cascades away with it). */
export async function resetAdaptation(groupCourseId: number, lessonPlanId: number): Promise<void> {
  await pool.query(`DELETE FROM lesson_adaptations WHERE group_course_id = $1 AND lesson_plan_id = $2`, [groupCourseId, lessonPlanId]);
}
