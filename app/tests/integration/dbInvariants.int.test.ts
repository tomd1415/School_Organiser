import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { makeYearCurrent, listYears } from '../../src/repos/setup';
import { migrate } from '../../src/db/migrate';

describe('DB invariants (integration — needs the dev DB up)', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('makeYearCurrent refuses an unknown id and never leaves zero current years (BUG-024)', async () => {
    const before = (await listYears()).find((y) => y.isCurrent);
    expect(before).toBeTruthy(); // the seed has a current year

    // a stale / forged / deleted positive id must NOT clear the current flag
    expect(await makeYearCurrent(2_000_000_000)).toBe(false);

    const after = (await listYears()).filter((y) => y.isCurrent);
    expect(after).toHaveLength(1); // still exactly one current year…
    expect(after[0]!.id).toBe(before!.id); // …and it's unchanged
  });

  it('concurrent migrators serialise on the advisory lock and both succeed (BUG-031)', async () => {
    // The dev DB is already migrated, so both runs are no-ops; the point is that two migrate() calls
    // racing each other neither deadlock nor throw (e.g. on the schema_migrations PK) — the advisory
    // lock serialises them.
    await expect(Promise.all([migrate(), migrate()])).resolves.toBeDefined();
  });
});
