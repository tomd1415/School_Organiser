// The ONE wrapper. Every AI call in the app goes through here; nothing else imports the SDK.
// It enforces the two structural guarantees (withhold safeguarding content, redact pupil names),
// audits the redacted request, and degrades cleanly when AI is off/unavailable/over budget.
// Two call shapes share the same boundary: callLLM (text) and callLLMStructured (typed object).
import { setDefaultResultOrder } from 'node:dns';

// The school network's IPv6 route intermittently blackholes while IPv4 stays fine; node then
// hangs on the AAAA record where curl's happy-eyeballs falls back. Prefer IPv4 outright.
setDefaultResultOrder('ipv4first');

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { ZodType } from 'zod/v4';
import { ANTHROPIC_API_KEY, PRICE_PENCE_PER_MTOK, PROVIDER } from '../config/llm';
import { appConfig } from '../config/app';
import { aiEnabled, getSetting, monthCapPence } from '../repos/settings';
import { listRoster, type RosterEntry } from '../repos/pupils';
import { insertAiCall, reconcileAiCall, reserveAiCall, type AiCallRecord } from '../repos/aiCalls';
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
  // Wave 5: an optional conservative cost estimate for THIS call. The monthly cap is otherwise checked
  // only at the START of a call, so one in-flight pricey (Opus) call could overshoot. When set, prepare()
  // refuses if this call would push spend past the cap — so the most expensive feature can't blow it.
  estimatedCostPence?: number;
}

// The API key: the env var wins (existing instances / ops-managed), else the value the teacher
// pastes into Settings. CRITICAL: in test mode we NEVER consult the settings table, so the
// integration suite's forced-empty env key always holds and a key stored in the shared dev DB
// can never cause a real provider call.
export async function resolveApiKey(): Promise<string> {
  if (ANTHROPIC_API_KEY) return ANTHROPIC_API_KEY;
  if (appConfig.NODE_ENV === 'test') return '';
  return (await getSetting('ai_api_key').catch(() => null)) || '';
}

/** Whether any usable key is configured (env or settings) — for routes' "AI unavailable" notes. */
export async function aiKeyConfigured(): Promise<boolean> {
  return (await resolveApiKey()).length > 0;
}

/** True when the key is fixed by the environment (so the Settings field is read-only, like the
 * password form when APP_PASSWORD_HASH is set). */
export const AI_KEY_ENV_MANAGED = ANTHROPIC_API_KEY.length > 0;

let client: Anthropic | null = null;
let clientKey = '';
function sdk(apiKey: string): Anthropic {
  // The school line can crawl (6s+ round-trips) — give the SDK patience instead of insta-failing:
  // more retries with backoff, and a generous per-request timeout for the long generations.
  // Rebuilt only when the resolved key changes (e.g. the teacher updates it in Settings).
  if (!client || clientKey !== apiKey) {
    client = new Anthropic({ apiKey, maxRetries: 4, timeout: 180_000 });
    clientKey = apiKey;
  }
  return client;
}

// Recursively re-expand roster tokens to display names in every string field of a parsed result —
// metachar-safe (no JSON round-trip), so a name like O"Brien or a backslash can't discard the result.
function expandDeep(value: unknown, roster: RosterEntry[]): unknown {
  if (typeof value === 'string') return expandTokens(value, roster);
  if (Array.isArray(value)) return value.map((v) => expandDeep(v, roster));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = expandDeep(v, roster);
    return out;
  }
  return value;
}

function estimateCostPence(model: string, inTok: number, outTok: number): number {
  const p = PRICE_PENCE_PER_MTOK[model] ?? { input: 240, output: 1200 };
  return Number(((inTok * p.input + outTok * p.output) / 1_000_000).toFixed(2));
}

