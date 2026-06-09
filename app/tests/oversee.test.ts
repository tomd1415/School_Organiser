import { describe, expect, it } from 'vitest';
import { buildOverseenWeek, type LessonRow, type PeriodRow } from '../src/services/timetable';

const period = (weekday: number, slotOrder: number, start: string): PeriodRow => ({
  weekday,
  slotOrder,
  slotType: 'lesson',
  label: `L${slotOrder}`,
  lessonIndex: 1,
  start,
  end: '10:00',
  teachable: true,
});

const lesson = (lessonId: number, weekday: number, slotOrder: number, isSelf: boolean, groupName: string | null, staffName: string): LessonRow => ({
  lessonId,
  purpose: 'teaching',
  weekday,
  slotOrder,
  isSelf,
  staffName,
  groupName,
  courses: [],
});

describe('buildOverseenWeek', () => {
  it('keeps only overseen lessons, enriched with period times, sorted by day then start', () => {
    const periods = [period(1, 3, '09:00'), period(3, 5, '11:00')];
    const lessons = [
      lesson(1, 1, 3, true, '8PFA', 'Me'), // self — excluded
      lesson(2, 3, 5, false, '7ARO', 'Mr TA'), // overseen, Wed
      lesson(3, 1, 3, false, '9XYZ', 'Ms TA'), // overseen, Mon (earlier)
    ];
    const out = buildOverseenWeek(periods, lessons);
    expect(out.map((o) => o.lessonId)).toEqual([3, 2]); // Monday before Wednesday
    expect(out[0]?.start).toBe('09:00');
    expect(out[0]?.staffName).toBe('Ms TA');
    expect(out.some((o) => o.groupName === '8PFA')).toBe(false); // self never appears
  });

  it('returns empty when there are no overseen lessons', () => {
    expect(buildOverseenWeek([], [lesson(1, 1, 3, true, '8PFA', 'Me')])).toEqual([]);
  });

  it('tolerates a lesson whose period is missing (blank time, still listed)', () => {
    const out = buildOverseenWeek([], [lesson(9, 2, 4, false, '7JMI', 'TA')]);
    expect(out).toHaveLength(1);
    expect(out[0]?.start).toBe('');
  });
});
