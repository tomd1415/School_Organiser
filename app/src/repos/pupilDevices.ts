// Phase 9.6 — "stay signed in on this computer". The browser holds a random secret in a cookie;
// only its SHA-256 hash is stored (the secret is never persisted). Bound to a PUPIL (no class
// binding) so it works school-wide and survives the multi-teacher fold. Revoked on disable / PIN
// reset / expiry / teacher revoke.
import { createHash, randomBytes } from 'node:crypto';
import { pool } from '../db/pool';

export function newDeviceSecret(): string {
  return randomBytes(18).toString('base64url');
}
export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

const DEVICE_DAYS = 120; // ~a term; re-established on each use is instant, expiry caps the risk

export async function rememberDevice(pupilId: number, secret: string, label: string): Promise<void> {
  const expires = new Date(Date.now() + DEVICE_DAYS * 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO pupil_devices (pupil_id, token_hash, label, expires_at, last_used_at, created_at)
     VALUES ($1, $2, $3, $4, now(), now())`,
    [pupilId, hashSecret(secret), label.slice(0, 80), expires],
  );
}

/** The pupil id for a valid, unexpired device cookie whose pupil is still active with an enabled
 *  credential (defence in depth vs archive/disable). Bumps last_used_at. Null otherwise. */
export async function resumeDevice(secret: string): Promise<number | null> {
  if (!secret) return null;
  const { rows } = await pool.query<{ id: number; pupilId: number }>(
    `SELECT d.id, d.pupil_id AS "pupilId" FROM pupil_devices d
     JOIN pupils p ON p.id = d.pupil_id AND p.active
     JOIN pupil_credentials pc ON pc.pupil_id = d.pupil_id AND pc.enabled
     WHERE d.token_hash = $1 AND d.expires_at > now()`,
    [hashSecret(secret)],
  );
  const d = rows[0];
  if (!d) return null;
  await pool.query(`UPDATE pupil_devices SET last_used_at = now() WHERE id = $1`, [d.id]);
  return d.pupilId;
}

export async function deviceCount(pupilId: number): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM pupil_devices WHERE pupil_id = $1 AND expires_at > now()`, [pupilId]);
  return rows[0]?.n ?? 0;
}
/** Revoke every device for a pupil — called on account disable / PIN reset / archive (cascade). */
export async function revokeAllDevices(pupilId: number): Promise<void> {
  await pool.query(`DELETE FROM pupil_devices WHERE pupil_id = $1`, [pupilId]);
}

/** Revoke every device for the pupils of a group — when a class turns "stay signed in" OFF. */
export async function revokeDevicesForGroup(groupId: number): Promise<void> {
  await pool.query(
    `DELETE FROM pupil_devices WHERE pupil_id IN (SELECT pupil_id FROM enrolments WHERE group_id = $1)`,
    [groupId],
  );
}

/** Has any of this group's courses enabled remembered devices? (gates the "stay signed in" button) */
export async function devicesEnabledForGroup(groupId: number): Promise<boolean> {
  const { rows } = await pool.query<{ n: number }>(
    `SELECT count(*)::int n FROM group_courses WHERE group_id = $1 AND devices_enabled`,
    [groupId],
  );
  return (rows[0]?.n ?? 0) > 0;
}

/** The pupil's enrolled group that has a lesson in the given (weekday, slot) — so a remembered-device
 *  resume lands in the lesson actually happening now, not just the lowest-id enrolment (a multi-class
 *  pupil otherwise resumed into the wrong class). Returns null when none is on right now. */
export async function pupilGroupInSlot(pupilId: number, weekday: number, slotOrder: number): Promise<number | null> {
  const { rows } = await pool.query<{ groupId: number }>(
    `SELECT e.group_id AS "groupId"
     FROM enrolments e
     JOIN groups g ON g.id = e.group_id AND g.active AND g.academic_year_id = (SELECT id FROM academic_years WHERE is_current)
     JOIN timetabled_lessons tl ON tl.group_id = e.group_id AND tl.purpose IN ('teaching', 'form')
     JOIN period_definitions p ON p.id = tl.period_definition_id
        AND p.weekday = $2 AND p.slot_order = $3
        AND p.academic_year_id = (SELECT id FROM academic_years WHERE is_current)
     WHERE e.pupil_id = $1 AND e.active ORDER BY e.id LIMIT 1`,
    [pupilId, weekday, slotOrder],
  );
  return rows[0]?.groupId ?? null;
}

/** A pupil's primary enrolled group (for resuming a session without a class code). */
export async function pupilPrimaryGroup(pupilId: number): Promise<number | null> {
  const { rows } = await pool.query<{ groupId: number }>(
    `SELECT e.group_id AS "groupId" FROM enrolments e
     JOIN groups g ON g.id = e.group_id AND g.active AND g.academic_year_id = (SELECT id FROM academic_years WHERE is_current)
     WHERE e.pupil_id = $1 AND e.active ORDER BY e.id LIMIT 1`,
    [pupilId],
  );
  return rows[0]?.groupId ?? null;
}
