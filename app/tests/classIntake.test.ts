import { describe, it, expect } from 'vitest';
import { classIntakeItems, CLASS_INTAKE_VERSION } from '../src/llm/prompts/classIntake';
import { classIntakeSchema } from '../src/llm/schemas/classIntake';
import { coveredItems } from '../src/llm/prompts/teachingContext';

const full = {
  teachingContext: 'short chunked tasks, lots of recap',
  coveredSummary: 'binary, the CPU',
  abilityMidpoint: 'Entry Level 3',
  guidedAccess: { viFont: 18, shortAttention: true, readingAge: '8', eal: false, dyslexiaFriendly: true, lowTyping: false },
};

describe('class_intake prompt + schema', () => {
  it('classIntakeItems wraps the description as one context item', () => {
    expect(classIntakeItems('Year 9 set 3')).toEqual([{ text: 'CLASS DESCRIPTION (set-up notes from the teacher):\nYear 9 set 3' }]);
  });

  it('schema accepts a full object with nullable fields, rejects a missing block', () => {
    expect(classIntakeSchema.safeParse(full).success).toBe(true);
    expect(classIntakeSchema.safeParse({ ...full, abilityMidpoint: null, coveredSummary: '' }).success).toBe(true);
    const { guidedAccess: _omit, ...noAccess } = full;
    expect(classIntakeSchema.safeParse(noAccess).success).toBe(false);
  });

  it('version is class_intake@1', () => {
    expect(CLASS_INTAKE_VERSION).toBe('class_intake@1');
  });
});

describe('coveredItems (what the class has covered)', () => {
  it('returns [] when empty, a labelled item when set', () => {
    expect(coveredItems(null)).toEqual([]);
    expect(coveredItems('  ')).toEqual([]);
    const items = coveredItems('binary, the CPU');
    expect(items[0]!.text).toMatch(/COVERED SO FAR/);
    expect(items[0]!.text).toContain('binary, the CPU');
  });
});
