import { describe, it, expect } from 'vitest';
import { choiceAnswerPoints, choiceAnswersInOrder } from '../src/lib/worksheetAnswers';
import { serialiseBlocks, type Block } from '../src/lib/worksheetBlocks';

// docs/LESSON_WORKSHEET_EDITOR_PLAN.md Gap B. The teacher's choice/multi-select answers map to render-time
// field keys by DOCUMENT ORDER; a count mismatch must yield null (write no scheme, never a wrong one).

describe('worksheetAnswers — choice/multi answers ↔ field keys by document order (Gap B)', () => {
  const blocks: Block[] = [
    { type: 'qtable', rows: [
      { q: 'Which is volatile?', kind: 'choice', options: ['RAM', 'ROM'], answer: 'RAM' },
      { q: 'Tick the inputs', kind: 'multichoice', options: ['mouse', 'monitor', 'mic'], answer: ['mouse', 'mic'] },
    ] },
  ];
  const md = serialiseBlocks(blocks);

  it('builds choice + multichoice points with the rendered field keys + expected answers', () => {
    expect(choiceAnswerPoints(md, blocks)).toEqual([
      { fieldKey: 't1.r1.c2', kind: 'choice', expected: 'RAM' },
      { fieldKey: 't1.r2.c2', kind: 'multichoice', expected: 'mouse, mic' },
    ]);
  });

  it('round-trips the answers back to the editor in document order', () => {
    expect(choiceAnswersInOrder(md, { 't1.r1.c2': 'RAM', 't1.r2.c2': 'mouse, mic' })).toEqual(['RAM', 'mouse, mic']);
  });

  it('skips a question with no answer set (no scheme point for it)', () => {
    const b2: Block[] = [{ type: 'qtable', rows: [
      { q: 'A?', kind: 'choice', options: ['x', 'y'], answer: 'x' },
      { q: 'B?', kind: 'choice', options: ['p', 'q'] }, // no answer → no point
    ] }];
    const pts = choiceAnswerPoints(serialiseBlocks(b2), b2);
    expect(pts).toHaveLength(1);
    expect(pts![0]!).toEqual({ fieldKey: 't1.r1.c2', kind: 'choice', expected: 'x' });
  });

  it('returns null when a stray choice cell breaks alignment (no wrong scheme written)', () => {
    const b3: Block[] = [
      { type: 'qtable', rows: [{ q: 'A?', kind: 'choice', options: ['x', 'y'], answer: 'x' }] },
      { type: 'raw', md: '| ref | ( ) a ( ) b |\n|---|---|\n| extra | ( ) a ( ) b |' }, // renders extra choice fields
    ];
    expect(choiceAnswerPoints(serialiseBlocks(b3), b3)).toBeNull();
  });
});
