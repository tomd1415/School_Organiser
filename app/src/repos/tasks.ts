// SQL for tasks. Thin functions over pg; the field whitelist keeps the dynamic
// UPDATE injection-safe and enum-checked.
import { pool } from '../db/pool';
import { toMinutes } from '../lib/time';
import { LOADS, URGENCIES, statusesFor, type BellTask, type GroupSlot, type TaskView } from '../services/task';

export interface TaskRow {
  id: number;
  title: string;
  detail?: string | null;
  urgency: string;
  estimateMin: number | null;
  cognitiveLoad: string | null;
  groupId: number | null;
  context: string | null;
  status: string;
  interest: boolean;
}

export interface GroupOpt {
  id: number;
  name: string;
}

export async function listGroups(): Promise<GroupOpt[]> {
  const { rows } = await pool.query<GroupOpt>(`SELECT id, name FROM groups WHERE active ORDER BY name`);
  return rows;
}

export async function createTask(title: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(`INSERT INTO tasks (title) VALUES ($1) RETURNING id`, [title]);
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('failed to create task');
  return id;
}

export interface ParsedEmailInput {
  title: string;
  detail: string;
  from: string | null;
  subject: string | null;
}

/** Store the pasted email and create a linked draft task (source='email'). */
export async function createTaskFromEmail(parsed: ParsedEmailInput, rawBody: string): Promise<number> {
  const intake = await pool.query<{ id: number }>(
    `INSERT INTO email_intake (from_addr, subject, body, received_at, processed) VALUES ($1, $2, $3, now(), true) RETURNING id`,
    [parsed.from, parsed.subject, rawBody],
  );
  const intakeId = intake.rows[0]?.id;
  if (intakeId === undefined) throw new Error('failed to store email');

  const task = await pool.query<{ id: number }>(
    `INSERT INTO tasks (title, detail, source, email_intake_id) VALUES ($1, $2, 'email', $3) RETURNING id`,
    [parsed.title, parsed.detail || null, intakeId],
  );
  const taskId = task.rows[0]?.id;
  if (taskId === undefined) throw new Error('failed to create task from email');

  await pool.query(`UPDATE email_intake SET created_task_id = $2 WHERE id = $1`, [intakeId, taskId]);
  return taskId;
}

