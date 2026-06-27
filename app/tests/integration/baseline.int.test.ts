import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { createPupil, disposePupil } from '../../src/repos/pupils';
import { baselineStatusForClass, getBaseline, recordBaseline } from '../../src/repos/baseline';

// 16A.7 — the baseline repo: record a placement, surface class status, and honour the erasure path.
let gcId = 0, realPupilId = 0, yearId = 0, throwawayId = 0;

beforeAll(async () => {
  yearId = Number((await pool.query<{ id: number }>(`SELECT id FROM academic_years WHERE is_current`)).rows[0]!.id);
  const cls = await pool.query<{ gc: number; pid: number }>(
    `SELECT gc.id AS gc, en.pupil_id AS pid FROM group_courses gc JOIN enrolments en ON en.group_id = gc.group_id AND en.active WHERE gc.active ORDER BY gc.id LIMIT 1`,
  );
  gcId = Number(cls.rows[0]!.gc);
  realPupilId = Number(cls.rows[0]!.pid);
  throwawayId = (await createPupil('ZZBL Throwaway')).id;
});

afterAll(async () => {
  await pool.query(`DELETE FROM pupil_baseline WHERE pupil_id = ANY($1)`, [[realPupilId, throwawayId]]).catch(() => {});
  await pool.query(`DELETE FROM pupils WHERE id = $1`, [throwawayId]).catch(() => {});
  await pool.query(`DELETE FROM pupil_disposals WHERE ai_token IN (SELECT ai_token FROM pupils WHERE display_name LIKE 'ZZBL %')`).catch(() => {});
  await pool.end();
});

describe('16A.7 — baseline repo', () => {
  it('records a placement and surfaces it in the class status (not missing, low-confidence first)', async () => {
    await recordBaseline({ pupilId: realPupilId, groupCourseId: gcId, academicYearId: yearId, mode: 'cold_start', placedPerStrand: { 1: 12 }, confidence: 'low' });
    const status = await baselineStatusForClass(gcId, yearId);
    const mine = status.find((s) => s.pupilId === realPupilId);
    expect(mine).toBeTruthy();
    expect(mine!.baselineMissing).toBe(false);
    expect(mine!.confidence).toBe('low');
    // pupils without a baseline are flagged missing
    expect(status.some((s) => s.baselineMissing)).toBe(true);
  });

  it('getBaseline returns the placement', async () => {
    const b = await getBaseline(realPupilId, gcId, yearId);
    expect(b?.confidence).toBe('low');
    expect(b?.placedPerStrand?.['1']).toBe(12);
  });

  it('erasure clears the baseline (and counts it)', async () => {
    await recordBaseline({ pupilId: throwawayId, groupCourseId: gcId, academicYearId: yearId, mode: 'cold_start', placedPerStrand: {}, confidence: 'ok' });
    const result = await disposePupil(throwawayId, 'erase');
    expect(result!.counts.baselines).toBe(1);
    expect(await getBaseline(throwawayId, gcId, yearId)).toBeNull();
  });
});
