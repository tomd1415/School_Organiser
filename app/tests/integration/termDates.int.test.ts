import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { createTerm } from '../../src/repos/setup';

// Term-date names recur within a year (INSET days, three half-terms). createTerm must allow the same
// name on different dates and reject only an EXACT duplicate — returning null, never throwing.
let yearId = 0;
const created: number[] = [];

describe('term dates allow recurring names (integration — needs the dev DB up)', () => {
  afterAll(async () => {
    if (created.length) await pool.query(`DELETE FROM term_dates WHERE id = ANY($1)`, [created]);
    if (yearId) await pool.query(`DELETE FROM academic_years WHERE id = $1`, [yearId]);
    await pool.end();
  });

  it('repeats a name on different dates, but blocks an exact duplicate (no throw)', async () => {
    const y = await pool.query<{ id: number }>(
      `INSERT INTO academic_years (name, start_date, end_date, is_current)
       VALUES ('TEST-terms', '2099-09-01', '2100-07-20', false) RETURNING id`,
    );
    yearId = y.rows[0]!.id;

    const a = await createTerm(yearId, 'INSET', '2099-09-02', '2099-09-02', 'inset');
    const b = await createTerm(yearId, 'INSET', '2100-01-05', '2100-01-05', 'inset'); // same name, different date
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(b).not.toBe(a);
    created.push(a!, b!);

    const dup = await createTerm(yearId, 'INSET', '2099-09-02', '2099-09-02', 'inset'); // exact duplicate
    expect(dup).toBeNull(); // blocked, but no error thrown
  });
});
