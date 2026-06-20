// RecurrenceService — pure: given a pattern and the last due date, the next due
// point. The repo's generator calls this repeatedly to materialise instances.
// Patterns: weekly:<dow> · every_weeks:<n>:<dow> · monthly:<dom> · per_lesson:<group_id>
import { addDays, weekdayOf } from '../lib/time';
import { classifyDay, type TermDate } from './clock';
import type { GroupSlot } from './task';

export interface DuePoint {
  date: string; // YYYY-MM-DD
  startMin: number;
}

export interface RecurCtx {
  groupSlots: Map<number, GroupSlot[]>;
  terms: TermDate[];
}

const DEFAULT_START = 17 * 60; // date-based recurrences are "due" at 17:00 unless lesson-bound
const REF_MONDAY = '2024-01-01'; // a known Monday, for fortnight/N-week parity

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) / 86_400_000);
}

function nextWeekday(afterIso: string, dow: number, everyWeeks: number): DuePoint {
  for (let i = 1; i <= 7 * Math.max(1, everyWeeks) + 7; i++) {
    const d = addDays(afterIso, i);
    if (weekdayOf(d) !== dow) continue;
    if (everyWeeks > 1 && Math.floor(daysBetween(REF_MONDAY, d) / 7) % everyWeeks !== 0) continue;
    return { date: d, startMin: DEFAULT_START };
  }
  return { date: addDays(afterIso, 7 * Math.max(1, everyWeeks)), startMin: DEFAULT_START };
}

function nextMonthly(afterIso: string, dom: number): DuePoint {
  for (let i = 1; i <= 62; i++) {
    const d = addDays(afterIso, i);
    if (Number(d.slice(8, 10)) === dom) return { date: d, startMin: DEFAULT_START };
  }
  return { date: addDays(afterIso, 30), startMin: DEFAULT_START };
}

// BUG-025: per_lesson recurs once PER LESSON, so a class taught twice in a day must yield two due
// points. Return the next (date, slot) STRICTLY AFTER the cursor (afterIso, afterStartMin): on the
// cursor day only slots later than afterStartMin count; on later days the earliest slot. The generator
// advances the cursor to each returned point, so same-day slots are walked in order before moving on.
function nextLesson(afterIso: string, afterStartMin: number, groupId: number, ctx: RecurCtx): DuePoint | null {
  const slots = ctx.groupSlots.get(groupId);
  if (!slots || slots.length === 0) return null;
  for (let i = 0; i <= 60; i++) {
    const d = addDays(afterIso, i);
    const wd = weekdayOf(d);
    if (!classifyDay(d, wd, ctx.terms).isSchoolDay) continue;
    const daySlots = slots.filter((s) => s.weekday === wd).sort((a, b) => a.startMin - b.startMin);
    for (const slot of daySlots) {
      if (i === 0 && slot.startMin <= afterStartMin) continue; // at/before the cursor on its own day
      return { date: d, startMin: slot.startMin };
    }
  }
  return null;
}

// `afterStartMin` is only consulted by per_lesson (the date-based patterns recur at most once a day, so
// they step strictly by date). Callers seeking the first due of a fresh cursor day pass END_OF_DAY.
export const END_OF_DAY = 24 * 60;

export function nextDueDate(pattern: string, afterIso: string, afterStartMin: number, ctx: RecurCtx): DuePoint | null {
  const weekly = /^weekly:([1-7])$/.exec(pattern);
  if (weekly && weekly[1]) return nextWeekday(afterIso, Number(weekly[1]), 1);

  const everyN = /^every_weeks:(\d+):([1-7])$/.exec(pattern);
  if (everyN && everyN[1] && everyN[2]) return nextWeekday(afterIso, Number(everyN[2]), Math.max(1, Number(everyN[1])));

  const monthly = /^monthly:(\d{1,2})$/.exec(pattern);
  if (monthly && monthly[1]) return nextMonthly(afterIso, Math.min(28, Math.max(1, Number(monthly[1]))));

  const perLesson = /^per_lesson:(\d+)$/.exec(pattern);
  if (perLesson && perLesson[1]) return nextLesson(afterIso, afterStartMin, Number(perLesson[1]), ctx);

  return null;
}
