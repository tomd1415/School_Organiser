import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { materialiseAssessment, setAssessmentStatus } from '../../src/repos/assessments';
import { assignToClass, getPupilAttempt, savedAnswers } from '../../src/repos/assessmentAttempts';
import { setSetting } from '../../src/repos/settings';
import { invalidateMarksGate } from '../../src/auth/marksGate';
import { availableForPupil, answer as saveTakeAnswer, startTake, submit, takeTree } from '../../src/services/assessmentTake';
import { assessmentWithQuestions } from '../../src/repos/assessments';

// Phase 3 — take lifecycle (integration; needs the dev DB; no AI). Uses a seeded timetabled class, enrols a
// fresh pupil (and a test pupil) in it, and drives availability → start (idempotent) → save → submit.

let courseId = 0, gcId = 0, groupId = 0, schemeId = 0, unitId = 0, assessmentId = 0, pupilId = 0, testPupilId = 0;
let prevMarks: string | null = null;

beforeAll(async () => {
  const slot = await pool.query<{ gcId: number; courseId: number; groupId: number }>(
    `SELECT gc.id AS "gcId", gc.course_id AS "courseId", gc.group_id AS "groupId"
     FROM timetabled_lesson_courses tlc
     JOIN group_courses gc      ON gc.id = tlc.group_course_id
     JOIN timetabled_lessons tl ON tl.id = tlc.timetabled_lesson_id
     JOIN period_definitions p  ON p.id  = tl.period_definition_id
     WHERE gc.active AND p.academic_year_id = (SELECT id FROM academic_years WHERE is_current)
     LIMIT 1`,
  );
  if (!slot.rows[0]) throw new Error('no seeded timetabled class — run npm run seed');
  gcId = Number(slot.rows[0].gcId);
  courseId = Number(slot.rows[0].courseId);
  groupId = Number(slot.rows[0].groupId);

  schemeId = Number((await pool.query<{ id: number }>(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1,'ZZT scheme',94,false) RETURNING id`, [courseId])).rows[0]!.id);
  unitId = Number((await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1,'ZZT unit',0) RETURNING id`, [schemeId])).rows[0]!.id);
  assessmentId = await materialiseAssessment({
    unitId, schemeId, courseId, title: 'ZZT take paper', style: 'gcse', examBoard: 'OCR J277', blueprint: { groupCourseId: gcId },
    questions: [{
      stem: 'Networks', specPointId: null, isUncovered: false,
      parts: [
        { partLabel: 'a', prompt: 'Pick one', marks: 1, expectedResponseType: 'multiple_choice', partConfig: { options: ['LAN', 'WAN'] }, modelAnswer: 'SECRET-MODEL', markPoints: [{ text: 'SECRET-MP', marks: 1, isRequired: true, acceptedAlternatives: [], kind: 'choice' }] },
        { partLabel: 'b', prompt: 'Explain', marks: 2, expectedResponseType: 'extended_response', markPoints: [{ text: 'SECRET-MP2', marks: 2, isRequired: false, acceptedAlternatives: [], kind: 'open' }] },
      ],
    }],
  });
  await setAssessmentStatus(assessmentId, 'ready');
  await assignToClass(assessmentId, gcId, { resultsMode: 'instant' }); // available now (no window)

  pupilId = Number((await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token) VALUES ('ZZT Pupil','PUPIL_ZZT1') RETURNING id`)).rows[0]!.id);
  testPupilId = Number((await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token, is_test) VALUES ('ZZT Test','PUPIL_ZZT2',true) RETURNING id`)).rows[0]!.id);
  await pool.query(`INSERT INTO enrolments (pupil_id, group_id, active) VALUES ($1,$2,true), ($3,$2,true)`, [pupilId, groupId, testPupilId]);

  // Enable the DPIA marks gate so a real submit enqueues marking (restored in afterAll).
  prevMarks = await pool.query<{ v: string | null }>(`SELECT value v FROM settings WHERE key = 'pupil_marks_enabled'`).then((r) => r.rows[0]?.v ?? null);
  await setSetting('pupil_marks_enabled', 'true');
  invalidateMarksGate();
});

