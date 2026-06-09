// FocusService — pick the single next action for "now". Pure ranking; the route
// supplies the candidates (open tasks) with `beforeBell` resolved. Three modes
// tune the weights: morning (do the heavy thing while fresh), free_period (fit the
// window), end_of_day (only light/urgent — then go home).

export type FocusMode = 'morning' | 'free_period' | 'end_of_day';

export interface Candidate {
  id: number;
  title: string;
  urgency: string;
  estimateMin: number | null;
  cognitiveLoad: string | null;
  interest: boolean;
  beforeBell: boolean;
}

const URGENCY_SCORE: Record<string, number> = { urgent_today: 100, by_next_lesson: 70, this_week: 30, someday: 5 };
const LOAD_RANK: Record<string, number> = { low: 1, medium: 2, high: 3 };

/** Score a candidate for a mode + window, or null if it should be hidden now. */
export function scoreCandidate(c: Candidate, mode: FocusMode, windowMinutes: number | null): number | null {
  const load = c.cognitiveLoad ? (LOAD_RANK[c.cognitiveLoad] ?? 2) : 2;
  const estimate = c.estimateMin ?? 15;

  if (windowMinutes != null && estimate > windowMinutes + 5) return null; // won't fit the window
  if (mode === 'end_of_day' && load === 3) return null; // no heavy work at the end of the day

  let score = URGENCY_SCORE[c.urgency] ?? 10;
  if (c.beforeBell) score += 50;
  if (c.interest) score += 10;
  if (mode === 'morning') score += load * 5; // fresh → bias toward heavier work
  if (mode === 'end_of_day') score += (3 - load) * 10; // tired → bias toward lighter work
  return score;
}

export function pickNext(candidates: Candidate[], mode: FocusMode, windowMinutes: number | null): Candidate | null {
  let best: Candidate | null = null;
  let bestScore = -Infinity;
  for (const c of candidates) {
    const score = scoreCandidate(c, mode, windowMinutes);
    if (score === null) continue;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

/** How many candidates are eligible right now (for "N others hidden"). */
export function eligibleCount(candidates: Candidate[], mode: FocusMode, windowMinutes: number | null): number {
  return candidates.filter((c) => scoreCandidate(c, mode, windowMinutes) !== null).length;
}
