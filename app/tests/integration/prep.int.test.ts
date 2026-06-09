import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { findOrCreateOccurrence } from '../../src/repos/occurrence';
import { getDayChecklist, listOccurrencePrep, toggleDayChecklist, toggleOccurrencePrep } from '../../src/repos/prep';

const OCC_DATE = '2099-05-05';
const DAY_DATE = '2099-05-06';

describe('prep checklists (integration — needs the dev DB up)', () => {
  afterAll(async () => {
    await pool.query(`DELETE FROM lesson_occurrences WHERE date = $1`, [OCC_DATE]);
    await pool.query(`DELETE FROM day_checklist WHERE date = $1::date`, [DAY_DATE]);
    await pool.end();
  });

  it('materialises the global prep templates onto a new occurrence', async () => {
    const { rows } = await pool.query<{ id: number }>(
      `SELECT id FROM timetabled_lessons WHERE purpose = 'teaching' ORDER BY id LIMIT 1`,
    );
    const occ = await findOrCreateOccurrence(rows[0]!.id, OCC_DATE);
    const prep = await listOccurrencePrep(occ);
    expect(prep.length).toBeGreaterThan(0);
    expect(prep.some((p) => p.text.includes('Teams'))).toBe(true);
    expect((await toggleOccurrencePrep(prep[0]!.id))?.done).toBe(true);
  });

  it('materialises the day checklist once and toggles an item', async () => {
    const start = await getDayChecklist(DAY_DATE, 'start');
    expect(start.length).toBeGreaterThan(0);
    const again = await getDayChecklist(DAY_DATE, 'start'); // idempotent — no duplicates
    expect(again.length).toBe(start.length);
    expect((await toggleDayChecklist(start[0]!.id))?.done).toBe(true);
  });
});
