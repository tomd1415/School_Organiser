import { describe, it, expect } from 'vitest';
import { reviewSchemeItems, REVIEW_SCHEME_VERSION } from '../src/llm/prompts/reviewScheme';
import { pastReviewItems } from '../src/llm/prompts/lessonReview';

describe('reviewSchemeItems (E2 — scheme-level sequence review prompt)', () => {
  it('lists the lessons in order and the unit spec points', () => {
    const items = reviewSchemeItems(
      'OCR GCSE CS',
      'Networks',
      [
        { title: 'Intro to networks', objectives: 'Define LAN and WAN' },
        { title: 'Topologies', objectives: 'Compare star and mesh' },
      ],
      ['1.3 network topologies'],
    );
    const seq = items[0]!.text;
    expect(REVIEW_SCHEME_VERSION).toBe('review_scheme@1');
    expect(seq).toContain('1. Intro to networks — Define LAN and WAN');
    expect(seq).toContain('2. Topologies — Compare star and mesh');
    expect(items.some((i) => i.text.includes('1.3 network topologies'))).toBe(true);
  });

  it('omits the spec-points item when none are mapped', () => {
    const items = reviewSchemeItems('C', 'U', [{ title: 'L1', objectives: null }], []);
    expect(items).toHaveLength(1);
  });
});

describe('pastReviewItems (E3 — re-injecting applied findings into the cheap planners)', () => {
  it('empty ⇒ no item (generation unchanged)', () => {
    expect(pastReviewItems([])).toEqual([]);
  });

  it('non-empty ⇒ one "lessons learned" item listing each issue → fix', () => {
    const items = pastReviewItems([{ issue: 'no recap', fix: 'add a retrieval starter' }]);
    expect(items).toHaveLength(1);
    expect(items[0]!.text).toContain('LESSONS LEARNED FROM PAST REVIEWS');
    expect(items[0]!.text).toContain('no recap → add a retrieval starter');
  });
});
