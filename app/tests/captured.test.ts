import { describe, it, expect } from 'vitest';
import { isResurfacing, resurfacing, type CapturedItem } from '../src/services/captured';

const mk = (over: Partial<CapturedItem>): CapturedItem => ({
  id: 1,
  body: 'x',
  category: null,
  surfaceOn: null,
  groupId: null,
  groupName: null,
  safeguarding: false,
  interest: false,
  archived: false,
  ...over,
});

describe('captured resurfacing', () => {
  const today = '2026-09-09';

  it('surfaces when the resurface date has arrived', () => {
    expect(isResurfacing(mk({ surfaceOn: '2026-09-09' }), today, [])).toBe(true);
    expect(isResurfacing(mk({ surfaceOn: '2026-09-10' }), today, [])).toBe(false);
  });

  it('surfaces when it concerns a class taught today', () => {
    expect(isResurfacing(mk({ groupId: 5 }), today, [5, 6])).toBe(true);
    expect(isResurfacing(mk({ groupId: 9 }), today, [5, 6])).toBe(false);
  });

  it('never surfaces archived items', () => {
    expect(isResurfacing(mk({ surfaceOn: '2026-09-01', archived: true }), today, [])).toBe(false);
  });

  it('filters the list', () => {
    const got = resurfacing([mk({ id: 1, surfaceOn: '2026-09-08' }), mk({ id: 2, groupId: 5 }), mk({ id: 3 })], today, [5]);
    expect(got.map((i) => i.id)).toEqual([1, 2]);
  });
});
