import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { createPupil, disposePupil } from '../../src/repos/pupils';
import { addEvidence } from '../../src/repos/progression';

// 16A.6 — progression evidence is a NEW pupil-data category, so the Phase-10 disposal path must cover it:
// a full ERASURE clears the pupil's criteria evidence + year-assessment rows; an ANONYMISE keeps the
// (now nameless) attainment, like marks. Locks both, and that evidence is never something AI sees.
let eraseId = 0;
let anonId = 0;
let criterionId = 0;
let stageId = 0;

beforeAll(async () => {
  // any real seeded criterion + its stage (the year ladder seed provides these)
  const cr = await pool.query<{ id: number; stage_id: number }>(`SELECT id, stage_id FROM prog_criteria ORDER BY id LIMIT 1`);
  criterionId = Number(cr.rows[0]!.id);
  stageId = Number(cr.rows[0]!.stage_id);

  eraseId = (await createPupil('ZZE Erase Prog')).id;
  anonId = (await createPupil('ZZE Anon Prog')).id;
  for (const id of [eraseId, anonId]) {
    await addEvidence({ pupilId: id, criterionId, sourceKind: 'manual' });
    await pool.query(`INSERT INTO pupil_year_assessment (pupil_id, stage_id, overall_label) VALUES ($1,$2,'Stage X')`, [id, stageId]);
  }
});

afterAll(async () => {
  // erase deletes its pupil; anon keeps a (nameless) pupil — clean both up.
  for (const id of [eraseId, anonId]) {
    await pool.query(`DELETE FROM pupil_criteria_evidence WHERE pupil_id = $1`, [id]).catch(() => {});
    await pool.query(`DELETE FROM pupil_year_assessment WHERE pupil_id = $1`, [id]).catch(() => {});
    await pool.query(`DELETE FROM pupils WHERE id = $1`, [id]).catch(() => {});
  }
  await pool.query(`DELETE FROM pupil_disposals WHERE ai_token IN (SELECT ai_token FROM pupils WHERE display_name LIKE 'ZZE %')`).catch(() => {});
  await pool.end();
});

const countEvidence = async (id: number): Promise<number> =>
  Number((await pool.query<{ n: number }>(`SELECT count(*)::int n FROM pupil_criteria_evidence WHERE pupil_id = $1`, [id])).rows[0]!.n);
const countYearAsmt = async (id: number): Promise<number> =>
  Number((await pool.query<{ n: number }>(`SELECT count(*)::int n FROM pupil_year_assessment WHERE pupil_id = $1`, [id])).rows[0]!.n);

describe('16A.6 — progression evidence honours the disposal path', () => {
  it('a full ERASURE clears the pupil\'s criteria evidence + year assessment (and counts them)', async () => {
    expect(await countEvidence(eraseId)).toBe(1);
    const result = await disposePupil(eraseId, 'erase');
    expect(result).not.toBeNull();
    expect(result!.counts.progressionEvidence).toBe(1);
    expect(result!.counts.yearAssessments).toBe(1);
    expect(await countEvidence(eraseId)).toBe(0);
    expect(await countYearAsmt(eraseId)).toBe(0);
  });

  it('an ANONYMISE keeps the now-nameless attainment (evidence stays under the token, like marks)', async () => {
    await disposePupil(anonId, 'anonymise');
    expect(await countEvidence(anonId)).toBe(1); // kept — cohort attainment, no longer identifying
  });
});
