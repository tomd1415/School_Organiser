import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { createPupil, listRoster, setPupilActive } from '../../src/repos/pupils';
import { insertAiCall, monthSpendPence, listAiCalls, getAiCall, spendByFeatureThisMonth } from '../../src/repos/aiCalls';
import { callLLM } from '../../src/llm/client';

// The AI key is forced empty in vitest.integration.config.ts, so callLLM never hits the network.
const created: number[] = [];

describe('AI boundary (integration — needs the dev DB up)', () => {
  afterAll(async () => {
    if (created.length) await pool.query(`DELETE FROM pupils WHERE id = ANY($1)`, [created]);
    await pool.query(`DELETE FROM ai_calls WHERE feature = 'test_feature'`);
    await pool.end();
  });

  it('createPupil assigns a stable PUPIL_<n> token; archived pupils STAY in the redaction roster', async () => {
    const p = await createPupil('Zzz Testpupil');
    created.push(p.id);
    expect(p.aiToken).toMatch(/^PUPIL_\d+$/);
    expect((await listRoster()).some((r) => r.id === p.id)).toBe(true);
    await setPupilActive(p.id, false);
    // Leavers keep their real name in the DB until a deliberate anonymisation, so they must
    // still be redacted/caught on egress — listRoster intentionally includes inactive pupils.
    expect((await listRoster()).some((r) => r.id === p.id)).toBe(true);
  });

  it('ai_calls audit inserts (redacted only) and month spend sums', async () => {
    await insertAiCall({
      feature: 'test_feature',
      provider: 'anthropic',
      model: 'claude-haiku-4-5',
      promptVersion: 'v1',
      requestRedacted: { user: 'a clean redacted note about PUPIL_1' },
      response: { text: 'ok' },
      inputTokens: 10,
      outputTokens: 5,
      costPence: 1.23,
      status: 'ok',
      error: null,
    });
    expect(await monthSpendPence()).toBeGreaterThanOrEqual(1.23);
  });

  it('the audit-log viewer reads back: filter by feature, expand the redacted payload, spend rollup', async () => {
    await insertAiCall({ feature: 'zz_log_test', provider: 'anthropic', model: 'claude-haiku-4-5', promptVersion: 'v1', requestRedacted: { user: 'note about PUPIL_9' }, response: { text: 'hi' }, inputTokens: 7, outputTokens: 3, costPence: 0.5, status: 'ok', error: null });
    await insertAiCall({ feature: 'zz_log_test', provider: 'anthropic', model: 'claude-haiku-4-5', promptVersion: 'v1', requestRedacted: {}, response: null, inputTokens: null, outputTokens: null, costPence: null, status: 'blocked', error: 'monthly cap reached' });
    const page = await listAiCalls({ feature: 'zz_log_test', limit: 50, offset: 0 });
    expect(page.total).toBe(2);
    expect(page.rows[0]!.feature).toBe('zz_log_test'); // newest first, only this feature
    const okOnly = await listAiCalls({ feature: 'zz_log_test', status: 'ok', limit: 50, offset: 0 });
    expect(okOnly.total).toBe(1);
    const detail = await getAiCall(page.rows[0]!.id);
    expect(detail).not.toBeNull();
    expect(JSON.stringify(detail!.requestRedacted)).not.toMatch(/[A-Z][a-z]+ [A-Z][a-z]+/); // no real "First Last" — redacted only
    const byFeature = await spendByFeatureThisMonth();
    const mine = byFeature.find((r) => r.feature === 'zz_log_test')!;
    expect(mine.calls).toBe(2);
    expect(mine.blocked).toBe(1);
    await pool.query(`DELETE FROM ai_calls WHERE feature = 'zz_log_test'`);
  });

  it('callLLM degrades to "unavailable" with no API key — no network, no spend', async () => {
    const r = await callLLM({
      feature: 'test_feature',
      model: 'claude-haiku-4-5',
      system: 'You are a planner.',
      context: [{ text: 'a note' }],
      instruction: 'draft something',
    });
    expect(r.status).toBe('unavailable');
    expect(r.text).toBeNull();
  });
});
