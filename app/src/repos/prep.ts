// SQL for prep checklists: per-lesson (occurrence_prep, materialised from
// prep_templates) and the start/end-of-day day_checklist.
import { pool } from '../db/pool';
import { DAY_CHECKLIST_DEFAULTS } from '../services/prep';

export interface PrepItem {
  id: number;
  text: string;
  done: boolean;
}

/** Materialise the global prep templates into this occurrence's checklist (once). */
export async function materialiseOccurrencePrep(occurrenceId: number): Promise<void> {
  await pool.query(
    `INSERT INTO occurrence_prep (occurrence_id, text, source, template_id)
     SELECT $1, pt.text, 'template', pt.id
     FROM prep_templates pt
     WHERE pt.active AND pt.scope = 'global'
       AND NOT EXISTS (SELECT 1 FROM occurrence_prep op WHERE op.occurrence_id = $1)`,
    [occurrenceId],
  );
}

export async function listOccurrencePrep(occurrenceId: number): Promise<PrepItem[]> {
  const { rows } = await pool.query<PrepItem>(
    `SELECT id, text, done FROM occurrence_prep WHERE occurrence_id = $1 ORDER BY id`,
    [occurrenceId],
  );
  return rows;
}

export async function toggleOccurrencePrep(id: number): Promise<PrepItem | null> {
  const { rows } = await pool.query<PrepItem>(
    `UPDATE occurrence_prep SET done = NOT done WHERE id = $1 RETURNING id, text, done`,
    [id],
  );
  return rows[0] ?? null;
}

/** 10.20 — add a one-off "before the bell" item to a specific lesson, in the moment. */
export async function addOccurrencePrep(occurrenceId: number, text: string): Promise<PrepItem> {
  const { rows } = await pool.query<PrepItem>(
    `INSERT INTO occurrence_prep (occurrence_id, text, source) VALUES ($1, $2, 'manual') RETURNING id, text, done`,
    [occurrenceId, text],
  );
  return rows[0]!;
}

/** 10.20 — add a one-off start/end-of-day checklist item. */
export async function addDayChecklist(date: string, part: 'start' | 'end', text: string): Promise<PrepItem> {
  const { rows } = await pool.query<PrepItem>(
    `INSERT INTO day_checklist (date, part, text, display_order)
     VALUES ($1::date, $2, $3, COALESCE((SELECT max(display_order) + 1 FROM day_checklist WHERE date = $1::date AND part = $2), 100))
     RETURNING id, text, done`,
    [date, part, text],
  );
  return rows[0]!;
}

async function readDay(date: string, part: 'start' | 'end'): Promise<PrepItem[]> {
  const { rows } = await pool.query<PrepItem>(
    `SELECT id, text, done FROM day_checklist WHERE date = $1::date AND part = $2 ORDER BY display_order, id`,
    [date, part],
  );
  return rows;
}

/** The day's checklist, materialising the defaults the first time a date is opened. */
export async function getDayChecklist(date: string, part: 'start' | 'end'): Promise<PrepItem[]> {
  const existing = await readDay(date, part);
  if (existing.length > 0) return existing;
  // Two simultaneous first-loads for the same (date, part) could both see "empty" and both insert the
  // defaults (duplicate checklist). A transaction-scoped advisory lock serialises materialisation: the
  // loser waits, re-reads (now populated), and skips — without constraining teacher-added items.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`day_checklist:${date}:${part}`]);
    const again = (
      await client.query<PrepItem>(`SELECT id, text, done FROM day_checklist WHERE date = $1::date AND part = $2 ORDER BY display_order, id`, [date, part])
    ).rows;
    if (again.length === 0) {
      let order = 0;
      for (const text of DAY_CHECKLIST_DEFAULTS[part]) {
        await client.query(`INSERT INTO day_checklist (date, part, text, display_order) VALUES ($1::date, $2, $3, $4)`, [date, part, text, order++]);
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return readDay(date, part);
}

export async function toggleDayChecklist(id: number): Promise<PrepItem | null> {
  const { rows } = await pool.query<PrepItem>(
    `UPDATE day_checklist SET done = NOT done WHERE id = $1 RETURNING id, text, done`,
    [id],
  );
  return rows[0] ?? null;
}