afterAll(async () => {
  await pool.query(`DELETE FROM assessments WHERE unit_id = $1`, [unitId]); // cascades attempts/answers/queue/classes
  await pool.query(`DELETE FROM enrolments WHERE pupil_id IN ($1,$2)`, [pupilId, testPupilId]);
  await pool.query(`DELETE FROM pupils WHERE id IN ($1,$2)`, [pupilId, testPupilId]);
  await pool.query(`DELETE FROM units WHERE id = $1`, [unitId]);
  await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [schemeId]);
  await setSetting('pupil_marks_enabled', prevMarks ?? 'false');
  invalidateMarksGate();
  await pool.end();
});

describe('assessment take lifecycle', () => {
  it('lists the assessment as available, not started', async () => {
    const items = await availableForPupil(pupilId, false);
    const mine = items.find((a) => a.id === assessmentId)!;
    expect(mine).toBeTruthy();
    expect(mine.attemptStatus).toBe('not_started');
  });

  it('startTake is idempotent and returns the PII-safe paper', async () => {
    const r1 = await startTake(assessmentId, pupilId, false);
    const r2 = await startTake(assessmentId, pupilId, false);
    if ('error' in r1 || 'error' in r2) throw new Error('startTake errored');
    expect(r2.attempt.id).toBe(r1.attempt.id); // one attempt
    expect(JSON.stringify(r1.paper)).not.toMatch(/SECRET-MODEL|SECRET-MP/); // no answer key
    expect(r1.paper.questions[0]!.parts[0]!.options).toEqual(['LAN', 'WAN']);
  });

  it('saves answers and restores them on resume', async () => {
    const r = await startTake(assessmentId, pupilId, false);
    if ('error' in r) throw new Error('errored');
    const [partA, partB] = r.paper.questions[0]!.parts;
    await saveTakeAnswer(assessmentId, r.attempt, partA!.partId, 'LAN');
    await saveTakeAnswer(assessmentId, r.attempt, partB!.partId, 'A LAN covers one site.');
    const saved = await savedAnswers(r.attempt.id);
    expect(saved.get(partA!.partId)).toBe('LAN');
    expect(saved.get(partB!.partId)).toBe('A LAN covers one site.');
  });

  it('rejects an answer for a part from another assessment', async () => {
    const r = await startTake(assessmentId, pupilId, false);
    if ('error' in r) throw new Error('errored');
    const res = await saveTakeAnswer(assessmentId, r.attempt, 999_999_999, 'nope');
    expect(res.ok).toBe(false);
  });

  it('submits (double-submit guarded) and enqueues marking for a real pupil', async () => {
    const r = await startTake(assessmentId, pupilId, false);
    if ('error' in r) throw new Error('errored');
    expect(await submit(r.attempt)).toBe(true);
    const r2 = await getPupilAttempt(assessmentId, pupilId, false);
    expect(r2!.status).toBe('submitted');
    expect(await submit(r2!)).toBe(false); // already submitted
    const queued = await pool.query(`SELECT 1 FROM assessment_mark_queue WHERE attempt_id = $1`, [r.attempt.id]);
    expect(queued.rowCount).toBe(1);
    const items = await availableForPupil(pupilId, false);
    expect(items.find((a) => a.id === assessmentId)!.attemptStatus).toBe('submitted');
  });

  it('a TEST attempt is separate and never enqueued for marking', async () => {
    const r = await startTake(assessmentId, testPupilId, true);
    if ('error' in r) throw new Error('errored');
    expect(await submit(r.attempt)).toBe(true);
    const queued = await pool.query(`SELECT 1 FROM assessment_mark_queue WHERE attempt_id = $1`, [r.attempt.id]);
    expect(queued.rowCount).toBe(0); // test attempts are excluded from marking
    expect((await assessmentWithQuestions(assessmentId))!.id).toBe(assessmentId); // sanity: tree still loads
    expect(takeTree((await assessmentWithQuestions(assessmentId))!).questions).toHaveLength(1);
  });
});
