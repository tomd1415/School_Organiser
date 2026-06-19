import { pool } from '../db/pool';
import { DEFAULT_MODELS, DEFAULT_MONTH_CAP_PENCE, type ModelRole } from '../config/llm';

export async function getSetting(key: string): Promise<string | null> {
  const { rows } = await pool.query<{ value: string }>(`SELECT value FROM settings WHERE key = $1`, [key]);
  return rows[0]?.value ?? null;
}

// idea 5 — the per-feature model overrides, keyed by feature (the `ai_model_feature_` prefix stripped).
export async function getFeatureModelOverrides(): Promise<Record<string, string>> {
  const { rows } = await pool.query<{ key: string; value: string }>(`SELECT key, value FROM settings WHERE key LIKE 'ai_model_feature_%'`);
  const out: Record<string, string> = {};
  for (const r of rows) out[r.key.slice('ai_model_feature_'.length)] = r.value;
  return out;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await pool.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value],
  );
}

/**
 * BUG-041 — first-run identity claim, serialised so two concurrent /welcome/identity submissions can
 * never both plant a teacher password (a brand-new instance is reachable by anyone on the LAN until
 * the first password is set). A transaction-scoped advisory lock makes the second caller wait; once
 * it acquires the lock it re-checks under it, finds the hash already present, and loses. Only the
 * single winner writes the hash + gets a teacher session. Returns true iff this caller won.
 */
export async function claimFirstRunIdentity(args: { name: string; school: string; passwordHash: string }): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, ['first-run-identity']);
    const existing = await client.query(`SELECT 1 FROM settings WHERE key = 'auth_password_hash'`);
    if ((existing.rowCount ?? 0) > 0) {
      await client.query('ROLLBACK');
      return false; // someone else already claimed it under the lock — this caller loses
    }
    await client.query(
      `INSERT INTO staff (name, role, is_self) SELECT $1, 'self', true WHERE NOT EXISTS (SELECT 1 FROM staff WHERE is_self)`,
      [args.name],
    );
    await client.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ('school_name', $1, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [args.school],
    );
    await client.query(
      `INSERT INTO settings (key, value, updated_at) VALUES ('auth_password_hash', $1, now())
       ON CONFLICT (key) DO NOTHING`,
      [args.passwordHash],
    );
    await client.query('COMMIT');
    return true;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** The AI kill-switch — true unless explicitly disabled in settings. */
export async function aiEnabled(): Promise<boolean> {
  return (await getSetting('ai_enabled')) !== 'false';
}

// Phase 11 Wave 5 — the advisory lesson reviewer is OFF by default (unlike the master AI switch): its
// Opus-capable cost is the project's named #1 risk, so it does nothing until the teacher opts in.
export async function aiReviewEnabled(): Promise<boolean> {
  return (await getSetting('ai_review_enabled')) === 'true';
}

export async function modelFor(role: ModelRole): Promise<string> {
  const key = role === 'plan' ? 'ai_model_plan' : role === 'design' ? 'ai_model_design' : 'ai_model_cheap';
  return (await getSetting(key)) ?? DEFAULT_MODELS[role];
}

// Phase 11 idea 5 — a feature's model: its per-feature override if set (key `ai_model_feature_<key>`),
// else the role default. Unset == today's behaviour exactly, so every call site is backward-compatible.
export async function modelForFeature(feature: string, fallbackRole: ModelRole): Promise<string> {
  const override = await getSetting(`ai_model_feature_${feature}`).catch(() => null);
  return (override && override.trim()) || modelFor(fallbackRole);
}

export async function monthCapPence(): Promise<number> {
  const v = await getSetting('ai_month_cap_pence');
  const n = v ? Number(v) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MONTH_CAP_PENCE;
}
