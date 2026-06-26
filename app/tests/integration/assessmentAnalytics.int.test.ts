import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { materialiseAssessment, setAssessmentStatus } from '../../src/repos/assessments';
import { assignToClass, confirmMarksForAttempt, saveAnswer, setReleased, startAttempt, submitAttempt, writeAwardedMark } from '../../src/repos/assessmentAttempts';
import { perPupilForAssessment, specPointMasteryForAssessment, assessmentSignalForClass } from '../../src/repos/assessmentAnalytics';
import { recomputeAttempt } from '../../src/services/assessmentMarking';
import { pupilResults, releaseFor } from '../../src/services/assessmentResults';

// Phase 5 — analytics + is_test exclusion + release flow (integration; needs the dev DB; no AI). Seeds a
// REAL attempt and a TEST attempt with marks, and asserts every analytics read includes the real one and
// EXCLUDES the test one, and that release flips pupil visibility.

let courseId = 0, gcId = 0, groupId = 0, schemeId = 0, unitId = 0, assessmentId = 0, specPointId = 0;
let pupilId = 0, testPupilId = 0, partAId = 0;

async function markObjectivePart(attemptId: number, partId: number, awarded: number, total: number, confirmed: boolean): Promise<void> {
  await saveAnswer(attemptId, partId, 'LAN');
  const ans = await pool.query<{ id: number }>(`SELECT id FROM assessment_answers WHERE attempt_id = $1 AND part_id = $2`, [attemptId, partId]);
  await writeAwardedMark({ answerId: Number(ans.rows[0]!.id), marksAwarded: awarded, marksTotal: total, marker: 'auto', confidence: 1, status: confirmed ? 'confirmed' : 'suggested', needsReview: false });
}

beforeAll(async () => {
  const slot = await pool.query<{ gcId: number; courseId: number; groupId: number }>(
    `SELECT gc.id AS "gcId", gc.course_id AS "courseId", gc.group_id AS "groupId"
     FROM timetabled_lesson_courses tlc JOIN group_courses gc ON gc.id = tlc.group_course_id
     JOIN timetabled_lessons tl ON tl.id = tlc.timetabled_lesson_id JOIN period_definitions p ON p.id = tl.period_definition_id
     WHERE gc.active AND p.academic_year_id = (SELECT id FROM academic_years WHERE is_current) LIMIT 1`,
  );
  const s = slot.rows[0]!;
  courseId = Number(s.courseId); gcId = Number(s.gcId); groupId = Number(s.groupId);
  specPointId = Number((await pool.query<{ id: number }>(`INSERT INTO course_spec_points (course_id, code, title, display_order, active) VALUES ($1,'ZZR.1','Topic',0,true) RETURNING id`, [courseId])).rows[0]!.id);
  schemeId = Number((await pool.query<{ id: number }>(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1,'ZZR scheme',91,false) RETURNING id`, [courseId])).rows[0]!.id);
  unitId = Number((await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1,'ZZR unit',0) RETURNING id`, [schemeId])).rows[0]!.id);
  assessmentId = await materialiseAssessment({
    unitId, schemeId, courseId, title: 'ZZR results paper', style: 'gcse', examBoard: 'OCR J277', blueprint: {},
    questions: [{ stem: 'Objective', specPointId, isUncovered: false, parts: [{ partLabel: 'a', prompt: 'Pick', marks: 2, expectedResponseType: 'multiple_choice', partConfig: { options: ['LAN', 'WAN'] }, markPoints: [{ text: 'LAN', marks: 2, isRequired: true, acceptedAlternatives: [], kind: 'choice' }] }] }],
  });
  await setAssessmentStatus(assessmentId, 'ready');
  await assignToClass(assessmentId, gcId, { resultsMode: 'on_release' });
  partAId = Number((await pool.query<{ id: number }>(`SELECT p.id FROM assessment_question_parts p JOIN assessment_questions q ON q.id = p.question_id WHERE q.assessment_id = $1`, [assessmentId])).rows[0]!.id);

  pupilId = Number((await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token) VALUES ('ZZR Pupil','PUPIL_ZZR1') RETURNING id`)).rows[0]!.id);
  testPupilId = Number((await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token, is_test) VALUES ('ZZR Test','PUPIL_ZZR2',true) RETURNING id`)).rows[0]!.id);
  await pool.query(`INSERT INTO enrolments (pupil_id, group_id, active) VALUES ($1,$2,true), ($3,$2,true)`, [pupilId, groupId, testPupilId]);

  // REAL attempt: 2/2, confirmed, submitted; per-spec-point cache via recompute.
  const real = await startAttempt(assessmentId, pupilId, gcId, false);
  await markObjectivePart(real.id, partAId, 2, 2, true);
  await pool.query(`INSERT INTO assessment_spec_point_results (attempt_id, spec_point_id, marks_awarded, marks_total) VALUES ($1,$2,2,2)`, [real.id, specPointId]);
  await submitAttempt(real.id);
  await recomputeAttempt(real.id);

  // TEST attempt: a wildly different score, must be EXCLUDED everywhere.
  const test = await startAttempt(assessmentId, testPupilId, gcId, true);
  await markObjectivePart(test.id, partAId, 0, 2, true);
  await pool.query(`INSERT INTO assessment_spec_point_results (attempt_id, spec_point_id, marks_awarded, marks_total) VALUES ($1,$2,0,2)`, [test.id, specPointId]);
  await submitAttempt(test.id);
  await recomputeAttempt(test.id);
});

