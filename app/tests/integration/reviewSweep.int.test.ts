import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { sweepReviews } from '../../src/services/reviewLesson';
import { openReviewCount } from '../../src/repos/reviews';
import { getSetting, setSetting } from '../../src/repos/settings';

// The cost-safety guarantee: the scheduled sweep spends nothing unless explicitly enabled, and even
// when enabled it writes no reviews when AI is unavailable (the integration env forces an empty key).
let original: string | null = null;

describe('sweepReviews cost safety (integration — needs the dev DB up)', () => {
  beforeAll(async () => {
    original = await getSetting('ai_review_enabled');
  });
  afterAll(async () => {
    await setSetting('ai_review_enabled', original ?? 'false');
    await pool.end();
  });

  it('is a no-op when the reviewer is off (the default)', async () => {
    await setSetting('ai_review_enabled', 'false');
    const before = await openReviewCount();
    const r = await sweepReviews(3);
    expect(r).toMatchObject({ disabled: true, reviewed: 0 });
    expect(await openReviewCount()).toBe(before); // nothing created, nothing spent
  });

  it('writes no reviews and does not throw when enabled but AI is unavailable (empty key)', async () => {
    await setSetting('ai_review_enabled', 'true');
    const before = await openReviewCount();
    const r = await sweepReviews(2);
    expect(r.reviewed).toBe(0); // no key → unavailable → nothing written
    expect(await openReviewCount()).toBe(before);
  });

  it('does nothing for a non-positive cap', async () => {
    const r = await sweepReviews(0);
    expect(r).toEqual({ reviewed: 0, stopped: false, disabled: false });
  });
});
