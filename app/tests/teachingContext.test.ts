import { describe, expect, it } from 'vitest';
import { groupContextItems, teachingContextItems } from '../src/llm/prompts/teachingContext';

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

describe('groupContextItems (5.9 — per-class context adds to the course default)', () => {
  it('course only → one item', () => {
    const items = groupContextItems('cohort default', null);
    expect(items).toHaveLength(1);
    expect(items[0]!.text).toContain('cohort default');
  });

  it('course + group → two items, class text marked as the specific one', () => {
    const items = groupContextItems('cohort default', 'this class needs movement breaks');
    expect(items).toHaveLength(2);
    expect(items[1]!.text).toContain('FOR THIS CLASS SPECIFICALLY');
    expect(items[1]!.text).toContain('movement breaks');
  });

  it('group only → still injected (no course default written yet)', () => {
    const items = groupContextItems(null, 'short tasks');
    expect(items).toHaveLength(1);
    expect(items[0]!.text).toContain('FOR THIS CLASS SPECIFICALLY');
  });

  it('neither → nothing', () => {
    expect(groupContextItems(null, '')).toHaveLength(0);
  });
});