// BUG-011: a CONSERVATIVE pre-call cost estimate, computed centrally (not left to each caller). Assume
// the FULL max_tokens of output and size the input from the redacted payload (~3.5 chars/token is
// generous). Reserving this before the call means a single pricey (Opus) call — or several at once —
// can never push spend past the cap unnoticed. A caller's own declared estimate, if larger, still wins.
function estimateRequestPence(model: string, systemText: string, userText: string, maxTokens: number, declared = 0): number {
  const inTok = Math.ceil((systemText.length + userText.length) / 3.5);
  return Math.max(estimateCostPence(model, inTok, maxTokens), declared);
}

// Pure cap test (Wave 5). The cap is a hard ceiling: refuse if we're already at it, OR if a caller's
// declared estimate for THIS call would cross it. Without the estimate, behaviour is exactly as before
// (block only once spend has reached the cap), so existing callers are unaffected.
export function overMonthlyCap(spent: number, cap: number, estimatePence = 0): boolean {
  return spent >= cap || spent + estimatePence > cap;
}

async function audit(req: LlmRequest, fields: Partial<AiCallRecord> & Pick<AiCallRecord, 'status'>): Promise<void> {
  // The audit write must NEVER throw into the caller — otherwise a failed insert after a SUCCESSFUL
  // (billed) provider call would be caught by the caller's try and re-logged as an 'error',
  // discarding correct output and undercounting spend. Swallow + log instead.
  try {
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
  } catch (err) {
    console.error('[ai audit] failed to record ai_calls row:', (err as Error).message);
  }
}

type Prep =
  | { ok: false; status: LlmStatus; message: string }
  | { ok: true; apiKey: string; roster: RosterEntry[]; systemText: string; userText: string; requestRedacted: unknown };

// The shared boundary: availability gates → withhold safeguarding → redact names → egress-assert.
// Nothing reaches a provider until this returns ok with an already-clean payload.
async function prepare(req: LlmRequest): Promise<Prep> {
  const apiKey = await resolveApiKey();
  if (!apiKey) return { ok: false, status: 'unavailable', message: 'No API key configured.' };
  if (!(await aiEnabled())) return { ok: false, status: 'unavailable', message: 'AI is switched off in settings.' };
  // The monthly-cap check now happens atomically AT RESERVATION time (see reserve()), not here — so a
  // concurrent pair can't both pass a pre-check and overshoot.

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
  return { ok: true, apiKey, roster, systemText, userText, requestRedacted: { system: systemText, user: userText } };
}

type Reserved = { ok: true; id: number } | { ok: false; status: LlmStatus; message: string };

// BUG-011/018: reserve this call's estimated cost against the monthly cap (atomically, in the repo)
// BEFORE the provider call. The reservation row persists the redacted request + the estimate, so the
// spend counts the moment the call is in flight and survives a failed post-call reconcile. Over cap → a
// 'blocked' audit row + a blocked result, exactly as the old pre-check returned.
async function reserve(req: LlmRequest, prep: Extract<Prep, { ok: true }>, estimatePence: number): Promise<Reserved> {
  const cap = await monthCapPence();
  const id = await reserveAiCall(
    { feature: req.feature, provider: PROVIDER, model: req.model, promptVersion: req.promptVersion ?? null, requestRedacted: prep.requestRedacted },
    cap,
    estimatePence,
  );
  if (id == null) {
    await audit(req, { status: 'blocked', error: 'monthly cap reached' });
    return { ok: false, status: 'blocked', message: `Monthly AI budget (£${Math.round(cap / 100)}) reached.` };
  }
  return { ok: true, id };
}

