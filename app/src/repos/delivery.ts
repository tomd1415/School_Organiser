// Phase 5.4: SQL for laying a unit into a group's weekly slot. The slot→course mapping already
// exists (timetabled_lesson_courses → group_courses); this binds a unit's lessons to the upcoming
// dated occurrences of one slot, for one group_course.
import { pool } from '../db/pool';
import { findOrCreateOccurrence, getOccurrenceCourses, setOccurrenceCoursePlan } from './occurrence';

export interface CourseSlot {
  lessonId: number; // timetabled_lessons id
  groupCourseId: number;
  groupName: string | null;
  weekday: number;
  slotOrder: number;
  periodLabel: string;
  start: string;
}

/** Every weekly slot that teaches a course (group + period) — the targets for laying a unit down. */
export async function listSlotsForCourse(courseId: number): Promise<CourseSlot[]> {
  const { rows } = await pool.query<CourseSlot>(
    `SELECT tl.id AS "lessonId", gc.id AS "groupCourseId", g.name AS "groupName",
            p.weekday, p.slot_order AS "slotOrder", p.label AS "periodLabel",
            to_char(p.start_time, 'HH24:MI') AS start
     FROM timetabled_lesson_courses tlc
     JOIN group_courses gc      ON gc.id = tlc.group_course_id
     JOIN timetabled_lessons tl ON tl.id = tlc.timetabled_lesson_id
     JOIN period_definitions p  ON p.id  = tl.period_definition_id
     LEFT JOIN groups g         ON g.id  = tl.group_id
     WHERE gc.course_id = $1
     ORDER BY p.weekday, p.slot_order`,
    [courseId],
  );
  return rows;
}

export async function getSlotWeekday(timetabledLessonId: number): Promise<number | null> {
  const { rows } = await pool.query<{ weekday: number }>(
    `SELECT p.weekday FROM timetabled_lessons tl JOIN period_definitions p ON p.id = tl.period_definition_id WHERE tl.id = $1`,
    [timetabledLessonId],
  );
  return rows[0]?.weekday ?? null;
}

// 5.6: the curriculum map — every weekly teaching slot (for the picker), and a slot's schedule.
export interface SlotOption {
  lessonId: number;
  groupCourseId: number;
  groupName: string | null;
  courseName: string;
  weekday: number;
  periodLabel: string;
}

export async function listAllSlots(): Promise<SlotOption[]> {
  const { rows } = await pool.query<SlotOption>(
    `SELECT tl.id AS "lessonId", gc.id AS "groupCourseId", g.name AS "groupName",
            c.name AS "courseName", p.weekday, p.label AS "periodLabel"
     FROM timetabled_lesson_courses tlc
     JOIN group_courses gc      ON gc.id = tlc.group_course_id
     JOIN courses c             ON c.id  = gc.course_id
     JOIN timetabled_lessons tl ON tl.id = tlc.timetabled_lesson_id
     JOIN period_definitions p  ON p.id  = tl.period_definition_id
     LEFT JOIN groups g         ON g.id  = tl.group_id
     WHERE tl.purpose = 'teaching'
     ORDER BY g.name, p.weekday, p.slot_order`,
  );
  return rows;
}

export interface ScheduleEntry {
  date: string;
  lessonPlanId: number | null;
  planTitle: string | null;
  stoppingPoint: string | null;
  adapted: boolean;
}

/** Dated occurrences of one slot for one group_course, with the bound plan + adapted flag. */
export async function slotSchedule(lessonId: number, groupCourseId: number, fromDate: string, toDate: string): Promise<ScheduleEntry[]> {
  const { rows } = await pool.query<ScheduleEntry>(
    `SELECT to_char(o.date, 'YYYY-MM-DD') AS date,
            oc.lesson_plan_id AS "lessonPlanId", lp.title AS "planTitle",
            oc.stopping_point AS "stoppingPoint",
            EXISTS (SELECT 1 FROM lesson_adaptations a
                    WHERE a.group_course_id = oc.group_course_id AND a.lesson_plan_id = oc.lesson_plan_id) AS adapted
     FROM occurrence_courses oc
     JOIN lesson_occurrences o ON o.id = oc.occurrence_id
     LEFT JOIN lesson_plans lp ON lp.id = oc.lesson_plan_id
     WHERE o.timetabled_lesson_id = $1 AND oc.group_course_id = $2 AND o.date BETWEEN $3 AND $4
     ORDER BY o.date`,
    [lessonId, groupCourseId, fromDate, toDate],
  );
  return rows;
}

export interface LaidLesson {
  date: string;
  lessonPlanId: number;
  title: string;
}

/**
 * Bind each unit lesson, in order, to the next upcoming occurrence of a slot — for one group_course.
 * Creates the occurrence (and its occurrence_courses) on demand and sets its lesson_plan_id. Stops
 * when it runs out of either lessons or dates (so a short term lays down what fits).
 */
export async function layLessonsIntoSlot(
  timetabledLessonId: number,
  groupCourseId: number,
  lessons: Array<{ id: number; title: string }>,
  dates: string[],
): Promise<LaidLesson[]> {
  const laid: LaidLesson[] = [];
  const n = Math.min(lessons.length, dates.length);
  for (let i = 0; i < n; i++) {
    const date = dates[i]!;
    const lesson = lessons[i]!;
    const occId = await findOrCreateOccurrence(timetabledLessonId, date);
    const ocs = await getOccurrenceCourses(occId);
    const oc = ocs.find((o) => Number(o.groupCourseId) === Number(groupCourseId));
    if (!oc) continue; // slot no longer teaches this group_course — skip
    await setOccurrenceCoursePlan(oc.occurrenceCourseId, lesson.id);
    laid.push({ date, lessonPlanId: lesson.id, title: lesson.title });
  }
  return laid;
}
