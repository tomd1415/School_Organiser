import { describe, it, expect } from 'vitest';
import { pickNext, eligibleCount, type Candidate } from '../src/services/focus';

const mk = (over: Partial<Candidate>): Candidate => ({
  id: 1,
  title: 't',
  urgency: 'this_week',
  estimateMin: 15,
  cognitiveLoad: 'medium',
  interest: false,
  beforeBell: false,
  ...over,
});

describe('pickNext', () => {
  it('morning picks the heavy urgent job over a light someday task', () => {
    const got = pickNext(
      [mk({ id: 1, urgency: 'urgent_today', cognitiveLoad: 'high' }), mk({ id: 2, urgency: 'someday', cognitiveLoad: 'low' })],
      'morning',
      null,
    );
    expect(got?.id).toBe(1);
  });

  it('a free period will not surface a task that does not fit the window', () => {
    const got = pickNext([mk({ id: 5, urgency: 'urgent_today', estimateMin: 90 })], 'free_period', 20);
    expect(got).toBeNull();
  });

  it('a free period picks a fitting task', () => {
    const got = pickNext(
      [mk({ id: 6, urgency: 'urgent_today', estimateMin: 90 }), mk({ id: 7, urgency: 'this_week', estimateMin: 10 })],
      'free_period',
      20,
    );
    expect(got?.id).toBe(7);
  });

  it('end of day hides high-load work and prefers light urgent', () => {
    const got = pickNext(
      [mk({ id: 8, urgency: 'urgent_today', cognitiveLoad: 'high' }), mk({ id: 9, urgency: 'urgent_today', cognitiveLoad: 'low' })],
      'end_of_day',
      null,
    );
    expect(got?.id).toBe(9);
  });

  it('before-the-bell and interest tip the balance', () => {
    const got = pickNext(
      [mk({ id: 10, urgency: 'this_week' }), mk({ id: 11, urgency: 'this_week', beforeBell: true })],
      'free_period',
      null,
    );
    expect(got?.id).toBe(11);
  });

  it('eligibleCount excludes hidden tasks', () => {
    const cands = [mk({ id: 1, estimateMin: 90 }), mk({ id: 2, estimateMin: 10 }), mk({ id: 3, cognitiveLoad: 'high' })];
    expect(eligibleCount(cands, 'end_of_day', 20)).toBe(1); // only id 2 fits a 20-min window and isn't heavy
  });
});
