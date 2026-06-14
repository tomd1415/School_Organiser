import { describe, it, expect } from 'vitest';
import { lessonReviewSchema } from '../src/llm/schemas/lessonReview';
import { LESSON_REVIEW_SYSTEM, reviewLessonItems } from '../src/llm/prompts/lessonReview';
import { overMonthlyCap } from '../src/llm/client';

// Wave 5 (idea 8, lean cut) — the advisory reviewer's contract, prompt, and cap guard. DB-free.

describe('lessonReviewSchema (the hard output contract)', () => {
  const base = {
    verdict: 'tweak' as const,
    findings: [{ issue: 'no recap', fix: 'add a 5-min retrieval starter' }],
    suggestedObjectives: 'O1\nO2',
    suggestedOutline: '1. starter (5)\n2. main (40)',
    rationale: 'Solid but add a recap.',
  };

  it('accepts a valid review and an empty findings list (a clean "keep")', () => {
    expect(lessonReviewSchema.safeParse(base).success).toBe(true);
    expect(lessonReviewSchema.safeParse({ ...base, verdict: 'keep', findings: [] }).success).toBe(true);
  });

  it('caps findings at three — a long list of tweaks is the failure mode to avoid', () => {
    const four = Array.from({ length: 4 }, (_, i) => ({ issue: `i${i}`, fix: `f${i}` }));
    expect(lessonReviewSchema.safeParse({ ...base, findings: four }).success).toBe(false);
    const three = four.slice(0, 3);
    expect(lessonReviewSchema.safeParse({ ...base, findings: three }).success).toBe(true);
  });
});

describe('reviewLessonItems (everything rides context[], never the system string)', () => {
  it('puts the lesson under review into a context item', () => {
    const items = reviewLessonItems('GCSE CS', 'Networks', { title: 'Protocols', objectives: 'O', outline: 'OUT' }, []);
    expect(items).toHaveLength(1);
    expect(items[0]!.text).toContain('LESSON UNDER REVIEW');
    expect(items[0]!.text).toContain('Protocols');
    expect(items[0]!.text).toContain('OUT');
  });

  it('adds a spec-points item only when there are mapped points', () => {
    const withPts = reviewLessonItems('C', 'U', { title: 'T', objectives: null, outline: null }, ['1.1 Binary', '1.2 Hex']);
    expect(withPts).toHaveLength(2);
    expect(withPts[1]!.text).toContain('1.1 Binary');
    const noPts = reviewLessonItems('C', 'U', { title: 'T', objectives: null, outline: null }, []);
    expect(noPts).toHaveLength(1);
  });

  it('the system prompt is a static constant that enforces the cohort-prose rule', () => {
    expect(LESSON_REVIEW_SYSTEM).toContain('never reference an individual pupil');
    expect(LESSON_REVIEW_SYSTEM).toContain('NOT yet taught');
  });
});

describe('overMonthlyCap (the pre-call cap guard so one Opus call cannot overshoot)', () => {
  it('blocks once spend has reached the cap (unchanged behaviour with no estimate)', () => {
    expect(overMonthlyCap(5000, 5000)).toBe(true);
    expect(overMonthlyCap(4999, 5000)).toBe(false);
  });

  it('refuses a call whose estimate would cross the cap', () => {
    expect(overMonthlyCap(4990, 5000, 20)).toBe(true); // 4990 + 20 = 5010 > 5000
    expect(overMonthlyCap(4980, 5000, 20)).toBe(false); // 4980 + 20 = 5000, not over
  });
});
