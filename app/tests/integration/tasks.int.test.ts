import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import {
  createTask,
  createTaskFromEmail,
  getGroupSlots,
  listBellTasks,
  listTasks,
  setTaskStatus,
  updateTaskField,
} from '../../src/repos/tasks';
import { parseEmail } from '../../src/services/emailIntake';

const created: number[] = [];

describe('tasks (integration — needs the dev DB up)', () => {
  afterAll(async () => {
    if (created.length) {
      await pool.query(`UPDATE tasks SET email_intake_id = NULL WHERE id = ANY($1)`, [created]);
      await pool.query(`DELETE FROM email_intake WHERE created_task_id = ANY($1)`, [created]);
      await pool.query(`DELETE FROM tasks WHERE id = ANY($1)`, [created]);
    }
    await pool.end();
  });

  it('creates a task in the inbox and autosaves fields', async () => {
    const id = await createTask('Reply to parent re Y10 trip');
    created.push(id);
    expect((await listTasks('inbox')).some((t) => t.id === id)).toBe(true);
    await updateTaskField(id, 'urgency', 'urgent_today');
    await updateTaskField(id, 'estimate_min', 10);
    const t = (await listTasks('inbox')).find((x) => x.id === id);
    expect(t?.urgency).toBe('urgent_today');
    expect(t?.estimateMin).toBe(10);
  });

  it('rejects invalid enum values and unknown fields', async () => {
    const id = created[0]!;
    expect(await updateTaskField(id, 'urgency', 'nonsense')).toBe(false);
    expect(await updateTaskField(id, 'drop table students', 'x')).toBe(false);
  });

  it('moves through triage → done across the buckets', async () => {
    const id = created[0]!;
    await setTaskStatus(id, 'triaged');
    expect((await listTasks('inbox')).some((t) => t.id === id)).toBe(false);
    expect((await listTasks('open')).some((t) => t.id === id)).toBe(true);
    await setTaskStatus(id, 'done');
    expect((await listTasks('done')).some((t) => t.id === id)).toBe(true);
  });

  it('reads group slots and bell candidates', async () => {
    expect((await getGroupSlots()).size).toBeGreaterThan(0);
    const id = await createTask('Urgent thing');
    created.push(id);
    await updateTaskField(id, 'urgency', 'urgent_today');
    expect((await listBellTasks()).some((t) => t.id === id)).toBe(true);
  });

  it('creates a task from a pasted email, linked to its source', async () => {
    const raw = 'Subject: Parents evening slots\n\nPlease confirm.';
    const id = await createTaskFromEmail(parseEmail(raw), raw);
    created.push(id);
    const { rows } = await pool.query<{ source: string; email_intake_id: number | null }>(
      `SELECT source, email_intake_id FROM tasks WHERE id = $1`,
      [id],
    );
    expect(rows[0]?.source).toBe('email');
    expect(rows[0]?.email_intake_id).not.toBeNull();
  });
});
