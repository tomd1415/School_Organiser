import { describe, expect, it } from 'vitest';
import { upcomingSlotDates, weekdayName } from '../src/services/delivery';
import type { TermDate } from '../src/services/clock';

// Self-contained calendar: spring term with a half-term week and one INSET Monday,
// then a summer term after a two-week holiday. 2026-01-05 is a Monday.
const terms: TermDate[] = [
  { startDate: '2026-01-05', endDate: '2026-03-27', kind: 'term', name: 'Spring' },
  { startDate: '2026-02-16', endDate: '2026-02-20', kind: 'half_term', name: 'Half term' },
  { startDate: '2026-01-19', endDate: '2026-01-19', kind: 'inset', name: 'INSET' },
  { startDate: '2026-04-13', endDate: '2026-07-17', kind: 'term', name: 'Summer' },
];

describe('upcomingSlotDates (5.4 — weekly slot dates, holiday-aware)', () => {
  it('returns consecutive Mondays, skipping the INSET day and half-term week', () => {
    expect(upcomingSlotDates(1, '2026-01-05', 6, terms)).toEqual([
      '2026-01-05',
      '2026-01-12',
      // 2026-01-19 skipped — INSET
      '2026-01-26',
      '2026-02-02',
      '2026-02-09',
      // 2026-02-16 skipped — half term
      '2026-02-23',
    ]);
  });

  it('includes fromDate itself when it lands on the slot weekday', () => {
    expect(upcomingSlotDates(1, '2026-01-12', 1, terms)).toEqual(['2026-01-12']);
  });

  it('starts at the next occurrence when fromDate is mid-week', () => {
    expect(upcomingSlotDates(1, '2026-01-07', 1, terms)).toEqual(['2026-01-12']);
  });

  it('slides across the Easter holiday into the next term', () => {
    expect(upcomingSlotDates(1, '2026-03-02', 5, terms)).toEqual([
      '2026-03-02',
      '2026-03-09',
      '2026-03-16',
      '2026-03-23',
      // 03-30 and 04-06 are out of term — skipped
      '2026-04-13',
    ]);
  });

  it('handles a Friday slot (weekday 5)', () => {
    expect(upcomingSlotDates(5, '2026-02-09', 3, terms)).toEqual([
      '2026-02-13',
      // 02-20 skipped — half term
      '2026-02-27',
      '2026-03-06',
    ]);
  });

  it('terminates (empty) when no school days exist at all', () => {
    expect(upcomingSlotDates(1, '2026-01-05', 3, [])).toEqual([]);
  });

  it('never returns weekend dates even if asked for weekday 6/7', () => {
    expect(upcomingSlotDates(6, '2026-01-05', 2, terms)).toEqual([]);
  });

  it('weekdayName maps 1..7', () => {
    expect(weekdayName(1)).toBe('Mon');
    expect(weekdayName(5)).toBe('Fri');
  });
});
