import { pool } from '../db/pool';
import { DEFAULT_MODELS, DEFAULT_MONTH_CAP_PENCE, type ModelRole } from '../config/llm';

export async function getSetting(key: string): Promise<string | null> {
  const { rows } = await pool.query<{ value: string }>(`SELECT value FROM settings WHERE key = $1`, [key]);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await pool.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, value],
  );
}

/** The AI kill-switch — true unless explicitly disabled in settings. */
export async function aiEnabled(): Promise<boolean> {
  return (await getSetting('ai_enabled')) !== 'false';
}

export async function modelFor(role: ModelRole): Promise<string> {
  const key = role === 'plan' ? 'ai_model_plan' : role === 'design' ? 'ai_model_design' : 'ai_model_cheap';
  return (await getSetting(key)) ?? DEFAULT_MODELS[role];
}

export async function monthCapPence(): Promise<number> {
  const v = await getSetting('ai_month_cap_pence');
  const n = v ? Number(v) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MONTH_CAP_PENCE;
}
