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

// Phase 13.5 — planner placement maths. A class's upcoming delivery is one date-ordered stream of
// positions (each a date + which weekly slot); each position holds at most one lesson plan. The drag
// operations rearrange plans ALONG that stream. Pure — the repo builds the positions from the DB and
// persists whatever these return. `locked` positions are pinned (a fixed assessment): cascades flow
// AROUND them, never moving their plan.
export interface Placement {
  date: string;
  timetabledLessonId: number; // which of the class's weekly slots
  lessonPlanId: number | null; // null = empty position
  locked?: boolean; // pinned to its date — a cascade jumps over it
}

// Only the positions whose binding actually changed (date+slot → new plan), for a minimal write.
function changed(positions: Placement[], next: Array<number | null>): Placement[] {
  const out: Placement[] = [];
  for (let i = 0; i < positions.length; i++) {
    if (next[i] !== positions[i]!.lessonPlanId) out.push({ ...positions[i]!, lessonPlanId: next[i]! });
  }
  return out;
}

/**
 * Insert `planId` at `positions[targetIndex]`, pushing the occupant and the contiguous run after it
 * one position LATER along the stream — "all move along one". The shift is absorbed by the first
 * empty (or locked-and-therefore-immovable boundary) position at or after the target; provide enough
 * positions that an empty one exists downstream, or the last movable occupant falls off the window.
 * Locked positions keep their plan and the cascade steps over them. Returns the CHANGED positions.
 */
export function cascadeInsert(positions: Placement[], targetIndex: number, planId: number): Placement[] {
  if (targetIndex < 0 || targetIndex >= positions.length) return [];
  if (positions[targetIndex]!.locked) return []; // can't drop onto a pinned position
  const cur = positions.map((p) => p.lessonPlanId);
  const next = cur.slice();
  // Walk forward from the target carrying the displaced plan; each movable position takes the carried
  // plan and yields its own; locked positions are skipped (carry passes over them); an empty position
  // absorbs the carry and we stop.
  let carry: number | null = planId;
  for (let i = targetIndex; i < positions.length; i++) {
    if (positions[i]!.locked) continue;
    const displaced = cur[i]!;
    next[i] = carry;
    carry = displaced;
    if (displaced == null) break; // landed in a gap — done
  }
  return changed(positions, next);
}

/**
 * Remove the lesson at `positions[targetIndex]` and PULL the contiguous run after it forward one
 * position to close the gap (the inverse of cascadeInsert). Locked positions stay put and stop the
 * pull. Returns the CHANGED positions (the freed tail position ends up empty).
 */
export function pullForward(positions: Placement[], targetIndex: number): Placement[] {
  if (targetIndex < 0 || targetIndex >= positions.length) return [];
  if (positions[targetIndex]!.locked) return [];
  const cur = positions.map((p) => p.lessonPlanId);
  const next = cur.slice();
  let write = targetIndex;
  for (let i = targetIndex + 1; i < positions.length; i++) {
    if (positions[i]!.locked) break; // a pinned lesson anchors everything after it
    if (cur[i] == null) {
      next[i] = null;
      break;
    }
    next[write] = cur[i]!;
    write = i;
  }
  next[write] = null; // the last pulled-from position is now free
  return changed(positions, next);
}
