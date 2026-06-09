import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { createSubtask, createTask, listFocusCandidates, listSubtasks, toggleSubtaskDone } from '../../src/repos/tasks';

const created: number[] = [];

describe('focus sub-steps (integration — needs the dev DB up)', () => {
  afterAll(async () => {
    if (created.length) {
      await pool.query(`DELETE FROM tasks WHERE parent_task_id = ANY($1)`, [created]);
      await pool.query(`DELETE FROM tasks WHERE id = ANY($1)`, [created]);
    }
    await pool.end();
  });

  it('top-level tasks are candidates; sub-steps are not', async () => {
    const parent = await createTask('Assign 9X worksheet to Teams');
    created.push(parent);
    expect((await listFocusCandidates()).some((c) => c.id === parent)).toBe(true);

    const sub = await createSubtask(parent, 'post to 9X Team, due Friday');
    expect((await listFocusCandidates()).some((c) => c.id === sub.id)).toBe(false);
    expect((await listSubtasks(parent)).map((s) => s.title)).toContain('post to 9X Team, due Friday');
  });

  it('toggles a sub-step done and back', async () => {
    const parent = created[0]!;
    const sub = await createSubtask(parent, 'tick the prep item');
    expect((await toggleSubtaskDone(sub.id))?.done).toBe(true);
    expect((await toggleSubtaskDone(sub.id))?.done).toBe(false);
  });
});
