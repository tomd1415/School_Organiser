// SQL for captured info — notes with kind='captured'.
import { pool } from '../db/pool';
import { CAPTURED_CATEGORIES, type CapturedItem } from '../services/captured';

const SELECT = `SELECT n.id, n.body, n.category,
                       to_char(n.surface_on, 'YYYY-MM-DD') AS "surfaceOn",
                       n.group_id AS "groupId", g.name AS "groupName",
                       n.safeguarding, n.interest, n.archived
                FROM notes n LEFT JOIN groups g ON g.id = n.group_id`;

export async function createCaptured(body: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(`INSERT INTO notes (kind, body) VALUES ('captured', $1) RETURNING id`, [body]);
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('failed to create captured note');
  return id;
}

/** Email triage files awareness items here, fully categorised. */
export async function fileCaptured(input: { body: string; category: string | null; groupId: number | null; safeguarding: boolean }): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO notes (kind, body, category, group_id, safeguarding) VALUES ('captured', $1, $2, $3, $4) RETURNING id`,
    [input.body, input.category, input.groupId, input.safeguarding],
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('failed to file captured item');
  return id;
}

export async function getCaptured(id: number): Promise<CapturedItem | null> {
  const { rows } = await pool.query<CapturedItem>(`${SELECT} WHERE n.id = $1 AND n.kind = 'captured'`, [id]);
  return rows[0] ?? null;
}

export async function listCaptured(category?: string): Promise<CapturedItem[]> {
  const params: unknown[] = [];
  let cond = `n.kind = 'captured' AND NOT n.archived`;
  if (category) {
    params.push(category);
    cond += ` AND n.category = $${params.length}`;
  }
  const { rows } = await pool.query<CapturedItem>(`${SELECT} WHERE ${cond} ORDER BY n.created_at DESC`, params);
  return rows;
}

/** All non-archived captured items — the Now screen filters them by today/class. */
export async function listForResurfacing(): Promise<CapturedItem[]> {
  return listCaptured();
}

const COLUMN: Record<string, string> = { body: 'body', category: 'category', surface_on: 'surface_on', group_id: 'group_id' };
const ENUMS: Record<string, readonly string[]> = { category: CAPTURED_CATEGORIES };

export async function updateCapturedField(id: number, field: string, value: string | null): Promise<boolean> {
  const column = COLUMN[field];
  if (!column) return false;
  const allowed = ENUMS[field];
  if (allowed && value !== null && !allowed.includes(String(value))) return false;
  let v: string | number | null = value;
  if (value === '') v = null;
  if (field === 'group_id' && v !== null) {
    const n = Number(v);
    v = Number.isFinite(n) ? n : null;
  }
  await pool.query(`UPDATE notes SET ${column} = $2, updated_at = now() WHERE id = $1 AND kind = 'captured'`, [id, v]);
  return true;
}

const FLAGS = new Set(['safeguarding', 'interest', 'archived']);

export async function toggleCapturedFlag(id: number, flag: string): Promise<CapturedItem | null> {
  if (!FLAGS.has(flag)) return null;
  await pool.query(`UPDATE notes SET ${flag} = NOT ${flag}, updated_at = now() WHERE id = $1 AND kind = 'captured'`, [id]);
  return getCaptured(id);
}

/** Promote a captured item to a task, link it back, and archive the capture. */
export async function promoteCapturedToTask(id: number): Promise<number | null> {
  const item = await getCaptured(id);
  if (!item) return null;
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO tasks (title, source, group_id) VALUES ($1, 'note', $2) RETURNING id`,
    [item.body.slice(0, 200) || 'From a captured note', item.groupId],
  );
  const taskId = rows[0]?.id;
  if (taskId === undefined) throw new Error('failed to promote captured note');
  await pool.query(`UPDATE notes SET task_id = $2, archived = true WHERE id = $1`, [id, taskId]);
  return taskId;
}
