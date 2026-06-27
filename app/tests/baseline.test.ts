import { describe, expect, it } from 'vitest';
import { baselineBand, placedStageFromResponses, randomClickGuard, shouldStopStrand, type BaselineResponse } from '../src/services/baseline';

const r = (stageOrdinal: number, correct: boolean, elapsedMs = 5000, optionIndex?: number): BaselineResponse => ({ stageOrdinal, correct, elapsedMs, optionIndex });

describe('randomClickGuard (16A.7 — don\'t trust random clicking)', () => {
  it('ok when responses are paced and varied', () => {
    expect(randomClickGuard([r(12, true, 5000, 0), r(13, false, 4000, 1), r(12, true, 6000, 2)])).toBe('ok');
  });
  it('low when a notable fraction are too fast', () => {
    expect(randomClickGuard([r(12, true, 500, 0), r(13, false, 5000, 1), r(12, true, 6000, 2)])).toBe('low'); // 1/3 fast
  });
  it('flagged when most are too fast', () => {
    expect(randomClickGuard([r(12, true, 400, 0), r(13, false, 300, 1), r(12, true, 600, 2)])).toBe('flagged');
  });
  it('flagged on an always-the-same-option pattern (enough items)', () => {
    const same = Array.from({ length: 6 }, (_, i) => r(12 + (i % 2), i % 2 === 0, 5000, 0)); // always option 0, paced
    expect(randomClickGuard(same)).toBe('flagged');
  });
  it('ok for an empty set', () => {
    expect(randomClickGuard([])).toBe('ok');
  });
});

describe('shouldStopStrand (adaptive stop)', () => {
  it('stops after the configured miss streak', () => {
    expect(shouldStopStrand([{ correct: true }, { correct: false }, { correct: false }])).toBe(true); // 2 misses
    expect(shouldStopStrand([{ correct: true }, { correct: false }, { correct: true }])).toBe(false);
  });
  it('does not stop before enough responses', () => {
    expect(shouldStopStrand([{ correct: false }])).toBe(false);
  });
});

describe('placedStageFromResponses', () => {
  it('places at the top of the contiguous-correct run', () => {
    expect(placedStageFromResponses([r(10, true), r(11, true), r(12, false), r(13, true)])).toBe(11);
  });
  it('null when the lowest probed item is wrong', () => {
    expect(placedStageFromResponses([r(10, false), r(11, true)])).toBeNull();
  });
  it('a stage is only cleared when ALL its probed items are correct', () => {
    expect(placedStageFromResponses([r(10, true), r(11, true), r(11, false)])).toBe(10);
  });
});

describe('baselineBand', () => {
  it('cold start probes a broad band around the age-expected stage', () => {
    expect(baselineBand(12, 'cold_start')).toEqual([10, 13]);
  });
  it('warm start probes a tighter band around the prior stage', () => {
    expect(baselineBand(12, 'warm_start')).toEqual([11, 13]);
  });
  it('clamps to the scheme stage range', () => {
    expect(baselineBand(7, 'cold_start', { minOrdinal: 6, maxOrdinal: 14 })).toEqual([6, 8]);
  });
});
