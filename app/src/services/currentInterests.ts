// Phase 12 D2 — a time-decaying "current interest" profile. Each interest-flagged item carries a
// recency weight (a 14-day half-life), so the Now screen foregrounds what the teacher is interested in
// RIGHT NOW and lets older marks fade out. Deterministic and pure (no AI); the decay maths is testable.
import { listInterestItems, type InterestRow } from '../repos/interests';

const HALF_LIFE_DAYS = 14;
const FRESH = 0.5; // weight ≥ this ⇒ "current" (within ~one half-life); below ⇒ "fading"
const FADED_OUT = 0.08; // weight below this ⇒ dropped from the profile (≈ 7+ weeks since marked)
const DAY_MS = 86_400_000;

export interface InterestItem extends InterestRow {
  weight: number; // 0..1 recency weight
  fresh: boolean; // recent enough to foreground
}

/** Recency weight from an interest timestamp: 1 at "now", halving every HALF_LIFE_DAYS. Null ⇒ 0. */
export function interestWeight(interestAtMs: number | null, nowMs: number, halfLifeDays = HALF_LIFE_DAYS): number {
  if (interestAtMs == null || !Number.isFinite(interestAtMs)) return 0;
  const ageDays = Math.max(0, (nowMs - interestAtMs) / DAY_MS);
  return Math.min(1, 0.5 ** (ageDays / halfLifeDays));
}

/** Weight + sort interest rows; drop fully-faded ones; cap. Pure so the route just renders the result. */
export function rankInterests(rows: InterestRow[], nowMs: number, limit = 6): InterestItem[] {
  return rows
    .map((r) => {
      const ms = r.interestAt ? Date.parse(r.interestAt) : null;
      const weight = interestWeight(Number.isNaN(ms as number) ? null : ms, nowMs);
      return { ...r, weight, fresh: weight >= FRESH };
    })
    .filter((i) => i.weight >= FADED_OUT)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}

export async function currentInterests(nowMs: number, limit = 6): Promise<InterestItem[]> {
  return rankInterests(await listInterestItems(), nowMs, limit);
}
