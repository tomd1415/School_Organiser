import { describe, it, expect } from 'vitest';
import { PEDAGOGY_PRINCIPLES, PEDAGOGY_GUIDANCE, PEDAGOGY_VERSION } from '../src/llm/prompts/pedagogy';
import { AUTHOR_SCHEME_SYSTEM } from '../src/llm/prompts/authorScheme';
import { DRAFT_LESSON_SYSTEM } from '../src/llm/prompts/draftLesson';
import { ADAPT_LESSON_SYSTEM } from '../src/llm/prompts/adaptLesson';
import { LESSON_RESOURCES_SYSTEM } from '../src/llm/prompts/lessonResources';
import { GENERATE_RESOURCE_SYSTEM } from '../src/llm/prompts/generateResource';
import { RETRIEVAL_STARTER_SYSTEM } from '../src/llm/prompts/retrievalStarter';
import { IMPROVE_MASTER_SYSTEM } from '../src/llm/prompts/improveMaster';

describe('NCCE computing pedagogy (data)', () => {
  it('is exactly the 12 principles, numbered 1–12, each with a name and summary', () => {
    expect(PEDAGOGY_PRINCIPLES).toHaveLength(12);
    expect(PEDAGOGY_PRINCIPLES.map((p) => p.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const p of PEDAGOGY_PRINCIPLES) {
      expect(p.name.trim().length).toBeGreaterThan(0);
      expect(p.summary.trim().length).toBeGreaterThan(0);
    }
    // a couple of signature principles are present by name
    const names = PEDAGOGY_PRINCIPLES.map((p) => p.name);
    expect(names).toContain('Read and explore code first');
    expect(names).toContain('Challenge misconceptions');
  });

  it('the AI guidance block names the key frameworks and is versioned', () => {
    expect(PEDAGOGY_VERSION).toBe('ncce_pedagogy@1');
    expect(PEDAGOGY_GUIDANCE).toMatch(/PRIMM/);
    expect(PEDAGOGY_GUIDANCE).toMatch(/misconception/i);
    expect(PEDAGOGY_GUIDANCE).toMatch(/Parson/);
  });
});

describe('pedagogy is wired into every content-generating prompt', () => {
  // If a prompt stops appending the guidance, this fails — the principles must keep shaping output.
  const prompts: Array<[string, string]> = [
    ['authorScheme', AUTHOR_SCHEME_SYSTEM],
    ['draftLesson', DRAFT_LESSON_SYSTEM],
    ['adaptLesson', ADAPT_LESSON_SYSTEM],
    ['lessonResources', LESSON_RESOURCES_SYSTEM],
    ['generateResource', GENERATE_RESOURCE_SYSTEM],
    ['retrievalStarter', RETRIEVAL_STARTER_SYSTEM],
    ['improveMaster', IMPROVE_MASTER_SYSTEM],
  ];
  for (const [name, system] of prompts) {
    it(`${name} system prompt includes the pedagogy guidance`, () => {
      expect(system).toContain(PEDAGOGY_GUIDANCE);
    });
  }
});
