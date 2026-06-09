// SQL for timers. One timer runs at a time (the partial unique index enforces it);
// starting a new one stops the running one first and accumulates its seconds onto
// the task. Interruptions are just stop + later start — totals add up.
import { pool } from '../db/pool';
import type { PoolClient } from 'pg';

export interface RunningTimer {
  id: number;
  taskId: number | null;
  taskTitle: string | null;
  startedAt: string; // UTC ISO
}

async function stopRunning(client: PoolClient): Promise<void> {
  const { rows } = await client.query<{ id: number; task_id: number | null; seconds: number }>(
    `UPDATE time_entries
     SET ended_at = now(), seconds = GREATEST(0, EXTRACT(EPOCH FROM (now() - started_at))::int)
     WHERE ended_at IS NULL
     RETURNING id, task_id, seconds`,
  );
  const stopped = rows[0];
  if (stopped && stopped.task_id != null) {
    await client.query(`UPDATE tasks SET actual_seconds = COALESCE(actual_seconds, 0) + $1 WHERE id = $2`, [
      stopped.seconds,
      stopped.task_id,
    ]);
  }
}

export async function startTaskTimer(taskId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await stopRunning(client);
    await client.query(`INSERT INTO time_entries (kind, task_id, started_at, source) VALUES ('task', $1, now(), 'timer')`, [taskId]);
    await client.query(
      `UPDATE tasks SET status = 'in_progress', updated_at = now() WHERE id = $1 AND status IN ('inbox','triaged','scheduled')`,
      [taskId],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function stopRunningTimer(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await stopRunning(client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getRunningTimer(): Promise<RunningTimer | null> {
  const { rows } = await pool.query<RunningTimer>(
    `SELECT te.id, te.task_id AS "taskId", t.title AS "taskTitle",
            to_char(te.started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "startedAt"
     FROM time_entries te
     LEFT JOIN tasks t ON t.id = te.task_id
     WHERE te.ended_at IS NULL`,
  );
  return rows[0] ?? null;
}
