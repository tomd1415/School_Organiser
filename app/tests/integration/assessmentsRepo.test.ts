import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { assessmentWithQuestions, materialiseAssessment, setAssessmentStatus, listAssessmentsForUnit } from '../../src/repos/assessments';
import {
  assignToClass, getAssignment, startAttempt, saveAnswer, submitAttempt, writeAwardedMark,
  confirmMarksForAttempt, recomputeAttemptScore, upsertSpecPointResult, answersForMarking, wipeTestAttempts, getAttempt,
} from '../../src/repos/assessmentAttempts';

// Per-unit assessment repos (integration; needs the dev DB up + migrated; never calls AI).

let courseId = 0, schemeId = 0, unitId = 0, specPointId = 0, groupId = 0, gcId = 0, pupilId = 0, testPupilId = 0, assessmentId = 0;

beforeAll(async () => {
  const yr = await pool.query<{ id: number }>(`SELECT id FROM academic_years WHERE is_current`);
  const yearId = Number(yr.rows[0]!.id);
  courseId = Number((await pool.query<{ id: number }>(`INSERT INTO courses (name) VALUES ('ZZA course') RETURNING id`)).rows[0]!.id);
  schemeId = Number((await pool.query<{ id: number }>(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1,'ZZA scheme',97,false) RETURNING id`, [courseId])).rows[0]!.id);
  unitId = Number((await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1,'ZZA unit',0) RETURNING id`, [schemeId])).rows[0]!.id);
  specPointId = Number((await pool.query<{ id: number }>(`INSERT INTO course_spec_points (course_id, code, title, display_order, active) VALUES ($1,'ZZA.1','Networks basics',0,true) RETURNING id`, [courseId])).rows[0]!.id);
  groupId = Number((await pool.query<{ id: number }>(`INSERT INTO groups (name, academic_year_id, active) VALUES ('ZZAGRP',$1,true) RETURNING id`, [yearId])).rows[0]!.id);
  gcId = Number((await pool.query<{ id: number }>(`INSERT INTO group_courses (group_id, course_id) VALUES ($1,$2) RETURNING id`, [groupId, courseId])).rows[0]!.id);
  pupilId = Number((await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token) VALUES ('ZZA Pupil','PUPIL_ZA1') RETURNING id`)).rows[0]!.id);
  testPupilId = Number((await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token, is_test) VALUES ('ZZA Test','PUPIL_ZA2',true) RETURNING id`)).rows[0]!.id);
  await pool.query(`INSERT INTO enrolments (pupil_id, group_id, active) VALUES ($1,$2,true)`, [pupilId, groupId]);
});

afterAll(async () => {
  await pool.query(`DELETE FROM assessments WHERE unit_id = $1`, [unitId]); // cascades to questions/parts/points/attempts/answers/marks
  await pool.query(`DELETE FROM enrolments WHERE group_id = $1`, [groupId]);
  await pool.query(`DELETE FROM pupils WHERE ai_token LIKE 'PUPIL_ZA%'`);
  await pool.query(`DELETE FROM group_courses WHERE id = $1`, [gcId]);
  await pool.query(`DELETE FROM groups WHERE id = $1`, [groupId]);
  await pool.query(`DELETE FROM course_spec_points WHERE course_id = $1`, [courseId]);
  await pool.query(`DELETE FROM units WHERE id = $1`, [unitId]);
  await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [schemeId]);
  await pool.query(`DELETE FROM courses WHERE id = $1`, [courseId]);
  await pool.end();
});

describe('assessment authoring repo', () => {
  it('materialises + reads back the question tree with computed marks_total', async () => {
    assessmentId = await materialiseAssessment({
      unitId, schemeId, courseId, title: 'ZZA end-of-unit', style: 'gcse', examBoard: 'OCR J277', blueprint: { groupCourseId: gcId },
      questions: [{
        stem: 'Networks question', specPointId, isUncovered: false, commandWordCode: 'state',
        parts: [
          { partLabel: 'a', prompt: 'Pick one', marks: 1, expectedResponseType: 'multiple_choice', partConfig: { options: ['LAN', 'WAN'] }, markPoints: [{ text: 'LAN', marks: 1, isRequired: true, acceptedAlternatives: [], kind: 'choice' }] },
          { partLabel: 'b', prompt: 'Explain', marks: 2, expectedResponseType: 'extended_response', markPoints: [{ text: 'a reason', marks: 2, isRequired: false, acceptedAlternatives: [], kind: 'open' }], misconceptions: [{ label: 'confuses LAN/WAN', description: '…' }] },
        ],
      }],
    });
    const tree = await assessmentWithQuestions(assessmentId);
    expect(tree).toBeTruthy();
    expect(tree!.marksTotal).toBe(3);
    expect(tree!.questions).toHaveLength(1);
    expect(tree!.questions[0]!.parts.map((p) => p.partLabel)).toEqual(['a', 'b']);
    expect(tree!.questions[0]!.parts[1]!.misconceptions).toHaveLength(1);
    expect((await listAssessmentsForUnit(unitId))[0]).toMatchObject({ id: assessmentId, questionCount: 1, marksTotal: 3 });
  });

  it('Mark-ready flips status', async () => {
    await setAssessmentStatus(assessmentId, 'ready');
    const tree = await assessmentWithQuestions(assessmentId);
    expect(tree!.status).toBe('ready');
  });
});

