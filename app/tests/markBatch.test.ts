import { describe, it, expect } from 'vitest';
import { isCompleteBatch } from '../src/services/marking';

// BUG-005: an AI marking batch is written only if it covers EXACTLY the answer slots that were sent —
// an empty, partial, duplicated or unknown-slot response must be rejected (and the job re-armed), never
// accepted as a complete marking pass.
describe('marking — isCompleteBatch (all-or-nothing slot validation)', () => {
  it('accepts a batch that covers exactly the slots sent (any order)', () => {
    expect(isCompleteBatch(['A', 'B', 'C'], ['A', 'B', 'C'])).toBe(true);
    expect(isCompleteBatch(['A', 'B', 'C'], ['C', 'A', 'B'])).toBe(true);
  });
  it('rejects an empty batch', () => {
    expect(isCompleteBatch(['A', 'B'], [])).toBe(false);
  });
  it('rejects a missing slot (some pupils would be silently unmarked)', () => {
    expect(isCompleteBatch(['A', 'B', 'C'], ['A', 'B'])).toBe(false);
  });
  it('rejects a duplicate slot (one answer would be overwritten twice)', () => {
    expect(isCompleteBatch(['A', 'B'], ['A', 'A'])).toBe(false);
    expect(isCompleteBatch(['A', 'B', 'C'], ['A', 'B', 'B'])).toBe(false);
  });
  it('rejects an unknown slot', () => {
    expect(isCompleteBatch(['A', 'B'], ['A', 'Z'])).toBe(false);
  });
});
