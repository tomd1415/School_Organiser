// TaskService — the pure task logic. Bucketing + the label/enum vocab here; SQL
// in repos/tasks.ts. `resolveDueRule` (2.3) turns "by next lesson with X" into a
// due instant using the Phase-1 ClockService.

export const URGENCIES = ['urgent_today', 'by_next_lesson', 'this_week', 'someday'] as const;
export type Urgency = (typeof URGENCIES)[number];
export const URGENCY_LABELS: Record<string, string> = {
  urgent_today: 'Urgent today',
  by_next_lesson: 'By next lesson',
  this_week: 'This week',
  someday: 'Someday',
};

export const LOADS = ['low', 'medium', 'high'] as const;
export const LOAD_LABELS: Record<string, string> = { low: 'Low load', medium: 'Med load', high: 'High load' };

export type TaskView = 'inbox' | 'open' | 'done';
const STATUSES: Record<TaskView, string[]> = {
  inbox: ['inbox'],
  open: ['triaged', 'scheduled', 'in_progress'],
  done: ['done', 'dropped'],
};

export function statusesFor(view: TaskView): string[] {
  return STATUSES[view];
}

// ── due_rule + "before the next bell" (2.3) ──────────────────────────────────
// Pure: works in civil dates + minutes-since-midnight, so comparisons need no
// timezone-instant conversion (the same trick the ClockService uses).

import { addDays, localParts, weekdayOf } from '../lib/time';
import { classifyDay, type TermDate } from './clock';

export interface GroupSlot {
  weekday: number;
  slotOrder: number;
  startMin: number;
}

export interface CivilPoint {
  date: string; // YYYY-MM-DD
  startMin: number;
}

export interface BellTask {
  id: number;
  title: string;
  urgency: string;
  dueAt: string | null; // UTC ISO ("…Z")
  dueRule: string | null;
  groupId: number | null;
}

/** `before_next_lesson:<group_id>` → the civil start of that group's next lesson. */
export function resolveDueRule(
  rule: string,
  now: Date,
  groupSlots: Map<number, GroupSlot[]>,
  terms: TermDate[],
  tz: string,
): CivilPoint | null {
  const match = /^before_next_lesson:(\d+)$/.exec(rule);
  if (!match || !match[1]) return null;
  const slots = groupSlots.get(Number(match[1]));
  if (!slots || slots.length === 0) return null;

  const { isoDate, minutes, weekday } = localParts(now, tz);
  for (let i = 0; i <= 60; i++) {
    const date = i === 0 ? isoDate : addDays(isoDate, i);
    const wd = i === 0 ? weekday : weekdayOf(date);
    if (!classifyDay(date, wd, terms).isSchoolDay) continue;
    const next = slots
      .filter((s) => s.weekday === wd && (i > 0 || s.startMin > minutes))
      .sort((a, b) => a.startMin - b.startMin)[0];
    if (next) return { date, startMin: next.startMin };
  }
  return null;
}

function atOrBefore(a: CivilPoint, b: CivilPoint): boolean {
  return a.date < b.date || (a.date === b.date && a.startMin <= b.startMin);
}

/** Filter open tasks to those that must be done before the next teaching bell. */
export function beforeNextBell(
  tasks: BellTask[],
  nextBell: CivilPoint | null,
  now: Date,
  groupSlots: Map<number, GroupSlot[]>,
  terms: TermDate[],
  tz: string,
): BellTask[] {
  return tasks.filter((t) => {
    if (t.urgency === 'urgent_today' || t.urgency === 'by_next_lesson') return true;
    if (!nextBell) return false;
    if (t.dueAt) {
      const c = localParts(new Date(t.dueAt), tz);
      if (atOrBefore({ date: c.isoDate, startMin: c.minutes }, nextBell)) return true;
    }
    if (t.dueRule) {
      const due = resolveDueRule(t.dueRule, now, groupSlots, terms, tz);
      if (due && atOrBefore(due, nextBell)) return true;
    }
    return false;
  });
}