describe('assessment delivery repo', () => {
  it('assigns to a class with a window', async () => {
    await assignToClass(assessmentId, gcId, { resultsMode: 'on_release' });
    expect(await getAssignment(assessmentId, gcId)).toMatchObject({ groupCourseId: gcId, resultsMode: 'on_release' });
  });

  it('startAttempt is idempotent for a real pupil; test attempts are separate', async () => {
    const a1 = await startAttempt(assessmentId, pupilId, gcId, false);
    const a2 = await startAttempt(assessmentId, pupilId, gcId, false);
    expect(a2.id).toBe(a1.id); // one real attempt
    const t = await startAttempt(assessmentId, testPupilId, gcId, true);
    expect(t.isTest).toBe(true);
    expect(t.id).not.toBe(a1.id);
  });

  it('saveAnswer drops a stale awarded mark only when the text changes', async () => {
    const attempt = await startAttempt(assessmentId, pupilId, gcId, false);
    const partB = (await assessmentWithQuestions(assessmentId))!.questions[0]!.parts[1]!.id;
    await saveAnswer(attempt.id, partB, 'first answer');
    const answerId = (await answersForMarking(attempt.id)).find((a) => a.partId === partB)!.answerId;
    await writeAwardedMark({ answerId, marksAwarded: 2, marksTotal: 2, marker: 'ai', confidence: 0.9, status: 'suggested' });
    await saveAnswer(attempt.id, partB, 'first answer'); // unchanged → mark stays
    expect((await pool.query(`SELECT 1 FROM assessment_awarded_marks WHERE answer_id = $1`, [answerId])).rowCount).toBe(1);
    await saveAnswer(attempt.id, partB, 'a different answer'); // changed → mark dropped
    expect((await pool.query(`SELECT 1 FROM assessment_awarded_marks WHERE answer_id = $1`, [answerId])).rowCount).toBe(0);
  });

  it('submit freezes the attempt (double-submit guarded)', async () => {
    const attempt = await startAttempt(assessmentId, pupilId, gcId, false);
    expect(await submitAttempt(attempt.id)).toBe(true);
    expect(await submitAttempt(attempt.id)).toBe(false);
    expect((await getAttempt(attempt.id))!.status).toBe('submitted');
  });

  it('confirm skips needs_review; recompute + spec-point upsert work', async () => {
    const attempt = await startAttempt(assessmentId, pupilId, gcId, false);
    const tree = (await assessmentWithQuestions(assessmentId))!;
    const partA = tree.questions[0]!.parts[0]!.id;
    await saveAnswer(attempt.id, partA, 'LAN');
    const ansA = (await answersForMarking(attempt.id)).find((a) => a.partId === partA)!.answerId;
    await writeAwardedMark({ answerId: ansA, marksAwarded: 1, marksTotal: 1, marker: 'auto', confidence: 1, status: 'suggested', needsReview: false });
    // a needs_review mark on part b should NOT be confirmed by confirm-all
    const partB = tree.questions[0]!.parts[1]!.id;
    await saveAnswer(attempt.id, partB, 'something');
    const ansB = (await answersForMarking(attempt.id)).find((a) => a.partId === partB)!.answerId;
    await writeAwardedMark({ answerId: ansB, marksAwarded: 0, marksTotal: 2, marker: 'ai', confidence: 0.3, status: 'suggested', needsReview: true });
    const confirmed = await confirmMarksForAttempt(attempt.id);
    expect(confirmed).toBe(1); // only partA's
    await recomputeAttemptScore(attempt.id);
    expect((await getAttempt(attempt.id))!.scoreTotal).toBe(3); // whole paper
    expect((await getAttempt(attempt.id))!.scoreAwarded).toBe(1);
    await upsertSpecPointResult(attempt.id, specPointId, 1, 1);
    expect((await pool.query(`SELECT marks_awarded FROM assessment_spec_point_results WHERE attempt_id = $1 AND spec_point_id = $2`, [attempt.id, specPointId])).rows[0]).toMatchObject({ marks_awarded: 1 });
  });

  it('wipeTestAttempts removes only is_test attempts', async () => {
    await startAttempt(assessmentId, testPupilId, gcId, true);
    const before = (await pool.query(`SELECT count(*)::int n FROM assessment_attempts WHERE assessment_id = $1 AND is_test`, [assessmentId])).rows[0] as { n: number };
    expect(before.n).toBeGreaterThan(0);
    await wipeTestAttempts();
    const afterTest = (await pool.query(`SELECT count(*)::int n FROM assessment_attempts WHERE assessment_id = $1 AND is_test`, [assessmentId])).rows[0] as { n: number };
    const realLeft = (await pool.query(`SELECT count(*)::int n FROM assessment_attempts WHERE assessment_id = $1 AND NOT is_test`, [assessmentId])).rows[0] as { n: number };
    expect(afterTest.n).toBe(0);
    expect(realLeft.n).toBeGreaterThan(0);
  });
});
