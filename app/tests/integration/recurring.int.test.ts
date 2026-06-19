import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import {
  createRecurring,
  generateDueInstances,
  setRecurringActive,
  updateRecurringField,
} from '../../src/repos/recurringTasks';

const defs: number[] = [];

describe('recurring tasks (integration — needs the dev DB up)', () => {
  afterAll(async () => {
    if (defs.length) {
      await pool.query(`DELETE FROM tasks WHERE recurring_task_id = ANY($1)`, [defs]);
      await pool.query(`DELETE FROM recurring_tasks WHERE id = ANY($1)`, [defs]);
    }
    await pool.end();
  });

  it('validates the pattern and generates due instances (idempotently)', async () => {
    const id = await createRecurring();
    defs.push(id);
    expect(await updateRecurringField(id, 'pattern', 'nonsense')).toBe(false);
    await updateRecurringField(id, 'pattern', 'weekly:5');
    await updateRecurringField(id, 'lead_days', '14');
    await updateRecurringField(id, 'title', 'Weekly admin check');

    await generateDueInstances('2026-09-09');
    const first = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM tasks WHERE recurring_task_id = $1`, [id]);
    expect(first.rows[0]!.n).toBeGreaterThan(0);

    await generateDueInstances('2026-09-09'); // same day again
    const second = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM tasks WHERE recurring_task_id = $1`, [id]);
    expect(second.rows[0]!.n).toBe(first.rows[0]!.n); // no duplicates
  });

  it('the DB itself rejects a second occurrence for one definition + due date (BUG-026)', async () => {
    const id = await createRecurring();
    defs.push(id);
    const key = `${id}:2026-10-01`;
    await pool.query(
      `INSERT INTO tasks (title, source, recurring_task_id, recurring_slot_key, due_at, status)
       VALUES ('dup probe', 'recurring', $1, $2, now(), 'inbox')`,
      [id, key],
    );
    // The partial unique index (migration 0050) makes a duplicate impossible even if two concurrent
    // sweeps both slipped past the generator's old WHERE-NOT-EXISTS check.
    await expect(
      pool.query(
        `INSERT INTO tasks (title, source, recurring_task_id, recurring_slot_key, due_at, status)
         VALUES ('dup probe', 'recurring', $1, $2, now(), 'inbox')`,
        [id, key],
      ),
    ).rejects.toThrow(/duplicate key|unique/i);
  });

  it('does not generate for a paused definition', async () => {
    const id = await createRecurring();
    defs.push(id);
    await updateRecurringField(id, 'pattern', 'weekly:1');
    await setRecurringActive(id, false);
    await generateDueInstances('2026-09-09');
    const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM tasks WHERE recurring_task_id = $1`, [id]);
    expect(rows[0]!.n).toBe(0);
  });
});
