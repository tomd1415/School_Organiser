// ClockService — the single answer to "what am I teaching now?".
// Pure: given an instant + the period definitions + term dates, it resolves the
// current period, minutes remaining, and the next teaching slot. No DB, no I/O —
// the route layer fetches periods/terms and passes them in. Single repeating
// week (no A/B). One-off exceptions (cover, room changes) arrive in Phase 2.
import { addDays, localParts, weekdayOf } from '../lib/time';

export interface PeriodDefinition {
  weekday: number; // 1=Mon … 7=Sun
  slotOrder: number;
  slotType: string;
  label: string;
  lessonIndex: number | null;
  startMin: number; // minutes since midnight, inclusive
  endMin: number; // exclusive
  teachable: boolean;
}

export interface TermDate {
  startDate: string; // "YYYY-MM-DD", inclusive
  endDate: string; // inclusive
  kind: 'term' | 'half_term' | 'holiday' | 'inset';
  name?: string;
}

export type DayKind = 'school' | 'weekend' | 'holiday' | 'half_term' | 'inset' | 'out_of_term';

export interface SlotRef {
  date: string;
  weekday: number;
  slotOrder: number;
  slotType: string;
  label: string;
  lessonIndex: number | null;
  startMin: number;
  endMin: number;
}

export interface NowState {
  isoDate: string;
  weekday: number;
  minutes: number;
  isSchoolDay: boolean;
  dayKind: DayKind;
  current: SlotRef | null; // the period happening now (null before/after the defined day)
  minutesRemaining: number | null; // until the end of `current`
  nextTeaching: SlotRef | null; // next teachable period, today or a future school day
}

export interface ClockContext {
  periods: PeriodDefinition[];
  terms: TermDate[];
  tz: string;
}

/** ISO date strings compare lexicographically, so range checks are plain string compares. */
function inRange(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end;
}

export interface TermProgress {
  name: string;
  week: number; // 1-based week of the term
  weeksTotal: number;
  weeksLeft: number; // after this one
}

/** Where this date sits in its term — "Week 3 of Summer term (4 left)". Null outside term time. */
export function termProgress(isoDate: string, terms: TermDate[]): TermProgress | null {
  const t = terms.find((x) => x.kind === 'term' && inRange(isoDate, x.startDate, x.endDate));
  if (!t) return null;
  const days = (iso: string) => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86400000;
  const week = Math.floor((days(isoDate) - days(t.startDate)) / 7) + 1;
  const weeksTotal = Math.floor((days(t.endDate) - days(t.startDate)) / 7) + 1;
  return { name: t.name ?? 'term', week, weeksTotal, weeksLeft: weeksTotal - week };
}

/** Is this civil date a teaching day, and if not, why not? */
export function classifyDay(
  isoDate: string,
  weekday: number,
  terms: TermDate[],
): { isSchoolDay: boolean; dayKind: DayKind } {
  if (weekday >= 6) return { isSchoolDay: false, dayKind: 'weekend' };
  // An overlay (holiday / half-term / INSET) wins even inside a term range.
  const exclusion = terms.find((t) => t.kind !== 'term' && inRange(isoDate, t.startDate, t.endDate));
  // The filter guarantees a non-'term' kind, all of which are valid DayKinds.
  if (exclusion) return { isSchoolDay: false, dayKind: exclusion.kind as 'half_term' | 'holiday' | 'inset' };
  const inTerm = terms.some((t) => t.kind === 'term' && inRange(isoDate, t.startDate, t.endDate));
  if (!inTerm) return { isSchoolDay: false, dayKind: 'out_of_term' };
  return { isSchoolDay: true, dayKind: 'school' };
}

function toSlotRef(p: PeriodDefinition, date: string): SlotRef {
  return {
    date,
    weekday: p.weekday,
    slotOrder: p.slotOrder,
    slotType: p.slotType,
    label: p.label,
    lessonIndex: p.lessonIndex,
    startMin: p.startMin,
    endMin: p.endMin,
  };
}

/** Earliest teachable period on `weekday`, optionally starting strictly after `afterMin`. */
function firstTeachable(
  periods: PeriodDefinition[],
  weekday: number,
  afterMin: number | null,
): PeriodDefinition | null {
  const candidates = periods
    .filter((p) => p.weekday === weekday && p.teachable && (afterMin === null || p.startMin > afterMin))
    .sort((a, b) => a.startMin - b.startMin);
  return candidates[0] ?? null;
}

function findNextTeaching(
  isoDate: string,
  weekday: number,
  minutes: number,
  isSchoolDayToday: boolean,
  ctx: ClockContext,
): SlotRef | null {
  if (isSchoolDayToday) {
    const todayNext = firstTeachable(ctx.periods, weekday, minutes);
    if (todayNext) return toSlotRef(todayNext, isoDate);
  }
  // Scan forward — far enough to clear the longest holiday (Christmas/summer).
  for (let i = 1; i <= 60; i++) {
    const date = addDays(isoDate, i);
    const wd = weekdayOf(date);
    if (!classifyDay(date, wd, ctx.terms).isSchoolDay) continue;
    const first = firstTeachable(ctx.periods, wd, null);
    if (first) return toSlotRef(first, date);
  }
  return null;
}

/** Resolve everything the Now screen needs for the given instant. */
export function resolveNow(now: Date, ctx: ClockContext): NowState {
  const { isoDate, minutes, weekday } = localParts(now, ctx.tz);
  const { isSchoolDay, dayKind } = classifyDay(isoDate, weekday, ctx.terms);

  let current: SlotRef | null = null;
  let minutesRemaining: number | null = null;
  if (isSchoolDay) {
    const slot = ctx.periods
      .filter((p) => p.weekday === weekday)
      .find((p) => minutes >= p.startMin && minutes < p.endMin);
    if (slot) {
      current = toSlotRef(slot, isoDate);
      minutesRemaining = slot.endMin - minutes;
    }
  }

  const nextTeaching = findNextTeaching(isoDate, weekday, minutes, isSchoolDay, ctx);
  return { isoDate, weekday, minutes, isSchoolDay, dayKind, current, minutesRemaining, nextTeaching };
}
