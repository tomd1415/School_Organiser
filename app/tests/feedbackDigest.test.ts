import { describe, it, expect } from 'vitest';
import { feedbackDigest } from '../src/lib/feedbackDigest';

describe('feedbackDigest (10.16 — cohort-level standing digest)', () => {
  it('names the two most-common liked and disliked activities', () => {
    const d = feedbackDigest({ ratings: [3, 4], liked: ['practical', 'cards', 'practical', 'video'], disliked: ['typing', 'typing', 'reading'] });
    expect(d).toContain('tends to enjoy practical, cards');
    expect(d).toContain('less keen on typing, reading');
  });
  it('handles likes only', () => {
    expect(feedbackDigest({ ratings: [], liked: ['games'], disliked: [] })).toBe('This class tends to enjoy games.');
  });
  it('returns null when there is nothing to summarise', () => {
    expect(feedbackDigest({ ratings: [], liked: [], disliked: [] })).toBeNull();
  });
});
