import { describe, it, expect } from 'vitest';
import { subscribe, broadcast, subscriberCount, sseFrame } from '../src/services/slideSync';

describe('slideSync in-process pub/sub', () => {
  it('fans a broadcast out to every subscriber on that lesson, and no others', () => {
    const a: string[] = [], b: string[] = [], other: string[] = [];
    const ua = subscribe(1, { write: (f) => a.push(f) });
    const ub = subscribe(1, { write: (f) => b.push(f) });
    const uo = subscribe(2, { write: (f) => other.push(f) });
    broadcast(1, 'slide', { index: 3 });
    expect(a).toEqual([sseFrame('slide', { index: 3 })]);
    expect(b).toEqual([sseFrame('slide', { index: 3 })]);
    expect(other).toEqual([]); // a different lesson is untouched
    ua(); ub(); uo();
  });

  it('unsubscribe stops delivery and frees the channel', () => {
    const got: string[] = [];
    const unsub = subscribe(5, { write: (f) => got.push(f) });
    expect(subscriberCount(5)).toBe(1);
    unsub();
    expect(subscriberCount(5)).toBe(0);
    broadcast(5, 'slide', { index: 1 });
    expect(got).toEqual([]);
  });

  it('a dead/throwing subscriber never breaks the fan-out to the others', () => {
    const good: string[] = [];
    subscribe(9, { write: () => { throw new Error('dead socket'); } });
    const ug = subscribe(9, { write: (f) => good.push(f) });
    expect(() => broadcast(9, 'lock', { locked: true })).not.toThrow();
    expect(good).toEqual([sseFrame('lock', { locked: true })]);
    ug();
  });
});
