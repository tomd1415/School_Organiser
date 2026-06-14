import { describe, it, expect } from 'vitest';
import { styleItems } from '../src/llm/prompts/standingPrefs';

describe('styleItems (idea 3 — standing style/feature prefs builder)', () => {
  it('returns [] when nothing is set (a literal no-op)', () => {
    expect(styleItems(null, null)).toEqual([]);
    expect(styleItems('', '   ')).toEqual([]);
    expect(styleItems(undefined, undefined)).toEqual([]);
  });

  it('emits a labelled STYLE item only when just style is set', () => {
    const items = styleItems('plain step-by-step language', null);
    expect(items).toHaveLength(1);
    expect(items[0]!.text).toContain('STANDING STYLE PREFERENCES');
    expect(items[0]!.text).toContain('plain step-by-step language');
  });

  it('emits both items; the feature item warns against lengthening the lesson', () => {
    const items = styleItems('UK spelling', 'always a retrieval starter');
    expect(items).toHaveLength(2);
    expect(items[1]!.text).toContain('FEATURE REQUIREMENTS');
    expect(items[1]!.text).toMatch(/without lengthening/i);
    expect(items[1]!.text).toContain('always a retrieval starter');
  });

  it('caps very long prefs so a paste cannot dominate the prompt', () => {
    const items = styleItems('x'.repeat(5000), null);
    expect((items[0]!.text.match(/x/g) ?? []).length).toBe(2000); // the pref body is truncated to 2000
  });

  it('items are cohort prose, sent normally (never safeguarding-withheld)', () => {
    expect(styleItems('a', 'b').every((i) => !i.safeguarding)).toBe(true);
  });
});
