// Phase 12 D1 — calibrate task-time estimates from the teacher's own timed history. The maths is
// pure and deterministic (median actual÷estimate ratio → a suggested padding multiplier); a cheap AI
// call then turns the numbers into a short, friendly insight. No pupil data — task titles + times only,
// and they still ride the wrapper's context[] (redaction/withholding/audit) so a stray name is tokenised.
import { callLLM } from '../llm/client';
import type { RedactableItem } from '../services/redact';
import { estimateSamples } from '../repos/tasks';
import { modelForFeature } from '../repos/settings';

export interface EstimateSample {
  title: string;
  estimateMin: number;
  actualMin: number;
  cognitiveLoad: string | null;
}

export interface Calibration {
  count: number;
  medianRatio: number; // actual ÷ estimate (1 = spot on, >1 = you underestimate)
  biasPct: number; // (medianRatio − 1) × 100, rounded
  multiplier: number; // suggested padding factor (medianRatio, 1 dp, clamped 0.5–3)
  verdict: 'under' | 'over' | 'accurate';
  byLoad: Array<{ load: string; count: number; medianRatio: number }>;
}

const MIN_SAMPLES = 3; // below this there isn't enough signal to calibrate

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Pure: derive the calibration from estimate/actual pairs. Returns null when there's too little data. */
export function summariseCalibration(samples: EstimateSample[]): Calibration | null {
  const valid = samples.filter((s) => s.estimateMin > 0 && s.actualMin > 0);
  if (valid.length < MIN_SAMPLES) return null;
  const ratios = valid.map((s) => s.actualMin / s.estimateMin);
  const medianRatio = median(ratios);
  const biasPct = Math.round((medianRatio - 1) * 100);
  const multiplier = Math.min(3, Math.max(0.5, Math.round(medianRatio * 10) / 10));
  const verdict: Calibration['verdict'] = biasPct > 15 ? 'under' : biasPct < -15 ? 'over' : 'accurate';

  const loads = ['low', 'medium', 'high'];
  const byLoad = loads
    .map((load) => {
      const g = valid.filter((s) => s.cognitiveLoad === load);
      return { load, count: g.length, medianRatio: median(g.map((s) => s.actualMin / s.estimateMin)) };
    })
    .filter((g) => g.count >= 2);

  return { count: valid.length, medianRatio, biasPct, multiplier, verdict, byLoad };
}

/** A plain-English headline that always works (no AI needed) — the deterministic core of the feature. */
export function calibrationHeadline(c: Calibration): string {
  if (c.verdict === 'accurate') return `Your estimates are about right — typically within ~${Math.abs(c.biasPct)}% (from ${c.count} timed tasks).`;
  const dir = c.verdict === 'under' ? 'longer than' : 'less than';
  const word = c.verdict === 'under' ? 'underestimate' : 'overestimate';
  return `You tend to ${word}: timed tasks took about ${c.multiplier}× your estimate (${Math.abs(c.biasPct)}% ${dir} planned, from ${c.count} tasks). Try padding new estimates by ×${c.multiplier}.`;
}

export async function gatherCalibration(): Promise<{ calibration: Calibration | null; samples: EstimateSample[] }> {
  const rows = await estimateSamples(40);
  const samples: EstimateSample[] = rows.map((r) => ({
    title: r.title,
    estimateMin: r.estimateMin,
    actualMin: Math.round(r.actualSeconds / 60),
    cognitiveLoad: r.cognitiveLoad,
  }));
  return { calibration: summariseCalibration(samples), samples };
}

const CAL_SYSTEM =
  'You are a calm productivity coach for a busy teacher. You are given a deterministic analysis of how ' +
  'their task-time ESTIMATES compared with the ACTUAL time they recorded, plus a few examples. In 2–3 ' +
  'short sentences give a kind, practical insight — name the pattern, one likely reason, and one concrete ' +
  'tip (e.g. a padding factor or which kind of task to budget more for). No lists, no preamble, plain UK English.';

/** Optional AI insight on top of the deterministic headline. Returns '' when AI is off / unavailable. */
export async function calibrationInsight(c: Calibration, samples: EstimateSample[]): Promise<string> {
  const byLoad = c.byLoad.map((g) => `${g.load}: ${g.medianRatio.toFixed(1)}× (${g.count})`).join(', ');
  const examples = samples
    .slice(0, 8)
    .map((s) => `• ${s.title} — estimated ${s.estimateMin}m, took ${s.actualMin}m`)
    .join('\n');
  const context: RedactableItem[] = [
    { text: `ANALYSIS: ${c.count} timed tasks. Median actual÷estimate = ${c.medianRatio.toFixed(2)} (${c.biasPct >= 0 ? '+' : ''}${c.biasPct}% vs planned). By cognitive load — ${byLoad || 'n/a'}.` },
    { text: `EXAMPLES:\n${examples}` },
  ];
  const res = await callLLM({
    feature: 'estimate_calibration',
    model: await modelForFeature('estimate_calibration', 'cheap'),
    system: CAL_SYSTEM,
    context,
    instruction: 'Give the short calibration insight now.',
    maxTokens: 200,
  });
  return res.status === 'ok' ? (res.text ?? '').trim() : '';
}
