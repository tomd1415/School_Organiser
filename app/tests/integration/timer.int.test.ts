import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { createTask } from '../../src/repos/tasks';
import { getRunningTimer, startTaskTimer, stopRunningTimer } from '../../src/repos/timeEntries';

const created: number[] = [];

describe('timers (integration — needs the dev DB up)', () => {
  afterAll(async () => {
    await stopRunningTimer().catch(() => undefined);
    if (created.length) {
      await pool.query(`DELETE FROM time_entries WHERE task_id = ANY($1)`, [created]);
      await pool.query(`DELETE FROM tasks WHERE id = ANY($1)`, [created]);
    }
    await pool.end();
  });

  it('runs one timer at a time — starting another stops the first', async () => {
    const a = await createTask('Task A');
    const b = await createTask('Task B');
    created.push(a, b);

    await startTaskTimer(a);
    expect((await getRunningTimer())?.taskId).toBe(a);

    await startTaskTimer(b);
    expect((await getRunningTimer())?.taskId).toBe(b);

    const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM time_entries WHERE ended_at IS NULL`);
    expect(rows[0]?.n).toBe(1);
  });

  it('accumulates seconds onto the task and marks it in_progress', async () => {
    const c = await createTask('Task C');
    created.push(c);
    await startTaskTimer(c);
    await stopRunningTimer();
    const { rows } = await pool.query<{ actual_seconds: number | null; status: string }>(
      `SELECT actual_seconds, status FROM tasks WHERE id = $1`,
      [c],
    );
    expect(rows[0]?.actual_seconds).not.toBeNull();
    expect(rows[0]?.status).toBe('in_progress');
    expect(await getRunningTimer()).toBeNull();
  });
});
