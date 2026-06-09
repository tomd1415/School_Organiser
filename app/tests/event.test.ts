import { describe, it, expect } from 'vitest';
import { daysUntil, dueSoon, type UpcomingEvent } from '../src/services/event';

describe('daysUntil', () => {
  it('counts whole days, signed', () => {
    expect(daysUntil('2026-09-10', '2026-09-09')).toBe(1);
    expect(daysUntil('2026-09-09', '2026-09-09')).toBe(0);
    expect(daysUntil('2026-09-08', '2026-09-09')).toBe(-1);
  });
});

describe('dueSoon', () => {
  const mk = (over: Partial<UpcomingEvent>): UpcomingEvent => ({
    id: 1,
    kind: 'report_deadline',
    title: 'x',
    date: null,
    leadDays: null,
    affectsAvailability: false,
    status: 'upcoming',
    ...over,
  });
  const today = '2026-09-09';

  it('surfaces events within lead time + overdue, sorted; hides far-off and undated', () => {
    const got = dueSoon(
      [
        mk({ id: 1, date: '2026-09-11', leadDays: 3 }), // in 2, lead 3 → soon
        mk({ id: 2, date: '2026-09-20', leadDays: 3 }), // in 11, lead 3 → no
        mk({ id: 3, date: '2026-09-07', leadDays: 1 }), // overdue → soon
        mk({ id: 4, date: null }), // no date → never
        mk({ id: 5, date: '2026-09-14' }), // in 5, default lead 7 → soon
      ],
      today,
    );
    expect(got.map((e) => e.id)).toEqual([3, 1, 5]); // sorted by daysUntil ascending
  });
});
