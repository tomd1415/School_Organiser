import { describe, it, expect } from 'vitest';
import { resolveNow, type ClockContext, type PeriodDefinition, type TermDate } from '../src/services/clock';
import { buildPeriodDefinitions, TERM_DATES, TZ } from '../src/seed/data';
import { toMinutes } from '../src/lib/time';

// Build the clock fixtures from the SAME typed seed data the DB uses, so the
// test and the real timetable cannot drift.
const periods: PeriodDefinition[] = buildPeriodDefinitions().map((p) => ({
  weekday: p.weekday,
  slotOrder: p.slotOrder,
  slotType: p.slotType,
  label: p.label,
  lessonIndex: p.lessonIndex,
  startMin: toMinutes(p.start),
  endMin: toMinutes(p.end),
  teachable: p.teachable,
}));
const terms: TermDate[] = TERM_DATES.map((t) => ({ startDate: t.start, endDate: t.end, kind: t.kind, name: t.name }));
const ctx: ClockContext = { periods, terms, tz: TZ };

// All instants carry an explicit offset (BST = +01:00 in term-time autumn, GMT = +00:00 in winter)
// so the wall-clock conversion is unambiguous. 2026-09-01 is a Tuesday (term start).
const now = (iso: string) => resolveNow(new Date(iso), ctx);

describe('ClockService — current period within a school day', () => {
  it('mid-lesson: Wed 11:10 BST is in Lesson 3 with 45 min left', () => {
    const s = now('2026-09-09T11:10:00+01:00');
    expect(s.isSchoolDay).toBe(true);
    expect(s.dayKind).toBe('school');
    expect(s.current?.lessonIndex).toBe(3);
    expect(s.current?.slotType).toBe('lesson');
    expect(s.minutesRemaining).toBe(45);
  });

  it('start_time is inclusive: 09:10 is the start of Lesson 1 (50 min left)', () => {
    const s = now('2026-09-09T09:10:00+01:00');
    expect(s.current?.lessonIndex).toBe(1);
    expect(s.minutesRemaining).toBe(50);
  });

  it('end_time is exclusive: 10:00 is Lesson 2, not the end of Lesson 1', () => {
    const s = now('2026-09-09T10:00:00+01:00');
    expect(s.current?.lessonIndex).toBe(2);
  });

  it('break is a period but not teachable', () => {
    const s = now('2026-09-09T10:55:00+01:00');
    expect(s.current?.slotType).toBe('break');
    expect(s.current?.lessonIndex).toBeNull();
  });

  it('lunch resolves to the lunch slot', () => {
    const s = now('2026-09-09T13:00:00+01:00');
    expect(s.current?.slotType).toBe('lunch');
  });

  it('a free period still resolves at the period level (Tue Lesson 4)', () => {
    const s = now('2026-09-08T12:00:00+01:00');
    expect(s.current?.lessonIndex).toBe(4);
  });
});

describe('ClockService — edges of the day and the next teaching slot', () => {
  it('before the day: 07:00 has no current period; next is today Lesson 1', () => {
    const s = now('2026-09-09T07:00:00+01:00');
    expect(s.current).toBeNull();
    expect(s.nextTeaching?.date).toBe('2026-09-09');
    expect(s.nextTeaching?.lessonIndex).toBe(1);
  });

  it('early morning: 08:00 is the before-school slot, not a lesson', () => {
    const s = now('2026-09-09T08:00:00+01:00');
    expect(s.current?.slotType).toBe('before_school');
    expect(s.nextTeaching?.lessonIndex).toBe(1);
  });

  it('after school: 16:00 is the after-school slot; next is the following morning', () => {
    const s = now('2026-09-09T16:00:00+01:00');
    expect(s.current?.slotType).toBe('after_school');
    expect(s.nextTeaching?.date).toBe('2026-09-10');
    expect(s.nextTeaching?.lessonIndex).toBe(1);
  });

  it('Friday last lesson → next teaching is Monday Lesson 1 (skips the weekend)', () => {
    const s = now('2026-09-11T15:00:00+01:00');
    expect(s.current?.lessonIndex).toBe(6);
    expect(s.nextTeaching?.date).toBe('2026-09-14');
    expect(s.nextTeaching?.lessonIndex).toBe(1);
  });
});

describe('ClockService — non-school days', () => {
  it('Saturday is a weekend; next teaching is Monday', () => {
    const s = now('2026-09-12T11:00:00+01:00');
    expect(s.isSchoolDay).toBe(false);
    expect(s.dayKind).toBe('weekend');
    expect(s.current).toBeNull();
    expect(s.nextTeaching?.date).toBe('2026-09-14');
  });

  it('half-term week is not a school day; next teaching is after the break', () => {
    const s = now('2026-10-28T11:00:00+00:00');
    expect(s.isSchoolDay).toBe(false);
    expect(s.dayKind).toBe('half_term');
    expect(s.nextTeaching?.date).toBe('2026-11-02');
  });

  it('INSET day (1 Sep) is not a teaching day; next is the first pupil day', () => {
    const s = now('2026-09-01T11:00:00+01:00');
    expect(s.isSchoolDay).toBe(false);
    expect(s.dayKind).toBe('inset');
    expect(s.nextTeaching?.date).toBe('2026-09-02');
  });

  it('crosses Christmas and skips the spring INSET to the first spring pupil day', () => {
    const s = now('2026-12-21T11:00:00+00:00');
    expect(s.dayKind).toBe('holiday');
    // Spring term starts Mon 4 Jan (INSET) → first teaching is Tue 5 Jan.
    expect(s.nextTeaching?.date).toBe('2027-01-05');
  });

  it('in-term bank holiday (Mon 3 May 2027) is closed; next teaching is the Tuesday', () => {
    const s = now('2027-05-03T11:00:00+01:00');
    expect(s.isSchoolDay).toBe(false);
    expect(s.dayKind).toBe('holiday');
    expect(s.nextTeaching?.date).toBe('2027-05-04');
  });
});
