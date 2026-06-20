import { afterAll, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { pool } from '../../src/db/pool';
import { absPath, storeBuffer } from '../../src/lib/resourceStore';
import { processPendingDeletions } from '../../src/repos/fileDeletions';

// BUG-044: durable file-deletion tombstones + an idempotent retry sweep, so a screenshot whose unlink
// failed (or was interrupted) during pupil disposal is eventually removed rather than orphaned forever.
describe('pending file deletions (integration — BUG-044)', () => {
  afterAll(async () => {
    await pool.query(`DELETE FROM pending_file_deletions WHERE storage_path LIKE 'pupil-work/zzfd-%'`);
    await pool.end();
  });

  it('the sweep deletes a tombstoned file and clears the tombstone', async () => {
    const rel = 'pupil-work/zzfd-1/x.png';
    await storeBuffer(rel, Buffer.from([1, 2, 3]));
    expect(existsSync(absPath(rel))).toBe(true);
    const id = (await pool.query<{ id: number }>(`INSERT INTO pending_file_deletions (storage_path, reason) VALUES ($1, 'test') RETURNING id`, [rel])).rows[0]!.id;
    const r = await processPendingDeletions();
    expect(r.cleared).toBeGreaterThanOrEqual(1);
    expect(existsSync(absPath(rel))).toBe(false); // the file is gone…
    expect((await pool.query(`SELECT 1 FROM pending_file_deletions WHERE id = $1`, [id])).rowCount).toBe(0); // …and the tombstone is cleared
  });

  it('a tombstone for an already-gone file is cleared idempotently (no error)', async () => {
    const rel = 'pupil-work/zzfd-2/never-existed.png';
    const id = (await pool.query<{ id: number }>(`INSERT INTO pending_file_deletions (storage_path, reason) VALUES ($1, 'test') RETURNING id`, [rel])).rows[0]!.id;
    await processPendingDeletions();
    expect((await pool.query(`SELECT 1 FROM pending_file_deletions WHERE id = $1`, [id])).rowCount).toBe(0); // cleared, not stuck retrying
  });
});
