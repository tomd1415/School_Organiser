import { describe, it, expect } from 'vitest';
import { buildWeekGrid, type LessonRow, type PeriodRow } from '../src/services/timetable';

const periods: PeriodRow[] = [
  { weekday: 1, slotOrder: 1, slotType: 'briefing', label: 'Briefing', lessonIndex: null, start: '08:30', end: '08:50', teachable: false },
  { weekday: 1, slotOrder: 2, slotType: 'lesson', label: 'Lesson 1', lessonIndex: 1, start: '09:10', end: '10:00', teachable: true },
  { weekday: 2, slotOrder: 1, slotType: 'before_school', label: 'Prep', lessonIndex: null, start: '08:30', end: '08:50', teachable: false },
  { weekday: 2, slotOrder: 2, slotType: 'lesson', label: 'Lesson 1', lessonIndex: 1, start: '09:10', end: '10:00', teachable: true },
];

const lessons: LessonRow[] = [
  { lessonId: 10, purpose: 'teaching', weekday: 1, slotOrder: 2, isSelf: true, staffName: 'Me', groupName: '8PFA', courses: [{ name: 'Computing Curriculum', colour: '#3b82f6' }] },
  // Split (two courses) on Tue L1, plus a parallel overseen lesson in the same slot.
  { lessonId: 11, purpose: 'teaching', weekday: 2, slotOrder: 2, isSelf: true, staffName: 'Me', groupName: 'Y10 GCSE CS', courses: [{ name: 'OCR J277', colour: '#8b5cf6' }, { name: 'Sound Eng', colour: '#f59e0b' }] },
  { lessonId: 12, purpose: 'teaching', weekday: 2, slotOrder: 2, isSelf: false, staffName: 'Other', groupName: '7ARO', courses: [{ name: 'Computer Skills', colour: '#06b6d4' }] },
];

const grid = buildWeekGrid(periods, lessons);
const rowAt = (slotOrder: number) => grid.rows.find((r) => r.slotOrder === slotOrder);

describe('TimetableService.buildWeekGrid', () => {
  it('produces Mon–Fri and one row per slot order', () => {
    expect(grid.weekdays).toEqual([1, 2, 3, 4, 5]);
    expect(grid.rows.map((r) => r.slotOrder)).toEqual([1, 2]);
  });

  it('row 1 reflects per-weekday slot type (briefing vs prep) and is empty', () => {
    const row = rowAt(1);
    expect(row?.label).toBe('Before');
    expect(row?.cells[0]?.slotType).toBe('briefing'); // Mon
    expect(row?.cells[0]?.periodLabel).toBe('Briefing');
    expect(row?.cells[1]?.slotType).toBe('before_school'); // Tue
    expect(row?.cells[1]?.periodLabel).toBe('Prep');
    expect(row?.cells[0]?.lessons.length).toBe(0);
  });

  it('a single lesson lands in its cell with its course', () => {
    const mon = rowAt(2)?.cells[0];
    expect(mon?.lessons.length).toBe(1);
    expect(mon?.lessons[0]?.groupName).toBe('8PFA');
    expect(mon?.lessons[0]?.courses.length).toBe(1);
  });

  it('a split keeps both courses, and self sorts before an overseen lesson', () => {
    const tue = rowAt(2)?.cells[1];
    expect(tue?.lessons.length).toBe(2);
    expect(tue?.lessons[0]?.isSelf).toBe(true);
    expect(tue?.lessons[0]?.groupName).toBe('Y10 GCSE CS');
    expect(tue?.lessons[0]?.courses.length).toBe(2);
    expect(tue?.lessons[1]?.isSelf).toBe(false);
    expect(tue?.lessons[1]?.groupName).toBe('7ARO');
  });

  it('the lesson row is marked teachable', () => {
    expect(rowAt(2)?.teachable).toBe(true);
    expect(rowAt(1)?.teachable).toBe(false);
  });
});
