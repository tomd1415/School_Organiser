import { describe, it, expect } from 'vitest';
import { pickSpacedRecall, firstObjective, daysBetween } from '../src/services/retrieval';
import type { PastLesson } from '../src/repos/retrieval';

const lesson = (date: string, objectives: string | null, title: string | null = 'Lesson'): PastLesson => ({ date, objectives, title });

describe('firstObjective', () => {
  it('takes the first non-empty line, stripped of bullet/number prefixes', () => {
    expect(firstObjective('1. Understand binary\n2. Convert denary')).toBe('Understand binary');
    expect(firstObjective('- Recall the CPU fetch–execute cycle')).toBe('Recall the CPU fetch–execute cycle');
    expect(firstObjective('\n\n  • Iteration  ')).toBe('Iteration');
    expect(firstObjective('')).toBe('');
    expect(firstObjective(null)).toBe('');
  });
});

describe('daysBetween', () => {
  it('counts whole days forward', () => {
    expect(daysBetween('2026-06-01', '2026-06-15')).toBe(14);
  });
});

describe('pickSpacedRecall', () => {
  const today = '2026-06-29';

  it('picks the lessons nearest ~2 and ~6 weeks back', () => {
    const past = [
      lesson('2026-06-26', 'Too recent'), // 3d
      lesson('2026-06-15', 'Understand iteration'), // 14d → 2 weeks ago
      lesson('2026-05-18', 'Understand selection'), // 42d → 6 weeks ago
      lesson('2026-04-01', 'Too long ago'), // ~89d
    ];
    const r = pickSpacedRecall(past, today);
    expect(r.map((x) => x.ageLabel)).toEqual(['2 weeks ago', '6 weeks ago']);
    expect(r[0]!.objective).toBe('Understand iteration');
    expect(r[1]!.objective).toBe('Understand selection');
  });

  it('skips a target with no lesson in its window', () => {
    const r = pickSpacedRecall([lesson('2026-06-15', 'Only one')], today);
    expect(r.map((x) => x.ageLabel)).toEqual(['2 weeks ago']);
  });

  it('returns nothing with no history, and ignores objective-less lessons', () => {
    expect(pickSpacedRecall([], today)).toEqual([]);
    expect(pickSpacedRecall([lesson('2026-06-15', '')], today)).toEqual([]);
  });
});
