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

/** The AI kill-switch — true unless explicitly disabled in settings. */
export async function aiEnabled(): Promise<boolean> {
  return (await getSetting('ai_enabled')) !== 'false';
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
