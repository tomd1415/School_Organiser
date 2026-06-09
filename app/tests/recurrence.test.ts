import { describe, it, expect } from 'vitest';
import { nextDueDate, type RecurCtx } from '../src/services/recurrence';
import type { TermDate } from '../src/services/clock';
import type { GroupSlot } from '../src/services/task';

const terms: TermDate[] = [{ startDate: '2026-09-01', endDate: '2026-12-18', kind: 'term', name: 'Autumn' }];
const groupSlots = new Map<number, GroupSlot[]>([
  [7, [
    { weekday: 1, slotOrder: 5, startMin: 9 * 60 + 10 }, // Mon 09:10
    { weekday: 3, slotOrder: 8, startMin: 11 * 60 + 5 }, // Wed 11:05
  ]],
]);
const ctx: RecurCtx = { groupSlots, terms };

describe('nextDueDate', () => {
  it('weekly:5 → the next Friday after the given date', () => {
    expect(nextDueDate('weekly:5', '2026-09-09', ctx)).toEqual({ date: '2026-09-11', startMin: 17 * 60 });
  });

  it('monthly:15 → the next 15th', () => {
    expect(nextDueDate('monthly:15', '2026-09-09', ctx)?.date).toBe('2026-09-15');
    expect(nextDueDate('monthly:15', '2026-09-20', ctx)?.date).toBe('2026-10-15');
  });

  it('every_weeks:2:1 → Mondays exactly 14 days apart', () => {
    const first = nextDueDate('every_weeks:2:1', '2026-09-09', ctx)!;
    const second = nextDueDate('every_weeks:2:1', first.date, ctx)!;
    const days = (new Date(`${second.date}T00:00:00Z`).getTime() - new Date(`${first.date}T00:00:00Z`).getTime()) / 86_400_000;
    expect(days).toBe(14);
    expect(new Date(`${first.date}T00:00:00Z`).getUTCDay()).toBe(1); // Monday
  });

  it('per_lesson:7 → the group’s next lesson (skips today), then advances', () => {
    const first = nextDueDate('per_lesson:7', '2026-09-09', ctx)!;
    expect(first).toEqual({ date: '2026-09-14', startMin: 9 * 60 + 10 }); // next Mon L1
    const second = nextDueDate('per_lesson:7', first.date, ctx)!;
    expect(second).toEqual({ date: '2026-09-16', startMin: 11 * 60 + 5 }); // following Wed L3
  });

  it('per_lesson skips a non-school day', () => {
    const inset = [{ startDate: '2026-09-14', endDate: '2026-09-14', kind: 'inset' as const }];
    const due = nextDueDate('per_lesson:7', '2026-09-09', { groupSlots, terms: [...terms, ...inset] })!;
    expect(due.date).toBe('2026-09-16'); // Mon 14th is an INSET → skip to Wed 16th
  });

  it('returns null for an unknown pattern or group', () => {
    expect(nextDueDate('nonsense', '2026-09-09', ctx)).toBeNull();
    expect(nextDueDate('per_lesson:999', '2026-09-09', ctx)).toBeNull();
  });
});
