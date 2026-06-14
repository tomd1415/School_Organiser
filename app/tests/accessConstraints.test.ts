import { describe, it, expect } from 'vitest';
import { accessConstraintLines, accessConstraintItems } from '../src/llm/prompts/accessConstraints';

describe('accessConstraints (idea 7 — guided cohort-access derivation)', () => {
  it('returns nothing for null/empty answers (a no-op)', () => {
    expect(accessConstraintLines(null)).toEqual([]);
    expect(accessConstraintLines({})).toEqual([]);
    expect(accessConstraintItems(null)).toEqual([]);
    expect(accessConstraintItems({})).toEqual([]);
  });

  it('derives a minimum-font line from viFont, and ignores non-positive sizes', () => {
    expect(accessConstraintLines({ viFont: 18 })).toEqual(['use a minimum font size of 18pt in any resource or slide']);
    expect(accessConstraintLines({ viFont: 0 })).toEqual([]);
  });

  it('maps each answer to its constraint line, in a fixed order', () => {
    const lines = accessConstraintLines({ viFont: 14, shortAttention: true, readingAge: '8', eal: true, dyslexiaFriendly: true, lowTyping: true });
    expect(lines).toHaveLength(6);
    expect(lines[0]).toContain('14pt');
    expect(lines[1]).toMatch(/short attention spans/i);
    expect(lines[2]).toContain('reading age 8');
    expect(lines[3]).toMatch(/EAL/);
    expect(lines[4]).toMatch(/dyslexia-friendly/i);
    expect(lines[5]).toMatch(/keyboard fluency/i);
  });

  it('wraps the lines in one labelled cohort-level context item', () => {
    const items = accessConstraintItems({ shortAttention: true });
    expect(items).toHaveLength(1);
    expect(items[0]!.text).toContain('CLASS ACCESS REQUIREMENTS');
    expect(items[0]!.text).toContain('- this class has very short attention spans');
    expect(items[0]!.safeguarding).toBeUndefined(); // cohort prose, sent normally
  });
});
