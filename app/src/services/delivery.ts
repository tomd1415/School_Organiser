// Phase 5.4: laying a unit's lessons into a group's weekly slot across the calendar.
// Pure date logic — the caller passes the term dates; this picks the upcoming dates the slot
// actually runs on, skipping weekends/holidays/half-term/INSET/out-of-term.
import { addDays, weekdayOf } from '../lib/time';
import { classifyDay, type TermDate } from './clock';

const WEEKDAY_NAMES = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function weekdayName(weekday: number): string {
  return WEEKDAY_NAMES[weekday] ?? `day ${weekday}`;
}

/**
 * The next `count` dates on `weekday` that are school days, on or after `fromDate`.
 * Single repeating weekly timetable, so a slot runs once a week on its weekday — except weeks where
 * that day is a holiday/INSET/half-term/out-of-term, which are skipped (the unit slides past them).
 */
export function upcomingSlotDates(weekday: number, fromDate: string, count: number, terms: TermDate[]): string[] {
  const out: string[] = [];
  let date = fromDate;
  // Cap the scan at ~3 years so a misconfigured weekday can never loop forever.
  for (let guard = 0; out.length < count && guard < 366 * 3; guard++) {
    const wd = weekdayOf(date);
    if (wd === weekday && classifyDay(date, wd, terms).isSchoolDay) out.push(date);
    date = addDays(date, 1);
  }
  return out;
}

// Phase 13.1 — multi-lesson-per-week delivery. A class (group_course) may teach on several weekly
// slots (GCSE = 3/week). One ClassSlot per weekly slot.
export interface ClassSlot {
  timetabledLessonId: number;
  weekday: number;
  slotOrder: number;
}
export interface ClassDate {
  date: string; // YYYY-MM-DD
  timetabledLessonId: number; // which of the class's weekly slots this date belongs to
}

/**
 * Merge ALL of a class's weekly slots into ONE date-ordered stream of teaching occurrences, holiday-
 * aware — so a unit's lessons lay SEQUENTIALLY across the week (3 slots ⇒ 3 lessons a week), not
 * one-per-week-per-slot. Same-day slots come out in period (slot_order) order. Pure date logic.
 */
export function upcomingClassSlots(slots: ClassSlot[], fromDate: string, count: number, terms: TermDate[]): ClassDate[] {
  const ordered = [...slots].sort((a, b) => a.weekday - b.weekday || a.slotOrder - b.slotOrder);
  const out: ClassDate[] = [];
  let date = fromDate;
  for (let guard = 0; out.length < count && guard < 366 * 3; guard++) {
    const wd = weekdayOf(date);
    if (classifyDay(date, wd, terms).isSchoolDay) {
      for (const s of ordered) {
        if (s.weekday !== wd) continue;
        out.push({ date, timetabledLessonId: s.timetabledLessonId });
        if (out.length >= count) break;
      }
    }
    date = addDays(date, 1);
  }
  return out;
}
