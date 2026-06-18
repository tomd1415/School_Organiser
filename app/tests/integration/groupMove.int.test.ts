import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { moveEnrolment } from '../../src/repos/setup';

// Throwaway years/groups/pupil so the seeded live data is never touched.
let yearA = 0;
let yearB = 0;
let gA = 0; // class A in yearA
let gB = 0; // class B in yearA
let gOther = 0; // a class in a DIFFERENT year
let pupil = 0;
let enrolment = 0;

async function mkYear(name: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO academic_years (name, start_date, end_date, is_current)
     VALUES ($1, '2099-09-01', '2100-07-20', false) RETURNING id`,
    [name],
  );
  return rows[0]!.id;
}
async function mkGroup(yearId: number, name: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO groups (name, academic_year_id) VALUES ($1, $2) RETURNING id`,
    [name, yearId],
  );
  return rows[0]!.id;
}
async function activeGroups(): Promise<number[]> {
  const { rows } = await pool.query<{ group_id: number }>(
    `SELECT group_id FROM enrolments WHERE pupil_id = $1 AND active ORDER BY group_id`,
    [pupil],
  );
  return rows.map((r) => r.group_id);
}

describe('moveEnrolment (integration — needs the dev DB up)', () => {
  afterAll(async () => {
    if (pupil) await pool.query(`DELETE FROM enrolments WHERE pupil_id = $1`, [pupil]);
    for (const g of [gA, gB, gOther]) if (g) await pool.query(`DELETE FROM groups WHERE id = $1`, [g]);
    if (pupil) await pool.query(`DELETE FROM pupils WHERE id = $1`, [pupil]);
    for (const y of [yearA, yearB]) if (y) await pool.query(`DELETE FROM academic_years WHERE id = $1`, [y]);
    await pool.end();
  });

  it('moves a pupil from one class to another in the same year', async () => {
    yearA = await mkYear('TEST-move-yearA');
    yearB = await mkYear('TEST-move-yearB');
    gA = await mkGroup(yearA, 'MOVE-A');
    gB = await mkGroup(yearA, 'MOVE-B');
    gOther = await mkGroup(yearB, 'MOVE-OTHER');
    const pr = await pool.query<{ id: number }>(
      `INSERT INTO pupils (display_name, ai_token) VALUES ('Test Mover', 'PUPIL_TEST_MOVE') RETURNING id`,
    );
    pupil = pr.rows[0]!.id;
    const er = await pool.query<{ id: number }>(
      `INSERT INTO enrolments (pupil_id, group_id, active) VALUES ($1, $2, true) RETURNING id`,
      [pupil, gA],
    );
    enrolment = er.rows[0]!.id;

    expect(await moveEnrolment(enrolment, gB)).toBe(true);

    const src = await pool.query<{ active: boolean }>(`SELECT active FROM enrolments WHERE id = $1`, [enrolment]);
    expect(src.rows[0]!.active).toBe(false); // left class A
    expect(await activeGroups()).toEqual([gB]); // now active only in class B
  });

  it('refuses a same-group move, a cross-year target, and an unknown enrolment', async () => {
    const eB = await pool.query<{ id: number }>(
      `SELECT id FROM enrolments WHERE pupil_id = $1 AND group_id = $2`,
      [pupil, gB],
    );
    const enrolB = eB.rows[0]!.id;
    expect(await moveEnrolment(enrolB, gB)).toBe(false); // same group
    expect(await moveEnrolment(enrolB, gOther)).toBe(false); // group in another academic year
    expect(await moveEnrolment(999_999_999, gA)).toBe(false); // unknown enrolment
    expect(await activeGroups()).toEqual([gB]); // unchanged
  });
});
