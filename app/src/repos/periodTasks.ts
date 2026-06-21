// Free-period task assignments (migration 0059): which Tasks the teacher has earmarked to do during a
// specific free period. The period is the (date, timetabled_lesson) pair — free periods have no
// occurrence — and the tasks are the real rows from the Tasks list, so there is one source of truth.
import { pool } from '../db/pool';
import type { TaskRow } from './tasks';

const TASK_COLS = `t.id, t.title, t.detail, t.urgency, t.estimate_min AS "estimateMin",
                   t.cognitive_load AS "cognitiveLoad", t.group_id AS "groupId", t.context, t.status, t.interest`;

/** Tasks assigned to this free period (unfinished first, then newest-assigned). */
export async function listPeriodTasks(date: string, lessonId: number): Promise<TaskRow[]> {
  const { rows } = await pool.query<TaskRow>(
    `SELECT ${TASK_COLS} FROM period_tasks pt JOIN tasks t ON t.id = pt.task_id
     WHERE pt.date = $1 AND pt.timetabled_lesson_id = $2
     ORDER BY (t.status IN ('done', 'dropped')), pt.created_at`,
    [date, lessonId],
  );
  return rows;
}

export async function assignTaskToPeriod(date: string, lessonId: number, taskId: number): Promise<void> {
  await pool.query(
    `INSERT INTO period_tasks (date, timetabled_lesson_id, task_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [date, lessonId, taskId],
  );
}

export async function unassignTaskFromPeriod(date: string, lessonId: number, taskId: number): Promise<void> {
  await pool.query(
    `DELETE FROM period_tasks WHERE date = $1 AND timetabled_lesson_id = $2 AND task_id = $3`,
    [date, lessonId, taskId],
  );
}

/** Unfinished tasks NOT yet on this period — the pick-list for "add an existing task to this period". */
export async function listAssignableTasks(date: string, lessonId: number): Promise<TaskRow[]> {
  const { rows } = await pool.query<TaskRow>(
    `SELECT ${TASK_COLS} FROM tasks t
     WHERE t.status NOT IN ('done', 'dropped')
       AND NOT EXISTS (
         SELECT 1 FROM period_tasks pt
         WHERE pt.task_id = t.id AND pt.date = $1 AND pt.timetabled_lesson_id = $2)
     ORDER BY t.created_at DESC
     LIMIT 50`,
    [date, lessonId],
  );
  return rows;
}
