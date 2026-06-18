import { describe, it, expect } from 'vitest';
import { computeWindows, applyExceptions, type AvailCtx, type AvailSlot, type SlotEffect } from '../src/services/availability';

const slot = (slotType: string, label: string, startMin: number, endMin: number, purpose: string | null = null): AvailSlot => ({
  slotType,
  label,
  startMin,
  endMin,
  purpose,
});
const coffee = slot('before_school', 'Coffee', 450, 460);
const beforeWork = slot('before_school', 'Before school', 460, 510);
const teach = slot('lesson', 'Lesson 1', 550, 600, 'teaching');
const free = slot('lesson', 'Lesson 4', 715, 765, 'free');
const lunch = slot('lunch', 'Lunch', 765, 830);
const after = slot('after_school', 'After school', 930, 1140); // 15:30 → 19:00 (leave time)

const base = (over: Partial<AvailCtx>): AvailCtx => ({
  weekday: 1,
  isSchoolDay: true,
  slots: [coffee, beforeWork, teach, free, lunch, after],
  blockingEvents: [],
  fortnightActive: false,
  bufferMin: 10,
  ...over,
});

describe('computeWindows', () => {
  it('keeps before-school + free + after-school; excludes coffee / teaching / lunch', () => {
    const w = computeWindows(base({ commitments: [] }));
    expect(w.map((x) => [x.startMin, x.endMin, x.label])).toEqual([
      [460, 510, 'Before school'],
      [715, 765, 'Lesson 4'],
      [930, 1140, 'After school'],
    ]);
  });

  it('carves an after-school commitment + 10-min buffer out of the window', () => {
    const w = computeWindows(base({ weekday: 4, commitments: [{ weekday: 4, startMin: 945, endMin: 1005, label: 'Staff meeting' }] }));
    const afterWindows = w.filter((x) => x.label === 'After school').map((x) => [x.startMin, x.endMin]);
    expect(afterWindows).toEqual([[930, 945], [1015, 1140]]); // meeting 15:45–16:45 + 10 = blocks 945–1015
  });

  it('respects the fortnightly flag', () => {
    const c = [{ weekday: 3, startMin: 1020, endMin: 1200, label: 'Staff TTRPG', fortnightly: true }];
    const off = computeWindows(base({ weekday: 3, commitments: c, fortnightActive: false }));
    const on = computeWindows(base({ weekday: 3, commitments: c, fortnightActive: true }));
    expect(off.find((x) => x.label === 'After school')?.endMin).toBe(1140);
    expect(on.find((x) => x.label === 'After school')?.endMin).toBe(1020);
  });

  it('subtracts a blocking event (+buffer)', () => {
    const w = computeWindows(base({ commitments: [], blockingEvents: [{ startMin: 1000, endMin: 1060 }] }));
    const afterWindows = w.filter((x) => x.label === 'After school').map((x) => [x.startMin, x.endMin]);
    expect(afterWindows).toEqual([[930, 1000], [1070, 1140]]); // event 1000–1060 + 10 = blocks 1000–1070
  });

  it('returns nothing on a non-school day', () => {
    expect(computeWindows(base({ isSchoolDay: false }))).toEqual([]);
  });
});

describe('applyExceptions (dated free/cover feed availability)', () => {
  const teachId: AvailSlot = { ...teach, lessonId: 11 };
  const freeId: AvailSlot = { ...free, lessonId: 22 };
  const effect = (m: Record<number, SlotEffect>) => (id: number): SlotEffect => m[id] ?? 'none';

  it('turns a cancelled/free lesson into a free work window', () => {
    const slots = applyExceptions([teachId, freeId], effect({ 11: 'free' }));
    expect(slots[0]!.purpose).toBe('free');
    const w = computeWindows(base({ slots, commitments: [] }));
    expect(w.some((x) => x.label === 'Lesson 1')).toBe(true);
  });

  it('drops a free period that is on cover', () => {
    const slots = applyExceptions([teachId, freeId], effect({ 22: 'busy' }));
    expect(slots[1]!.purpose).toBe('cover');
    const w = computeWindows(base({ slots, commitments: [] }));
    expect(w.some((x) => x.label === 'Lesson 4')).toBe(false);
  });

  it('leaves unmatched slots and null-lesson slots untouched', () => {
    const slots = applyExceptions([teachId, freeId, coffee], effect({}));
    expect(slots).toEqual([teachId, freeId, coffee]);
  });
});
