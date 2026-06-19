import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { createPupil, setPupilActive, getPupilSessionState } from '../../src/repos/pupils';
import { setPupilPin, setPupilCredentialEnabled } from '../../src/repos/pupilCredentials';

// BUG-017: the request hook compares a pupil session's epoch to pupils.session_epoch and re-checks
// active, so a PIN reset / disable / archive / disposal revokes the live session. This proves the epoch
// is bumped by each of those actions and that state reads correctly (the hook comparison is trivial).
const created: number[] = [];

describe('pupil session revocation epoch (integration — BUG-017)', () => {
  afterAll(async () => {
    if (created.length) {
      await pool.query(`DELETE FROM pupil_credentials WHERE pupil_id = ANY($1)`, [created]);
      await pool.query(`DELETE FROM pupils WHERE id = ANY($1)`, [created]);
    }
    await pool.end();
  });

  it('bumps the epoch on PIN (re)set, credential disable and archive', async () => {
    const p = await createPupil('ZZ Revoke Test');
    created.push(p.id);

    const start = (await getPupilSessionState(p.id))!;
    expect(start.active).toBe(true);

    await setPupilPin(p.id, '1234'); // a PIN (re)set revokes live sessions
    const afterPin = (await getPupilSessionState(p.id))!.epoch;
    expect(afterPin).toBeGreaterThan(start.epoch);

    await setPupilCredentialEnabled(p.id, false); // disabling revokes
    const afterDisable = (await getPupilSessionState(p.id))!.epoch;
    expect(afterDisable).toBeGreaterThan(afterPin);

    await setPupilCredentialEnabled(p.id, true); // re-enabling does NOT bump (epoch unchanged)
    expect((await getPupilSessionState(p.id))!.epoch).toBe(afterDisable);

    await setPupilActive(p.id, false); // archive → inactive AND a bump
    const archived = (await getPupilSessionState(p.id))!;
    expect(archived.active).toBe(false);
    expect(archived.epoch).toBeGreaterThan(afterDisable);
  });

  it('returns null for an erased (deleted) pupil — the hook treats that as revoked', async () => {
    const p = await createPupil('ZZ Erase Test');
    await pool.query(`DELETE FROM pupils WHERE id = $1`, [p.id]);
    expect(await getPupilSessionState(p.id)).toBeNull();
  });
});
