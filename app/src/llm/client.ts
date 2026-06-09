// The ONE wrapper. Every AI call in the app goes through here; nothing else imports the SDK.
// It enforces the two structural guarantees (withhold safeguarding content, redact pupil names),
// audits the redacted request, and degrades cleanly when AI is off/unavailable/over budget.
// Structured output + effort/thinking arrive with the first feature (4.3); for now it returns text.
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY, HAS_API_KEY, PRICE_PENCE_PER_MTOK, PROVIDER } from '../config/llm';
import { aiEnabled, monthCapPence } from '../repos/settings';
import { listRoster } from '../repos/pupils';
import { insertAiCall, monthSpendPence, type AiCallRecord } from '../repos/aiCalls';
import {
  containsRosterName,
  expandTokens,
  redactNames,
  withholdSafeguarding,
  type RedactableItem,
} from '../services/redact';

export type LlmStatus = 'ok' | 'unavailable' | 'blocked' | 'error';

export interface LlmResult {
  status: LlmStatus;
  text: string | null;
  message?: string;
}

export interface LlmRequest {
  feature: string; // audit label, e.g. 'draft_lesson'
  model: string; // from settings.modelFor(role)
  promptVersion?: string;
  system: string;
  context: RedactableItem[]; // free-text context; flagged items withheld, names redacted
  instruction: string; // the question/instruction, appended after the context
  maxTokens?: number;
}

let client: Anthropic | null = null;
function sdk(): Anthropic {
  client ??= new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  return client;
}

function estimateCostPence(model: string, inTok: number, outTok: number): number {
  const p = PRICE_PENCE_PER_MTOK[model] ?? { input: 240, output: 1200 };
  return Number(((inTok * p.input + outTok * p.output) / 1_000_000).toFixed(2));
}

async function audit(req: LlmRequest, fields: Partial<AiCallRecord> & Pick<AiCallRecord, 'status'>): Promise<void> {
  await insertAiCall({
    feature: req.feature,
    provider: PROVIDER,
    model: req.model,
    promptVersion: req.promptVersion ?? null,
    requestRedacted: {},
    response: null,
    inputTokens: null,
    outputTokens: null,
    costPence: null,
    error: null,
    ...fields,
  });
}

export async function callLLM(req: LlmRequest): Promise<LlmResult> {
  // 1. Availability gates — degrade cleanly, never throw into the UI.
  if (!HAS_API_KEY) return { status: 'unavailable', text: null, message: 'No API key configured.' };
  if (!(await aiEnabled())) return { status: 'unavailable', text: null, message: 'AI is switched off in settings.' };

  const [cap, spent] = await Promise.all([monthCapPence(), monthSpendPence()]);
  if (spent >= cap) {
    await audit(req, { status: 'blocked', error: 'monthly cap reached' });
    return { status: 'blocked', text: null, message: `Monthly AI budget (£${Math.round(cap / 100)}) reached.` };
  }

  // 2. The boundary: withhold safeguarding items, redact every roster name to its token.
  const roster = await listRoster();
  const kept = withholdSafeguarding(req.context);
  const userText = [...kept.map((c) => redactNames(c.text, roster)), redactNames(req.instruction, roster)]
    .filter((s) => s.trim().length > 0)
    .join('\n\n');
  const systemText = redactNames(req.system, roster);

  // 3. Egress assertion (defence in depth): if any name survived, refuse to send.
  if (containsRosterName(`${systemText}\n${userText}`, roster)) {
    await audit(req, { status: 'blocked', error: 'redaction incomplete — refused' });
    return { status: 'blocked', text: null, message: 'Redaction check failed; nothing was sent.' };
  }

  // 4. Call the provider; audit the redacted request only.
  const requestRedacted = { system: systemText, user: userText };
  try {
    const res = await sdk().messages.create({
      model: req.model,
      max_tokens: req.maxTokens ?? 8000,
      system: systemText,
      messages: [{ role: 'user', content: userText }],
    });
    const inTok = res.usage.input_tokens ?? 0;
    const outTok = res.usage.output_tokens ?? 0;
    const cost = estimateCostPence(req.model, inTok, outTok);
    const raw = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    await audit(req, {
      status: 'ok',
      requestRedacted,
      response: { text: raw },
      inputTokens: inTok,
      outputTokens: outTok,
      costPence: cost,
    });
    // 5. Re-expand tokens to names for display only.
    return { status: 'ok', text: expandTokens(raw, roster) };
  } catch (err) {
    const msg = err instanceof Anthropic.APIError ? `${err.status ?? ''} ${err.message}`.trim() : (err as Error).message;
    await audit(req, { status: 'error', requestRedacted, error: msg });
    return { status: 'error', text: null, message: 'The AI service is unavailable right now.' };
  }
}
