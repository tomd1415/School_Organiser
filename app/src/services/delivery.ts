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
