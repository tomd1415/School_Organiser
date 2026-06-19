import { describe, it, expect } from 'vitest';
import { coverPackItem } from '../src/llm/prompts/coverPack';

describe('coverPackItem', () => {
  it('builds a single cohort context item from the lesson', () => {
    const items = coverPackItem({ className: '9X/Cp1', yearGroup: 'Y9', planTitle: 'Binary', objectives: 'Convert denary to binary', outline: null });
    expect(items).toHaveLength(1);
    expect(items[0]!.text).toContain('9X/Cp1 (Y9)');
    expect(items[0]!.text).toContain('Convert denary to binary');
    expect(items[0]!.text).toContain('Binary');
  });

  it('falls back to the outline when there are no objectives', () => {
    const items = coverPackItem({ className: '8A', yearGroup: 'Y8', planTitle: null, objectives: null, outline: 'Practise loops' });
    expect(items).toHaveLength(1);
    expect(items[0]!.text).toContain('Practise loops');
  });

  it('is empty when there is nothing to base cover work on', () => {
    expect(coverPackItem({ className: '9X', yearGroup: null, planTitle: 'T', objectives: null, outline: null })).toEqual([]);
    expect(coverPackItem({ className: '9X', yearGroup: null, planTitle: null, objectives: '', outline: '' })).toEqual([]);
  });
});
