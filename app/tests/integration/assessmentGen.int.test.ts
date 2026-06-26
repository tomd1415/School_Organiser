import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { generateAssessment } from '../../src/services/assessmentGen';
import { listAssessmentsForUnit } from '../../src/repos/assessments';

// Phase 1 — degrade writes nothing (integration; needs the dev DB; AI forced OFF by the test config's
// empty key). With no key, callLLMStructured returns 'unavailable' and generateAssessment must create NO
// assessments row. Fixture mirrors tests/integration/assessmentsRepo.test.ts.

let courseId = 0;
let schemeId = 0;
let unitId = 0;
let groupId = 0;
let gcId = 0;

beforeAll(async () => {
  const yr = await pool.query<{ id: number }>(`SELECT id FROM academic_years WHERE is_current`);
  const yearId = Number(yr.rows[0]!.id);
  courseId = Number((await pool.query<{ id: number }>(`INSERT INTO courses (name) VALUES ('ZZB course') RETURNING id`)).rows[0]!.id);
  schemeId = Number((await pool.query<{ id: number }>(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1,'ZZB scheme',96,false) RETURNING id`, [courseId])).rows[0]!.id);
  unitId = Number((await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1,'ZZB unit',0) RETURNING id`, [schemeId])).rows[0]!.id);
  await pool.query(`INSERT INTO course_spec_points (course_id, code, title, display_order, active) VALUES ($1,'ZZB.1','Topic',0,true)`, [courseId]);
  groupId = Number((await pool.query<{ id: number }>(`INSERT INTO groups (name, academic_year_id, active) VALUES ('ZZBGRP',$1,true) RETURNING id`, [yearId])).rows[0]!.id);
  gcId = Number((await pool.query<{ id: number }>(`INSERT INTO group_courses (group_id, course_id) VALUES ($1,$2) RETURNING id`, [groupId, courseId])).rows[0]!.id);
});

afterAll(async () => {
  await pool.query(`DELETE FROM assessments WHERE unit_id = $1`, [unitId]);
  await pool.query(`DELETE FROM group_courses WHERE id = $1`, [gcId]);
  await pool.query(`DELETE FROM groups WHERE id = $1`, [groupId]);
  await pool.query(`DELETE FROM course_spec_points WHERE course_id = $1`, [courseId]);
  await pool.query(`DELETE FROM units WHERE id = $1`, [unitId]);
  await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [schemeId]);
  await pool.query(`DELETE FROM courses WHERE id = $1`, [courseId]);
  await pool.end();
});

describe('generateAssessment — degrade writes nothing (AI off)', () => {
  it('returns ok:false and creates no assessments row for the unit', async () => {
    const before = (await listAssessmentsForUnit(unitId)).length;
    const res = await generateAssessment(unitId, gcId);
    expect(res.ok).toBe(false);
    expect(res.assessmentId).toBeUndefined();
    expect((await listAssessmentsForUnit(unitId)).length).toBe(before);
  });
});