afterAll(async () => {
  await pool.query(`DELETE FROM assessments WHERE unit_id = $1`, [unitId]);
  await pool.query(`DELETE FROM enrolments WHERE pupil_id IN ($1,$2)`, [pupilId, testPupilId]);
  await pool.query(`DELETE FROM pupils WHERE id IN ($1,$2)`, [pupilId, testPupilId]);
  await pool.query(`DELETE FROM course_spec_points WHERE id = $1`, [specPointId]);
  await pool.query(`DELETE FROM units WHERE id = $1`, [unitId]);
  await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [schemeId]);
  await pool.end();
});

describe('assessment analytics — is_test exclusion + release', () => {
  it('per-pupil read includes the real attempt only', async () => {
    const rows = await perPupilForAssessment(assessmentId);
    expect(rows.map((r) => r.pupilId)).toEqual([pupilId]); // test attempt excluded
    expect(rows[0]!.scoreAwarded).toBe(2);
  });

  it('per-spec-point mastery aggregates the real attempt only (test excluded)', async () => {
    const sp = await specPointMasteryForAssessment(assessmentId);
    const mine = sp.find((s) => s.specPointId === specPointId)!;
    expect(mine.nPupils).toBe(1); // only the real attempt
    expect(mine.awarded).toBe(2);
    expect(mine.pct).toBe(100); // a test 0/2 would have dragged this down
  });

  it('cohort signal excludes the test attempt', async () => {
    const sig = await assessmentSignalForClass(gcId);
    expect(sig.get(pupilId)).toBe(100);
    expect(sig.has(testPupilId)).toBe(false);
  });

  it('release flips pupil visibility (on_release)', async () => {
    expect(await pupilResults(pupilId, assessmentId)).toBeNull(); // held back
    await releaseFor(assessmentId, gcId, true);
    const r = await pupilResults(pupilId, assessmentId);
    expect(r).toBeTruthy();
    expect(r!.awarded).toBe(2); // confirmed marks only
    expect(r!.total).toBe(2);
    expect(r!.items).toHaveLength(1);
    expect(r!.specPoints).toHaveLength(1); // confirmed objective → spec-point breakdown shown
    await setReleased(assessmentId, gcId, false); // un-release → hidden again
    expect(await pupilResults(pupilId, assessmentId)).toBeNull();
  });

  it('a pupil never sees a SUGGESTED (unconfirmed) mark — per-part OR per-spec-point', async () => {
    // make the mark suggested again, release, and assert BOTH the confirmed-only reads return nothing
    await pool.query(`UPDATE assessment_awarded_marks am SET status='suggested' FROM assessment_answers ans WHERE ans.id=am.answer_id AND ans.attempt_id IN (SELECT id FROM assessment_attempts WHERE assessment_id=$1 AND pupil_id=$2 AND NOT is_test)`, [assessmentId, pupilId]);
    await releaseFor(assessmentId, gcId, true);
    const r = await pupilResults(pupilId, assessmentId);
    expect(r!.items).toHaveLength(0); // suggested mark excluded from the per-part list
    expect(r!.specPoints).toHaveLength(0); // and from the per-spec-point breakdown (was leaking before)
    await confirmMarksForAttempt((await pool.query<{ id: number }>(`SELECT id FROM assessment_attempts WHERE assessment_id=$1 AND pupil_id=$2 AND NOT is_test`, [assessmentId, pupilId])).rows[0]!.id);
  });
});
