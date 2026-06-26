import { test, expect } from '@playwright/test';
import { Pool } from 'pg';

// Phase 3 — pupil take-flow smoke (real browser). As the TEST pupil: list → start → answer → submit → see
// the confirmation, asserting the page NEVER shows a mark-point / model-answer (the PII-safe projection).
// Self-contained: a beforeAll seeds a ready assessment assigned (instant) to a seeded class, with the TEST
// pupil enrolled in it; afterAll removes the fixture. AI is off (empty key), so nothing leaves.

const DB = 'postgres://organiser:organiser@localhost:5434/organiser';
const TITLE = 'E2E Take Paper';
const SECRET_MODEL = 'ZZSECRETMODEL';
const SECRET_MP = 'ZZSECRETMARKPOINT';

let schemeId = 0;
let unitId = 0;
let assessmentId = 0;
let testPupilId = 0;
let enrolled = false;

test.beforeAll(async () => {
  const pool = new Pool({ connectionString: DB });
  try {
    const slot = await pool.query<{ gcId: number; courseId: number; groupId: number }>(
      `SELECT gc.id AS "gcId", gc.course_id AS "courseId", gc.group_id AS "groupId"
       FROM timetabled_lesson_courses tlc
       JOIN group_courses gc ON gc.id = tlc.group_course_id
       JOIN timetabled_lessons tl ON tl.id = tlc.timetabled_lesson_id
       JOIN period_definitions p ON p.id = tl.period_definition_id
       WHERE gc.active AND p.academic_year_id = (SELECT id FROM academic_years WHERE is_current)
       LIMIT 1`,
    );
    const s = slot.rows[0]!;
    const courseId = Number(s.courseId);
    const gcId = Number(s.gcId);
    const groupId = Number(s.groupId);

    // get-or-create the test pupil ensureTestPupil() returns (the first is_test pupil), and enrol it.
    let tp = await pool.query<{ id: number }>(`SELECT id FROM pupils WHERE is_test ORDER BY id LIMIT 1`);
    if (!tp.rows[0]) {
      tp = await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token, active, is_test) VALUES ('Test Pupil', 'PUPIL_E2E_TP', true, true) RETURNING id`);
    }
    testPupilId = Number(tp.rows[0]!.id);
    const enrol = await pool.query(`INSERT INTO enrolments (pupil_id, group_id, active) VALUES ($1,$2,true) ON CONFLICT DO NOTHING`, [testPupilId, groupId]);
    enrolled = (enrol.rowCount ?? 0) > 0;

    schemeId = Number((await pool.query<{ id: number }>(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1,'ZZE scheme',93,false) RETURNING id`, [courseId])).rows[0]!.id);
    unitId = Number((await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1,'ZZE unit',0) RETURNING id`, [schemeId])).rows[0]!.id);
    const a = await pool.query<{ id: number }>(
      `INSERT INTO assessments (unit_id, scheme_id, course_id, title, style, exam_board, status, marks_total, blueprint, source_type)
       VALUES ($1,$2,$3,$4,'gcse','OCR J277','ready',3,'{}'::jsonb,'ai_generated') RETURNING id`,
      [unitId, schemeId, courseId, TITLE],
    );
    assessmentId = Number(a.rows[0]!.id);
    const q = await pool.query<{ id: number }>(
      `INSERT INTO assessment_questions (assessment_id, display_order, stem, is_uncovered, marks_total, model_answer)
       VALUES ($1,0,'A school LAN.',false,3,$2) RETURNING id`,
      [assessmentId, SECRET_MODEL],
    );
    const qid = Number(q.rows[0]!.id);
    const pa = await pool.query<{ id: number }>(
      `INSERT INTO assessment_question_parts (question_id, part_label, display_order, prompt, marks, expected_response_type, part_config, model_answer)
       VALUES ($1,'a',0,'Pick the topology',1,'multiple_choice', $2::jsonb, $3) RETURNING id`,
      [qid, JSON.stringify({ options: ['Star', 'Bus'] }), SECRET_MODEL],
    );
    await pool.query(`INSERT INTO assessment_mark_points (part_id, display_order, text, marks, kind) VALUES ($1,0,$2,1,'choice')`, [Number(pa.rows[0]!.id), SECRET_MP]);
    const pb = await pool.query<{ id: number }>(
      `INSERT INTO assessment_question_parts (question_id, part_label, display_order, prompt, marks, expected_response_type)
       VALUES ($1,'b',1,'State one advantage',2,'short_text') RETURNING id`,
      [qid],
    );
    await pool.query(`INSERT INTO assessment_mark_points (part_id, display_order, text, marks, kind) VALUES ($1,0,$2,2,'open')`, [Number(pb.rows[0]!.id), SECRET_MP]);

    await pool.query(`INSERT INTO assessment_classes (assessment_id, group_course_id, results_mode) VALUES ($1,$2,'instant')`, [assessmentId, gcId]);
  } finally {
    await pool.end();
  }
});

test.afterAll(async () => {
  const pool = new Pool({ connectionString: DB });
  try {
    if (assessmentId) await pool.query(`DELETE FROM assessments WHERE id = $1`, [assessmentId]); // cascades
    if (unitId) await pool.query(`DELETE FROM units WHERE id = $1`, [unitId]);
    if (schemeId) await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [schemeId]);
    if (enrolled && testPupilId) await pool.query(`DELETE FROM enrolments WHERE pupil_id = $1 AND group_id IN (SELECT group_id FROM group_courses gc JOIN assessment_classes ac ON ac.group_course_id = gc.id WHERE ac.assessment_id = $2)`, [testPupilId, assessmentId]).catch(() => {});
  } finally {
    await pool.end();
  }
});

test('test pupil takes an assessment without ever seeing the answer key', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  // Become the test pupil: extract the teacher CSRF token, then POST /test-pupil/open on the same session.
  await page.goto('/schemes', { waitUntil: 'domcontentloaded' });
  const html = await page.content();
  const token = html.match(/"x-csrf-token":"([^"]+)"/)?.[1] ?? html.match(/name="_csrf"\s+value="([^"]+)"/)?.[1];
  expect(token, 'teacher CSRF token').toBeTruthy();
  const today = new Date().toISOString().slice(0, 10);
  const open = await page.request.post('/test-pupil/open', { headers: { 'x-csrf-token': token! }, form: { lesson: '1', date: today, level: 'core' } });
  expect(open.ok()).toBeTruthy();

  // The pupil assessments list shows our paper.
  await page.goto('/me/assessments', { waitUntil: 'domcontentloaded' });
  const card = page.locator('.asmt-take-card', { hasText: TITLE });
  await expect(card).toBeVisible();
  await card.getByRole('link', { name: /Start|Resume/ }).click();
  await page.waitForLoadState('domcontentloaded');

  // The take page must NOT contain the answer key (model answer / mark point).
  const content = await page.content();
  expect(content).not.toContain(SECRET_MODEL);
  expect(content).not.toContain(SECRET_MP);
  await expect(page.locator('h1', { hasText: TITLE })).toBeVisible();

  // Answer: pick a radio + type the short answer (each autosaves).
  await page.locator('input[type=radio]').first().check();
  await page.locator('input[type=text][name=value]').first().fill('A LAN covers one site.');
  await expect(page.locator('.note-status.saved').first()).toBeVisible();

  // Submit (accept the confirm) → the confirmation replaces the form.
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: /Submit my answers/ }).click();
  await expect(page.locator('h1', { hasText: 'Submitted' })).toBeVisible();
  expect(await page.content()).not.toContain(SECRET_MODEL);

  expect(errors, errors.join('\n')).toEqual([]);
});
