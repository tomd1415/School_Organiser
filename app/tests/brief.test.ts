import { describe, it, expect } from 'vitest';
import { coverageRisk, weeksBetween, buildBrief } from '../src/services/brief';
import type { CoverageCourseRow } from '../src/repos/brief';

const cov = (over: Partial<CoverageCourseRow>): CoverageCourseRow => ({
  schemeId: 1,
  courseName: 'J277 Paper 1',
  examDate: null,
  covered: 0,
  total: 0,
  ...over,
});

describe('coverageRisk bands', () => {
  it('flags high when the exam is close and coverage is low', () => {
    expect(coverageRisk(0.5, 4)).toBe('high');
    expect(coverageRisk(0.85, 3)).toBe('high'); // <90% within 6 wk
  });
  it('flags medium further out', () => {
    expect(coverageRisk(0.5, 12)).toBe('medium');
  });
  it('does not flag healthy coverage, or a past/absent exam', () => {
    expect(coverageRisk(0.95, 3)).toBeNull();
    expect(coverageRisk(0.5, 30)).toBeNull(); // beyond the 16-wk window
    expect(coverageRisk(0.1, -2)).toBeNull(); // exam already past
    expect(coverageRisk(0.1, null)).toBeNull(); // no exam date
  });
});

describe('weeksBetween', () => {
  it('counts whole-ish weeks forward', () => {
    expect(weeksBetween('2026-06-01', '2026-06-15')).toBe(2);
    expect(Math.round(weeksBetween('2026-06-01', '2026-07-01'))).toBe(4);
  });
});

describe('buildBrief', () => {
  it('ranks high coverage risk first, then info lines', () => {
    const items = buildBrief({
      today: '2026-06-01',
      coverage: [
        cov({ courseName: 'Behind soon', examDate: '2026-06-29', covered: 4, total: 10 }), // ~4 wk, 40% → high
        cov({ courseName: 'On track', examDate: '2026-06-29', covered: 10, total: 10 }), // 100% → none
      ],
      nextSchoolDay: { label: 'Tomorrow', teachingCount: 5 },
      markingClasses: 2,
    });
    expect(items[0]).toMatchObject({ level: 'high', text: expect.stringContaining('Behind soon') });
    expect(items.some((i) => i.text.includes('On track'))).toBe(false);
    expect(items.some((i) => i.text === 'Tomorrow: 5 lessons to teach')).toBe(true);
    expect(items.some((i) => i.text === 'Marking waiting for 2 classes')).toBe(true);
  });

  it('is empty when nothing is notable', () => {
    expect(buildBrief({ today: '2026-06-01', coverage: [], nextSchoolDay: null, markingClasses: 0 })).toEqual([]);
  });

  it('surfaces open lesson reviews from the nightly sweep', () => {
    const items = buildBrief({ today: '2026-06-01', coverage: [], nextSchoolDay: null, markingClasses: 0, openReviews: 3 });
    expect(items.some((i) => i.text === '3 lesson reviews to look at' && i.href === '/schemes')).toBe(true);
    const one = buildBrief({ today: '2026-06-01', coverage: [], nextSchoolDay: null, markingClasses: 0, openReviews: 1 });
    expect(one.some((i) => i.text === '1 lesson review to look at')).toBe(true);
  });

  it('singularises one lesson / one class', () => {
    const items = buildBrief({
      today: '2026-06-01',
      coverage: [],
      nextSchoolDay: { label: 'Mon 8 Jun', teachingCount: 1 },
      markingClasses: 1,
    });
    expect(items.some((i) => i.text === 'Mon 8 Jun: 1 lesson to teach')).toBe(true);
    expect(items.some((i) => i.text === 'Marking waiting for 1 class')).toBe(true);
  });
});
