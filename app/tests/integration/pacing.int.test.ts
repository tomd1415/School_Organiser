import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { recentPaceSamples } from '../../src/repos/adaptations';
import { paceItemsFor } from '../../src/services/pacing';

// idea 2 — the query + service wiring run against the real schema and return the right shape. The
// gating/band logic is exercised exhaustively in the unit suite; here we just confirm the SQL is
// valid and the service degrades to a no-op when a class lacks enough pace signal (the common case).
let gcId: number | null = null;

beforeAll(async () => {
  const r = await pool.query<{ id: number }>(`SELECT id FROM group_courses ORDER BY id LIMIT 1`);
  gcId = r.rows[0]?.id ?? null;
});

afterAll(async () => {
  await pool.end();
});

describe('pace-aware sizing (integration)', () => {
  it('recentPaceSamples runs and returns rows of the expected shape', async () => {
    if (gcId == null) return;
    const rows = await recentPaceSamples(gcId);
    expect(Array.isArray(rows)).toBe(true);
    for (const row of rows) {
      expect(row).toHaveProperty('progressStep');
      expect(row).toHaveProperty('outline');
    }
  });

  it('paceItemsFor returns an array, and [] when there is not enough signal', async () => {
    if (gcId == null) return;
    const items = await paceItemsFor(gcId);
    expect(Array.isArray(items)).toBe(true);
    // With < 2 tracked lessons it must be empty (no nudge); never throws.
    const rows = await recentPaceSamples(gcId);
    const valid = rows.filter((r) => r.progressStep != null && r.progressStep > 0).length;
    if (valid < 2) expect(items).toEqual([]);
  });
});
