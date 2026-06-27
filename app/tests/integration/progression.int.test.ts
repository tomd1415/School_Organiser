import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import {
  addEvidence,
  bindClassToScheme,
  criteriaForScheme,
  evidencedCriterionIds,
  getSchemeForClass,
  listStrands,
} from '../../src/repos/progression';
import { currentStagePerStrand, overallRollUp } from '../../src/services/progression';

// 16A.1 — the progression schema wired to the pure roll-up. Builds a throwaway GCSE-shaped scheme (2 strands
// × 2 grades × 2 criteria), binds a real class, evidences a pupil, and asserts the per-strand stage + overall
// roll-up computed from real SQL. All scratch data is namespaced 'ZZTEST' and torn down in finally.
let schemeId = 0;
let pupilId = 0;
let groupCourseId = 0;
const critId: Record<string, number> = {};

beforeAll(async () => {
  schemeId = Number(
    (await pool.query<{ id: number }>(
      `INSERT INTO progression_schemes (name, kind, exam_board) VALUES ('ZZTEST scheme','gcse_grades','OCR J277') RETURNING id`,
    )).rows[0]!.id,
  );
  const strand: Record<string, number> = {};
  for (const [code, name, ord] of [['PG', 'Programming', 0], ['TH', 'Theory', 1]] as const) {
    strand[code] = Number(
      (await pool.query<{ id: number }>(`INSERT INTO prog_strands (scheme_id, code, name, display_order) VALUES ($1,$2,$3,$4) RETURNING id`, [schemeId, code, name, ord])).rows[0]!.id,
    );
  }
  const stage: Record<number, number> = {};
  for (const ord of [3, 4]) {
    stage[ord] = Number(
      (await pool.query<{ id: number }>(`INSERT INTO prog_stages (scheme_id, ordinal, label) VALUES ($1,$2,$3) RETURNING id`, [schemeId, ord, `Grade ${ord}`])).rows[0]!.id,
    );
  }
  // a unit+lesson per (strand) so criteria have a content home; two criteria per (strand, grade).
  for (const code of ['PG', 'TH'] as const) {
    for (const ord of [3, 4]) {
      const unitId = Number(
        (await pool.query<{ id: number }>(`INSERT INTO prog_units (scheme_id, stage_id, strand_id, title) VALUES ($1,$2,$3,$4) RETURNING id`, [schemeId, stage[ord], strand[code], `ZZ ${code} G${ord}`])).rows[0]!.id,
      );
      const lessonId = Number(
        (await pool.query<{ id: number }>(`INSERT INTO prog_lessons (unit_id, objective) VALUES ($1,$2) RETURNING id`, [unitId, 'obj'])).rows[0]!.id,
      );
      for (const n of [1, 2]) {
        const id = Number(
          (await pool.query<{ id: number }>(
            `INSERT INTO prog_criteria (lesson_id, stage_id, strand_id, descriptor, display_order) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
            [lessonId, stage[ord], strand[code], `I can ${code} G${ord} #${n}`, n],
          )).rows[0]!.id,
        );
        critId[`${code}${ord}_${n}`] = id;
      }
    }
  }
  groupCourseId = Number((await pool.query<{ id: number }>(`SELECT id FROM group_courses WHERE active ORDER BY id LIMIT 1`)).rows[0]!.id);
  pupilId = Number((await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token) VALUES ('ZZTEST Prog','PUPIL_ZZPROG') RETURNING id`)).rows[0]!.id);
});

afterAll(async () => {
  await pool.query(`DELETE FROM pupil_criteria_evidence WHERE pupil_id = $1`, [pupilId]).catch(() => {});
  await pool.query(`DELETE FROM pupils WHERE id = $1`, [pupilId]).catch(() => {});
  await pool.query(`DELETE FROM group_course_scheme WHERE scheme_id = $1`, [schemeId]).catch(() => {});
  await pool.query(`DELETE FROM progression_schemes WHERE id = $1`, [schemeId]).catch(() => {}); // cascades content
  await pool.end();
});

describe('progression schema ↔ pure roll-up (integration)', () => {
  it('binds a class to a scheme and reads it back', async () => {
    await bindClassToScheme(groupCourseId, schemeId);
    expect(await getSchemeForClass(groupCourseId)).toBe(schemeId);
  });

  it('computes per-strand stage + overall from real evidence', async () => {
    // Programming: both grade-3 + both grade-4 → grade 4. Theory: both grade-3 only → grade 3.
    for (const k of ['PG3_1', 'PG3_2', 'PG4_1', 'PG4_2', 'TH3_1', 'TH3_2']) {
      expect(await addEvidence({ pupilId, criterionId: critId[k]!, sourceKind: 'manual' })).toBe(true);
    }
    const [criteria, evidenced, strands] = await Promise.all([
      criteriaForScheme(schemeId),
      evidencedCriterionIds(pupilId),
      listStrands(schemeId),
    ]);
    const perStrand = currentStagePerStrand(criteria, evidenced);
    const pg = strands.find((s) => s.code === 'PG')!;
    const th = strands.find((s) => s.code === 'TH')!;
    expect(perStrand.find((p) => p.strandId === pg.id)?.stageOrdinal).toBe(4);
    expect(perStrand.find((p) => p.strandId === th.id)?.stageOrdinal).toBe(3);
    expect(overallRollUp(perStrand).overallOrdinal).toBe(4); // (4+3)/2 = 3.5 → 4
  });

  it('addEvidence is idempotent on (pupil, criterion)', async () => {
    expect(await addEvidence({ pupilId, criterionId: critId.PG3_1!, sourceKind: 'manual' })).toBe(false);
  });
});
