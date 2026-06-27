import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import {
  addEvidence,
  criteriaEvidencedByAttempt,
  criteriaForUnit,
  evidencedCriterionIds,
  getUnitPlacement,
  recordUnitPlacement,
  tagQuestionCriterion,
} from '../../src/repos/progression';
import { placedPerStrand } from '../../src/services/progression';

// 16A.8 — assessments as stage evidence: an end-of-unit question tagged to a criterion, scored well, yields
// that criterion as evidence; the per-strand placement is recorded for the unit. Deterministic, no AI.
let schemeId = 0, strandId = 0, progUnitId = 0, criterionId = 0, pupilId = 0;
let assessmentId = 0, questionId = 0, attemptId = 0;

async function seedAssessmentChain(): Promise<void> {
  const u = await pool.query<{ unit: number; scheme: number; course: number }>(
    `SELECT u.id AS unit, s.id AS scheme, s.course_id AS course FROM units u JOIN schemes_of_work s ON s.id = u.scheme_id WHERE s.active LIMIT 1`,
  );
  const unitId = Number(u.rows[0]!.unit), sowId = Number(u.rows[0]!.scheme), courseId = Number(u.rows[0]!.course);
  const gcId = Number((await pool.query<{ id: number }>(`SELECT id FROM group_courses WHERE course_id = $1 AND active LIMIT 1`, [courseId])).rows[0]!.id);
  assessmentId = Number((await pool.query<{ id: number }>(`INSERT INTO assessments (unit_id, scheme_id, course_id, title, purpose, status) VALUES ($1,$2,$3,'ZZUP paper','end_of_unit','ready') RETURNING id`, [unitId, sowId, courseId])).rows[0]!.id);
  questionId = Number((await pool.query<{ id: number }>(`INSERT INTO assessment_questions (assessment_id, display_order, stem, marks_total) VALUES ($1,0,'ZZ stem',4) RETURNING id`, [assessmentId])).rows[0]!.id);
  const partId = Number((await pool.query<{ id: number }>(`INSERT INTO assessment_question_parts (question_id, part_label, prompt, marks, expected_response_type) VALUES ($1,'a','ZZ prompt',4,'short_text') RETURNING id`, [questionId])).rows[0]!.id);
  attemptId = Number((await pool.query<{ id: number }>(`INSERT INTO assessment_attempts (assessment_id, pupil_id, group_course_id, status) VALUES ($1,$2,$3,'submitted') RETURNING id`, [assessmentId, pupilId, gcId])).rows[0]!.id);
  const answerId = Number((await pool.query<{ id: number }>(`INSERT INTO assessment_answers (attempt_id, part_id) VALUES ($1,$2) RETURNING id`, [attemptId, partId])).rows[0]!.id);
  await pool.query(`INSERT INTO assessment_awarded_marks (answer_id, marks_awarded, marks_total, marker, status) VALUES ($1,4,4,'auto','confirmed')`, [answerId]); // aced
}

beforeAll(async () => {
  schemeId = Number((await pool.query<{ id: number }>(`INSERT INTO progression_schemes (name, kind) VALUES ('ZZUP scheme','year_ladder') RETURNING id`)).rows[0]!.id);
  strandId = Number((await pool.query<{ id: number }>(`INSERT INTO prog_strands (scheme_id, code, name) VALUES ($1,'PG','Programming') RETURNING id`, [schemeId])).rows[0]!.id);
  const stageId = Number((await pool.query<{ id: number }>(`INSERT INTO prog_stages (scheme_id, ordinal, label) VALUES ($1,12,'Year 7') RETURNING id`, [schemeId])).rows[0]!.id);
  progUnitId = Number((await pool.query<{ id: number }>(`INSERT INTO prog_units (scheme_id, stage_id, strand_id, title) VALUES ($1,$2,$3,'ZZ unit') RETURNING id`, [schemeId, stageId, strandId])).rows[0]!.id);
  const lessonId = Number((await pool.query<{ id: number }>(`INSERT INTO prog_lessons (unit_id, objective) VALUES ($1,'obj') RETURNING id`, [progUnitId])).rows[0]!.id);
  criterionId = Number((await pool.query<{ id: number }>(`INSERT INTO prog_criteria (lesson_id, stage_id, strand_id, descriptor) VALUES ($1,$2,$3,'I can ZZUP') RETURNING id`, [lessonId, stageId, strandId])).rows[0]!.id);
  pupilId = Number((await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token) VALUES ('ZZUP Pupil','PUPIL_ZZUP') RETURNING id`)).rows[0]!.id);
  await seedAssessmentChain();
  await tagQuestionCriterion(questionId, criterionId);
});

afterAll(async () => {
  await pool.query(`DELETE FROM pupil_unit_placement WHERE pupil_id = $1`, [pupilId]).catch(() => {});
  await pool.query(`DELETE FROM pupil_criteria_evidence WHERE pupil_id = $1`, [pupilId]).catch(() => {});
  await pool.query(`DELETE FROM pupils WHERE id = $1`, [pupilId]).catch(() => {});
  await pool.query(`DELETE FROM assessments WHERE id = $1`, [assessmentId]).catch(() => {});
  await pool.query(`DELETE FROM progression_schemes WHERE id = $1`, [schemeId]).catch(() => {});
  await pool.end();
});

describe('16A.8 — end-of-unit marks become stage evidence + a per-unit placement', () => {
  it('a tagged question scored ≥70% yields its criterion as evidence', async () => {
    const evidenced = await criteriaEvidencedByAttempt(attemptId);
    expect(evidenced.has(criterionId)).toBe(true);
  });

  it('writing that evidence + recording the placement reflects the reached stage', async () => {
    for (const cId of await criteriaEvidencedByAttempt(attemptId)) {
      await addEvidence({ pupilId, criterionId: cId, sourceKind: 'assessment', sourceRefId: attemptId });
    }
    expect((await evidencedCriterionIds(pupilId)).has(criterionId)).toBe(true);

    const placed = placedPerStrand(await criteriaForUnit(progUnitId), await evidencedCriterionIds(pupilId));
    expect(placed[strandId]).toBe(12); // the single unit criterion is met → strand at Year 7
    await recordUnitPlacement({ pupilId, unitId: progUnitId, assessmentId, placedPerStrand: placed });
    const back = await getUnitPlacement(pupilId, progUnitId);
    expect(back?.placedPerStrand?.[strandId]).toBe(12);
  });
});
