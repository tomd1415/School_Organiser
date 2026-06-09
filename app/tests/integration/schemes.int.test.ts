import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import {
  addPlan,
  addUnit,
  cloneSchemeNewVersion,
  listPlansForScheme,
  listSchemeVersions,
  listUnits,
  materialiseScheme,
  movePlan,
  updatePlanField,
} from '../../src/repos/schemes';

let courseId = 0;
const schemes: number[] = [];

describe('schemes (integration — needs the dev DB up)', () => {
  beforeAll(async () => {
    const c = await pool.query<{ id: number }>(`SELECT id FROM courses ORDER BY id LIMIT 1`);
    courseId = c.rows[0]!.id;
    const s = await pool.query<{ id: number }>(
      `INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, 'TEST scheme', 99, false) RETURNING id`,
      [courseId],
    );
    schemes.push(s.rows[0]!.id);
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM lesson_plans WHERE unit_id IN (SELECT id FROM units WHERE scheme_id = ANY($1))`, [schemes]);
    await pool.query(`DELETE FROM units WHERE scheme_id = ANY($1)`, [schemes]);
    await pool.query(`DELETE FROM schemes_of_work WHERE id = ANY($1)`, [schemes]);
    await pool.end();
  });

  it('adds units + plans and autosaves a field', async () => {
    const schemeId = schemes[0]!;
    const u = await addUnit(schemeId, 'Unit X');
    const p1 = await addPlan(u, 'Lesson 1');
    await addPlan(u, 'Lesson 2');
    await updatePlanField(p1, 'objectives', 'understand variables');
    expect((await listUnits(schemeId)).length).toBe(1);
    const plans = await listPlansForScheme(schemeId);
    expect(plans.length).toBe(2);
    expect(plans.find((p) => p.id === p1)?.objectives).toBe('understand variables');
  });

  it('reorders plans with move', async () => {
    const schemeId = schemes[0]!;
    const before = (await listPlansForScheme(schemeId)).sort((a, b) => a.displayOrder - b.displayOrder);
    const second = before[1]!;
    await movePlan(second.id, 'up');
    const after = (await listPlansForScheme(schemeId)).sort((a, b) => a.displayOrder - b.displayOrder);
    expect(after[0]!.id).toBe(second.id);
  });

  it('materialiseScheme creates a scheme with units + lessons atomically (4.4)', async () => {
    const schemeId = await materialiseScheme(courseId, 'TEST authored scheme', [
      { title: 'Unit A', lessons: ['A1', 'A2'] },
      { title: 'Unit B', lessons: ['B1'] },
    ]);
    expect(schemeId).not.toBeNull();
    try {
      expect((await listUnits(schemeId!)).length).toBe(2);
      expect((await listPlansForScheme(schemeId!)).length).toBe(3);
    } finally {
      await pool.query(`DELETE FROM lesson_plans WHERE unit_id IN (SELECT id FROM units WHERE scheme_id = $1)`, [schemeId]);
      await pool.query(`DELETE FROM units WHERE scheme_id = $1`, [schemeId]);
      await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [schemeId]);
    }
  });

  it('clones to a new draft version with the same units', async () => {
    const schemeId = schemes[0]!;
    const newId = await cloneSchemeNewVersion(schemeId);
    expect(newId).not.toBeNull();
    if (newId) schemes.push(newId);
    expect((await listSchemeVersions(courseId)).some((v) => v.id === newId && !v.active)).toBe(true);
    expect((await listUnits(newId!)).length).toBe((await listUnits(schemeId)).length);
  });
});
