import { describe, expect, it } from 'vitest';
import { atlTrendOf, medianLevel } from '../src/repos/cohort';

// Pupils §11 cohort analytics — the pure derivation logic (ATL trend + class ability midpoint). DB-free.

describe('atlTrendOf', () => {
  it('returns "none" with fewer than two scores', () => {
    expect(atlTrendOf([])).toBe('none');
    expect(atlTrendOf([3])).toBe('none');
  });
  it('rising scores → up', () => {
    expect(atlTrendOf([1, 2, 3, 4])).toBe('up');
    expect(atlTrendOf([2, 2, 4])).toBe('up'); // older [2] vs recent [2,4]=3
  });
  it('falling scores → down', () => {
    expect(atlTrendOf([4, 4, 2, 1])).toBe('down');
  });
  it('steady scores → flat', () => {
    expect(atlTrendOf([3, 3, 3, 3])).toBe('flat');
    expect(atlTrendOf([3, 3])).toBe('flat');
  });
});

describe('medianLevel — class ability midpoint', () => {
  it('null when no levels recorded', () => {
    expect(medianLevel([])).toBeNull();
  });
  it('picks the central level', () => {
    expect(medianLevel(['support', 'core', 'challenge'])).toBe('core');
    expect(medianLevel(['support', 'support', 'core'])).toBe('support');
    expect(medianLevel(['core', 'challenge', 'challenge'])).toBe('challenge');
  });
  it('a single level is its own midpoint', () => {
    expect(medianLevel(['challenge'])).toBe('challenge');
  });
});
