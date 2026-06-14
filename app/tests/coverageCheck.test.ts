import { describe, it, expect } from 'vitest';
import { coverageItems, COVERAGE_CHECK_VERSION } from '../src/llm/prompts/coverageCheck';
import { coverageCheckSchema } from '../src/llm/schemas/coverageCheck';

describe('coverage_check prompt + schema (idea 10 slice 2)', () => {
  it('coverageItems lists uncovered points and lessons with refs + objectives', () => {
    const items = coverageItems({
      uncovered: [{ code: '1.1.1', title: 'Purpose of the CPU' }],
      lessons: [{ ref: 'L1', title: 'Intro to the CPU', objectives: 'define the CPU' }],
    });
    expect(items).toHaveLength(2);
    expect(items[0]!.text).toContain('1.1.1: Purpose of the CPU');
    expect(items[1]!.text).toContain('L1 — Intro to the CPU: define the CPU');
  });

  it('notes when there are no lessons yet', () => {
    const items = coverageItems({ uncovered: [{ code: 'x', title: 'y' }], lessons: [] });
    expect(items[1]!.text).toMatch(/none yet/i);
  });

  it('schema accepts an existing-lesson ref or NEW', () => {
    expect(coverageCheckSchema.safeParse({ suggestions: [{ point: '1.1.1', lesson: 'L1', why: 'fits' }] }).success).toBe(true);
    expect(coverageCheckSchema.safeParse({ suggestions: [{ point: '1.1.1', lesson: 'NEW', why: '' }] }).success).toBe(true);
  });

  it('version is coverage_check@1', () => {
    expect(COVERAGE_CHECK_VERSION).toBe('coverage_check@1');
  });
});
