// SQL for events / deadlines.
import { pool } from '../db/pool';
import { EVENT_KINDS, type UpcomingEvent } from '../services/event';

export async function createEvent(): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO events (kind, title, date) VALUES ('other', 'New event', CURRENT_DATE) RETURNING id`,
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error('failed to create event');
  return id;
}

export async function listUpcoming(): Promise<UpcomingEvent[]> {
  const { rows } = await pool.query<UpcomingEvent>(
    `SELECT id, kind, title, to_char(date, 'YYYY-MM-DD') AS date,
            lead_days AS "leadDays", affects_availability AS "affectsAvailability", status
     FROM events
     WHERE status = 'upcoming'
     ORDER BY date NULLS LAST, id`,
  );
  return rows;
}

const COLUMN: Record<string, string> = {
  title: 'title',
  kind: 'kind',
  date: 'date',
  lead_days: 'lead_days',
  affects_availability: 'affects_availability',
};
const ENUMS: Record<string, readonly string[]> = { kind: EVENT_KINDS };
const BOOLS = new Set(['affects_availability']);

export async function updateEventField(id: number, field: string, value: string | number | null): Promise<boolean> {
  const column = COLUMN[field];
  if (!column) return false;
  const allowed = ENUMS[field];
  if (allowed && value !== null && !allowed.includes(String(value))) return false;
  let v: string | number | boolean | null = value;
  if (BOOLS.has(field)) v = value === 'true';
  if (field === 'lead_days' && v !== null) {
    const n = Number(v);
    v = Number.isFinite(n) ? n : null;
  }
  if (field === 'date' && v === '') v = null;
  await pool.query(`UPDATE events SET ${column} = $2 WHERE id = $1`, [id, v]);
  return true;
}

export async function setEventStatus(id: number, status: string): Promise<void> {
  await pool.query(`UPDATE events SET status = $2 WHERE id = $1`, [id, status]);
}

/** After-school commitments + one-offs that remove a work window (for AvailabilityService). */
export interface BlockingEvent {
  date: string;
  startMin: number | null;
  endMin: number | null;
}

export async function listAvailabilityEvents(date: string): Promise<BlockingEvent[]> {
  const { rows } = await pool.query<BlockingEvent>(
    `SELECT to_char(date, 'YYYY-MM-DD') AS date,
            CASE WHEN start_at IS NOT NULL THEN EXTRACT(hour FROM start_at AT TIME ZONE 'Europe/London') * 60
                 + EXTRACT(minute FROM start_at AT TIME ZONE 'Europe/London') END::int AS "startMin",
            CASE WHEN end_at IS NOT NULL THEN EXTRACT(hour FROM end_at AT TIME ZONE 'Europe/London') * 60
                 + EXTRACT(minute FROM end_at AT TIME ZONE 'Europe/London') END::int AS "endMin"
     FROM events
     WHERE status = 'upcoming' AND affects_availability AND date = $1::date`,
    [date],
  );
  return rows;
}
