import { describe, it, expect } from 'vitest';
import { summariseCalibration, calibrationHeadline, type EstimateSample } from '../src/services/estimateCalibration';

const s = (estimateMin: number, actualMin: number, load: string | null = null): EstimateSample => ({ title: 't', estimateMin, actualMin, cognitiveLoad: load });

describe('estimateCalibration — summariseCalibration (pure)', () => {
  it('returns null below the minimum sample size', () => {
    expect(summariseCalibration([s(10, 12), s(10, 12)])).toBeNull();
  });

  it('detects under-estimation and suggests a padding multiplier', () => {
    // consistently ~1.5× over the estimate
    const c = summariseCalibration([s(10, 15), s(20, 30), s(30, 45), s(10, 15)])!;
    expect(c.verdict).toBe('under');
    expect(c.medianRatio).toBeCloseTo(1.5, 5);
    expect(c.multiplier).toBe(1.5);
    expect(c.biasPct).toBe(50);
    expect(c.count).toBe(4);
  });

  it('detects over-estimation', () => {
    const c = summariseCalibration([s(20, 10), s(40, 20), s(10, 5)])!;
    expect(c.verdict).toBe('over');
    expect(c.medianRatio).toBeCloseTo(0.5, 5);
  });

  it('calls near-1 estimates accurate (within the dead-band)', () => {
    const c = summariseCalibration([s(10, 10), s(20, 22), s(30, 29)])!;
    expect(c.verdict).toBe('accurate');
  });

  it('breaks the median down by cognitive load when a level has ≥2 samples', () => {
    const c = summariseCalibration([s(10, 20, 'high'), s(20, 40, 'high'), s(10, 11, 'low'), s(20, 22, 'low')])!;
    const high = c.byLoad.find((g) => g.load === 'high')!;
    expect(high.count).toBe(2);
    expect(high.medianRatio).toBeCloseTo(2, 5);
    expect(c.byLoad.find((g) => g.load === 'medium')).toBeUndefined(); // no medium samples
  });

  it('drops zero/invalid pairs before deciding there is enough data', () => {
    expect(summariseCalibration([s(0, 10), s(10, 0), s(10, 15)])).toBeNull(); // only 1 valid pair left
  });

  it('headline always renders a plain-English line', () => {
    const c = summariseCalibration([s(10, 15), s(20, 30), s(30, 45)])!;
    expect(calibrationHeadline(c)).toMatch(/underestimate/);
    expect(calibrationHeadline(c)).toMatch(/×1\.5/);
  });
});
