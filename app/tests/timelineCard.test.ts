import { describe, expect, it } from 'vitest';
import { renderTimelineCard, renderTimelineShell } from '../src/lib/nowView';
import type { NowState } from '../src/services/clock';
import type { LessonRow, PeriodRow } from '../src/services/timetable';

// The Now-screen day timeline must advance its done/active/next markers purely from the (server-resolved,
// school-tz) clock — proving it re-renders correctly as the /now/timeline poll feeds a fresh `minutes`.
// DB-free: just render the card twice with two different clock positions.

const WEEKDAY = 2; // Tuesday

const periods: PeriodRow[] = [
  { weekday: WEEKDAY, slotOrder: 1, slotType: 'lesson', label: 'P1', lessonIndex: 0, start: '09:00', end: '10:00', teachable: true },
  { weekday: WEEKDAY, slotOrder: 2, slotType: 'lesson', label: 'P2', lessonIndex: 1, start: '10:00', end: '11:00', teachable: true },
];

const lessons: LessonRow[] = [
  { lessonId: 1, purpose: 'teaching', weekday: WEEKDAY, slotOrder: 1, isSelf: true, staffName: 'Me', groupName: '7A', courses: [{ name: 'Computing', colour: null }] },
  { lessonId: 2, purpose: 'teaching', weekday: WEEKDAY, slotOrder: 2, isSelf: true, staffName: 'Me', groupName: '8B', courses: [{ name: 'Computing', colour: null }] },
];

function stateAt(minutes: number): NowState {
  return {
    isoDate: '2026-06-23',
    weekday: WEEKDAY,
    minutes,
    isSchoolDay: true,
    dayKind: 'school',
    current: null,
    minutesRemaining: null,
    nextTeaching: null,
  };
}

// The two <li class="timeline-slot ..."> status classes, in DOM order.
function slotStatuses(html: string): string[] {
  return [...html.matchAll(/class="timeline-slot ([^"]*)"/g)].map((m) => m[1]!.trim());
}

describe('renderTimelineCard auto-advance', () => {
  it('marks the running slot active and the later slot next at 09:05', () => {
    const html = renderTimelineCard(lessons, periods, stateAt(9 * 60 + 5), new Date('2026-06-23T09:05:00Z'), 'Europe/London');
    expect(slotStatuses(html)).toEqual(['active current', 'next']);
  });

  it('the SAME card advances: at 10:05 P1 is done and P2 is now active', () => {
    const html = renderTimelineCard(lessons, periods, stateAt(10 * 60 + 5), new Date('2026-06-23T10:05:00Z'), 'Europe/London');
    expect(slotStatuses(html)).toEqual(['done', 'active current']);
  });

  it('after the day (16:00) every slot is done', () => {
    const html = renderTimelineCard(lessons, periods, stateAt(16 * 60), new Date('2026-06-23T16:00:00Z'), 'Europe/London');
    expect(slotStatuses(html)).toEqual(['done', 'done']);
  });

  it('fills the active slot from the top in proportion to time elapsed (and ONLY the active slot)', () => {
    // 09:30 is exactly halfway through P1 (09:00–10:00).
    const html = renderTimelineCard(lessons, periods, stateAt(9 * 60 + 30), new Date('2026-06-23T09:30:00Z'), 'Europe/London');
    const lis = [...html.matchAll(/<li class="timeline-slot ([^"]*)"([^>]*)>/g)];
    expect(lis).toHaveLength(2);
    const [active, later] = lis;
    expect(active![1]).toContain('active current');
    expect(active![2]).toContain('linear-gradient'); // active slot has the progress fill…
    expect(active![2]).toContain('50%'); // …filled to ~halfway
    expect(later![2]).not.toContain('linear-gradient'); // the upcoming slot has no fill
  });

  it('the fill tracks progress: ~10% near the start, ~90% near the end', () => {
    const early = renderTimelineCard(lessons, periods, stateAt(9 * 60 + 6), new Date('2026-06-23T09:06:00Z'), 'Europe/London');
    const late = renderTimelineCard(lessons, periods, stateAt(9 * 60 + 54), new Date('2026-06-23T09:54:00Z'), 'Europe/London');
    expect(early).toContain('10%');
    expect(late).toContain('90%');
  });

  it('carries the self-polling attributes so the swapped-in fragment keeps advancing', () => {
    const html = renderTimelineCard(lessons, periods, stateAt(9 * 60 + 5), new Date('2026-06-23T09:05:00Z'), 'Europe/London');
    expect(html).toContain('id="now-timeline"');
    expect(html).toContain('hx-get="/now/timeline"');
    expect(html).toContain('hx-trigger="every 30s"');
    expect(html).toContain('hx-swap="outerHTML"');
  });

  it('the empty shell still carries the poll attributes (so the poller never dies)', () => {
    const shell = renderTimelineShell();
    expect(shell).toContain('id="now-timeline"');
    expect(shell).toContain('hx-get="/now/timeline"');
    expect(shell).toContain('hx-trigger="every 30s"');
  });

  it('a future / non-school day lights up nothing (all slots "next")', () => {
    const future = { ...stateAt(9 * 60 + 5), isSchoolDay: false };
    const html = renderTimelineCard(lessons, periods, future, new Date('2026-06-23T09:05:00Z'), 'Europe/London');
    expect(slotStatuses(html)).toEqual(['next', 'next']);
  });

  it('on a school day each own lesson links straight into its lesson page (the timeline IS the day list)', () => {
    const html = renderTimelineCard(lessons, periods, stateAt(9 * 60 + 5), new Date('2026-06-23T09:05:00Z'), 'Europe/London');
    expect(html).toContain(`class="slot-link" href="/lesson?lesson=1&amp;date=2026-06-23"`);
    expect(html).toContain(`class="slot-link" href="/lesson?lesson=2&amp;date=2026-06-23"`);
  });

  it('a weekend previews the NEXT teaching day and links slots with THAT date', () => {
    const sat: NowState = {
      ...stateAt(10 * 60), weekday: 6, isSchoolDay: false, dayKind: 'weekend',
      nextTeaching: { date: '2026-06-23', weekday: WEEKDAY, slotOrder: 1, slotType: 'lesson', label: 'P1', lessonIndex: 0, startMin: 9 * 60, endMin: 10 * 60 },
    };
    const html = renderTimelineCard(lessons, periods, sat, new Date('2026-06-20T10:00:00Z'), 'Europe/London');
    expect(html).toContain('Timetable:'); // labelled as a future day, not "Today's Timetable"
    expect(html).toContain(`href="/lesson?lesson=1&amp;date=2026-06-23"`);
  });

  it('a non-school day whose weekday still has periods (holiday Monday) previews WITHOUT links', () => {
    const holiday = { ...stateAt(9 * 60 + 5), isSchoolDay: false, dayKind: 'holiday' as const };
    const html = renderTimelineCard(lessons, periods, holiday, new Date('2026-06-23T09:05:00Z'), 'Europe/London');
    expect(html).not.toContain('slot-link');
  });
});
