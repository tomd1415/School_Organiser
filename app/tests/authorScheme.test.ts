import { describe, expect, it } from 'vitest';
import { authorSchemeSchema } from '../src/llm/schemas/authorScheme';
import { authorSchemeInstruction } from '../src/llm/prompts/authorScheme';

describe('author-scheme schema + prompt (4.4)', () => {
  it('parses a nested units → lessons structure', () => {
    const r = authorSchemeSchema.safeParse({
      units: [
        { title: 'Unit 1', lessons: ['Lesson 1', 'Lesson 2'] },
        { title: 'Unit 2', lessons: ['Lesson 3'] },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('rejects a malformed structure', () => {
    expect(authorSchemeSchema.safeParse({ units: [{ title: 1, lessons: 'nope' }] }).success).toBe(false);
  });

  it('the instruction includes the course name and the brief', () => {
    const s = authorSchemeInstruction('KS3 Computing', 'file management and online safety');
    expect(s).toContain('KS3 Computing');
    expect(s).toContain('file management and online safety');
  });
});
