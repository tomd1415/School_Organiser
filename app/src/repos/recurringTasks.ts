// SQL + the generator for recurring task definitions. The generator materialises
// due instances into `tasks` (idempotent via last_generated). Run on app boot +
// daily (see server.ts) and via `npm run generate-recurring`.
import { pool } from '../db/pool';
import { addDays } from '../lib/time';
import { LOADS, URGENCIES } from '../services/task';
import { END_OF_DAY, nextDueDate } from '../services/recurrence';
import { getClockContext } from './clock';
import { getGroupSlots } from './tasks';

export interface RecurringDef {
  id: number;
  title: string;
  detail: string | null;
  urgency: string;
  estimateMin: number | null;
  cognitiveLoad: string | null;
  groupId: number | null;
  courseId: number | null;
  pattern: string;
  leadDays: number;
  active: boolean;
  lastGenerated: string | null;
}

const PATTERN_RE = /^(weekly:[1-7]|every_weeks:\d+:[1-7]|monthly:\d{1,2}|per_lesson:\d+)$/;

const SELECT = `SELECT id, title, detail, urgency, estimate_min AS "estimateMin", cognitive_load AS "cognitiveLoad",
                       group_id AS "groupId", course_id AS "courseId", pattern, lead_days AS "leadDays", active,
                       to_char(last_generated, 'YYYY-MM-DD') AS "lastGenerated"
                FROM recurring_tasks`;

export async function createRecurring(): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO recurring_tasks (title, pattern) VALUES ('New recurring task', 'weekly:5') RETURNING id`,
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('failed to create recurring task');
  return id;
}

export async function getRecurring(id: number): Promise<RecurringDef | null> {
  const { rows } = await pool.query<RecurringDef>(`${SELECT} WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function listRecurring(): Promise<RecurringDef[]> {
  const { rows } = await pool.query<RecurringDef>(`${SELECT} ORDER BY active DESC, id`);
  return rows;
}

const COLUMN: Record<string, string> = {
  title: 'title',
  urgency: 'urgency',
  estimate_min: 'estimate_min',
  cognitive_load: 'cognitive_load',
  group_id: 'group_id',
  pattern: 'pattern',
  lead_days: 'lead_days',
};
const ENUMS: Record<string, readonly string[]> = { urgency: URGENCIES, cognitive_load: LOADS };

export async function updateRecurringField(id: number, field: string, value: string | null): Promise<boolean> {
  const column = COLUMN[field];
  if (!column) return false;
  if (field === 'title' && (value === null || value.trim() === '')) return false; // NOT NULL — keep existing (BUG-035)
  const allowed = ENUMS[field];
  if (allowed && value !== null && !allowed.includes(String(value))) return false;
  if (field === 'pattern' && (value === null || !PATTERN_RE.test(value))) return false;
  let v: string | number | null = value;
  if (value === '') v = null;
  if ((field === 'estimate_min' || field === 'lead_days' || field === 'group_id') && v !== null) {
    const n = Number(v);
    v = Number.isFinite(n) ? n : null;
  }
  await pool.query(`UPDATE recurring_tasks SET ${column} = $2 WHERE id = $1`, [id, v]);
  return true;
}

export async function setRecurringActive(id: number, active: boolean): Promise<void> {
  await pool.query(`UPDATE recurring_tasks SET active = $2 WHERE id = $1`, [id, active]);
}

export async function deleteRecurring(id: number): Promise<void> {
  await pool.query(`UPDATE tasks SET recurring_task_id = NULL WHERE recurring_task_id = $1`, [id]);
  await pool.query(`DELETE FROM recurring_tasks WHERE id = $1`, [id]);
}

function daysFromToday(dateIso: string, todayIso: string): number {
  return Math.round((new Date(`${dateIso}T00:00:00Z`).getTime() - new Date(`${todayIso}T00:00:00Z`).getTime()) / 86_400_000);
}

/** Materialise any due instances (today within lead time). Idempotent. Returns the count created. */
export async function generateDueInstances(today: string): Promise<number> {
  const defs = (await listRecurring()).filter((d) => d.active);
  if (defs.length === 0) return 0;
  const ctx = await getClockContext();
  const groupSlots = await getGroupSlots();
  const recurCtx = { groupSlots, terms: ctx.terms };

  let created = 0;
  const client = await pool.connect();
  try {
    for (const def of defs) {
      let after = def.lastGenerated ?? addDays(today, -1);
      // BUG-025: the cursor is (date, slot-minute). It starts at END_OF_DAY so the cursor day itself is
      // excluded (matching the date-based "next date after" semantics + skipping an already-swept day on
      // resume); within a run it advances to each due slot, so a class's same-day slots are walked.
      let afterStartMin = END_OF_DAY;
      for (let guard = 0; guard < 40; guard++) {
        const due = nextDueDate(def.pattern, after, afterStartMin, recurCtx);
        if (!due) break;
        if (daysFromToday(due.date, today) > def.leadDays) break; // not yet within lead time
        // BUG-026/025: one task per definition per due SLOT (date + start-minute) is a DB guarantee
        // (partial unique index on recurring_slot_key, migration 0050; the :startMin suffix added in
        // 0053). Insert + cursor bump go in ONE transaction; ON CONFLICT DO NOTHING makes a re-run (or a
        // crash before the cursor advanced) a harmless no-op. Count real inserts.
        const slotKey = `${def.id}:${due.date}:${due.startMin}`;
        await client.query('BEGIN');
        const ins = await client.query(
          `INSERT INTO tasks (title, detail, urgency, estimate_min, cognitive_load, group_id, course_id, source, recurring_task_id, recurring_slot_key, due_at, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'recurring', $8, $9,
                   ($10::date + make_interval(mins => $11)) AT TIME ZONE 'Europe/London', 'inbox')
           ON CONFLICT (recurring_slot_key) WHERE recurring_slot_key IS NOT NULL DO NOTHING`,
          [def.title, def.detail, def.urgency, def.estimateMin, def.cognitiveLoad, def.groupId, def.courseId, def.id, slotKey, due.date, due.startMin],
        );
        await client.query(`UPDATE recurring_tasks SET last_generated = $2::date WHERE id = $1`, [def.id, due.date]);
        await client.query('COMMIT');
        after = due.date;
        afterStartMin = due.startMin; // advance within the day so the next slot of a twice-taught day is next
        if (ins.rowCount) created++;
      }
    }
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  return created;
}
