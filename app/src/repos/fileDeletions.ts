// BUG-044: durable deletion tombstones for resource-volume files. A tombstone is enqueued INSIDE the
// transaction that removes the last DB pointer to a file (e.g. pupil disposal), so a failed/interrupted
// unlink can't silently leave the bytes behind — a periodic sweep retries it idempotently. The stored
// path is a non-identifying object key.
import type { PoolClient } from 'pg';
import { pool } from '../db/pool';
import { removeStored } from '../lib/resourceStore';

/** Record (within the caller's transaction) that a file must be deleted. Returns the tombstone id so the
 *  caller can clear it once the immediate unlink succeeds. */
export async function enqueueFileDeletion(client: PoolClient, storagePath: string, reason: string): Promise<number> {
  const { rows } = await client.query<{ id: number }>(
    `INSERT INTO pending_file_deletions (storage_path, reason) VALUES ($1, $2) RETURNING id`,
    [storagePath, reason],
  );
  return rows[0]!.id;
}

/** Clear a tombstone once its file is gone (deleted, or confirmed already absent). */
export async function clearFileDeletion(id: number): Promise<void> {
  await pool.query(`DELETE FROM pending_file_deletions WHERE id = $1`, [id]);
}

/**
 * Retry outstanding file deletions, idempotently: `removeStored` is a no-op on an already-gone file, so
 * a tombstone clears whether the unlink just happened or the file was already absent. A genuine fs error
 * (permission, disk) leaves the tombstone with a bumped attempt count for the next sweep. Returns counts.
 */
export async function processPendingDeletions(limit = 200): Promise<{ cleared: number; failed: number }> {
  const { rows } = await pool.query<{ id: number; storage_path: string }>(
    `SELECT id, storage_path FROM pending_file_deletions ORDER BY created_at LIMIT $1`,
    [limit],
  );
  let cleared = 0;
  let failed = 0;
  for (const r of rows) {
    try {
      await removeStored(r.storage_path); // force:true → succeeds even if the file is already gone
      await clearFileDeletion(r.id);
      cleared++;
    } catch {
      await pool.query(`UPDATE pending_file_deletions SET attempts = attempts + 1, last_attempt_at = now() WHERE id = $1`, [r.id]);
      failed++;
    }
  }
  return { cleared, failed };
}
