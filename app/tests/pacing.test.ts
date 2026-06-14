import { describe, it, expect } from 'vitest';
import { classifyPace, paceItems } from '../src/llm/prompts/pacing';

describe('classifyPace (idea 2 — deliberately conservative)', () => {
  it('returns null below 2 valid samples (no signal → say nothing)', () => {
    expect(classifyPace([])).toBeNull();
    expect(classifyPace([{ progressStep: 2, plannedSteps: 5 }])).toBeNull();
    // null / zero step and zero planned-steps samples don't count
    expect(classifyPace([
      { progressStep: null, plannedSteps: 5 },
      { progressStep: 0, plannedSteps: 5 },
      { progressStep: 3, plannedSteps: 0 },
      { progressStep: 3, plannedSteps: 5 },
    ])).toBeNull(); // only 1 valid
  });

  it('flags "over" when the class reliably under-runs (mean ratio < 0.7)', () => {
    const r = classifyPace([{ progressStep: 2, plannedSteps: 6 }, { progressStep: 3, plannedSteps: 8 }]);
    expect(r?.band).toBe('over');
    expect(r?.samples).toBe(2);
    expect(r!.meanRatio).toBeLessThan(0.5);
  });

  it('reports "steady" when the class reaches the end', () => {
    expect(classifyPace([{ progressStep: 5, plannedSteps: 5 }, { progressStep: 4, plannedSteps: 5 }])?.band).toBe('steady');
  });

  it('caps a single over-shoot sample so it cannot skew the mean', () => {
    // 20/5 would be 4.0 uncapped; capped at 1.5, with a 1.0 sample → mean 1.25 → steady, not absurd
    const r = classifyPace([{ progressStep: 20, plannedSteps: 5 }, { progressStep: 5, plannedSteps: 5 }]);
    expect(r?.band).toBe('steady');
    expect(r!.meanRatio).toBeCloseTo(1.25, 2);
  });
});

describe('paceItems (idea 2 — soft nudge, under-running only)', () => {
  it('emits nothing for null or a steady class', () => {
    expect(paceItems(null)).toEqual([]);
    expect(paceItems({ band: 'steady', samples: 3, meanRatio: 0.95 })).toEqual([]);
  });

  it('a severe under-run says "about half"; a milder one says "frequently does not finish"', () => {
    expect(paceItems({ band: 'over', samples: 3, meanRatio: 0.4 })[0]!.text).toContain('about half');
    expect(paceItems({ band: 'over', samples: 3, meanRatio: 0.65 })[0]!.text).toMatch(/frequently does not finish/);
  });

  it('the directive keeps duration, asks for fewer activities, and flags itself as a nudge', () => {
    const text = paceItems({ band: 'over', samples: 2, meanRatio: 0.5 })[0]!.text;
    expect(text).toMatch(/FEWER/);
    expect(text).toMatch(/keep the same lesson duration/i);
    expect(text).toMatch(/nudge|not a precise/i);
    expect(paceItems({ band: 'over', samples: 2, meanRatio: 0.5 })[0]!.safeguarding).toBeUndefined();
  });
});
