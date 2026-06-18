// SQL for the day's slots (→ availability) and the work log (planned vs actual).
import { pool } from '../db/pool';
import { toMinutes } from '../lib/time';
import type { AvailSlot } from '../services/availability';

export async function getDaySlots(weekday: number): Promise<AvailSlot[]> {
  const { rows } = await pool.query<{ slotType: string; label: string; start: string; end: string; purpose: string | null; lessonId: number | null }>(
    `SELECT p.slot_type AS "slotType", p.label,
            to_char(p.start_time, 'HH24:MI') AS start, to_char(p.end_time, 'HH24:MI') AS "end",
            tl.purpose, tl.id AS "lessonId"
     FROM period_definitions p
     LEFT JOIN timetabled_lessons tl
       ON tl.period_definition_id = p.id AND tl.staff_id = (SELECT id FROM staff WHERE is_self)
     WHERE p.weekday = $1
       AND p.academic_year_id = (SELECT id FROM academic_years WHERE is_current)
     ORDER BY p.slot_order`,
    [weekday],
  );
  return rows.map((r) => ({
    slotType: r.slotType,
    label: r.label,
    startMin: toMinutes(r.start),
    endMin: toMinutes(r.end),
    purpose: r.purpose,
    lessonId: r.lessonId,
  }));
}

export async function getLeaveMinutes(): Promise<number> {
  const { rows } = await pool.query<{ value: string }>(`SELECT value FROM settings WHERE key = 'default_leave'`);
  return toMinutes(rows[0]?.value ?? '19:00');
}

export interface WorkBlockRow {
  id: number;
  plannedNote: string | null;
  actualNote: string | null;
  status: string;
}

export async function createWorkBlock(date: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(`INSERT INTO work_blocks (date) VALUES ($1::date) RETURNING id`, [date]);
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('failed to create work block');
  return id;
}

export async function getWorkBlock(id: number): Promise<WorkBlockRow | null> {
  const { rows } = await pool.query<WorkBlockRow>(
    `SELECT id, planned_note AS "plannedNote", actual_note AS "actualNote", status FROM work_blocks WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listWorkBlocks(date: string): Promise<WorkBlockRow[]> {
  const { rows } = await pool.query<WorkBlockRow>(
    `SELECT id, planned_note AS "plannedNote", actual_note AS "actualNote", status
     FROM work_blocks WHERE date = $1::date ORDER BY id`,
    [date],
  );
  return rows;
}

const COLUMN: Record<string, string> = { planned_note: 'planned_note', actual_note: 'actual_note' };

export async function updateWorkBlockField(id: number, field: string, value: string | null): Promise<boolean> {
  const column = COLUMN[field];
  if (!column) return false;
  await pool.query(`UPDATE work_blocks SET ${column} = $2 WHERE id = $1`, [id, value || null]);
  return true;
}

export async function setWorkBlockStatus(id: number, status: string): Promise<void> {
  await pool.query(`UPDATE work_blocks SET status = $2 WHERE id = $1`, [id, status]);
}

export async function deleteWorkBlock(id: number): Promise<void> {
  await pool.query(`DELETE FROM work_blocks WHERE id = $1`, [id]);
}
