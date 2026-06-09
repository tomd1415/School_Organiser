import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import {
  createCaptured,
  getCaptured,
  listCaptured,
  promoteCapturedToTask,
  toggleCapturedFlag,
  updateCapturedField,
} from '../../src/repos/captured';

const notes: number[] = [];
const tasks: number[] = [];

describe('captured (integration — needs the dev DB up)', () => {
  afterAll(async () => {
    if (tasks.length) {
      await pool.query(`UPDATE notes SET task_id = NULL WHERE task_id = ANY($1)`, [tasks]);
      await pool.query(`DELETE FROM tasks WHERE id = ANY($1)`, [tasks]);
    }
    if (notes.length) await pool.query(`DELETE FROM notes WHERE id = ANY($1)`, [notes]);
    await pool.end();
  });

  it('creates, categorises, dates and flags a captured item', async () => {
    const id = await createCaptured('D12 projector replaced over half term');
    notes.push(id);
    await updateCapturedField(id, 'category', 'logistics');
    await updateCapturedField(id, 'surface_on', '2026-10-26');
    const item = await getCaptured(id);
    expect(item?.category).toBe('logistics');
    expect(item?.surfaceOn).toBe('2026-10-26');
    expect((await toggleCapturedFlag(id, 'safeguarding'))?.safeguarding).toBe(true);
    expect(await updateCapturedField(id, 'category', 'nonsense')).toBe(false);
  });

  it('promotes a captured item to a task and archives it', async () => {
    const id = await createCaptured('SENCo wants a catch-up re EHCPs');
    notes.push(id);
    const taskId = await promoteCapturedToTask(id);
    expect(taskId).not.toBeNull();
    if (taskId) tasks.push(taskId);
    expect((await getCaptured(id))?.archived).toBe(true);
    expect((await listCaptured()).some((i) => i.id === id)).toBe(false);
  });
});
