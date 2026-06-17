import { describe, it, expect } from 'vitest';
import { classifyExam } from '../src/services/examProfile';
import { examStyleItems } from '../src/llm/prompts/lessonResources';

const TODAY = new Date('2026-06-17T00:00:00Z');

describe('examProfile — classifyExam (pure, GCSE proximity)', () => {
  it('KS3 / nothing set ⇒ foundational, no exam weighting (KS3 sheets unchanged)', () => {
    expect(classifyExam({ keyStage: 'KS3', today: TODAY }).weighting).toBe('none');
    expect(classifyExam({ yearGroup: 'Y8', today: TODAY }).stage).toBe('foundational');
    expect(classifyExam({ today: TODAY }).weighting).toBe('none');
  });

  it('Y10 / KS4 with no near date ⇒ building (medium) — exams ~2 years out', () => {
    expect(classifyExam({ keyStage: 'KS4', yearGroup: 'Y10', today: TODAY }).weighting).toBe('medium');
    expect(classifyExam({ keyStage: 'KS4', yearGroup: 'Y10', today: TODAY }).stage).toBe('building');
  });

  it('Y11 / Post-16 final year ⇒ gcse (high)', () => {
    expect(classifyExam({ yearGroup: 'Y11', today: TODAY }).weighting).toBe('high');
    expect(classifyExam({ yearGroup: 'Post-16', today: TODAY }).stage).toBe('gcse');
  });

  it('a near exam date dominates ⇒ exam-soon (high) with the month count', () => {
    const p = classifyExam({ qualification: 'GCSE', examDate: '2026-09-20', today: TODAY }); // ~3 months
    expect(p.stage).toBe('exam-soon');
    expect(p.weighting).toBe('high');
    expect(p.monthsToExam).toBeLessThanOrEqual(4);
  });

  it('a far exam date (~24 months) on a GCSE course ⇒ building (medium)', () => {
    expect(classifyExam({ qualification: 'GCSE', examDate: '2028-06-01', yearGroup: 'Y10', today: TODAY }).weighting).toBe('medium');
  });

  it('a GCSE qualification alone ⇒ at least building (some exam weighting)', () => {
    expect(classifyExam({ qualification: 'GCSE Computer Science', today: TODAY }).weighting).not.toBe('none');
  });
});

describe('examProfile — examStyleItems prompt helper (B5)', () => {
  it('weighting none ⇒ NO item (foundational classes get no exam guidance)', () => {
    expect(examStyleItems({ stage: 'foundational', weighting: 'none', monthsToExam: null, label: 'x' })).toEqual([]);
  });

  it('high ⇒ a prioritised, OCR-styled item naming command words + mark tariffs', () => {
    const items = examStyleItems({ stage: 'gcse', weighting: 'high', monthsToExam: 9, label: 'a GCSE class' });
    expect(items).toHaveLength(1);
    expect(items[0]!.text).toContain('EXAM PRACTICE WEIGHTING');
    expect(items[0]!.text).toContain('PRIORITY');
    expect(items[0]!.text).toMatch(/J277/);
    expect(items[0]!.text).toMatch(/\[1\]|\[2\]|\[6\]/); // mark tariffs
    expect(items[0]!.text).toContain('answers'); // correct answers still kept out of the worksheet
  });

  it('medium ⇒ a gentler "include some" item', () => {
    const items = examStyleItems({ stage: 'building', weighting: 'medium', monthsToExam: null, label: 'a KS4 class' });
    expect(items[0]!.text).toContain('approaching GCSE');
    expect(items[0]!.text).not.toContain('PRIORITY');
  });
});
