import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { importReferenceFiles } from '../../src/services/referenceLibrary';
import { confirmResourceCriterion, linkResourceCriterion, listActivityTypes, referencesForCriterion, reviewQueue, seedActivityTypes } from '../../src/repos/reference';

// Phase 17.1/17.2/17.3 — import reference files (in-memory fixtures mirroring the TeachComputing tree), then
// link to a criterion and exercise the library lookup + review queue. Self-contained; tears down its rows.
let resourceIds: number[] = [];
let criterionId = 0;

const FIXTURES = [
  { relPath: 'KS3/year_9/unit_99/Lesson 1 debug the broken countdown_v1.zip', buf: Buffer.from('zzref lesson 1') },
  { relPath: 'KS3/year_9/unit_99/Lesson 2 parsons problem reorder_v1.pptx', buf: Buffer.from('zzref lesson 2') },
  { relPath: 'KS3/year_9/unit_99/Unit guide_99_ZZ reference_Y9_v1.docx', buf: Buffer.from('zzref guide') },
];

beforeAll(async () => {
  await seedActivityTypes();
  criterionId = Number((await pool.query<{ id: number }>(`SELECT id FROM prog_criteria ORDER BY id LIMIT 1`)).rows[0]!.id);
});

afterAll(async () => {
  if (resourceIds.length) await pool.query(`DELETE FROM resources WHERE id = ANY($1::bigint[])`, [resourceIds]).catch(() => {});
  await pool.end();
});

describe('Phase 17 — reference-lesson library', () => {
  it('seeds the activity-type catalogue', async () => {
    const types = await listActivityTypes();
    expect(types.some((t) => t.code === 'debugging')).toBe(true);
    expect(types.some((t) => t.code === 'parsons')).toBe(true);
  });

  it('imports reference files with TCC coordinates + inferred activity type, idempotently', async () => {
    const first = await importReferenceFiles(FIXTURES);
    resourceIds = first.resourceIds;
    expect(first.created).toBe(3);
    const again = await importReferenceFiles(FIXTURES);
    expect(again.created).toBe(0);
    expect(again.skipped).toBe(3); // dedupe on checksum

    const rows = (await pool.query<{ tcc_unit_key: string; tcc_lesson_no: number | null; activity_type: string | null; is_reference: boolean }>(
      `SELECT tcc_unit_key, tcc_lesson_no, activity_type, is_reference FROM resources WHERE id = ANY($1::bigint[]) ORDER BY id`,
      [resourceIds],
    )).rows;
    expect(rows.every((r) => r.is_reference)).toBe(true);
    expect(rows.every((r) => r.tcc_unit_key === 'KS3:Y9:unit_99')).toBe(true);
    expect(rows[0]!.tcc_lesson_no).toBe(1);
    expect(rows[0]!.activity_type).toBe('debugging'); // "debug the broken…"
    expect(rows[1]!.activity_type).toBe('parsons');   // "parsons problem reorder"
    expect(rows[2]!.tcc_lesson_no).toBeNull();         // the unit guide
  });

  it('links a reference to a criterion and the library lookup + review queue surface it', async () => {
    const resId = resourceIds[0]!;
    await linkResourceCriterion(resId, criterionId, { origin: 'structure', verifyState: 'unverified' });
    const refs = await referencesForCriterion(criterionId);
    expect(refs.some((r) => r.resourceId === resId)).toBe(true);
    // unverified + unconfirmed → in the review queue
    expect((await reviewQueue()).some((q) => q.resourceId === resId)).toBe(true);
    // confirming removes it from the queue and keeps it in the lookup
    await confirmResourceCriterion(resId, criterionId, 'teacher', 'confirmed');
    expect((await reviewQueue()).some((q) => q.resourceId === resId)).toBe(false);
    expect((await referencesForCriterion(criterionId)).some((r) => r.resourceId === resId && r.verifyState === 'confirmed')).toBe(true);
  });
});
