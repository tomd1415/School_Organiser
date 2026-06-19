// Named TA logins (8.1) — one row per TA, replacing the shared ta_password_hash setting.
import { pool } from '../db/pool';
import { verifyPassword } from '../lib/passwords';

export interface TaAccount {
  id: number;
  name: string;
  staffId: number | null;
  active: boolean;
  epoch: number; // session-revocation epoch (BUG-016)
}

const COLS = `id, name, staff_id AS "staffId", active, session_epoch AS epoch`;

export async function listTaAccounts(): Promise<TaAccount[]> {
  const { rows } = await pool.query<TaAccount>(`SELECT ${COLS} FROM ta_accounts ORDER BY name`);
  return rows;
}

export async function createTaAccount(name: string, passwordHash: string, staffId: number | null): Promise<TaAccount> {
  const { rows } = await pool.query<TaAccount>(
    `INSERT INTO ta_accounts (name, password_hash, staff_id) VALUES ($1, $2, $3) RETURNING ${COLS}`,
    [name.trim(), passwordHash, staffId],
  );
  return rows[0]!;
}

export async function setTaAccountActive(id: number, active: boolean): Promise<void> {
  // Disabling (active=false) also revokes any live session for the account (BUG-016).
  await pool.query(`UPDATE ta_accounts SET active = $2, session_epoch = session_epoch + (CASE WHEN $2 THEN 0 ELSE 1 END) WHERE id = $1`, [id, active]);
}

export async function setTaAccountPassword(id: number, passwordHash: string): Promise<void> {
  // A password change revokes any live session for the account (BUG-016).
  await pool.query(`UPDATE ta_accounts SET password_hash = $2, session_epoch = session_epoch + 1 WHERE id = $1`, [id, passwordHash]);
}

export async function deleteTaAccount(id: number): Promise<void> {
  await pool.query(`DELETE FROM ta_accounts WHERE id = $1`, [id]);
}

/** Live-session validity inputs for the request hook: is the account still active, and at what epoch?
 *  Returns null if the account no longer exists (deleted) → the hook treats that as revoked. */
export async function getTaAccountState(id: number): Promise<{ active: boolean; epoch: number } | null> {
  const { rows } = await pool.query<{ active: boolean; epoch: number }>(
    `SELECT active, session_epoch AS epoch FROM ta_accounts WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/** Try a password against every active TA account; first match wins (passwords are per-TA). */
export async function verifyTaLogin(password: string): Promise<TaAccount | null> {
  const { rows } = await pool.query<TaAccount & { passwordHash: string }>(
    `SELECT ${COLS}, password_hash AS "passwordHash" FROM ta_accounts WHERE active ORDER BY id`,
  );
  for (const row of rows) {
    if (verifyPassword(password, row.passwordHash)) {
      return { id: row.id, name: row.name, staffId: row.staffId, active: row.active, epoch: row.epoch };
    }
  }
  return null;
}