/** Record an email in the intake log without a task (triage filed it elsewhere). */
export async function recordEmailIntake(parsed: { from: string | null; subject: string | null }, rawBody: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO email_intake (from_addr, subject, body, received_at, processed) VALUES ($1, $2, $3, now(), true) RETURNING id`,
    [parsed.from, parsed.subject, rawBody],
  );
  return rows[0]!.id;
}

/** Triage refinements on an email-created task. */
export async function setTaskTriage(taskId: number, urgency: string | null, groupId: number | null): Promise<void> {
  await pool.query(
    `UPDATE tasks SET urgency = COALESCE($2, urgency), group_id = COALESCE($3, group_id) WHERE id = $1`,
    [taskId, urgency, groupId],
  );
}

export async function listTasks(view: TaskView): Promise<TaskRow[]> {
  const { rows } = await pool.query<TaskRow>(
    `SELECT id, title, detail, urgency, estimate_min AS "estimateMin", cognitive_load AS "cognitiveLoad",
            group_id AS "groupId", context, status, interest
     FROM tasks
     WHERE status = ANY($1)
     ORDER BY array_position(ARRAY['urgent_today','by_next_lesson','this_week','someday'], urgency),
              created_at DESC`,
    [statusesFor(view)],
  );
  return rows;
}

// field → column, whitelisted (so the dynamic SET is injection-safe).
const COLUMN: Record<string, string> = {
  title: 'title',
  urgency: 'urgency',
  estimate_min: 'estimate_min',
  cognitive_load: 'cognitive_load',
  group_id: 'group_id',
  context: 'context',
};
const ENUMS: Record<string, readonly string[]> = { urgency: URGENCIES, cognitive_load: LOADS };

export async function updateTaskField(id: number, field: string, value: string | number | null): Promise<boolean> {
  const column = COLUMN[field];
  if (!column) return false;
  const allowed = ENUMS[field];
  if (allowed && value !== null && !allowed.includes(String(value))) return false;
  await pool.query(`UPDATE tasks SET ${column} = $2, updated_at = now() WHERE id = $1`, [id, value]);
  return true;
}

export async function setTaskStatus(id: number, status: string): Promise<void> {
  await pool.query(
    `UPDATE tasks
     SET status = $2,
         completed_at = CASE WHEN $2 = 'done' THEN now() ELSE NULL END,
         updated_at = now()
     WHERE id = $1`,
    [id, status],
  );
}

const TASK_ROW_COLS = `id, title, urgency, estimate_min AS "estimateMin", cognitive_load AS "cognitiveLoad",
                       group_id AS "groupId", context, status, interest`;

export async function getTaskRow(id: number): Promise<TaskRow | null> {
  const { rows } = await pool.query<TaskRow>(`SELECT ${TASK_ROW_COLS} FROM tasks WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function listInterestTasks(): Promise<TaskRow[]> {
  const { rows } = await pool.query<TaskRow>(
    `SELECT ${TASK_ROW_COLS} FROM tasks WHERE interest AND status NOT IN ('done','dropped') ORDER BY created_at DESC`,
  );
  return rows;
}

export async function toggleTaskInterest(id: number): Promise<void> {
  await pool.query(`UPDATE tasks SET interest = NOT interest, updated_at = now() WHERE id = $1`, [id]);
}

/** Map of group → the (weekday, slot, start) of each teaching lesson — for due_rule. */
export async function getGroupSlots(): Promise<Map<number, GroupSlot[]>> {
  const { rows } = await pool.query<{ groupId: number; weekday: number; slotOrder: number; start: string }>(
    `SELECT g.id AS "groupId", p.weekday, p.slot_order AS "slotOrder", to_char(p.start_time, 'HH24:MI') AS start
     FROM timetabled_lessons tl
     JOIN period_definitions p ON p.id = tl.period_definition_id
     JOIN staff s ON s.id = tl.staff_id AND s.is_self
     JOIN groups g ON g.id = tl.group_id
     WHERE tl.purpose = 'teaching'
       AND p.academic_year_id = (SELECT id FROM academic_years WHERE is_current)`,
  );
  const map = new Map<number, GroupSlot[]>();
  for (const r of rows) {
    const arr = map.get(r.groupId) ?? [];
    arr.push({ weekday: r.weekday, slotOrder: r.slotOrder, startMin: toMinutes(r.start) });
    map.set(r.groupId, arr);
  }
  return map;
}

// ── Focus (2.9) ──────────────────────────────────────────────────────────────

export interface FocusCandidate {
  id: number;
  title: string;
  urgency: string;
  estimateMin: number | null;
  cognitiveLoad: string | null;
  interest: boolean;
  dueAt: string | null;
  dueRule: string | null;
  groupId: number | null;
}

/** Top-level open tasks (no sub-steps) — the focus candidates. */
export async function listFocusCandidates(): Promise<FocusCandidate[]> {
  const { rows } = await pool.query<FocusCandidate>(
    `SELECT id, title, urgency, estimate_min AS "estimateMin", cognitive_load AS "cognitiveLoad", interest,
            to_char(due_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "dueAt",
            due_rule AS "dueRule", group_id AS "groupId"
     FROM tasks
     WHERE status NOT IN ('done', 'dropped') AND parent_task_id IS NULL`,
  );
  return rows;
}

export interface SubStep {
  id: number;
  title: string;
  done: boolean;
}

export async function listSubtasks(parentId: number): Promise<SubStep[]> {
  const { rows } = await pool.query<{ id: number; title: string; status: string }>(
    `SELECT id, title, status FROM tasks WHERE parent_task_id = $1 ORDER BY id`,
    [parentId],
  );
  return rows.map((r) => ({ id: r.id, title: r.title, done: r.status === 'done' }));
}

export async function createSubtask(parentId: number, title: string): Promise<SubStep> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO tasks (title, parent_task_id, status, urgency) VALUES ($1, $2, 'triaged', 'this_week') RETURNING id`,
    [title, parentId],
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('failed to create sub-step');
  return { id, title, done: false };
}

export async function toggleSubtaskDone(id: number): Promise<SubStep | null> {
  const { rows } = await pool.query<{ id: number; title: string; status: string }>(
    `UPDATE tasks
     SET status = CASE WHEN status = 'done' THEN 'triaged' ELSE 'done' END,
         completed_at = CASE WHEN status = 'done' THEN NULL ELSE now() END,
         updated_at = now()
     WHERE id = $1 AND parent_task_id IS NOT NULL
     RETURNING id, title, status`,
    [id],
  );
  const r = rows[0];
  return r ? { id: r.id, title: r.title, done: r.status === 'done' } : null;
}

/** Open tasks that might be due before the next bell (the Now screen filters them). */
export async function listBellTasks(): Promise<BellTask[]> {
  const { rows } = await pool.query<BellTask>(
    `SELECT id, title, urgency,
            to_char(due_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "dueAt",
            due_rule AS "dueRule", group_id AS "groupId"
     FROM tasks
     WHERE status NOT IN ('done', 'dropped')`,
  );
  return rows;
}
