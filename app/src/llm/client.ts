// The ONE wrapper. Every AI call in the app goes through here; nothing else imports the SDK.
// It enforces the two structural guarantees (withhold safeguarding content, redact pupil names),
// audits the redacted request, and degrades cleanly when AI is off/unavailable/over budget.
// Two call shapes share the same boundary: callLLM (text) and callLLMStructured (typed object).
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { ZodType } from 'zod/v4';
import { ANTHROPIC_API_KEY, HAS_API_KEY, PRICE_PENCE_PER_MTOK, PROVIDER } from '../config/llm';
import { aiEnabled, monthCapPence } from '../repos/settings';
import { listRoster, type RosterEntry } from '../repos/pupils';
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

export interface LlmStructuredResult<T> {
  status: LlmStatus;
  data: T | null;
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

type Prep =
  | { ok: false; status: LlmStatus; message: string }
  | { ok: true; roster: RosterEntry[]; systemText: string; userText: string; requestRedacted: unknown };

// The shared boundary: availability gates → withhold safeguarding → redact names → egress-assert.
// Nothing reaches a provider until this returns ok with an already-clean payload.
async function prepare(req: LlmRequest): Promise<Prep> {
  if (!HAS_API_KEY) return { ok: false, status: 'unavailable', message: 'No API key configured.' };
  if (!(await aiEnabled())) return { ok: false, status: 'unavailable', message: 'AI is switched off in settings.' };

  const [cap, spent] = await Promise.all([monthCapPence(), monthSpendPence()]);
  if (spent >= cap) {
    await audit(req, { status: 'blocked', error: 'monthly cap reached' });
    return { ok: false, status: 'blocked', message: `Monthly AI budget (£${Math.round(cap / 100)}) reached.` };
  }

  const roster = await listRoster();
  const kept = withholdSafeguarding(req.context);
  const userText = [...kept.map((c) => redactNames(c.text, roster)), redactNames(req.instruction, roster)]
    .filter((s) => s.trim().length > 0)
    .join('\n\n');
  const systemText = redactNames(req.system, roster);

  if (containsRosterName(`${systemText}\n${userText}`, roster)) {
    await audit(req, { status: 'blocked', error: 'redaction incomplete — refused' });
    return { ok: false, status: 'blocked', message: 'Redaction check failed; nothing was sent.' };
  }
  return { ok: true, roster, systemText, userText, requestRedacted: { system: systemText, user: userText } };
}

/** Free-text completion. Returns text with tokens re-expanded to names for display. */
export async function callLLM(req: LlmRequest): Promise<LlmResult> {
  const p = await prepare(req);
  if (!p.ok) return { status: p.status, text: null, message: p.message };
  try {
    const res = await sdk().messages.create({
      model: req.model,
      max_tokens: req.maxTokens ?? 8000,
      system: p.systemText,
      messages: [{ role: 'user', content: p.userText }],
    });
    const inTok = res.usage.input_tokens ?? 0;
    const outTok = res.usage.output_tokens ?? 0;
    const raw = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');
    await audit(req, {
      status: 'ok',
      requestRedacted: p.requestRedacted,
      response: { text: raw },
      inputTokens: inTok,
      outputTokens: outTok,
      costPence: estimateCostPence(req.model, inTok, outTok),
    });
    return { status: 'ok', text: expandTokens(raw, p.roster) };
  } catch (err) {
    const msg = err instanceof Anthropic.APIError ? `${err.status ?? ''} ${err.message}`.trim() : (err as Error).message;
    await audit(req, { status: 'error', requestRedacted: p.requestRedacted, error: msg });
    return { status: 'error', text: null, message: 'The AI service is unavailable right now.' };
  }
}

/** Structured completion against a Zod (v4) schema. Returns the parsed object, tokens re-expanded. */
export async function callLLMStructured<T>(req: LlmRequest, schema: ZodType<T>): Promise<LlmStructuredResult<T>> {
  const p = await prepare(req);
  if (!p.ok) return { status: p.status, data: null, message: p.message };
  try {
    const res = await sdk().messages.parse({
      model: req.model,
      max_tokens: req.maxTokens ?? 8000,
      system: p.systemText,
      output_config: { format: zodOutputFormat(schema) },
      messages: [{ role: 'user', content: p.userText }],
    });
    const inTok = res.usage.input_tokens ?? 0;
    const outTok = res.usage.output_tokens ?? 0;
    const cost = estimateCostPence(req.model, inTok, outTok);
    const parsed = res.parsed_output as T | null;
    await audit(req, {
      status: parsed ? 'ok' : 'error',
      requestRedacted: p.requestRedacted,
      response: parsed ?? null,
      inputTokens: inTok,
      outputTokens: outTok,
      costPence: cost,
      error: parsed ? null : 'no parsed output',
    });
    if (!parsed) return { status: 'error', data: null, message: 'The AI returned no usable result.' };
    // Re-expand tokens to names for display only (string fields, via a JSON round-trip).
    const display = JSON.parse(expandTokens(JSON.stringify(parsed), p.roster)) as T;
    return { status: 'ok', data: display };
  } catch (err) {
    const msg = err instanceof Anthropic.APIError ? `${err.status ?? ''} ${err.message}`.trim() : (err as Error).message;
    await audit(req, { status: 'error', requestRedacted: p.requestRedacted, error: msg });
    return { status: 'error', data: null, message: 'The AI service is unavailable right now.' };
  }
}
