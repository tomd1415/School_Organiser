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

export async function createTask(title: string, detail?: string | null): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(`INSERT INTO tasks (title, detail) VALUES ($1, $2) RETURNING id`, [title, detail ?? null]);
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

/** Email-intake idempotency (#21): has this message already been imported? (keyed by Message-ID, or a
 *  content hash when absent) — so a re-seen message after a failed \Seen-set isn't imported twice. */
export async function emailAlreadyProcessed(dedupKey: string): Promise<boolean> {
  const { rows } = await pool.query<{ n: number }>(`SELECT 1 AS n FROM processed_emails WHERE dedup_key = $1 AND state = 'complete'`, [dedupKey]);
  return rows.length > 0;
}
export async function markEmailProcessed(dedupKey: string): Promise<void> {
  await pool.query(`INSERT INTO processed_emails (dedup_key, state) VALUES ($1, 'complete') ON CONFLICT (dedup_key) DO UPDATE SET state = 'complete', processed_at = now()`, [dedupKey]);
}

// How long a 'processing' claim is honoured before it's treated as a crashed attempt and may be reclaimed.
const EMAIL_CLAIM_STALE = '15 minutes';

/**
 * BUG-027: atomically CLAIM an email for processing. Returns true iff THIS caller won the claim — a fresh
 * key, or a STALE 'processing' claim (older than the window above, i.e. a crashed prior attempt) reclaimed.
 * A 'complete' key, or a fresh 'processing' claim held by a concurrent poll, returns false (skip). This is
 * the dedup that makes intake idempotent when the IMAP \Seen flag fails or two polls overlap.
 */
export async function claimEmail(dedupKey: string): Promise<boolean> {
  const { rows } = await pool.query(
    `INSERT INTO processed_emails (dedup_key, state, claimed_at) VALUES ($1, 'processing', now())
     ON CONFLICT (dedup_key) DO UPDATE SET state = 'processing', claimed_at = now()
       WHERE processed_emails.state = 'processing' AND processed_emails.claimed_at < now() - interval '${EMAIL_CLAIM_STALE}'
     RETURNING dedup_key`,
    [dedupKey],
  );
  return rows.length > 0;
}

/** Mark a claimed email fully processed — the dedup is now permanent. */
export async function completeEmail(dedupKey: string): Promise<void> {
  await pool.query(`UPDATE processed_emails SET state = 'complete', processed_at = now() WHERE dedup_key = $1`, [dedupKey]);
}

/** Release a claim whose processing FAILED, so the next poll retries promptly rather than waiting out the
 *  stale window. Only ever releases a still-'processing' row — never a completed one. */
export async function releaseEmail(dedupKey: string): Promise<void> {
  await pool.query(`DELETE FROM processed_emails WHERE dedup_key = $1 AND state = 'processing'`, [dedupKey]);
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
  // A NOT NULL title must never be nulled/emptied — refuse and keep the existing value (BUG-035).
  if (field === 'title' && (value === null || String(value).trim() === '')) return false;
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
  // D2: stamp interest_at when turning interest ON (so the Now profile can decay it), clear when OFF.
  // The CASE reads the OLD row value, so `NOT interest` is the NEW value after the flip.
  await pool.query(
    `UPDATE tasks SET interest = NOT interest,
            interest_at = CASE WHEN NOT interest THEN now() ELSE NULL END,
            updated_at = now() WHERE id = $1`,
    [id],
  );
}

// D1: tasks that have BOTH an estimate and recorded actual time — the raw material for calibration.
export interface EstimateSampleRow {
  title: string;
  estimateMin: number;
  actualSeconds: number;
  cognitiveLoad: string | null;
}
export async function estimateSamples(limit = 40): Promise<EstimateSampleRow[]> {
  const { rows } = await pool.query<EstimateSampleRow>(
    `SELECT title, estimate_min AS "estimateMin", actual_seconds AS "actualSeconds", cognitive_load AS "cognitiveLoad"
     FROM tasks
     WHERE estimate_min IS NOT NULL AND estimate_min > 0 AND actual_seconds IS NOT NULL AND actual_seconds > 0
     ORDER BY updated_at DESC LIMIT $1`,
    [limit],
  );
  return rows;
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
