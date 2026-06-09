import { describe, expect, it } from 'vitest';
import { draftLessonSchema } from '../src/llm/schemas/draftLesson';
import { draftLessonInstruction } from '../src/llm/prompts/draftLesson';

describe('draft-lesson schema + prompt (4.3)', () => {
  it('parses a well-formed draft', () => {
    const r = draftLessonSchema.safeParse({ objectives: ['recall x', 'apply y'], outline: 'starter…', durationMin: 50 });
    expect(r.success).toBe(true);
  });

  it('rejects a malformed draft', () => {
    expect(draftLessonSchema.safeParse({ objectives: 'not-an-array', outline: 1, durationMin: 'x' }).success).toBe(false);
  });

  it('the instruction names the lesson + unit and lists siblings without the plan itself', () => {
    const s = draftLessonInstruction({
      courseName: 'GCSE Computer Science',
      unitTitle: 'Data Representation',
      planTitle: 'L3 Binary addition',
      siblingTitles: ['L2 Number bases', 'L3 Binary addition', 'L4 Binary subtraction'],
    });
    expect(s).toContain('L3 Binary addition');
    expect(s).toContain('Data Representation');
    // the plan itself is filtered out of the "other lessons" list
    expect(s).toContain('L2 Number bases; L4 Binary subtraction');
  });
});
