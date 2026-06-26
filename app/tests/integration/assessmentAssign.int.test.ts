import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { materialiseAssessment, setAssessmentStatus } from '../../src/repos/assessments';
import { assign, eligibleClassesFor, unassignClass } from '../../src/services/assessmentAssign';

// Phase 2 — assign + eligibility (integration; needs the dev DB). Uses an existing SEEDED timetable slot
// (so listSlotsForCourse returns a real class) and creates an isolated, INACTIVE scheme/unit under that
// class's course. No AI. Cleaned up in afterAll (assessments cascade to assessment_classes).

let courseId = 0;
let gcId = 0;
let schemeId = 0;
let unitId = 0;
let readyId = 0;
let draftId = 0;

beforeAll(async () => {
  // A seeded class (group_course) that is actually timetabled — mirrors listSlotsForCourse's join.
  const slot = await pool.query<{ gcId: number; courseId: number }>(
    `SELECT gc.id AS "gcId", gc.course_id AS "courseId"
     FROM timetabled_lesson_courses tlc
     JOIN group_courses gc      ON gc.id = tlc.group_course_id
     JOIN timetabled_lessons tl ON tl.id = tlc.timetabled_lesson_id
     JOIN period_definitions p  ON p.id  = tl.period_definition_id
     WHERE gc.active AND p.academic_year_id = (SELECT id FROM academic_years WHERE is_current)
     LIMIT 1`,
  );
  if (!slot.rows[0]) throw new Error('no seeded timetabled class found — run npm run seed');
  gcId = Number(slot.rows[0].gcId);
  courseId = Number(slot.rows[0].courseId);

  schemeId = Number((await pool.query<{ id: number }>(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1,'ZZC scheme',95,false) RETURNING id`, [courseId])).rows[0]!.id);
  unitId = Number((await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1,'ZZC unit',0) RETURNING id`, [schemeId])).rows[0]!.id);

  const mk = (title: string) =>
    materialiseAssessment({
      unitId, schemeId, courseId, title, style: 'gcse', examBoard: 'OCR J277', blueprint: { groupCourseId: gcId },
      questions: [{ stem: 'Q', specPointId: null, isUncovered: false, parts: [{ partLabel: 'a', prompt: 'p', marks: 1, expectedResponseType: 'short_text', markPoints: [{ text: 'x', marks: 1, isRequired: false, acceptedAlternatives: [], kind: 'exact' }] }] }],
    });
  readyId = await mk('ZZC ready');
  await setAssessmentStatus(readyId, 'ready');
  draftId = await mk('ZZC draft');
});

afterAll(async () => {
  await pool.query(`DELETE FROM assessments WHERE unit_id = $1`, [unitId]); // cascades to assessment_classes
  await pool.query(`DELETE FROM units WHERE id = $1`, [unitId]);
  await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [schemeId]);
  await pool.end();
});

describe('assessment assignment', () => {
  it('lists the eligible class once (deduped), initially unassigned', async () => {
    const eligible = await eligibleClassesFor(readyId);
    const mine = eligible.filter((c) => c.groupCourseId === gcId);
    expect(mine).toHaveLength(1);
    expect(mine[0]!.assigned).toBe(false);
  });

  it('assigns with a window + results mode, then reflects it', async () => {
    const res = await assign(readyId, gcId, { availableFrom: '2026-07-01T09:00', availableUntil: '2026-07-08T16:00', resultsMode: 'instant' });
    expect(res.ok).toBe(true);
    const c = (await eligibleClassesFor(readyId)).find((x) => x.groupCourseId === gcId)!;
    expect(c.assigned).toBe(true);
    expect(c.resultsMode).toBe('instant');
    expect(c.window?.from).toMatch(/2026-07-01/);
  });

  it('editing the window updates it (idempotent upsert)', async () => {
    await assign(readyId, gcId, { availableFrom: '2026-07-02T09:00', availableUntil: null, resultsMode: 'on_release' });
    const c = (await eligibleClassesFor(readyId)).find((x) => x.groupCourseId === gcId)!;
    expect(c.window?.from).toMatch(/2026-07-02/);
    expect(c.window?.until).toBeNull();
    expect(c.resultsMode).toBe('on_release');
  });

  it('rejects an invalid window (close before open)', async () => {
    const res = await assign(readyId, gcId, { availableFrom: '2026-07-08T16:00', availableUntil: '2026-07-01T09:00' });
    expect(res.ok).toBe(false);
  });

  it('unassign removes the row', async () => {
    await unassignClass(readyId, gcId);
    const c = (await eligibleClassesFor(readyId)).find((x) => x.groupCourseId === gcId)!;
    expect(c.assigned).toBe(false);
  });

  it('refuses to assign a DRAFT assessment (ready-gate)', async () => {
    const res = await assign(draftId, gcId, {});
    expect(res.ok).toBe(false);
    expect(res.message).toMatch(/ready/i);
  });
});
