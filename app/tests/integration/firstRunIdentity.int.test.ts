import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { claimFirstRunIdentity, getSetting } from '../../src/repos/settings';

// BUG-041: a brand-new instance is reachable by anyone on the LAN until the first teacher password is
// set. The /welcome/identity check ("no hash yet?") is not enough on its own — two simultaneous
// submissions can both pass it before either writes, so both would plant a teacher password and get a
// session. claimFirstRunIdentity serialises the claim under an advisory lock: exactly one caller wins,
// and a loser can NEVER overwrite the winner's hash. This proves that invariant directly (the route is
// now a thin wrapper around it; its own env hash makes it 403 in this config, so it can't be exercised
// end-to-end here).
const NAME_A = 'Race Winner A 7yz';
const NAME_B = 'Race Loser B 7yz';
let savedHash: string | null = null;
let savedSchool: string | null = null;

async function blankSlate(): Promise<void> {
  await pool.query(`DELETE FROM settings WHERE key = 'auth_password_hash'`);
}

beforeEach(async () => {
  savedHash = await getSetting('auth_password_hash');
  savedSchool = await getSetting('school_name');
  await blankSlate();
});

afterAll(async () => {
  if (savedHash === null) await pool.query(`DELETE FROM settings WHERE key = 'auth_password_hash'`);
  else await pool.query(`UPDATE settings SET value = $1 WHERE key = 'auth_password_hash'`, [savedHash]);
  if (savedSchool === null) await pool.query(`DELETE FROM settings WHERE key = 'school_name'`);
  else await pool.query(`UPDATE settings SET value = $1 WHERE key = 'school_name'`, [savedSchool]);
  await pool.query(`DELETE FROM staff WHERE name = ANY($1)`, [[NAME_A, NAME_B]]);
  await pool.end();
});

describe('first-run identity claim (integration — BUG-041)', () => {
  it('two concurrent claims: exactly one wins and the loser cannot overwrite the hash', async () => {
    const [a, b] = await Promise.all([
      claimFirstRunIdentity({ name: NAME_A, school: 'Aschool', passwordHash: 'HASH_A' }),
      claimFirstRunIdentity({ name: NAME_B, school: 'Bschool', passwordHash: 'HASH_B' }),
    ]);
    // exactly one winner
    expect([a, b].filter(Boolean)).toHaveLength(1);
    // the persisted hash is the winner's — the loser never clobbered it
    const stored = await getSetting('auth_password_hash');
    expect(stored).toBe(a ? 'HASH_A' : 'HASH_B');
  });

  it('a claim against an already-configured instance loses (no overwrite)', async () => {
    // first claim wins…
    expect(await claimFirstRunIdentity({ name: NAME_A, school: 'Aschool', passwordHash: 'HASH_A' })).toBe(true);
    // …a later attempt by anyone else loses and the hash is untouched
    expect(await claimFirstRunIdentity({ name: NAME_B, school: 'Bschool', passwordHash: 'HASH_B' })).toBe(false);
    expect(await getSetting('auth_password_hash')).toBe('HASH_A');
  });
});
