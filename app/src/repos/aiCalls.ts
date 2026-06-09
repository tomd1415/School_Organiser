import { pool } from '../db/pool';

export interface AiCallRecord {
  feature: string;
  provider: string;
  model: string;
  promptVersion: string | null;
  requestRedacted: unknown; // redacted payload ONLY — never a raw name
  response: unknown;
  inputTokens: number | null;
  outputTokens: number | null;
  costPence: number | null;
  status: 'ok' | 'error' | 'blocked';
  error: string | null;
}

export async function insertAiCall(r: AiCallRecord): Promise<void> {
  await pool.query(
    `INSERT INTO ai_calls
       (feature, provider, model, prompt_version, request_redacted, response,
        input_tokens, output_tokens, cost_pence, status, error)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9, $10, $11)`,
    [
      r.feature,
      r.provider,
      r.model,
      r.promptVersion,
      JSON.stringify(r.requestRedacted ?? {}),
      r.response == null ? null : JSON.stringify(r.response),
      r.inputTokens,
      r.outputTokens,
      r.costPence,
      r.status,
      r.error,
    ],
  );
}

/** Total spend this calendar month (pence) — drives the budget ceiling. */
export async function monthSpendPence(): Promise<number> {
  const { rows } = await pool.query<{ s: number }>(
    `SELECT COALESCE(sum(cost_pence), 0)::float AS s FROM ai_calls
     WHERE created_at >= date_trunc('month', now())`,
  );
  return rows[0]?.s ?? 0;
}
