import { test, expect } from '@playwright/test';
import { Pool } from 'pg';

// Phase 7 — full-lifecycle smoke (teacher side, real browser, AI off). A real pupil's SUBMITTED + objective-
// marked attempt is seeded (the pupil take side is covered by assessmentTake.spec); the teacher then walks
// results → marking grid → confirm → release. Asserts the results dashboard never shows the answer key, and
// that release flips the held → released control. Self-contained; afterAll removes the fixture.

const DB = 'postgres://organiser:organiser@localhost:5434/organiser';
const TITLE = 'E2E Lifecycle Paper';
const SECRET_MODEL = 'ZZLIFEMODELANSWER';

let schemeId = 0, unitId = 0, assessmentId = 0, attemptId = 0, specPointId = 0, pupilId = 0, enrolled = false;

test.beforeAll(async () => {
  const pool = new Pool({ connectionString: DB });
  try {
    const slot = (await pool.query<{ gcId: number; courseId: number; groupId: number }>(
      `SELECT gc.id AS "gcId", gc.course_id AS "courseId", gc.group_id AS "groupId"
       FROM timetabled_lesson_courses tlc JOIN group_courses gc ON gc.id = tlc.group_course_id
       JOIN timetabled_lessons tl ON tl.id = tlc.timetabled_lesson_id JOIN period_definitions p ON p.id = tl.period_definition_id
       WHERE gc.active AND p.academic_year_id = (SELECT id FROM academic_years WHERE is_current) LIMIT 1`,
    )).rows[0]!;
    const courseId = Number(slot.courseId), gcId = Number(slot.gcId), groupId = Number(slot.groupId);
    specPointId = Number((await pool.query<{ id: number }>(`INSERT INTO course_spec_points (course_id, code, title, display_order, active) VALUES ($1,'ZZL.1','Topic',0,true) RETURNING id`, [courseId])).rows[0]!.id);
    schemeId = Number((await pool.query<{ id: number }>(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1,'ZZL scheme',90,false) RETURNING id`, [courseId])).rows[0]!.id);
    unitId = Number((await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1,'ZZL unit',0) RETURNING id`, [schemeId])).rows[0]!.id);
    assessmentId = Number((await pool.query<{ id: number }>(
      `INSERT INTO assessments (unit_id, scheme_id, course_id, title, style, status, marks_total, blueprint, source_type) VALUES ($1,$2,$3,$4,'gcse','ready',1,'{}'::jsonb,'ai_generated') RETURNING id`, [unitId, schemeId, courseId, TITLE])).rows[0]!.id);
    const qid = Number((await pool.query<{ id: number }>(`INSERT INTO assessment_questions (assessment_id, display_order, stem, spec_point_id, is_uncovered, marks_total, model_answer) VALUES ($1,0,'A LAN',$2,false,1,$3) RETURNING id`, [assessmentId, specPointId, SECRET_MODEL])).rows[0]!.id);
    const partId = Number((await pool.query<{ id: number }>(`INSERT INTO assessment_question_parts (question_id, part_label, display_order, prompt, marks, expected_response_type, part_config, model_answer) VALUES ($1,'a',0,'Pick',1,'multiple_choice',$2::jsonb,$3) RETURNING id`, [qid, JSON.stringify({ options: ['LAN', 'WAN'] }), SECRET_MODEL])).rows[0]!.id);
    await pool.query(`INSERT INTO assessment_mark_points (part_id, display_order, text, marks, kind) VALUES ($1,0,'LAN',1,'choice')`, [partId]);
    await pool.query(`INSERT INTO assessment_classes (assessment_id, group_course_id, results_mode) VALUES ($1,$2,'on_release')`, [assessmentId, gcId]);

    pupilId = Number((await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token) VALUES ('ZZL Pupil','PUPIL_ZZL1') RETURNING id`)).rows[0]!.id);
    const e = await pool.query(`INSERT INTO enrolments (pupil_id, group_id, active) VALUES ($1,$2,true) ON CONFLICT DO NOTHING`, [pupilId, groupId]);
    enrolled = (e.rowCount ?? 0) > 0;
    attemptId = Number((await pool.query<{ id: number }>(`INSERT INTO assessment_attempts (assessment_id, pupil_id, group_course_id, status, submitted_at, score_awarded, score_total) VALUES ($1,$2,$3,'submitted',now(),1,1) RETURNING id`, [assessmentId, pupilId, gcId])).rows[0]!.id);
    const ansId = Number((await pool.query<{ id: number }>(`INSERT INTO assessment_answers (attempt_id, part_id, answer_text) VALUES ($1,$2,'LAN') RETURNING id`, [attemptId, partId])).rows[0]!.id);
    await pool.query(`INSERT INTO assessment_awarded_marks (answer_id, marks_awarded, marks_total, marker, status, needs_review) VALUES ($1,1,1,'auto','suggested',false)`, [ansId]);
    await pool.query(`INSERT INTO assessment_spec_point_results (attempt_id, spec_point_id, marks_awarded, marks_total) VALUES ($1,$2,1,1)`, [attemptId, specPointId]);
  } finally {
    await pool.end();
  }
});

test.afterAll(async () => {
  const pool = new Pool({ connectionString: DB });
  try {
    if (assessmentId) await pool.query(`DELETE FROM assessments WHERE id = $1`, [assessmentId]);
    if (enrolled && pupilId) await pool.query(`DELETE FROM enrolments WHERE pupil_id = $1`, [pupilId]);
    if (pupilId) await pool.query(`DELETE FROM pupils WHERE id = $1`, [pupilId]);
    if (specPointId) await pool.query(`DELETE FROM course_spec_points WHERE id = $1`, [specPointId]);
    if (unitId) await pool.query(`DELETE FROM units WHERE id = $1`, [unitId]);
    if (schemeId) await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [schemeId]);
  } finally {
    await pool.end();
  }
});

test('teacher: results → marking grid → confirm → release; no answer key on the dashboard', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  // 1) Results dashboard: the pupil's score + the per-spec-point heatmap — but NOT the model answer.
  await page.goto(`/assessments/${assessmentId}/results`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1', { hasText: TITLE })).toBeVisible();
  await expect(page.locator('.asmt-results-table')).toContainText('ZZL Pupil');
  await expect(page.locator('.asmt-heat')).toContainText('ZZL.1');
  expect(await page.content()).not.toContain(SECRET_MODEL); // answer key never on the dashboard

  // 2) Marking grid: confirm the suggested objective mark.
  await page.goto(`/assessments/${assessmentId}/attempts/${attemptId}/marks`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.asmt-marking')).toContainText('LAN'); // the pupil's answer (teacher sees PII)
  await page.getByRole('button', { name: /Confirm all/ }).click();
  await expect(page.locator('.asmt-marking .badge.good', { hasText: 'confirmed' }).first()).toBeVisible();

  // 3) Release: the on_release class is held; release it.
  await page.goto(`/assessments/${assessmentId}/results`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#asmt-release')).toContainText('held');
  await page.locator('#asmt-release').getByRole('button', { name: /Release results/ }).first().click();
  await expect(page.locator('#asmt-release')).toContainText('released');

  expect(errors, errors.join('\n')).toEqual([]);
});
