// OccurrenceService — assemble the lesson-detail view model. Pure (takes rows,
// returns the view); the repo does the find-or-create and the SQL. A split lesson
// yields one section per course, each carrying its own stopping point, plan flag
// and "where we got to last time".

export interface OccurrenceHeader {
  occurrenceId: number;
  lessonId: number;
  date: string; // "YYYY-MM-DD"
  status: string;
  purpose: string;
  periodLabel: string;
  lessonIndex: number | null;
  start: string;
  end: string;
  groupName: string | null;
  isSelf: boolean;
  staffName: string;
  roomName: string | null;
}

export interface OccurrenceCourseRow {
  occurrenceCourseId: number;
  groupCourseId: number;
  courseName: string;
  colour: string | null;
  stoppingPoint: string | null;
  lessonPlanId: number | null;
}

export interface LastStop {
  groupCourseId: number;
  stoppingPoint: string;
  date: string;
}

export interface NoteView {
  id: number;
  body: string;
  stoppingPoint: string | null;
  time: string;
  courseId: number | null;
}

export interface CourseSection {
  occurrenceCourseId: number;
  groupCourseId: number;
  courseName: string;
  colour: string | null;
  stoppingPoint: string | null;
  lastStop: LastStop | null;
  hasPlan: boolean;
}

export interface LessonDetail {
  header: OccurrenceHeader;
  sections: CourseSection[];
}

export function buildLessonDetail(
  header: OccurrenceHeader,
  courses: OccurrenceCourseRow[],
  lastStops: LastStop[],
): LessonDetail {
  const lastByGroupCourse = new Map<number, LastStop>();
  for (const ls of lastStops) lastByGroupCourse.set(ls.groupCourseId, ls);

  const sections: CourseSection[] = courses.map((c) => ({
    occurrenceCourseId: c.occurrenceCourseId,
    groupCourseId: c.groupCourseId,
    courseName: c.courseName,
    colour: c.colour,
    stoppingPoint: c.stoppingPoint,
    lastStop: lastByGroupCourse.get(c.groupCourseId) ?? null,
    hasPlan: c.lessonPlanId !== null,
  }));

  return { header, sections };
}
