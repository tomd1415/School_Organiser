import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import {
  getAdaptation,
  getEffectiveLesson,
  listAdaptationHistory,
  resetAdaptation,
  upsertAdaptation,
} from '../../src/repos/adaptations';
import {
  createResource,
  linkResourceToAdaptation,
  linkResourceToPlan,
  listResourcesForAdaptation,
  listResourcesForPlan,
} from '../../src/repos/resources';

// 5.1: per-group adaptation of a master lesson. Uses an existing group_course (read-only) and a
// throwaway master lesson, so the seeded data is never touched.
let groupCourseId = 0;
let lessonPlanId = 0;
let schemeId = 0;
let unitId = 0;
const master = { objectives: 'MASTER objectives', outline: 'MASTER outline' };

describe('lesson adaptations (5.1 — integration, needs the dev DB up)', () => {
  beforeAll(async () => {
    const gc = await pool.query<{ id: number; course_id: number }>(
      `SELECT id, course_id FROM group_courses ORDER BY id LIMIT 1`,
    );
    groupCourseId = Number(gc.rows[0]!.id);
    const courseId = Number(gc.rows[0]!.course_id);
    const s = await pool.query<{ id: number }>(
      `INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, 'TEST adapt scheme', 99, false) RETURNING id`,
      [courseId],
    );
    schemeId = Number(s.rows[0]!.id);
    const u = await pool.query<{ id: number }>(
      `INSERT INTO units (scheme_id, title, display_order) VALUES ($1, 'TEST unit', 1) RETURNING id`,
      [schemeId],
    );
    unitId = Number(u.rows[0]!.id);
    const p = await pool.query<{ id: number }>(
      `INSERT INTO lesson_plans (unit_id, course_id, title, display_order, objectives, outline)
       VALUES ($1, $2, 'TEST master lesson', 1, 'MASTER objectives', 'MASTER outline') RETURNING id`,
      [unitId, courseId],
    );
    lessonPlanId = Number(p.rows[0]!.id);
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM lesson_adaptations WHERE group_course_id = $1 AND lesson_plan_id = $2`, [groupCourseId, lessonPlanId]);
    await pool.query(`DELETE FROM lesson_plans WHERE id = $1`, [lessonPlanId]);
    await pool.query(`DELETE FROM units WHERE id = $1`, [unitId]);
    await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [schemeId]);
    // pool is closed once, in the final describe's afterAll below.
  });

  it('falls back to the master when there is no adaptation', async () => {
    const eff = await getEffectiveLesson(groupCourseId, lessonPlanId, master);
    expect(eff.adapted).toBe(false);
    expect(eff.objectives).toBe('MASTER objectives');
    expect(eff.adaptationId).toBeNull();
  });

  it('overrides the master and logs the change', async () => {
    await upsertAdaptation({
      groupCourseId,
      lessonPlanId,
      objectives: 'GROUP objectives',
      outline: 'GROUP outline',
      adaptationNote: null,
      changeSummary: 'teacher edit',
    });
    const eff = await getEffectiveLesson(groupCourseId, lessonPlanId, master);
    expect(eff.adapted).toBe(true);
    expect(eff.objectives).toBe('GROUP objectives');
    expect(eff.outline).toBe('GROUP outline');
    const a = await getAdaptation(groupCourseId, lessonPlanId);
    expect(a).not.toBeNull();
    const hist = await listAdaptationHistory(a!.id);
    expect(hist.length).toBe(1);
    expect(hist[0]!.changeSummary).toBe('teacher edit');
    expect(hist[0]!.author).toBe('teacher');
  });

  it('inherits the master per-field when an override field is null', async () => {
    await upsertAdaptation({
      groupCourseId,
      lessonPlanId,
      objectives: 'ONLY objectives changed',
      outline: null, // inherit the master outline
      adaptationNote: null,
      changeSummary: 'teacher edit',
    });
    const eff = await getEffectiveLesson(groupCourseId, lessonPlanId, master);
    expect(eff.objectives).toBe('ONLY objectives changed');
    expect(eff.outline).toBe('MASTER outline'); // fell back to master
  });

  it('a second edit appends history and keeps a single adaptation row', async () => {
    const a = await getAdaptation(groupCourseId, lessonPlanId);
    const hist = await listAdaptationHistory(a!.id);
    expect(hist.length).toBe(2); // from the two upserts above
    const count = await pool.query<{ n: number }>(
      `SELECT count(*)::int n FROM lesson_adaptations WHERE group_course_id = $1 AND lesson_plan_id = $2`,
      [groupCourseId, lessonPlanId],
    );
    expect(count.rows[0]!.n).toBe(1);
  });

  it('never mutates the master lesson', async () => {
    const m = await pool.query<{ objectives: string; outline: string }>(
      `SELECT objectives, outline FROM lesson_plans WHERE id = $1`,
      [lessonPlanId],
    );
    expect(m.rows[0]!.objectives).toBe('MASTER objectives');
    expect(m.rows[0]!.outline).toBe('MASTER outline');
  });

  it('reset returns to the master and removes the history', async () => {
    const a = await getAdaptation(groupCourseId, lessonPlanId);
    await resetAdaptation(groupCourseId, lessonPlanId);
    const eff = await getEffectiveLesson(groupCourseId, lessonPlanId, master);
    expect(eff.adapted).toBe(false);
    expect(eff.objectives).toBe('MASTER objectives');
    const hist = await listAdaptationHistory(a!.id);
    expect(hist.length).toBe(0); // cascaded away with the adaptation
  });
});

// Regression — class-adapted resources must belong to the class's adaptation, NOT the master plan.
// (The teacher reported that resources generated for a class were not connected to the revised
// lesson plan. The class-path generator links to the adaptation; this proves the two stores never
// bleed into each other.) Self-contained setup so it never depends on the suite above.
describe('adapted resources are scoped to the class, not the master plan (regression)', () => {
  let gcId = 0;
  let planId = 0;
  let unit = 0;
  let scheme = 0;
  let adaptationId = 0;
  const masterResIds: number[] = [];
  const classResIds: number[] = [];

  beforeAll(async () => {
    const gc = await pool.query<{ id: number; course_id: number }>(
      `SELECT id, course_id FROM group_courses ORDER BY id LIMIT 1`,
    );
    gcId = Number(gc.rows[0]!.id);
    const courseId = Number(gc.rows[0]!.course_id);
    const s = await pool.query<{ id: number }>(
      `INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, 'TEST res-scope scheme', 98, false) RETURNING id`,
      [courseId],
    );
    scheme = Number(s.rows[0]!.id);
    const u = await pool.query<{ id: number }>(
      `INSERT INTO units (scheme_id, title, display_order) VALUES ($1, 'TEST res-scope unit', 1) RETURNING id`,
      [scheme],
    );
    unit = Number(u.rows[0]!.id);
    const p = await pool.query<{ id: number }>(
      `INSERT INTO lesson_plans (unit_id, course_id, title, display_order, objectives, outline)
       VALUES ($1, $2, 'TEST res-scope master', 1, 'MASTER objectives', 'MASTER outline') RETURNING id`,
      [unit, courseId],
    );
    planId = Number(p.rows[0]!.id);
    await upsertAdaptation({
      groupCourseId: gcId,
      lessonPlanId: planId,
      objectives: 'GROUP objectives',
      outline: 'GROUP outline',
      adaptationNote: null,
      changeSummary: 'set up for res-scope test',
    });
    adaptationId = (await getAdaptation(gcId, planId))!.id;
  });

  afterAll(async () => {
    const all = [...masterResIds, ...classResIds];
    if (all.length) {
      await pool.query(`DELETE FROM resource_links WHERE resource_id = ANY($1)`, [all]);
      await pool.query(`DELETE FROM resources WHERE id = ANY($1)`, [all]);
    }
    await pool.query(`DELETE FROM lesson_adaptations WHERE group_course_id = $1 AND lesson_plan_id = $2`, [gcId, planId]);
    await pool.query(`DELETE FROM lesson_plans WHERE id = $1`, [planId]);
    await pool.query(`DELETE FROM units WHERE id = $1`, [unit]);
    await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [scheme]);
    await pool.end();
  });

  it('a resource generated for the class is returned for the adaptation, not the master plan', async () => {
    const id = await createResource('TEST class deck', 'slides', null, 'ai_generated');
    classResIds.push(id);
    await linkResourceToAdaptation(id, adaptationId);

    const forClass = await listResourcesForAdaptation(adaptationId);
    expect(forClass.map((r) => r.resourceId)).toContain(id);

    const forMaster = await listResourcesForPlan(planId);
    expect(forMaster.map((r) => r.resourceId)).not.toContain(id);
  });

  it('a master resource is returned for the plan, not the class adaptation', async () => {
    const id = await createResource('TEST master deck', 'slides', null, 'ai_generated');
    masterResIds.push(id);
    await linkResourceToPlan(id, planId);

    const forMaster = await listResourcesForPlan(planId);
    expect(forMaster.map((r) => r.resourceId)).toContain(id);

    const forClass = await listResourcesForAdaptation(adaptationId);
    expect(forClass.map((r) => r.resourceId)).not.toContain(id);
  });
});
