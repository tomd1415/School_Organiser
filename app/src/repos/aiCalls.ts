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

/**
 * BUG-011/018: atomically check the monthly cap AND reserve this call's estimated cost in ONE
 * transaction, serialised by an advisory lock — so two calls can't both read the same spend, both pass
 * the check, and collectively overshoot. The reservation is a real 'reserved' ai_calls row carrying the
 * redacted request + the estimate; because it's committed before the provider call, a later call's cap
 * check sees it, and even if the post-call reconcile UPDATE fails the spend is still counted and the
 * DPIA evidence is preserved (no silent undercount). Returns the new row id, or null if over the cap.
 */
export async function reserveAiCall(
  r: Pick<AiCallRecord, 'feature' | 'provider' | 'model' | 'promptVersion' | 'requestRedacted'>,
  capPence: number,
  estimatePence: number,
): Promise<number | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, ['ai-budget']);
    const spentRow = await client.query<{ s: number }>(
      `SELECT COALESCE(sum(cost_pence), 0)::float AS s FROM ai_calls WHERE created_at >= date_trunc('month', now())`,
    );
    const spent = spentRow.rows[0]?.s ?? 0;
    // The cap is a hard ceiling: refuse if already at it, or if THIS call's estimate would cross it.
    if (spent >= capPence || spent + estimatePence > capPence) {
      await client.query('ROLLBACK');
      return null;
    }
    const ins = await client.query<{ id: number }>(
      `INSERT INTO ai_calls
         (feature, provider, model, prompt_version, request_redacted, response,
          input_tokens, output_tokens, cost_pence, status, error)
       VALUES ($1, $2, $3, $4, $5::jsonb, NULL, NULL, NULL, $6, 'reserved', NULL) RETURNING id`,
      [r.feature, r.provider, r.model, r.promptVersion, JSON.stringify(r.requestRedacted ?? {}), estimatePence],
    );
    await client.query('COMMIT');
    return ins.rows[0]!.id;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Reconcile a reserved call with its actual outcome (status / tokens / real cost / response / error),
 *  replacing the estimate. Best-effort: if this UPDATE fails the reservation's estimate simply stands, so
 *  the spend is still accounted for (BUG-018) rather than lost. */
export async function reconcileAiCall(
  id: number,
  fields: { status: 'ok' | 'error'; response?: unknown; inputTokens?: number | null; outputTokens?: number | null; costPence?: number | null; error?: string | null },
): Promise<void> {
  await pool.query(
    `UPDATE ai_calls SET status = $2, response = $3::jsonb, input_tokens = $4, output_tokens = $5, cost_pence = $6, error = $7 WHERE id = $1`,
    [id, fields.status, fields.response == null ? null : JSON.stringify(fields.response), fields.inputTokens ?? null, fields.outputTokens ?? null, fields.costPence ?? null, fields.error ?? null],
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

// ── 10.6: the AI audit-log viewer — the DPIA's central redaction-control evidence, made reviewable
// in-app (it was only ever surfaced as a monthly count). All read-only over ai_calls.

export interface AiCallRow {
  id: number;
  createdAt: string;
  feature: string;
  model: string;
  status: string;
  inputTokens: number | null;
  outputTokens: number | null;
  costPence: number | null;
  error: string | null;
}

export interface AiCallDetail extends AiCallRow {
  promptVersion: string | null;
  requestRedacted: unknown;
  response: unknown;
}

export interface AiCallFilter {
  feature?: string;
  status?: string;
  limit: number;
  offset: number;
}

/** A page of recent calls (newest first), optionally filtered by feature/status. */
export async function listAiCalls(f: AiCallFilter): Promise<{ rows: AiCallRow[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.feature) { params.push(f.feature); where.push(`feature = $${params.length}`); }
  if (f.status) { params.push(f.status); where.push(`status = $${params.length}`); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = Number(
    (await pool.query<{ n: number }>(`SELECT count(*)::int AS n FROM ai_calls ${clause}`, params)).rows[0]?.n ?? 0,
  );
  const limited = [...params, f.limit, f.offset];
  const { rows } = await pool.query<AiCallRow>(
    `SELECT id, to_char(created_at, 'YYYY-MM-DD HH24:MI') AS "createdAt", feature, model, status,
            input_tokens AS "inputTokens", output_tokens AS "outputTokens",
            cost_pence AS "costPence", error
     FROM ai_calls ${clause}
     ORDER BY created_at DESC, id DESC
     LIMIT $${limited.length - 1} OFFSET $${limited.length}`,
    limited,
  );
  return { rows, total };
}

/** One call with its stored redacted request + response (for the expand view / DPO evidence). */
export async function getAiCall(id: number): Promise<AiCallDetail | null> {
  const { rows } = await pool.query<AiCallDetail>(
    `SELECT id, to_char(created_at, 'YYYY-MM-DD HH24:MI') AS "createdAt", feature, model, status,
            input_tokens AS "inputTokens", output_tokens AS "outputTokens",
            cost_pence AS "costPence", error, prompt_version AS "promptVersion",
            request_redacted AS "requestRedacted", response
     FROM ai_calls WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export interface FeatureSpend {
  feature: string;
  calls: number;
  ok: number;
  errors: number;
  blocked: number;
  pence: number;
}

/** This month's spend + call counts grouped by feature (the spend rollup for the DPO). */
export async function spendByFeatureThisMonth(): Promise<FeatureSpend[]> {
  const { rows } = await pool.query<FeatureSpend>(
    `SELECT feature,
            count(*)::int AS calls,
            count(*) FILTER (WHERE status = 'ok')::int AS ok,
            count(*) FILTER (WHERE status = 'error')::int AS errors,
            count(*) FILTER (WHERE status = 'blocked')::int AS blocked,
            COALESCE(sum(cost_pence), 0)::float AS pence
     FROM ai_calls WHERE created_at >= date_trunc('month', now())
     GROUP BY feature ORDER BY pence DESC, calls DESC`,
  );
  return rows;
}

/** Distinct feature names seen (for the filter dropdown). */
export async function aiCallFeatures(): Promise<string[]> {
  const { rows } = await pool.query<{ feature: string }>(`SELECT DISTINCT feature FROM ai_calls ORDER BY feature`);
  return rows.map((r) => r.feature);
}
