import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { materialiseAssessment, setAssessmentStatus } from '../../src/repos/assessments';
import { assignToClass, attemptMarkingRows, confirmMarksForAttempt, enqueueAttemptMark, getAttempt } from '../../src/repos/assessmentAttempts';
import { setSetting } from '../../src/repos/settings';
import { invalidateMarksGate } from '../../src/auth/marksGate';
import { startTake, answer as saveTakeAnswer, submit } from '../../src/services/assessmentTake';
import { markAttempt, recomputeAttempt } from '../../src/services/assessmentMarking';
import { runDueAttemptMarks } from '../../src/services/assessmentMarkQueue';
import { listSafeguardingItems } from '../../src/repos/safeguarding';

// Phase 4 — marking lifecycle (integration; needs the dev DB; AI forced OFF). Objective parts auto-mark;
// open parts are left unmarked with AI off (degrade writes nothing) + re-armed by the worker; a guard-phrase
// answer is WITHHELD from AI and flagged disclosure (surfacing in the safeguarding register);
// confirm-all skips needs_review; the score + per-spec-point caches recompute.

let courseId = 0, gcId = 0, groupId = 0, schemeId = 0, unitId = 0, assessmentId = 0, pupilId = 0, specPointId = 0;
let prevMarks: string | null = null;
let attemptId = 0;
let partAId = 0, partBId = 0, partCId = 0;

