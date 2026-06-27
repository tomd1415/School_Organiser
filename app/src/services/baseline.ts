// Phase 16A.7 — the PURE start-of-year baseline logic (no DB, no AI): the random-click guard, the adaptive
// stop, the stage band to sample, and the placement a set of responses yields. Kept pure so the "keep it
// short, don't trust random clicking" rules are unit-tested in isolation; the AI generation of the probe
// and the take-flow UI are the follow-on that feed these.

export interface BaselineResponse {
  stageOrdinal: number; // the stage the item probes
  correct: boolean;
  elapsedMs: number; // time from showing the item to answering
  optionIndex?: number; // which choice (for the patterned-clicking check)
}

export type BaselineConfidence = 'ok' | 'low' | 'flagged';

export interface GuardOptions {
  readMs?: number; // below this, a response is "too fast to have read" (default 1500ms)
  lowFastFrac?: number; // ≥ this fraction fast → 'low' (default 0.3)
  flagFastFrac?: number; // ≥ this fraction fast → 'flagged' (default 0.6)
  patternMin?: number; // ≥ this many responses all on the same option → 'flagged' (default 6)
}

/**
 * Detect responses that look like random clicking and lower the baseline's confidence: too many answers
 * faster than a readable threshold, or an always-the-same-option pattern. A low/flagged baseline is held
 * for teacher review, never auto-trusted as the placement.
 */
export function randomClickGuard(responses: BaselineResponse[], opts: GuardOptions = {}): BaselineConfidence {
  const readMs = opts.readMs ?? 1500;
  const lowFrac = opts.lowFastFrac ?? 0.3;
  const flagFrac = opts.flagFastFrac ?? 0.6;
  const patternMin = opts.patternMin ?? 6;
  if (responses.length === 0) return 'ok';

  const fast = responses.filter((r) => r.elapsedMs < readMs).length;
  const fastFrac = fast / responses.length;

  // patterned: every answered option is the same (and there are enough to be suspicious)
  const opts2 = responses.map((r) => r.optionIndex).filter((o): o is number => o != null);
  const patterned = opts2.length >= patternMin && opts2.every((o) => o === opts2[0]);

  if (fastFrac >= flagFrac || patterned) return 'flagged';
  if (fastFrac >= lowFrac) return 'low';
  return 'ok';
}

/**
 * Adaptive stop for one strand: once the pupil has missed `missStreak` items in a row (the items have got
 * too hard), end the strand — don't make them grind on items above their level. Responses are in the order
 * shown (ascending difficulty). Returns true when the trailing `missStreak` are all incorrect.
 */
export function shouldStopStrand(responses: Array<{ correct: boolean }>, missStreak = 2): boolean {
  if (responses.length < missStreak) return false;
  return responses.slice(-missStreak).every((r) => !r.correct);
}

/**
 * The stage a strand's responses place the pupil at: the highest stage (by ordinal) they answered correctly
 * such that every LOWER probed stage was also correct (contiguous from the bottom). null = they didn't clear
 * even the lowest probed item. Mirrors the roll-up's "you're at the top of the contiguous completed run".
 */
export function placedStageFromResponses(responses: BaselineResponse[]): number | null {
  const byStage = new Map<number, boolean>(); // ordinal → all-correct so far
  for (const r of responses) {
    const prev = byStage.get(r.stageOrdinal);
    byStage.set(r.stageOrdinal, (prev ?? true) && r.correct);
  }
  let placed: number | null = null;
  for (const ord of [...byStage.keys()].sort((a, b) => a - b)) {
    if (!byStage.get(ord)) break; // first incomplete stage stops the climb
    placed = ord;
  }
  return placed;
}

export interface BandOptions {
  spanBelow?: number; // cold start: how many stages below the expected to probe (default 2)
  spanAbove?: number; // ...and above (default 1)
  warmBelow?: number; // warm start: tighter band below the prior stage (default 1)
  warmAbove?: number; // ...and above (default 1)
  minOrdinal?: number; // clamp to the scheme's lowest/highest stage
  maxOrdinal?: number;
}

/**
 * The inclusive [low, high] band of stage ordinals to sample. Cold start (Year 7, no history) probes a
 * BROAD band around the age-expected stage to locate the pupil; warm start probes a TIGHTER band around the
 * prior-year stage (confirm-and-nudge). Clamped to the scheme's stage range.
 */
export function baselineBand(centreOrdinal: number, mode: 'cold_start' | 'warm_start', opts: BandOptions = {}): [number, number] {
  const below = mode === 'cold_start' ? (opts.spanBelow ?? 2) : (opts.warmBelow ?? 1);
  const above = mode === 'cold_start' ? (opts.spanAbove ?? 1) : (opts.warmAbove ?? 1);
  let lo = centreOrdinal - below;
  let hi = centreOrdinal + above;
  if (opts.minOrdinal != null) lo = Math.max(lo, opts.minOrdinal);
  if (opts.maxOrdinal != null) hi = Math.min(hi, opts.maxOrdinal);
  if (hi < lo) hi = lo;
  return [lo, hi];
}
