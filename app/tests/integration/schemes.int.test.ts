import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import {
  addPlan,
  addUnit,
  cloneSchemeNewVersion,
  createScheme,
  deleteScheme,
  getCourseTeachingContext,
  getScheme,
  getPlanRow,
  listAllSchemes,
  moveSchemeToCourse,
  setCourseTeachingContext,
  setSchemeLabels,
  listPlansForScheme,
  listSchemeVersions,
  listUnits,
  materialiseScheme,
  movePlan,
  updatePlanField,
} from '../../src/repos/schemes';
import { createResource, linkResourceToPlan, listResourcesForPlan } from '../../src/repos/resources';

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

  it('course teaching-context round-trips and is seeded by default (4.4.1)', async () => {
    const seeded = await getCourseTeachingContext(courseId);
    expect(seeded && seeded.length > 0).toBe(true); // migration 0008 seeded a SEND default
    await setCourseTeachingContext(courseId, 'TEST ctx — autistic majority, low arousal');
    expect(await getCourseTeachingContext(courseId)).toBe('TEST ctx — autistic majority, low arousal');
    await setCourseTeachingContext(courseId, seeded ?? ''); // restore
  });

  it('adds units + plans and autosaves a field', async () => {
    const schemeId = schemes[0]!;
    const u = await addUnit(schemeId, 'Unit X');
    const p1 = await addPlan(u, 'Lesson 1');
    await addPlan(u, 'Lesson 2');
    await updatePlanField(p1, 'objectives', 'understand variables');
    await updatePlanField(p1, 'kit_needed', '16× micro:bit, batteries'); // C1
    expect((await listUnits(schemeId)).length).toBe(1);
    const plans = await listPlansForScheme(schemeId);
    expect(plans.length).toBe(2);
    expect(plans.find((p) => p.id === p1)?.objectives).toBe('understand variables');
    expect(plans.find((p) => p.id === p1)?.kitNeeded).toBe('16× micro:bit, batteries'); // C1 round-trips
    expect((await getPlanRow(p1))?.kitNeeded).toBe('16× micro:bit, batteries');
  });

  it('reorders plans with move', async () => {
    const schemeId = schemes[0]!;
    const before = (await listPlansForScheme(schemeId)).sort((a, b) => a.displayOrder - b.displayOrder);
    const second = before[1]!;
    await movePlan(second.id, 'up');
    const after = (await listPlansForScheme(schemeId)).sort((a, b) => a.displayOrder - b.displayOrder);
    expect(after[0]!.id).toBe(second.id);
  });

  it('scheme labels / move / delete with clean FK handling', async () => {
    const cs = await pool.query<{ id: number }>(`SELECT id FROM courses WHERE active ORDER BY id LIMIT 2`);
    const c1 = cs.rows[0]!.id;
    const c2 = cs.rows[1]!.id;
    const schemeId = await materialiseScheme(c1, 'TEST mgmt scheme', [{ title: 'U1', lessons: ['MGMT-L1', 'MGMT-L2'] }]);
    expect(schemeId).not.toBeNull();
    try {
      // labels — trimmed and de-duplicated of blanks
      await setSchemeLabels(schemeId!, ' Year 7 , Computer skills ,, ');
      expect((await getScheme(schemeId!))?.labels).toBe('Year 7, Computer skills');
      // move — scheme + all its plans repoint to the new course
      expect(await moveSchemeToCourse(schemeId!, c2)).toBe(true);
      expect(Number((await getScheme(schemeId!))?.courseId)).toBe(Number(c2));
      const wrong = await pool.query<{ n: number }>(
        `SELECT count(*)::int n FROM lesson_plans lp JOIN units u ON u.id=lp.unit_id WHERE u.scheme_id=$1 AND lp.course_id<>$2`,
        [schemeId, c2],
      );
      expect(wrong.rows[0]!.n).toBe(0);
      expect((await listAllSchemes()).some((s) => Number(s.id) === Number(schemeId))).toBe(true);
      // delete — gone, no orphaned plans left behind
      await deleteScheme(schemeId!);
      expect(await getScheme(schemeId!)).toBeNull();
      const orphans = await pool.query<{ n: number }>(
        `SELECT count(*)::int n FROM lesson_plans WHERE unit_id IS NULL AND title IN ('MGMT-L1','MGMT-L2')`,
      );
      expect(orphans.rows[0]!.n).toBe(0);
    } finally {
      // Belt-and-braces: clean up even if an assertion above failed mid-test.
      await pool.query(`DELETE FROM lesson_plans WHERE unit_id IN (SELECT id FROM units WHERE scheme_id=$1)`, [schemeId]);
      await pool.query(`DELETE FROM schemes_of_work WHERE id=$1`, [schemeId]);
    }
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

  it('DB-enforces one active scheme + unique version per course (BUG-019)', async () => {
    // a throwaway course, guaranteed to start with zero schemes, so we don't disturb real data
    await pool.query(`DELETE FROM schemes_of_work WHERE course_id IN (SELECT id FROM courses WHERE name = 'TEST inv course')`);
    await pool.query(`DELETE FROM courses WHERE name = 'TEST inv course'`);
    const c = await pool.query<{ id: number }>(`INSERT INTO courses (name) VALUES ('TEST inv course') RETURNING id`);
    const cid = c.rows[0]!.id;
    try {
      const a = await createScheme(cid); // first scheme → live, v1
      const head = await getScheme(a!);
      expect(head?.active).toBe(true);
      expect(head?.version).toBe(1);

      const b = await createScheme(cid); // a second create must NOT clobber the live one → draft, v2
      const draft = await getScheme(b!);
      expect(draft?.active).toBe(false);
      expect(draft?.version).toBe(2);

      // two clones of the same head mint DISTINCT versions (the old head.version+1 collided)
      await cloneSchemeNewVersion(a!);
      await cloneSchemeNewVersion(a!);
      const versions = await listSchemeVersions(cid);
      expect(new Set(versions.map((v) => v.version)).size).toBe(versions.length); // all distinct

      // the database itself refuses a second active scheme…
      await expect(pool.query(`UPDATE schemes_of_work SET active = true WHERE id = $1`, [b])).rejects.toThrow(/duplicate key|unique/i);
      // …and a duplicate (course_id, version)
      await expect(
        pool.query(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, 'dup', 1, false)`, [cid]),
      ).rejects.toThrow(/duplicate key|unique/i);
    } finally {
      await pool.query(`DELETE FROM units WHERE scheme_id IN (SELECT id FROM schemes_of_work WHERE course_id = $1)`, [cid]);
      await pool.query(`DELETE FROM schemes_of_work WHERE course_id = $1`, [cid]);
      await pool.query(`DELETE FROM courses WHERE id = $1`, [cid]);
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

  it('cloning carries labels, kit_needed and resource links forward (BUG-020)', async () => {
    // a self-contained source scheme: a unit + a plan that has kit, a linked resource, and scheme labels
    const srcId = await materialiseScheme(courseId, 'CLONE-SRC scheme', [{ title: 'CU', lessons: ['CL1'] }]);
    expect(srcId).not.toBeNull();
    schemes.push(srcId!);
    await setSchemeLabels(srcId!, 'Year 9, Robotics');
    const srcPlan = (await listPlansForScheme(srcId!))[0]!;
    await updatePlanField(srcPlan.id, 'kit_needed', '6× Arduino, jumper wires');
    const resId = await createResource('CLONE-RES.md', 'document', 'text/markdown', 'uploaded');
    await linkResourceToPlan(resId, srcPlan.id);

    const cloneId = await cloneSchemeNewVersion(srcId!);
    expect(cloneId).not.toBeNull();
    schemes.push(cloneId!);
    try {
      expect((await getScheme(cloneId!))?.labels).toBe('Year 9, Robotics'); // scheme labels carried
      const clonePlan = (await listPlansForScheme(cloneId!))[0]!;
      expect((await getPlanRow(clonePlan.id))?.kitNeeded).toBe('6× Arduino, jumper wires'); // kit carried
      expect((await listResourcesForPlan(clonePlan.id)).some((r) => Number(r.resourceId) === resId)).toBe(true); // link carried
    } finally {
      await pool.query(`DELETE FROM resources WHERE id = $1`, [resId]); // cascades its resource_links
    }
  });
});
