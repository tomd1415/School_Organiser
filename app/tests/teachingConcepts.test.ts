import { describe, it, expect } from 'vitest';
import { conceptItems } from '../src/llm/prompts/teachingConcepts';

describe('conceptItems (idea 1.1 — teaching-concepts builder)', () => {
  it('returns [] when there are no concepts, or only blank titles (a no-op)', () => {
    expect(conceptItems([])).toEqual([]);
    expect(conceptItems([{ title: '   ' }])).toEqual([]);
  });

  it('renders one labelled item, "• title — body" per concept (body optional)', () => {
    const items = conceptItems([
      { title: 'CPU as a busy office', body: 'analogy for fetch–decode–execute' },
      { title: 'Unplug it first' },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]!.text).toContain('TEACHING CONCEPTS TO WEAVE IN');
    expect(items[0]!.text).toContain('• CPU as a busy office — analogy for fetch–decode–execute');
    expect(items[0]!.text).toContain('• Unplug it first');
  });

  it('tells the model not to force all of them or lengthen the lesson', () => {
    const text = conceptItems([{ title: 'x' }])[0]!.text;
    expect(text).toMatch(/don't force all/i);
    expect(text).toMatch(/don't lengthen/i);
  });

  it('skips blank-title entries but keeps the good ones', () => {
    const items = conceptItems([{ title: '' }, { title: 'Keep me' }]);
    expect(items).toHaveLength(1);
    expect(items[0]!.text).toContain('• Keep me');
    expect(items[0]!.text).not.toMatch(/•\s*—/); // no empty bullet
  });
});
