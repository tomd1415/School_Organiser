import { describe, it, expect } from 'vitest';
import {
  ACADEMIC_YEARS,
  TERM_DATES,
  COURSES,
  GROUPS,
  GRID,
  OVERSEEN,
  EXPECTED,
  buildPeriodDefinitions,
} from '../src/seed/data';

// Pure regression guard on the typed seed data: catches a mistyped group/course
// in the grid, a miscounted split, or a calendar slip — before they reach the DB.

const groupNames = new Set(GROUPS.map((g) => g.name));
const courseNames = new Set(COURSES.map((c) => c.name));
const cells = [1, 2, 3, 4, 5].flatMap((w) => GRID[w] ?? []);

describe('seed data — period definitions', () => {
  const periods = buildPeriodDefinitions();

  it('has 13 slots per weekday (65 total)', () => {
    expect(periods.length).toBe(EXPECTED.periods);
    for (let w = 1; w <= 5; w++) {
      expect(periods.filter((p) => p.weekday === w).length).toBe(13);
    }
  });

  it('has 6 teachable lessons L1..L6 per weekday; nothing else is teachable', () => {
    for (let w = 1; w <= 5; w++) {
      const lessons = periods.filter((p) => p.weekday === w && p.slotType === 'lesson');
      expect(lessons.map((p) => p.lessonIndex).sort((a, b) => Number(a) - Number(b))).toEqual([1, 2, 3, 4, 5, 6]);
      expect(lessons.every((p) => p.teachable)).toBe(true);
    }
    expect(periods.filter((p) => p.slotType !== 'lesson').some((p) => p.teachable)).toBe(false);
  });
});

describe('seed data — the grid references only known groups/courses', () => {
  it('every weekday has 6 cells, all valid', () => {
    for (let w = 1; w <= 5; w++) {
      const day = GRID[w] ?? [];
      expect(day.length, `weekday ${w}`).toBe(6);
      for (const cell of day) {
        if (cell.kind === 'teach') {
          expect(groupNames.has(cell.group)).toBe(true);
          expect(cell.courses.length).toBeGreaterThanOrEqual(1);
          for (const c of cell.courses) expect(courseNames.has(c), c).toBe(true);
        } else if (cell.kind === 'form') {
          expect(groupNames.has(cell.group)).toBe(true);
        }
      }
    }
  });

  it('overseen lessons reference known groups/courses', () => {
    for (const o of OVERSEEN) {
      expect(groupNames.has(o.group), o.group).toBe(true);
      expect(courseNames.has(o.course), o.course).toBe(true);
    }
  });
});

describe('seed data — derived counts match EXPECTED', () => {
  it('teaching = 26, free = 3, form = 1 cells', () => {
    expect(cells.filter((c) => c.kind === 'teach').length).toBe(26);
    expect(cells.filter((c) => c.kind === 'free').length).toBe(EXPECTED.free);
    expect(cells.filter((c) => c.kind === 'form').length).toBe(1);
  });

  it('distinct group_courses == EXPECTED.groupCourses', () => {
    const set = new Set<string>();
    for (const c of cells) if (c.kind === 'teach') for (const course of c.courses) set.add(`${c.group}|${course}`);
    for (const o of OVERSEEN) set.add(`${o.group}|${o.course}`);
    expect(set.size).toBe(EXPECTED.groupCourses);
  });

  it('total course-links (self + overseen) == EXPECTED.lessonCourses', () => {
    const self = cells.reduce((n, c) => n + (c.kind === 'teach' ? c.courses.length : 0), 0);
    expect(self + OVERSEEN.length).toBe(EXPECTED.lessonCourses);
  });

  it('exactly 6 split cells (Post-16 ×3 + Y10 ×3)', () => {
    expect(cells.filter((c) => c.kind === 'teach' && c.courses.length > 1).length).toBe(6);
  });
});

describe('seed data — calendar', () => {
  it('exactly one current academic year', () => {
    expect(ACADEMIC_YEARS.filter((y) => y.isCurrent).length).toBe(EXPECTED.currentYears);
  });

  it('term dates reference known years and match the expected count', () => {
    const years = new Set(ACADEMIC_YEARS.map((y) => y.name));
    expect(TERM_DATES.length).toBe(EXPECTED.termDates);
    for (const t of TERM_DATES) expect(years.has(t.year), t.year).toBe(true);
  });
});
