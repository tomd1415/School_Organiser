import { vi, describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod/v4';

// The ONE part of the redaction boundary the rest of the suite can't reach: the SUCCESS path of the
// wrapper (a real key forces the integration suite to skip it). We mock the Anthropic SDK + the DB
// repos so there's no network and no DB, and assert the load-bearing behaviour — names are redacted
// BEFORE send, tokens are re-expanded to names AFTER (display only), the audit stores the redacted
// request + cost, and safeguarding-flagged items are withheld entirely.
const h = vi.hoisted(() => ({ create: vi.fn(), parse: vi.fn(), insertAiCall: vi.fn(async () => {}) }));

vi.mock('@anthropic-ai/sdk', () => {
  class APIError extends Error {}
  class Anthropic {
    messages = { create: h.create, parse: h.parse };
    constructor(_opts: unknown) {}
    static APIError = APIError;
  }
  return { default: Anthropic };
});
vi.mock('@anthropic-ai/sdk/helpers/zod', () => ({ zodOutputFormat: () => ({}) }));
vi.mock('../src/config/llm', () => ({ ANTHROPIC_API_KEY: 'sk-mock', PROVIDER: 'anthropic', PRICE_PENCE_PER_MTOK: {} }));
vi.mock('../src/repos/settings', () => ({ aiEnabled: async () => true, getSetting: async () => null, monthCapPence: async () => 100000 }));
vi.mock('../src/repos/pupils', () => ({ listRoster: async () => [{ id: 1, displayName: 'Zoë Quibble', aiToken: 'PUPIL_1', active: true }] }));
vi.mock('../src/repos/aiCalls', () => ({ insertAiCall: h.insertAiCall, monthSpendPence: async () => 0 }));

import { callLLM, callLLMStructured } from '../src/llm/client';

describe('LLM wrapper success path (mocked SDK — no network, no DB)', () => {
  beforeEach(() => { h.create.mockReset(); h.parse.mockReset(); h.insertAiCall.mockReset(); });

  it('callLLM redacts the name before send, re-expands tokens for display, audits ok + cost (redacted only)', async () => {
    h.create.mockResolvedValue({ usage: { input_tokens: 10, output_tokens: 5 }, content: [{ type: 'text', text: 'PUPIL_1 did really well today' }] });
    const r = await callLLM({ feature: 'class_work', model: 'claude-x', system: 'You summarise.', context: [{ text: 'Zoë Quibble worked hard' }], instruction: 'go' });
    expect(r.status).toBe('ok');
    expect(r.text).toBe('Zoë Quibble did really well today'); // token → name for DISPLAY
    const sent = JSON.stringify(h.create.mock.calls[0]![0]);
    expect(sent).toContain('PUPIL_1'); // the model only ever saw the token
    expect(sent).not.toContain('Zoë Quibble'); // never the real name
    const ok = h.insertAiCall.mock.calls.map((c) => c[0] as { status: string; requestRedacted: unknown; costPence: number }).find((a) => a.status === 'ok');
    expect(ok).toBeTruthy();
    expect(JSON.stringify(ok!.requestRedacted)).not.toContain('Zoë Quibble'); // audit holds the redacted request only
    expect(ok!.costPence).toBeGreaterThan(0);
  });

  it('callLLMStructured parses the object and re-expands tokens inside it', async () => {
    h.parse.mockResolvedValue({ usage: { input_tokens: 8, output_tokens: 4 }, parsed_output: { summary: 'PUPIL_1 improved on lists' } });
    const r = await callLLMStructured({ feature: 'x', model: 'm', system: 's', context: [{ text: 'note re Zoë Quibble' }], instruction: 'go' }, z.object({ summary: z.string() }));
    expect(r.status).toBe('ok');
    expect(r.data?.summary).toBe('Zoë Quibble improved on lists'); // tokens re-expanded inside the parsed object
    expect(JSON.stringify(h.parse.mock.calls[0]![0])).not.toContain('Zoë Quibble');
  });

  it('withholds a safeguarding-flagged item entirely (never sent)', async () => {
    h.create.mockResolvedValue({ usage: { input_tokens: 3, output_tokens: 2 }, content: [{ type: 'text', text: 'ok' }] });
    await callLLM({ feature: 'x', model: 'm', system: 's', context: [{ text: 'Zoë Quibble said she will hurt herself', safeguarding: true }, { text: 'a clean cohort note' }], instruction: 'go' });
    const sent = JSON.stringify(h.create.mock.calls[0]![0]);
    expect(sent).not.toContain('hurt herself'); // flagged item withheld
    expect(sent).toContain('a clean cohort note'); // clean item still sent
  });
});
