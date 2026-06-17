import { describe, it, expect } from 'vitest';
import { interestWeight, rankInterests } from '../src/services/currentInterests';
import type { InterestRow } from '../src/repos/interests';

const NOW = Date.parse('2026-06-17T12:00:00Z');
const daysAgo = (n: number): string => new Date(NOW - n * 86_400_000).toISOString();

describe('currentInterests — interestWeight (14-day half-life decay)', () => {
  it('is 1 at "now" and halves every 14 days', () => {
    expect(interestWeight(NOW, NOW)).toBeCloseTo(1, 5);
    expect(interestWeight(NOW - 14 * 86_400_000, NOW)).toBeCloseTo(0.5, 5);
    expect(interestWeight(NOW - 28 * 86_400_000, NOW)).toBeCloseTo(0.25, 5);
  });
  it('is 0 for a null timestamp and never exceeds 1 for a future stamp', () => {
    expect(interestWeight(null, NOW)).toBe(0);
    expect(interestWeight(NOW + 86_400_000, NOW)).toBeLessThanOrEqual(1);
  });
});

describe('currentInterests — rankInterests', () => {
  it('sorts by recency weight, marks fresh vs fading, and drops fully-stale items', () => {
    const input: InterestRow[] = [
      { kind: 'task', id: 1, label: 'fresh', interestAt: daysAgo(2) },
      { kind: 'captured', id: 2, label: 'fading', interestAt: daysAgo(20) },
      { kind: 'task', id: 3, label: 'ancient', interestAt: daysAgo(80) }, // weight ~0.02 → dropped
      { kind: 'task', id: 4, label: 'no stamp', interestAt: null }, // weight 0 → dropped
    ];
    const ranked = rankInterests(input, NOW);
    expect(ranked.map((i) => i.label)).toEqual(['fresh', 'fading']); // ancient + no-stamp dropped
    expect(ranked[0]!.fresh).toBe(true); // 2 days → still fresh
    expect(ranked[1]!.fresh).toBe(false); // 20 days → past one half-life, fading
    expect(ranked[0]!.weight).toBeGreaterThan(ranked[1]!.weight);
  });

  it('respects the limit', () => {
    const many: InterestRow[] = Array.from({ length: 10 }, (_, i) => ({ kind: 'task' as const, id: i, label: `t${i}`, interestAt: daysAgo(i) }));
    expect(rankInterests(many, NOW, 4).length).toBe(4);
  });
});
