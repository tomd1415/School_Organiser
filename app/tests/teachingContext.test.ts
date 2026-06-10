import { describe, expect, it } from 'vitest';
import { teachingContextItems } from '../src/llm/prompts/teachingContext';

describe('teachingContextItems (4.4.1)', () => {
  it('returns one leading context item when there is text', () => {
    const items = teachingContextItems('autistic-majority; low arousal; chunked');
    expect(items).toHaveLength(1);
    expect(items[0]!.text).toContain('TEACHING CONTEXT');
    expect(items[0]!.text).toContain('autistic-majority');
  });

  it('returns nothing for empty / whitespace / null / undefined', () => {
    expect(teachingContextItems('')).toHaveLength(0);
    expect(teachingContextItems('   ')).toHaveLength(0);
    expect(teachingContextItems(null)).toHaveLength(0);
    expect(teachingContextItems(undefined)).toHaveLength(0);
  });
});
