import { describe, expect, it } from 'vitest';
import { authorSchemeSchema } from '../src/llm/schemas/authorScheme';
import { authorSchemeInstruction, specPointsItems, AUTHOR_SCHEME_VERSION } from '../src/llm/prompts/authorScheme';

describe('author-scheme schema + prompt (4.4 / @4)', () => {
  it('parses units → lessons where each lesson carries its spec-point codes', () => {
    const r = authorSchemeSchema.safeParse({
      units: [
        { title: 'Unit 1', lessons: [{ title: 'Lesson 1', specPoints: ['1.1.1'] }, { title: 'Lesson 2', specPoints: [] }] },
        { title: 'Unit 2', lessons: [{ title: 'Lesson 3', specPoints: ['1.2'] }] },
      ],
    });
    expect(r.success).toBe(true);
  });

  it('rejects the old string-lessons shape and other malformed structures', () => {
    expect(authorSchemeSchema.safeParse({ units: [{ title: 'U', lessons: ['Lesson 1'] }] }).success).toBe(false);
    expect(authorSchemeSchema.safeParse({ units: [{ title: 1, lessons: 'nope' }] }).success).toBe(false);
  });

  it('the instruction includes the course name and the brief', () => {
    const s = authorSchemeInstruction('KS3 Computing', 'file management and online safety');
    expect(s).toContain('KS3 Computing');
    expect(s).toContain('file management and online safety');
  });

  it('the instruction adds the exam date + revision only when a date is given (idea 10 slice 2b)', () => {
    expect(authorSchemeInstruction('Computing', 'brief', '2026-05-01')).toMatch(/Exam date: 2026-05-01/);
    expect(authorSchemeInstruction('Computing', 'brief', '2026-05-01')).toMatch(/revision/i);
    expect(authorSchemeInstruction('Computing', 'brief', null)).not.toMatch(/Exam date/);
  });

  it('specPointsItems lists the points to cover, or [] when there are none', () => {
    expect(specPointsItems([])).toEqual([]);
    const items = specPointsItems([{ code: '1.1.1', title: 'Purpose of the CPU' }]);
    expect(items[0]!.text).toMatch(/MUST COVER/);
    expect(items[0]!.text).toContain('1.1.1: Purpose of the CPU');
  });

  it('version is author_scheme@4', () => {
    expect(AUTHOR_SCHEME_VERSION).toBe('author_scheme@4');
  });
});
