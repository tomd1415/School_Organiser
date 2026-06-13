// Phase 8.2: pupil login. Class code → pick your name → PIN. Credentials are a separate table
// from the names-only roster and only exist once the teacher has enabled pupil access (which is
// gated on DPIA sign-off). PINs are scrypt-hashed like every other credential; a per-pupil
// failed-count gives a durable lockout (the in-memory limiter guards the attempt *rate*).
import { pool } from '../db/pool';
import { hashPassword, verifyPassword } from '../lib/passwords';

export const PIN_LOCK_AT = 5;

export interface PupilLoginRow {
  pupilId: number;
  displayName: string;
  hasPin: boolean;
  enabled: boolean;
  locked: boolean;
  pin: string | null; // the PIN value, for the teacher-only printable cards + admin display
}

/** Current-year groups that have a login code, each with its enrolled pupils' credential state. */
export interface GroupLogins {
  groupId: number;
  groupName: string;
  loginCode: string | null;
  pupils: PupilLoginRow[];
}

export async function listGroupLogins(): Promise<GroupLogins[]> {
  // One query: current-year active groups joined to their enrolled pupils + credential state.
  const { rows } = await pool.query<{
    groupId: number;
    groupName: string;
    loginCode: string | null;
    pupilId: number | null;
    displayName: string | null;
    hasPin: boolean;
    enabled: boolean;
    locked: boolean;
    pin: string | null;
  }>(
    `SELECT g.id AS "groupId", g.name AS "groupName", g.login_code AS "loginCode",
            p.id AS "pupilId", p.display_name AS "displayName",
            (pc.pupil_id IS NOT NULL) AS "hasPin",
            COALESCE(pc.enabled, false) AS enabled,
            COALESCE(pc.failed_count, 0) >= $1 AS locked,
            pc.pin AS pin
     FROM groups g
     LEFT JOIN enrolments e ON e.group_id = g.id AND e.active
     LEFT JOIN pupils p ON p.id = e.pupil_id
     LEFT JOIN pupil_credentials pc ON pc.pupil_id = p.id
     WHERE g.active AND g.academic_year_id = (SELECT id FROM academic_years WHERE is_current)
     ORDER BY g.name, p.display_name`,
    [PIN_LOCK_AT],
  );
  const byGroup = new Map<number, GroupLogins>();
  for (const r of rows) {
    let grp = byGroup.get(r.groupId);
    if (!grp) {
      grp = { groupId: r.groupId, groupName: r.groupName, loginCode: r.loginCode, pupils: [] };
      byGroup.set(r.groupId, grp);
    }
    if (r.pupilId != null) {
      grp.pupils.push({ pupilId: r.pupilId, displayName: r.displayName!, hasPin: r.hasPin, enabled: r.enabled, locked: r.locked, pin: r.pin });
    }
  }
  return [...byGroup.values()];
}

/** The class a pupil types a code for → its enrolled, login-ready names (for "tap your name"). */
export async function resolveGroupByCode(code: string): Promise<{ groupId: number; groupName: string } | null> {
  const { rows } = await pool.query<{ groupId: number; groupName: string }>(
    `SELECT id AS "groupId", name AS "groupName" FROM groups
     WHERE login_code = $1 AND active AND academic_year_id = (SELECT id FROM academic_years WHERE is_current)`,
    [code.trim().toUpperCase()],
  );
  return rows[0] ?? null;
}

export async function listLoginNames(groupId: number): Promise<{ pupilId: number; displayName: string }[]> {
  const { rows } = await pool.query<{ pupilId: number; displayName: string }>(
    `SELECT p.id AS "pupilId", p.display_name AS "displayName"
     FROM enrolments e
     JOIN pupils p ON p.id = e.pupil_id
     JOIN pupil_credentials pc ON pc.pupil_id = p.id AND pc.enabled AND pc.failed_count < $2
     WHERE e.group_id = $1 AND e.active
     ORDER BY p.display_name`,
    [groupId, PIN_LOCK_AT],
  );
  return rows;
}

/** Confirm a pupil is enrolled in the group whose code they used (login binds the two). */
export async function pupilInGroup(pupilId: number, groupId: number): Promise<boolean> {
  const { rows } = await pool.query<{ n: number }>(
    `SELECT count(*)::int n FROM enrolments WHERE pupil_id = $1 AND group_id = $2 AND active`,
    [pupilId, groupId],
  );
  return (rows[0]?.n ?? 0) > 0;
}

export async function setGroupLoginCode(groupId: number, code: string | null): Promise<void> {
  await pool.query(`UPDATE groups SET login_code = $2 WHERE id = $1`, [groupId, code && code.trim() !== '' ? code.trim().toUpperCase() : null]);
}

export async function setPupilPin(pupilId: number, pin: string): Promise<void> {
  // Store the hash (for verification) AND the PIN value (so the teacher can print/read it).
  await pool.query(
    `INSERT INTO pupil_credentials (pupil_id, pin_hash, pin, enabled, failed_count, updated_at)
     VALUES ($1, $2, $3, true, 0, now())
     ON CONFLICT (pupil_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, pin = EXCLUDED.pin, enabled = true, failed_count = 0, updated_at = now()`,
    [pupilId, hashPassword(pin), pin],
  );
}

export async function setPupilCredentialEnabled(pupilId: number, enabled: boolean): Promise<void> {
  await pool.query(`UPDATE pupil_credentials SET enabled = $2, updated_at = now() WHERE pupil_id = $1`, [pupilId, enabled]);
}

export async function unlockPupil(pupilId: number): Promise<void> {
  await pool.query(`UPDATE pupil_credentials SET failed_count = 0, updated_at = now() WHERE pupil_id = $1`, [pupilId]);
}

export type PinResult = { ok: true } | { ok: false; reason: 'disabled' | 'locked' | 'wrong' };

/** Verify a PIN, maintaining the durable lockout. Correct PIN on a locked account still fails. */
export async function verifyPin(pupilId: number, pin: string): Promise<PinResult> {
  const { rows } = await pool.query<{ pinHash: string; enabled: boolean; failedCount: number }>(
    `SELECT pin_hash AS "pinHash", enabled, failed_count AS "failedCount" FROM pupil_credentials WHERE pupil_id = $1`,
    [pupilId],
  );
  const c = rows[0];
  if (!c || !c.enabled) return { ok: false, reason: 'disabled' };
  if (c.failedCount >= PIN_LOCK_AT) return { ok: false, reason: 'locked' };
  if (verifyPassword(pin, c.pinHash)) {
    if (c.failedCount > 0) await unlockPupil(pupilId);
    return { ok: true };
  }
  const { rows: upd } = await pool.query<{ failedCount: number }>(
    `UPDATE pupil_credentials SET failed_count = failed_count + 1, updated_at = now() WHERE pupil_id = $1 RETURNING failed_count AS "failedCount"`,
    [pupilId],
  );
  return { ok: false, reason: (upd[0]?.failedCount ?? 0) >= PIN_LOCK_AT ? 'locked' : 'wrong' };
}

/** The display name + an enrolled, active group for a logged-in pupil (for /me resolution). */
export async function getPupilName(pupilId: number): Promise<string | null> {
  const { rows } = await pool.query<{ displayName: string }>(`SELECT display_name AS "displayName" FROM pupils WHERE id = $1`, [pupilId]);
  return rows[0]?.displayName ?? null;
}
