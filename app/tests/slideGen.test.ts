import { describe, it, expect } from 'vitest';
import { cleanDeck, applyDedicatedDeck } from '../src/services/slideGen';
import type { TidyResource } from '../src/llm/schemas/lessonResources';

// The deck is generated as free text (the structured-output single-string field gave a 1-slide stub).
// cleanDeck tidies that free text; applyDedicatedDeck swaps it into the four-doc resource set.

describe('cleanDeck', () => {
  it('leaves a clean deck untouched', () => {
    const deck = '## 1. Intro\n\n🧠\n\n- A point\n\n> 🧑‍🏫 a private note';
    expect(cleanDeck(deck)).toBe(deck);
  });

  it('drops a preamble before the first slide heading', () => {
    const deck = 'Here is the complete deck for your lesson:\n\n## 1. Intro\n\n- A point';
    expect(cleanDeck(deck)).toBe('## 1. Intro\n\n- A point');
  });

  it('unwraps an outer ```markdown fence that wraps the WHOLE deck', () => {
    const deck = '```markdown\n## 1. Intro\n\n- A point\n\n## 2. More\n```';
    expect(cleanDeck(deck)).toBe('## 1. Intro\n\n- A point\n\n## 2. More');
  });

  it('KEEPS inner code fences (```python / ```parsons after a slide heading)', () => {
    const deck = '## 1. Code\n\n```python\nprint("hi")\n```\n\n> key idea: code runs top to bottom';
    const cleaned = cleanDeck(deck);
    expect(cleaned).toContain('```python');
    expect(cleaned).toContain('print("hi")');
    expect(cleaned).toBe(deck); // nothing stripped — the fence is INSIDE a slide
  });

  it('keeps a deck that starts with a level divider', () => {
    const deck = '# 🟢 Support\n\n## 1. Easy intro\n\n- A point';
    expect(cleanDeck(deck)).toBe(deck);
  });
});

describe('applyDedicatedDeck', () => {
  const worksheet: TidyResource = { kind: 'worksheet', title: 'WS', content: '## 🟢 Support\n- do this' };
  const stubSlides: TidyResource = { kind: 'slides', title: 'Slides', content: '## Only one slide' };
  const fullDeck = '## 1. Intro\n\n## 2. Body\n\n# 🟢 Support\n## 3. Easy';

  it('overrides an existing (stub) slides doc with the dedicated deck', () => {
    const tidy = { docs: [structuredClone(stubSlides), structuredClone(worksheet)], missing: [] as string[] };
    applyDedicatedDeck(tidy, fullDeck, 'My Lesson');
    expect(tidy.docs.find((d) => d.kind === 'slides')!.content).toBe(fullDeck);
    expect(tidy.missing).toEqual([]); // both slides + worksheet present
  });

  it('inserts a slides doc when the four-doc call returned none, clearing it from missing', () => {
    const tidy = { docs: [structuredClone(worksheet)], missing: ['slides'] };
    applyDedicatedDeck(tidy, fullDeck, 'My Lesson');
    const slides = tidy.docs.find((d) => d.kind === 'slides');
    expect(slides).toBeTruthy();
    expect(slides!.content).toBe(fullDeck);
    expect(tidy.missing).toEqual([]); // slides no longer missing
  });

  it('keeps the four-doc deck when the dedicated call failed (deck = null)', () => {
    const tidy = { docs: [structuredClone(stubSlides), structuredClone(worksheet)], missing: [] as string[] };
    applyDedicatedDeck(tidy, null, 'My Lesson');
    expect(tidy.docs.find((d) => d.kind === 'slides')!.content).toBe(stubSlides.content); // unchanged fallback
  });

  it('still reports worksheet missing when only the deck is present', () => {
    const tidy = { docs: [] as TidyResource[], missing: ['slides', 'worksheet'] };
    applyDedicatedDeck(tidy, fullDeck, 'My Lesson');
    expect(tidy.missing).toEqual(['worksheet']); // deck filled slides; worksheet still absent
  });
});
