import { describe, expect, it } from 'vitest';
import { renderNowHero } from '../src/lib/nowView';
import type { NowState, SlotRef } from '../src/services/clock';
import type { NowLesson } from '../src/repos/clock';

// The Now-screen hero strip (UI rebuild): states what's happening NOW + the time-remaining countdown +
// what's next, across the in-lesson / free / outside-lesson / no-school states. Pure data→HTML, DB-free.

const slot = (label: string, startMin: number, endMin: number): SlotRef => ({
  date: '2026-06-23', weekday: 2, slotOrder: 3, slotType: 'lesson', label, lessonIndex: 2, startMin, endMin,
});
const lesson = (groupName: string | null, room: string | null): NowLesson => ({
  lessonId: 7, purpose: 'teaching', groupName, roomName: room, courses: [{ name: 'Networks', colour: null }],
});
const base: NowState = {
  isoDate: '2026-06-23', weekday: 2, minutes: 10 * 60 + 47, isSchoolDay: true,
  dayKind: 'school', current: null, minutesRemaining: null, nextTeaching: null,
};

describe('renderNowHero', () => {
  it('in a lesson: period eyebrow, lesson title, room + started, countdown', () => {
    const state: NowState = { ...base, current: slot('Period 3', 10 * 60 + 5, 11 * 60 + 5), minutesRemaining: 18 };
    const html = renderNowHero(state, lesson('Year 9 Computing', 'B14'), null);
    expect(html).toContain('now-hero');
    expect(html).toContain('Now · Period 3');
    expect(html).toContain('Year 9 Computing');
    expect(html).toContain('B14');
    expect(html).toContain('started 10:05');
    expect(html).toContain('now-hero-count');
    expect(html).toContain('18');
  });

  it('a free-period exception reads "Free", not the timetabled class', () => {
    const state: NowState = { ...base, current: slot('Period 3', 10 * 60 + 5, 11 * 60 + 5), minutesRemaining: 18 };
    const html = renderNowHero(state, lesson('Year 9 Computing', 'B14'), null, { mode: 'free', label: 'Free', detail: 'Y9 on trip', roomName: null });
    expect(html).toContain('Free');
    expect(html).toContain('Y9 on trip');
    expect(html).not.toContain('Year 9 Computing');
  });

  it('outside lesson time shows the next teaching slot, no countdown', () => {
    const state: NowState = { ...base, current: null, nextTeaching: slot('Period 4', 11 * 60 + 25, 12 * 60 + 25) };
    const html = renderNowHero(state, null, lesson('8B', null));
    expect(html).toContain('Outside lesson time');
    expect(html).toContain('Next: 8B · Period 4');
    expect(html).not.toContain('now-hero-count');
  });

  it('a non-school day says so', () => {
    const state: NowState = { ...base, isSchoolDay: false, dayKind: 'inset_day' };
    const html = renderNowHero(state, null, null);
    expect(html).toContain('No school today');
    expect(html).toContain('inset day');
    expect(html).not.toContain('now-hero-count');
  });
});
