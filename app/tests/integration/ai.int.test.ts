import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { createPupil, listRoster, setPupilActive } from '../../src/repos/pupils';
import { insertAiCall, monthSpendPence } from '../../src/repos/aiCalls';
import { callLLM } from '../../src/llm/client';

// The AI key is forced empty in vitest.integration.config.ts, so callLLM never hits the network.
const created: number[] = [];

describe('AI boundary (integration — needs the dev DB up)', () => {
  afterAll(async () => {
    if (created.length) await pool.query(`DELETE FROM pupils WHERE id = ANY($1)`, [created]);
    await pool.query(`DELETE FROM ai_calls WHERE feature = 'test_feature'`);
    await pool.end();
  });

  it('createPupil assigns a stable PUPIL_<n> token; archived pupils drop out of the roster', async () => {
    const p = await createPupil('Zzz Testpupil');
    created.push(p.id);
    expect(p.aiToken).toMatch(/^PUPIL_\d+$/);
    expect((await listRoster()).some((r) => r.id === p.id)).toBe(true);
    await setPupilActive(p.id, false);
    expect((await listRoster()).some((r) => r.id === p.id)).toBe(false);
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
