import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { addEvidence, recordYearAssessment, yearAnchorsForScheme, criteriaForScheme, evidencedCriterionIds } from '../../src/repos/progression';
import { currentStagePerStrand, overallRollUp } from '../../src/services/progression';

// 16A.5 — a recorded year-end overall (pupil_year_assessment) anchors the overall roll-up, overriding the
// computed cross-strand mean. Throwaway scheme: one strand, stages 12 & 13.
let schemeId = 0;
let pupilId = 0;
let stage13Id = 0;
const crit: number[] = [];

beforeAll(async () => {
  schemeId = Number((await pool.query<{ id: number }>(`INSERT INTO progression_schemes (name, kind) VALUES ('ZZYA scheme','year_ladder') RETURNING id`)).rows[0]!.id);
  const strandId = Number((await pool.query<{ id: number }>(`INSERT INTO prog_strands (scheme_id, code, name) VALUES ($1,'PG','Programming') RETURNING id`, [schemeId])).rows[0]!.id);
  const stage12Id = Number((await pool.query<{ id: number }>(`INSERT INTO prog_stages (scheme_id, ordinal, label) VALUES ($1,12,'Year 7') RETURNING id`, [schemeId])).rows[0]!.id);
  stage13Id = Number((await pool.query<{ id: number }>(`INSERT INTO prog_stages (scheme_id, ordinal, label) VALUES ($1,13,'Year 8') RETURNING id`, [schemeId])).rows[0]!.id);
  const unitId = Number((await pool.query<{ id: number }>(`INSERT INTO prog_units (scheme_id, stage_id, strand_id, title) VALUES ($1,$2,$3,'ZZ unit') RETURNING id`, [schemeId, stage12Id, strandId])).rows[0]!.id);
  const lessonId = Number((await pool.query<{ id: number }>(`INSERT INTO prog_lessons (unit_id, objective) VALUES ($1,'obj') RETURNING id`, [unitId])).rows[0]!.id);
  // one criterion at stage 12 — evidencing it places the pupil at stage 12 (computed overall = 12)
  crit.push(Number((await pool.query<{ id: number }>(`INSERT INTO prog_criteria (lesson_id, stage_id, strand_id, descriptor) VALUES ($1,$2,$3,'I can ZZ12') RETURNING id`, [lessonId, stage12Id, strandId])).rows[0]!.id));
  pupilId = Number((await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token) VALUES ('ZZYA Pupil','PUPIL_ZZYA') RETURNING id`)).rows[0]!.id);
  await addEvidence({ pupilId, criterionId: crit[0]!, sourceKind: 'manual' });
});

afterAll(async () => {
  await pool.query(`DELETE FROM pupil_year_assessment WHERE pupil_id = $1`, [pupilId]).catch(() => {});
  await pool.query(`DELETE FROM pupil_criteria_evidence WHERE pupil_id = $1`, [pupilId]).catch(() => {});
  await pool.query(`DELETE FROM pupils WHERE id = $1`, [pupilId]).catch(() => {});
  await pool.query(`DELETE FROM progression_schemes WHERE id = $1`, [schemeId]).catch(() => {});
  await pool.end();
});

describe('16A.5 — year-end overall anchor', () => {
  it('computed overall is the evidenced stage with no anchor', async () => {
    const perStrand = currentStagePerStrand(await criteriaForScheme(schemeId), await evidencedCriterionIds(pupilId));
    expect(overallRollUp(perStrand).overallOrdinal).toBe(12);
    expect((await yearAnchorsForScheme([pupilId], schemeId)).size).toBe(0);
  });

  it('a recorded year-end assessment anchors the overall to its stage (overriding the computed mean)', async () => {
    await recordYearAssessment({ pupilId, stageId: stage13Id, overallLabel: 'Year 8 (confirmed)' });
    const anchors = await yearAnchorsForScheme([pupilId], schemeId);
    expect(anchors.get(pupilId)).toBe(13);
    const perStrand = currentStagePerStrand(await criteriaForScheme(schemeId), await evidencedCriterionIds(pupilId));
    expect(overallRollUp(perStrand, { yearAssessmentOrdinal: anchors.get(pupilId) ?? null }).overallOrdinal).toBe(13);
  });

  it('recordYearAssessment is idempotent on (pupil, stage)', async () => {
    await recordYearAssessment({ pupilId, stageId: stage13Id, overallLabel: 'updated' });
    const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM pupil_year_assessment WHERE pupil_id = $1`, [pupilId]);
    expect(rows[0]!.n).toBe(1);
  });
});
