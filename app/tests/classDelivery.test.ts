import { describe, it, expect } from 'vitest';
import { cascadeInsert, pullForward, upcomingClassSlots, type ClassSlot, type Placement } from '../src/services/delivery';
import type { TermDate } from '../src/services/clock';

// Build a stream of positions from a compact spec: a plan id, or null for an empty slot, or
// [id, 'lock'] for a pinned position. Dates/slots are synthetic but realistic-shaped.
function positions(spec: Array<number | null | [number, 'lock']>): Placement[] {
  return spec.map((s, i) => {
    const base = { date: `2026-06-${String(15 + i).padStart(2, '0')}`, timetabledLessonId: 10 };
    if (Array.isArray(s)) return { ...base, lessonPlanId: s[0], locked: true };
    return { ...base, lessonPlanId: s };
  });
}
const plans = (ps: Placement[]) => ps.map((p) => p.lessonPlanId);
// Apply the returned changes onto a copy of the starting plan array, for easy assertion.
function applied(start: Placement[], changes: Placement[]): Array<number | null> {
  const out = plans(start).slice();
  const idx = new Map(start.map((p, i) => [`${p.date}#${p.timetabledLessonId}`, i]));
  for (const c of changes) out[idx.get(`${c.date}#${c.timetabledLessonId}`)!] = c.lessonPlanId;
  return out;
}

// One open term covering the test window, no holidays — so only weekends are skipped.
const terms: TermDate[] = [{ startDate: '2026-01-01', endDate: '2026-12-31', kind: 'term' }];

describe('upcomingClassSlots (13.1 — multi-lesson-per-week delivery)', () => {
  it('a 3-slots-a-week class gets 3 lessons a week, in date + period order', () => {
    // GCSE-style: Mon (p1), Wed (p1), Fri (p1). Mon 15 Jun 2026 is a Monday.
    const slots: ClassSlot[] = [
      { timetabledLessonId: 10, weekday: 1, slotOrder: 1 }, // Mon
      { timetabledLessonId: 20, weekday: 3, slotOrder: 1 }, // Wed
      { timetabledLessonId: 30, weekday: 5, slotOrder: 1 }, // Fri
    ];
    const stream = upcomingClassSlots(slots, '2026-06-15', 7, terms);
    expect(stream.map((s) => s.date)).toEqual([
      '2026-06-15', '2026-06-17', '2026-06-19', // week 1: Mon, Wed, Fri
      '2026-06-22', '2026-06-24', '2026-06-26', // week 2: Mon, Wed, Fri
      '2026-06-29', // week 3: Mon
    ]);
    // each date carries which weekly slot it is
    expect(stream.slice(0, 3).map((s) => s.timetabledLessonId)).toEqual([10, 20, 30]);
  });

  it('two slots on the SAME day come out in period (slot_order) order', () => {
    const slots: ClassSlot[] = [
      { timetabledLessonId: 200, weekday: 1, slotOrder: 4 }, // Mon, later period
      { timetabledLessonId: 100, weekday: 1, slotOrder: 1 }, // Mon, earlier period
    ];
    const stream = upcomingClassSlots(slots, '2026-06-15', 4, terms);
    expect(stream).toEqual([
      { date: '2026-06-15', timetabledLessonId: 100 },
      { date: '2026-06-15', timetabledLessonId: 200 },
      { date: '2026-06-22', timetabledLessonId: 100 },
      { date: '2026-06-22', timetabledLessonId: 200 },
    ]);
  });

  it('a single-slot class still lays one lesson per week (unchanged for KS3)', () => {
    const stream = upcomingClassSlots([{ timetabledLessonId: 5, weekday: 2, slotOrder: 1 }], '2026-06-15', 3, terms);
    expect(stream.map((s) => s.date)).toEqual(['2026-06-16', '2026-06-23', '2026-06-30']); // Tuesdays
  });

  it('skips a half-term/holiday week (the sequence slides past it)', () => {
    const withHalfTerm: TermDate[] = [
      { startDate: '2026-01-01', endDate: '2026-12-31', kind: 'term' },
      { startDate: '2026-06-22', endDate: '2026-06-26', kind: 'half_term' }, // week 2 off
    ];
    const slots: ClassSlot[] = [{ timetabledLessonId: 1, weekday: 1, slotOrder: 1 }]; // Mondays
    const stream = upcomingClassSlots(slots, '2026-06-15', 3, withHalfTerm);
    expect(stream.map((s) => s.date)).toEqual(['2026-06-15', '2026-06-29', '2026-07-06']); // 22 Jun skipped
  });
});

describe('cascadeInsert (13.5 — "all move along one")', () => {
  it('pushes the occupant and the run after it into the next empty position', () => {
    const p = positions([1, 2, 3, null, 9]);
    const out = applied(p, cascadeInsert(p, 0, 7)); // drop 7 at the front
    expect(out).toEqual([7, 1, 2, 3, 9]); // 1→2→3 each slide one; the gap at idx3 absorbed it; 9 untouched
  });

  it('inserting mid-stream only shifts from the target to the next gap', () => {
    const p = positions([1, 2, 3, null]);
    const out = applied(p, cascadeInsert(p, 1, 7));
    expect(out).toEqual([1, 7, 2, 3]);
  });

  it('the last movable occupant falls off when there is no trailing gap (caller must extend)', () => {
    const p = positions([1, 2, 3]);
    const out = applied(p, cascadeInsert(p, 0, 7));
    expect(out).toEqual([7, 1, 2]); // 3 dropped off the provided window
  });

  it('a dropped-on EMPTY position just places the lesson — nothing shifts', () => {
    const p = positions([1, null, 3]);
    expect(applied(p, cascadeInsert(p, 1, 7))).toEqual([1, 7, 3]);
  });

  it('flows AROUND a locked lesson (the pin keeps its date)', () => {
    const p = positions([1, [2, 'lock'], 3, null]);
    const out = applied(p, cascadeInsert(p, 0, 7));
    expect(out).toEqual([7, 2, 1, 3]); // 2 pinned at idx1; 1 jumps over it to idx2; 3 pushed to idx3
  });

  it('refuses to drop onto a locked position', () => {
    const p = positions([1, [2, 'lock'], 3]);
    expect(cascadeInsert(p, 1, 7)).toEqual([]);
  });
});

describe('pullForward (13.5 — close the gap)', () => {
  it('removes a lesson and pulls the contiguous run forward', () => {
    const p = positions([1, 2, 3, null, 9]);
    expect(applied(p, pullForward(p, 0))).toEqual([2, 3, null, null, 9]); // 9 is past the gap, untouched
  });

  it('clearing the only lesson in a run just empties it', () => {
    const p = positions([1, null, 3]);
    expect(applied(p, pullForward(p, 0))).toEqual([null, null, 3]);
  });

  it('a locked lesson anchors everything after it', () => {
    const p = positions([1, 2, [3, 'lock'], 4]);
    expect(applied(p, pullForward(p, 0))).toEqual([2, null, 3, 4]); // pull stops at the pin; 3,4 stay
  });
});
