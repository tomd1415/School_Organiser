import { describe, expect, it } from 'vitest';
import { markField, isDeterministic, type MarkPoint } from '../src/lib/deterministicMarker';

const pt = (over: Partial<MarkPoint>): MarkPoint => ({ id: 1, kind: 'exact', expected: '', alternatives: [], marks: 1, required: false, ...over });

describe('deterministicMarker — exact', () => {
  it('folds case, trim and surrounding punctuation', () => {
    const p = [pt({ expected: 'CPU' })];
    expect(markField(p, 'cpu').marksAwarded).toBe(1);
    expect(markField(p, '  CPU. ').marksAwarded).toBe(1);
    expect(markField(p, 'gpu').marksAwarded).toBe(0);
    expect(markField(p, '').marksAwarded).toBe(0); // blank never scores
  });
  it('accepts listed alternatives', () => {
    const p = [pt({ expected: 'CPU', alternatives: ['processor', 'central processing unit'] })];
    expect(markField(p, 'processor').marksAwarded).toBe(1);
    expect(markField(p, 'Central Processing Unit').marksAwarded).toBe(1);
  });
});

describe('deterministicMarker — multichoice (tick all that apply: set equality)', () => {
  const p = [pt({ kind: 'multichoice', expected: 'buttons, light sensor, temperature sensor' })];
  it('matches the exact chosen set, order-independent + case/space-insensitive', () => {
    expect(markField(p, 'buttons, light sensor, temperature sensor').marksAwarded).toBe(1);
    expect(markField(p, 'Temperature Sensor,  buttons ,light sensor').marksAwarded).toBe(1);
  });
  it('rejects a partial or wrong set', () => {
    expect(markField(p, 'buttons, light sensor').marksAwarded).toBe(0); // missing one
    expect(markField(p, 'buttons, light sensor, temperature sensor, the screen').marksAwarded).toBe(0); // extra wrong one
    expect(markField(p, '').marksAwarded).toBe(0);
  });
});

describe('deterministicMarker — numeric (strict after parsing)', () => {
  const p = [pt({ kind: 'numeric', expected: '4', alternatives: ['four'] })];
  it('matches 4 / 4.0 / " 4 " / "4 items"', () => {
    expect(markField(p, '4').marksAwarded).toBe(1);
    expect(markField(p, '4.0').marksAwarded).toBe(1);
    expect(markField(p, ' 4 ').marksAwarded).toBe(1);
    expect(markField(p, '4 items').marksAwarded).toBe(1);
  });
  it('matches the word-form alternative', () => {
    expect(markField(p, 'four').marksAwarded).toBe(1);
  });
  it('rejects a different number / non-numeric', () => {
    expect(markField(p, '5').marksAwarded).toBe(0);
    expect(markField(p, 'lots').marksAwarded).toBe(0);
  });
});

describe('deterministicMarker — keyword (multi-point, word-bounded)', () => {
  it('awards a mark per distinct keyword found', () => {
    const points = [
      pt({ id: 1, kind: 'keyword', expected: 'input', marks: 1 }),
      pt({ id: 2, kind: 'keyword', expected: 'process', alternatives: ['processing'], marks: 1 }),
      pt({ id: 3, kind: 'keyword', expected: 'output', marks: 1 }),
    ];
    const r = markField(points, 'The computer takes input, does processing, then output.');
    expect(r.marksAwarded).toBe(3);
    expect(r.marksTotal).toBe(3);
    expect(r.pointsHit.sort()).toEqual([1, 2, 3]);
  });
  it('is word-bounded — "outputting" does not match "output" as a standalone... actually it should not partial-match a longer word edge', () => {
    const points = [pt({ kind: 'keyword', expected: 'cat' })];
    expect(markField(points, 'concatenate the strings').marksAwarded).toBe(0); // "cat" inside "concatenate"
    expect(markField(points, 'the cat sat').marksAwarded).toBe(1);
  });
});

describe('deterministicMarker — tick & choice', () => {
  it('tick scores only when the checklist value is "x"', () => {
    const p = [pt({ kind: 'tick', expected: 'done', marks: 1 })];
    expect(markField(p, 'x').marksAwarded).toBe(1);
    expect(markField(p, '').marksAwarded).toBe(0);
  });
  it('choice matches the chosen option exactly (normalised)', () => {
    const p = [pt({ kind: 'choice', expected: 'B', alternatives: [] })];
    expect(markField(p, 'b').marksAwarded).toBe(1);
    expect(markField(p, 'C').marksAwarded).toBe(0);
  });
});

describe('deterministicMarker — open & classification', () => {
  it('open points never score deterministically (left to the AI)', () => {
    const p = [pt({ kind: 'open', expected: '', marks: 3 })];
    expect(markField(p, 'a long thoughtful answer').marksAwarded).toBe(0);
  });
  it('isDeterministic: true only when every point is objective', () => {
    expect(isDeterministic([pt({ kind: 'exact' }), pt({ kind: 'numeric' })])).toBe(true);
    expect(isDeterministic([pt({ kind: 'exact' }), pt({ kind: 'open' })])).toBe(false);
    expect(isDeterministic([])).toBe(false);
  });
});
