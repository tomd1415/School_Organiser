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
