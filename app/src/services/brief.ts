// Wave 7.1 — the morning brief, pure. No DB (type-only import below) so it unit-tests freely. The
// route/scheduled job gather the inputs (coverage rows, next school day, marking count) and call
// buildBrief; the digest is deterministic and AI-free.
import type { CoverageCourseRow } from '../repos/brief';

export type RiskLevel = 'high' | 'medium';

/** Banded coverage risk: tightens as the exam nears, deliberately conservative so it never over-flags. */
export function coverageRisk(coveredPct: number, weeksToExam: number | null): RiskLevel | null {
  if (weeksToExam == null || weeksToExam < 0) return null; // no exam ahead (or already past)
  if (weeksToExam <= 6 && coveredPct < 0.9) return 'high';
  if (weeksToExam <= 16 && coveredPct < 0.6) return 'medium';
  return null;
}

/** Whole weeks between two ISO dates (toIso − fromIso), can be fractional → rounded by the caller. */
export function weeksBetween(fromIso: string, toIso: string): number {
  return (Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / (7 * 86_400_000);
}

export interface BriefItem {
  level: RiskLevel | 'info';
  icon: string;
  text: string;
  href?: string;
}

export interface BriefInput {
  today: string; // 'YYYY-MM-DD'
  coverage: CoverageCourseRow[];
  nextSchoolDay: { label: string; teachingCount: number } | null;
  markingClasses: number;
  openReviews?: number; // Wave 7.2 — advisory lesson reviews waiting (from the nightly sweep)
}

export function buildBrief(input: BriefInput): BriefItem[] {
  const risks: BriefItem[] = [];
  for (const c of input.coverage) {
    if (c.total <= 0) continue;
    const pct = c.covered / c.total;
    const weeks = c.examDate ? weeksBetween(input.today, c.examDate) : null;
    const level = coverageRisk(pct, weeks);
    if (!level) continue;
    const when = weeks == null ? '' : `, exam in ${Math.max(0, Math.round(weeks))} wk`;
    risks.push({ level, icon: '📉', text: `${c.courseName}: ${Math.round(pct * 100)}% covered${when}`, href: '/coverage' });
  }
  risks.sort((a, b) => (a.level === b.level ? 0 : a.level === 'high' ? -1 : 1));

  const items: BriefItem[] = [...risks];
  if (input.nextSchoolDay && input.nextSchoolDay.teachingCount > 0) {
    const n = input.nextSchoolDay.teachingCount;
    items.push({ level: 'info', icon: '📅', text: `${input.nextSchoolDay.label}: ${n} lesson${n === 1 ? '' : 's'} to teach`, href: '/timetable' });
  }
  if (input.markingClasses > 0) {
    items.push({ level: 'info', icon: '✍️', text: `Marking waiting for ${input.markingClasses} class${input.markingClasses === 1 ? '' : 'es'}`, href: '/' });
  }
  if ((input.openReviews ?? 0) > 0) {
    const n = input.openReviews as number;
    items.push({ level: 'info', icon: '🔎', text: `${n} lesson review${n === 1 ? '' : 's'} to look at`, href: '/schemes' });
  }
  return items;
}
