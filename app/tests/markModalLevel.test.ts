import { describe, it, expect } from 'vitest';
import { renderMarkModal } from '../src/lib/markModalView';
import { renderWorksheet } from '../src/lib/worksheetForm';

// Regression for the trial bug: the per-pupil marking modal listed EVERY level's questions, but a pupil
// only ever saw the shared blocks + their own differentiation level. So the modal showed far more
// questions than the pupil was given, every other-level one a permanent "— left blank —". The modal must
// enumerate exactly what the pupil saw (shared + their level), keeping any already-answered field.
const SHEET = [
  '# W',
  '',
  '| Q | Type your answer here |',
  '|---|---|',
  '| SharedQ alpha? | |',
  '',
  '## 🟢 Support',
  '| Q | Type your answer here |',
  '|---|---|',
  '| SupportQ bravo? | |',
  '',
  '## 🔴 Challenge',
  '| Q | Type your answer here |',
  '|---|---|',
  '| ChallengeQ charlie? | |',
  '',
].join('\n');

function opts(level: 'support' | 'core' | 'challenge'): any {
  return {
    oc: 1, pid: 10, marking: true, wsIndex: 0, header: null,
    worksheets: [{ title: 'Sheet', markdown: SHEET, keyPrefix: '' }],
    roster: [{ pupilId: 10, displayName: 'Test Pupil', done: false }],
    level, atlScore: null, ansRows: [], marks: [], comment: '', scheme: null,
  };
}

describe("marking modal slices to the pupil's differentiation level", () => {
  it('a support pupil sees the shared + support questions, not the challenge one', () => {
    const html = renderMarkModal(opts('support'));
    expect(html).toContain('alpha'); // shared — shown
    expect(html).toContain('bravo'); // support (their level) — shown
    expect(html).not.toContain('charlie'); // challenge — NOT shown (was the bug)
  });

  it('keeps an out-of-level question the pupil already answered (re-level safety)', () => {
    const challengeKey = renderWorksheet(SHEET, { mode: 'review' }).fields.find((f) => f.label.includes('charlie'))!.key;
    const o = opts('support');
    o.ansRows = [{ id: 1, field_key: challengeKey, value: 'they answered this before being re-levelled' }];
    const html = renderMarkModal(o);
    expect(html).toContain('charlie'); // retained because it has a stored answer
  });
});

describe('marking modal — trace-table cells self-mark leniently (trim/case/numeric)', () => {
  const SHEET = ['# W', '', '## Trace', '| line | x | output |', '|---|---|---|', '| 1 | ??5?? | ??True?? |', ''].join('\n');
  const keyOf = (label: string) => renderWorksheet(SHEET, { mode: 'review' }).fields.find((f) => f.solution?.[0] === label)!.key;
  function opts(ans: Array<{ key: string; value: string }>): any {
    return {
      oc: 1, pid: 10, marking: true, wsIndex: 0, header: null,
      worksheets: [{ title: 'Sheet', markdown: SHEET, keyPrefix: '' }],
      roster: [{ pupilId: 10, displayName: 'Test Pupil', done: false }],
      level: 'core', atlScore: null, ansRows: ans.map((a, i) => ({ id: i + 1, field_key: a.key, value: a.value })), marks: [], comment: '', scheme: null,
    };
  }
  it('numeric cell: " 5 " counts as correct (trim + numeric equality)', () => {
    expect(renderMarkModal(opts([{ key: keyOf('5'), value: ' 5 ' }]))).toContain('✓ correct');
  });
  it('text cell: "true" matches expected "True" (case-insensitive)', () => {
    expect(renderMarkModal(opts([{ key: keyOf('True'), value: 'true' }]))).toContain('✓ correct');
  });
  it('a wrong value shows "not the expected answer"', () => {
    expect(renderMarkModal(opts([{ key: keyOf('5'), value: '6' }]))).toContain('not the expected answer');
  });
});
