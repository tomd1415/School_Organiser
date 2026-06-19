// Wave 7.3 — pure spaced-retrieval selection: from a class's dated taught-history, pick the lesson
// nearest each spacing target (~2 and ~6 weeks back) to recap. No DB (type-only import), no AI.
import type { PastLesson } from '../repos/retrieval';

export interface RecallItem {
  ageLabel: string; // "2 weeks ago"
  date: string;
  title: string | null;
  objective: string;
}

const DAY = 86_400_000;
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY);
}

/** The first teachable objective line, stripped of bullet/number prefixes and capped. */
export function firstObjective(objectives: string | null): string {
  if (!objectives) return '';
  const line = objectives
    .split('\n')
    .map((s) => s.replace(/^[-*•\d.()\s]+/, '').trim())
    .find(Boolean);
  return (line ?? '').slice(0, 160);
}

const TARGETS = [
  { days: 14, label: '2 weeks ago', tol: 5 },
  { days: 42, label: '6 weeks ago', tol: 10 },
];

/** Pick the past lesson nearest each spacing target (within tolerance); no date reused across targets. */
export function pickSpacedRecall(past: PastLesson[], today: string): RecallItem[] {
  const out: RecallItem[] = [];
  const usedDates = new Set<string>();
  for (const t of TARGETS) {
    let best: { row: PastLesson; diff: number } | null = null;
    for (const row of past) {
      if (usedDates.has(row.date)) continue;
      const age = daysBetween(row.date, today);
      if (age <= 0) continue; // future / same day
      const diff = Math.abs(age - t.days);
      if (diff > t.tol) continue;
      if (!best || diff < best.diff) best = { row, diff };
    }
    if (!best) continue;
    const objective = firstObjective(best.row.objectives);
    if (!objective) continue;
    usedDates.add(best.row.date);
    out.push({ ageLabel: t.label, date: best.row.date, title: best.row.title, objective });
  }
  return out;
}
