import { describe, it, expect } from 'vitest';
import {
  buildLessonDetail,
  type LastStop,
  type OccurrenceCourseRow,
  type OccurrenceHeader,
} from '../src/services/occurrence';

const header: OccurrenceHeader = {
  occurrenceId: 1,
  lessonId: 5,
  date: '2026-09-09',
  status: 'planned',
  purpose: 'teaching',
  periodLabel: 'Lesson 4',
  lessonIndex: 4,
  start: '11:55',
  end: '12:45',
  groupName: 'Y10 GCSE CS',
  isSelf: true,
  staffName: 'Me',
  roomName: 'U1',
};

const courses: OccurrenceCourseRow[] = [
  { occurrenceCourseId: 1, groupCourseId: 100, courseId: 50, courseName: 'OCR J277', colour: '#8b5cf6', stoppingPoint: 'paging vs segmentation', lessonPlanId: null, planTitle: null, planObjectives: null, planOutline: null },
  { occurrenceCourseId: 2, groupCourseId: 200, courseId: 60, courseName: 'Sound Eng', colour: '#f59e0b', stoppingPoint: null, lessonPlanId: 42, planTitle: 'Mixing basics', planObjectives: 'gain staging', planOutline: null },
];

const lastStops: LastStop[] = [{ groupCourseId: 100, stoppingPoint: 'fetch-decode-execute', date: '2026-09-02' }];

describe('buildLessonDetail', () => {
  const detail = buildLessonDetail(header, courses, lastStops);
  const section = (gc: number) => detail.sections.find((s) => s.groupCourseId === gc);

  it('makes one section per course for a split lesson', () => {
    expect(detail.sections.length).toBe(2);
  });

  it('matches a last stopping point to the right course only', () => {
    expect(section(100)?.lastStop?.stoppingPoint).toBe('fetch-decode-execute');
    expect(section(200)?.lastStop).toBeNull();
  });

  it('carries the current stopping point through', () => {
    expect(section(100)?.stoppingPoint).toBe('paging vs segmentation');
    expect(section(200)?.stoppingPoint).toBeNull();
  });

  it('carries the bound lesson plan through', () => {
    expect(section(100)?.lessonPlanId).toBeNull();
    expect(section(200)?.lessonPlanId).toBe(42);
    expect(section(200)?.planTitle).toBe('Mixing basics');
  });

  it('carries the occurrence_course id (for the stopping-point input)', () => {
    expect(section(100)?.occurrenceCourseId).toBe(1);
    expect(section(200)?.occurrenceCourseId).toBe(2);
  });
});
