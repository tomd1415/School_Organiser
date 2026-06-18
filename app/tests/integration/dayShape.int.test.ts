import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { applyModelDay } from '../../src/repos/setup';

// Works in a throwaway, non-current year so the seeded live data is never touched.
const YEAR_NAME = 'TEST-modelday';
let yearId = 0;

type DayShape = Record<number, Array<{ label: string; start: string; slotType: string; teachable: boolean }>>;
async function shape(): Promise<DayShape> {
  const { rows } = await pool.query<{ weekday: number; label: string; start: string; slot_type: string; teachable: boolean }>(
    `SELECT weekday, label, to_char(start_time,'HH24:MI') AS start, slot_type, teachable
       FROM period_definitions WHERE academic_year_id = $1 ORDER BY weekday, slot_order`,
    [yearId],
  );
  const out: DayShape = {};
  for (const r of rows) (out[r.weekday] ??= []).push({ label: r.label, start: r.start, slotType: r.slot_type, teachable: r.teachable });
  return out;
}

describe('applyModelDay (integration — needs the dev DB up)', () => {
  afterAll(async () => {
    if (yearId) {
      await pool.query(
        `DELETE FROM timetabled_lessons WHERE period_definition_id IN
           (SELECT id FROM period_definitions WHERE academic_year_id = $1)`,
        [yearId],
      );
      await pool.query(`DELETE FROM period_definitions WHERE academic_year_id = $1`, [yearId]);
      await pool.query(`DELETE FROM academic_years WHERE id = $1`, [yearId]);
    }
    await pool.end();
  });

  it('stamps the model day onto every other weekday (times/labels only, no classes)', async () => {
    const y = await pool.query<{ id: number }>(
      `INSERT INTO academic_years (name, start_date, end_date, is_current)
       VALUES ($1, '2099-09-01', '2100-07-20', false) RETURNING id`,
      [YEAR_NAME],
    );
    yearId = y.rows[0]!.id;

    // Build Monday (weekday 1) as the model: a briefing, a lesson and a break.
    await pool.query(
      `INSERT INTO period_definitions
         (academic_year_id, weekday, slot_order, slot_type, label, lesson_index, start_time, end_time, teachable)
       VALUES
         ($1,1,1,'briefing','Briefing',NULL,'08:30','08:50',false),
         ($1,1,2,'lesson','Lesson 1',1,'09:00','10:00',true),
         ($1,1,3,'break','Break',NULL,'10:00','10:15',false)`,
      [yearId],
    );

    const res = await applyModelDay(yearId, 1);
    expect(res.modelPeriods).toBe(3);
    expect([...res.applied].sort()).toEqual([2, 3, 4, 5]);
    expect(res.blocked).toEqual([]);

    const byDay = await shape();
    for (const wd of [2, 3, 4, 5]) expect(byDay[wd]).toEqual(byDay[1]); // identical to Monday

    const { rows } = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM timetabled_lessons tl
         JOIN period_definitions p ON p.id = tl.period_definition_id WHERE p.academic_year_id = $1`,
      [yearId],
    );
    expect(rows[0]!.n).toBe(0); // never creates classes
  });

  it('is idempotent and protects a weekday that already has classes assigned', async () => {
    const staff = await pool.query<{ id: number }>(`SELECT id FROM staff ORDER BY id LIMIT 1`);
    const tue = await pool.query<{ id: number }>(
      `SELECT id FROM period_definitions WHERE academic_year_id = $1 AND weekday = 2 ORDER BY slot_order LIMIT 1`,
      [yearId],
    );
    await pool.query(
      `INSERT INTO timetabled_lessons (period_definition_id, purpose, group_id, staff_id) VALUES ($1,'free',NULL,$2)`,
      [tue.rows[0]!.id, staff.rows[0]!.id],
    );

    const res = await applyModelDay(yearId, 1);
    expect(res.blocked).toContain(2);
    expect(res.applied).not.toContain(2);
    expect([...res.applied].sort()).toEqual([3, 4, 5]);

    // the protected lesson survived the re-apply
    const { rows } = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM timetabled_lessons WHERE period_definition_id = $1`,
      [tue.rows[0]!.id],
    );
    expect(rows[0]!.n).toBe(1);
  });
});