/** Free-text completion. Returns text with tokens re-expanded to names for display. */
export async function callLLM(req: LlmRequest): Promise<LlmResult> {
  const p = await prepare(req);
  if (!p.ok) return { status: p.status, text: null, message: p.message };
  const r = await reserve(req, p, estimateRequestPence(req.model, p.systemText, p.userText, req.maxTokens ?? 8000, req.estimatedCostPence ?? 0));
  if (!r.ok) return { status: r.status, text: null, message: r.message };
  try {
    const res = await sdk(p.apiKey).messages.create({
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
    await reconcileAiCall(r.id, { status: 'ok', response: { text: raw }, inputTokens: inTok, outputTokens: outTok, costPence: estimateCostPence(req.model, inTok, outTok) }).catch((err) =>
      console.error('[ai audit] failed to reconcile ai_calls row:', (err as Error).message),
    );
    return { status: 'ok', text: expandTokens(raw, p.roster) };
  } catch (err) {
    const msg = err instanceof Anthropic.APIError ? `${err.status ?? ''} ${err.message}`.trim() : (err as Error).message;
    // A failed call isn't billed → release the reservation (cost 0), keeping the redacted request + error.
    await reconcileAiCall(r.id, { status: 'error', costPence: 0, error: msg }).catch(() => {});
    return { status: 'error', text: null, message: degradeMessage(msg) };
  }
}


/** A degrade message the teacher can act on, instead of one generic line for every failure. */
function degradeMessage(raw: string): string {
  if (/connection error|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNREFUSED|fetch failed/i.test(raw)) {
    return "Can't reach the AI service — the server has lost internet access (Docker networking can drop this after a host network change). Restart the stack (./start.sh) and try again.";
  }
  if (/parse|schema|too_big|invalid_type|output_format/i.test(raw)) {
    return 'The AI returned an unexpected format — try again (a retry almost always passes).';
  }
  if (/429|rate.?limit/i.test(raw)) return 'The AI service is rate-limiting us — wait a minute and try again.';
  if (/overloaded|529/i.test(raw)) return 'The AI service is overloaded right now — try again shortly.';
  if (/401|403|authentication|invalid.*key/i.test(raw)) return 'The AI key was rejected — check the API key in Settings → AI (or ANTHROPIC_API_KEY in app/.env, where that manages it).';
  return 'The AI service is unavailable right now.';
}

/** Structured completion against a Zod (v4) schema. Returns the parsed object, tokens re-expanded. */
export async function callLLMStructured<T>(req: LlmRequest, schema: ZodType<T>): Promise<LlmStructuredResult<T>> {
  const p = await prepare(req);
  if (!p.ok) return { status: p.status, data: null, message: p.message };
  const r = await reserve(req, p, estimateRequestPence(req.model, p.systemText, p.userText, req.maxTokens ?? 8000, req.estimatedCostPence ?? 0));
  if (!r.ok) return { status: r.status, data: null, message: r.message };
  try {
    const res = await sdk(p.apiKey).messages.parse({
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
    // A parsed result IS billed (cost stands); a null parse still consumed tokens, so keep that cost too.
    await reconcileAiCall(r.id, {
      status: parsed ? 'ok' : 'error',
      response: parsed ?? null,
      inputTokens: inTok,
      outputTokens: outTok,
      costPence: cost,
      error: parsed ? null : 'no parsed output',
    }).catch((err) => console.error('[ai audit] failed to reconcile ai_calls row:', (err as Error).message));
    if (!parsed) return { status: 'error', data: null, message: 'The AI returned no usable result.' };
    // Re-expand tokens to names for display only. Walk the parsed object and expand each STRING value —
    // NOT via a JSON round-trip: a display name containing a JSON metachar (a quote, backslash) would
    // make the re-serialised JSON unparseable and throw away a successful, already-billed response.
    const display = expandDeep(parsed, p.roster) as T;
    return { status: 'ok', data: display };
  } catch (err) {
    const msg = err instanceof Anthropic.APIError ? `${err.status ?? ''} ${err.message}`.trim() : (err as Error).message;
    await reconcileAiCall(r.id, { status: 'error', costPence: 0, error: msg }).catch(() => {}); // not billed → release
    return { status: 'error', data: null, message: degradeMessage(msg) };
  }
}