beforeAll(async () => {
  const slot = await pool.query<{ gcId: number; courseId: number; groupId: number }>(
    `SELECT gc.id AS "gcId", gc.course_id AS "courseId", gc.group_id AS "groupId"
     FROM timetabled_lesson_courses tlc JOIN group_courses gc ON gc.id = tlc.group_course_id
     JOIN timetabled_lessons tl ON tl.id = tlc.timetabled_lesson_id
     JOIN period_definitions p ON p.id = tl.period_definition_id
     WHERE gc.active AND p.academic_year_id = (SELECT id FROM academic_years WHERE is_current) LIMIT 1`,
  );
  const s = slot.rows[0]!;
  courseId = Number(s.courseId); gcId = Number(s.gcId); groupId = Number(s.groupId);
  specPointId = Number((await pool.query<{ id: number }>(`INSERT INTO course_spec_points (course_id, code, title, display_order, active) VALUES ($1,'ZZM.1','Topic',0,true) RETURNING id`, [courseId])).rows[0]!.id);
  schemeId = Number((await pool.query<{ id: number }>(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1,'ZZM scheme',92,false) RETURNING id`, [courseId])).rows[0]!.id);
  unitId = Number((await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1,'ZZM unit',0) RETURNING id`, [schemeId])).rows[0]!.id);
  assessmentId = await materialiseAssessment({
    unitId, schemeId, courseId, title: 'ZZM marking paper', style: 'gcse', examBoard: 'OCR J277', blueprint: {},
    questions: [
      { stem: 'Objective', specPointId, isUncovered: false, parts: [{ partLabel: 'a', prompt: 'Pick', marks: 1, expectedResponseType: 'multiple_choice', partConfig: { options: ['LAN', 'WAN'] }, markPoints: [{ text: 'LAN', marks: 1, isRequired: true, acceptedAlternatives: [], kind: 'choice' }] }] },
      { stem: 'Open', specPointId: null, isUncovered: false, parts: [{ partLabel: 'a', prompt: 'Explain', marks: 3, expectedResponseType: 'extended_response', markPoints: [{ text: 'a reason', marks: 3, isRequired: false, acceptedAlternatives: [], kind: 'open' }] }] },
      { stem: 'Open2', specPointId: null, isUncovered: false, parts: [{ partLabel: 'a', prompt: 'Discuss', marks: 3, expectedResponseType: 'extended_response', markPoints: [{ text: 'judgement', marks: 3, isRequired: false, acceptedAlternatives: [], kind: 'open' }] }] },
    ],
  });
  await setAssessmentStatus(assessmentId, 'ready');
  await assignToClass(assessmentId, gcId, { resultsMode: 'instant' });
  pupilId = Number((await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token) VALUES ('ZZM Pupil','PUPIL_ZZM1') RETURNING id`)).rows[0]!.id);
  await pool.query(`INSERT INTO enrolments (pupil_id, group_id, active) VALUES ($1,$2,true)`, [pupilId, groupId]);
  prevMarks = await pool.query<{ v: string | null }>(`SELECT value v FROM settings WHERE key='pupil_marks_enabled'`).then((r) => r.rows[0]?.v ?? null);
  await setSetting('pupil_marks_enabled', 'true');
  invalidateMarksGate();

  // Take + answer + submit (submit runs objective inline + open inline-no-op in test mode).
  const r = await startTake(assessmentId, pupilId, false);
  if ('error' in r) throw new Error(r.error);
  attemptId = r.attempt.id;
  [partAId, partBId, partCId] = [r.paper.questions[0]!.parts[0]!.partId, r.paper.questions[1]!.parts[0]!.partId, r.paper.questions[2]!.parts[0]!.partId];
  await saveTakeAnswer(assessmentId, r.attempt, partAId, 'LAN'); // correct objective
  await saveTakeAnswer(assessmentId, r.attempt, partBId, 'A LAN covers a single site.'); // open, AI-off → unmarked
  await saveTakeAnswer(assessmentId, r.attempt, partCId, 'I want to die'); // guard phrase → withheld + flagged
  await submit(r.attempt);
});

afterAll(async () => {
  await pool.query(`DELETE FROM assessments WHERE unit_id = $1`, [unitId]);
  await pool.query(`DELETE FROM enrolments WHERE pupil_id = $1`, [pupilId]);
  await pool.query(`DELETE FROM pupils WHERE id = $1`, [pupilId]);
  await pool.query(`DELETE FROM course_spec_points WHERE id = $1`, [specPointId]);
  await pool.query(`DELETE FROM units WHERE id = $1`, [unitId]);
  await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [schemeId]);
  await setSetting('pupil_marks_enabled', prevMarks ?? 'false');
  invalidateMarksGate();
  await pool.end();
});

const rowFor = async (partId: number) => (await attemptMarkingRows(attemptId)).find((r) => r.partId === partId)!;

describe('assessment marking lifecycle (AI off)', () => {
  it('auto-marks the objective part instantly', async () => {
    const a = await rowFor(partAId);
    expect(a.marker).toBe('auto');
    expect(a.marksAwarded).toBe(1);
    expect(a.status).toBe('suggested');
    expect(a.needsReview).toBe(false);
  });

  it('leaves an open part unmarked when AI is off (degrade writes nothing)', async () => {
    const b = await rowFor(partBId);
    expect(b.answerId).toBeTruthy(); // the answer exists
    expect(b.marker).toBeNull(); // but no mark was written
  });

  it('withholds a safeguarding-flagged answer from AI and flags it (disclosure)', async () => {
    const c = await rowFor(partCId);
    expect(c.disclosure).toBe(true);
    expect(c.needsReview).toBe(true);
    expect(c.marksAwarded).toBe(0);
    expect(c.marker).toBe('auto'); // marked by the guard, never sent to AI
    // it surfaces in the safeguarding register (assessment_answer stream)
    const reg = await listSafeguardingItems();
    expect(reg.some((x) => x.sourceType === 'assessment_answer' && x.text.includes('want to die'))).toBe(true);
  });

  it('confirm-all confirms the objective mark but SKIPS needs_review', async () => {
    const n = await confirmMarksForAttempt(attemptId);
    expect(n).toBe(1); // only partA's suggested, non-review mark
    expect((await rowFor(partAId)).status).toBe('confirmed');
    expect((await rowFor(partCId)).status).toBe('suggested'); // needs_review → not confirmed
  });

  it('recomputes the score + per-spec-point objective cache', async () => {
    await recomputeAttempt(attemptId);
    const at = await getAttempt(attemptId);
    expect(at!.scoreTotal).toBe(7); // whole paper
    expect(at!.scoreAwarded).toBe(1); // only the objective part scored (open unmarked / guard 0)
    const spr = await pool.query<{ awarded: number; total: number }>(
      `SELECT marks_awarded AS awarded, marks_total AS total FROM assessment_spec_point_results WHERE attempt_id = $1 AND spec_point_id = $2`, [attemptId, specPointId]);
    expect(spr.rows[0]).toMatchObject({ awarded: 1, total: 1 }); // objective-only attribution
  });

  it('the open AI pass re-arms the queue when AI is unavailable', async () => {
    await enqueueAttemptMark(attemptId); // simulate a queued open pass
    await runDueAttemptMarks(); // AI off → markAttemptOpen unavailable → re-arm
    const q = await pool.query(`SELECT 1 FROM assessment_mark_queue WHERE attempt_id = $1`, [attemptId]);
    expect(q.rowCount).toBe(1); // re-armed, not dropped
    expect((await rowFor(partBId)).marker).toBeNull(); // still unmarked (nothing written)
  });

  it('markAttempt is a no-op-safe manual trigger (objective already done; open degrades)', async () => {
    const res = await markAttempt(attemptId);
    expect(res.objective.marked).toBe(0); // partA already marked → skipped
    expect(['unavailable', 'nothing', 'ok']).toContain(res.open.status);
  });
});
