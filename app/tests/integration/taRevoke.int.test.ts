import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { createTaAccount, setTaAccountActive, setTaAccountPassword, deleteTaAccount, getTaAccountState } from '../../src/repos/taAccounts';
import { hashPassword } from '../../src/lib/passwords';

// BUG-016: the request hook compares a TA session's epoch to ta_accounts.session_epoch and re-checks
// active, so disable / delete / password-change revokes the live session. This proves each action bumps
// the epoch / clears the row (the hook comparison is trivial wiring).
const NAMES = ['ZZ Revoke TA', 'ZZ Delete TA'];

describe('TA account session revocation epoch (integration — BUG-016)', () => {
  afterAll(async () => {
    await pool.query(`DELETE FROM ta_accounts WHERE name = ANY($1)`, [NAMES]);
    await pool.end();
  });

  it('bumps the epoch on password change and disable', async () => {
    await pool.query(`DELETE FROM ta_accounts WHERE name = $1`, [NAMES[0]]); // clear any leftover
    const a = await createTaAccount(NAMES[0]!, hashPassword('pw-12345'), null);
    const start = (await getTaAccountState(a.id))!;
    expect(start.active).toBe(true);
    expect(start.epoch).toBe(0);

    await setTaAccountPassword(a.id, hashPassword('pw-67890')); // password change revokes
    const afterPw = (await getTaAccountState(a.id))!.epoch;
    expect(afterPw).toBeGreaterThan(start.epoch);

    await setTaAccountActive(a.id, false); // disable → inactive AND a bump
    const disabled = (await getTaAccountState(a.id))!;
    expect(disabled.active).toBe(false);
    expect(disabled.epoch).toBeGreaterThan(afterPw);

    await setTaAccountActive(a.id, true); // re-enable does NOT bump
    expect((await getTaAccountState(a.id))!.epoch).toBe(disabled.epoch);
  });

  it('returns null after the account is deleted — the hook treats that as revoked', async () => {
    await pool.query(`DELETE FROM ta_accounts WHERE name = $1`, [NAMES[1]]);
    const a = await createTaAccount(NAMES[1]!, hashPassword('pw-xyz12'), null);
    await deleteTaAccount(a.id);
    expect(await getTaAccountState(a.id)).toBeNull();
  });
});
