// Phase 5.4: SQL for laying a unit into a group's weekly slot. The slot→course mapping already
// exists (timetabled_lesson_courses → group_courses); this binds a unit's lessons to the upcoming
// dated occurrences of one slot, for one group_course.
import { pool } from '../db/pool';
import { findOccurrence, findOrCreateOccurrence, getOccurrenceCourses, setOccurrenceCoursePlan } from './occurrence';
import type { Placement } from '../services/delivery'; // pure type only — the cascade maths lives in the service

export interface CourseSlot {
  lessonId: number; // timetabled_lessons id
  groupCourseId: number;
  groupName: string | null;
  weekday: number;
  slotOrder: number;
  periodLabel: string;
  start: string;
}

/** The current academic year's last day — future planning never crosses into next September's
 * timetable (which may not even exist yet). */
export async function getCurrentYearEnd(): Promise<string | null> {
  const { rows } = await pool.query<{ end: string }>(
    `SELECT to_char(end_date, 'YYYY-MM-DD') AS "end" FROM academic_years WHERE is_current`,
  );
  return rows[0]?.end ?? null;
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
     WHERE gc.course_id = $1 AND gc.active
       AND p.academic_year_id = (SELECT id FROM academic_years WHERE is_current)
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
  courseId: number;
  courseName: string;
  weekday: number;
  periodLabel: string;
}

export async function listAllSlots(): Promise<SlotOption[]> {
  const { rows } = await pool.query<SlotOption>(
    `SELECT tl.id AS "lessonId", gc.id AS "groupCourseId", g.name AS "groupName",
            c.id AS "courseId", c.name AS "courseName", p.weekday, p.label AS "periodLabel"
     FROM timetabled_lesson_courses tlc
     JOIN group_courses gc      ON gc.id = tlc.group_course_id
     JOIN courses c             ON c.id  = gc.course_id
     JOIN timetabled_lessons tl ON tl.id = tlc.timetabled_lesson_id
     JOIN period_definitions p  ON p.id  = tl.period_definition_id
     LEFT JOIN groups g         ON g.id  = tl.group_id
     WHERE tl.purpose = 'teaching' AND gc.active
       AND p.academic_year_id = (SELECT id FROM academic_years WHERE is_current)
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
  kitNeeded: string | null; // C1: the (master) lesson's kit note, for the map row + weeks summary
}

/** Dated occurrences of one slot for one group_course, with the bound plan + adapted flag. */
export async function slotSchedule(lessonId: number, groupCourseId: number, fromDate: string, toDate: string): Promise<ScheduleEntry[]> {
  const { rows } = await pool.query<ScheduleEntry>(
    `SELECT to_char(o.date, 'YYYY-MM-DD') AS date,
            oc.lesson_plan_id AS "lessonPlanId", lp.title AS "planTitle",
            oc.stopping_point AS "stoppingPoint", lp.kit_needed AS "kitNeeded",
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

// ── Phase 13.1: per-class delivery across ALL the class's weekly slots ────────────────────────────

export interface GroupCourseSlot {
  timetabledLessonId: number;
  weekday: number;
  slotOrder: number;
  periodLabel: string;
}

/** Every weekly teaching slot a class (group_course) is taught in — GCSE/Post-16 have several. */
export async function classSlots(groupCourseId: number): Promise<GroupCourseSlot[]> {
  const { rows } = await pool.query<GroupCourseSlot>(
    `SELECT tl.id AS "timetabledLessonId", p.weekday, p.slot_order AS "slotOrder", p.label AS "periodLabel"
     FROM timetabled_lesson_courses tlc
     JOIN timetabled_lessons tl ON tl.id = tlc.timetabled_lesson_id
     JOIN period_definitions p  ON p.id  = tl.period_definition_id
     WHERE tlc.group_course_id = $1 AND tl.purpose = 'teaching'
       AND p.academic_year_id = (SELECT id FROM academic_years WHERE is_current)
     ORDER BY p.weekday, p.slot_order`,
    [groupCourseId],
  );
  return rows;
}

export interface ClassScheduleEntry extends ScheduleEntry {
  timetabledLessonId: number; // which of the class's slots this occurrence is in
  locked: boolean; // 13.5: pinned to its date — cascades flow around it
}

/** All bound occurrences for a class across ALL its weekly slots, date-ordered (map/planner source). */
export async function classSchedule(groupCourseId: number, fromDate: string, toDate: string): Promise<ClassScheduleEntry[]> {
  const { rows } = await pool.query<ClassScheduleEntry>(
    `SELECT to_char(o.date, 'YYYY-MM-DD') AS date, o.timetabled_lesson_id AS "timetabledLessonId",
            oc.lesson_plan_id AS "lessonPlanId", lp.title AS "planTitle",
            oc.stopping_point AS "stoppingPoint", lp.kit_needed AS "kitNeeded", oc.planner_locked AS locked,
            EXISTS (SELECT 1 FROM lesson_adaptations a
                    WHERE a.group_course_id = oc.group_course_id AND a.lesson_plan_id = oc.lesson_plan_id) AS adapted
     FROM occurrence_courses oc
     JOIN lesson_occurrences o ON o.id = oc.occurrence_id
     JOIN timetabled_lesson_courses tlc
       ON tlc.timetabled_lesson_id = o.timetabled_lesson_id AND tlc.group_course_id = oc.group_course_id
     LEFT JOIN lesson_plans lp ON lp.id = oc.lesson_plan_id
     WHERE oc.group_course_id = $1 AND o.date BETWEEN $2 AND $3
     ORDER BY o.date, o.timetabled_lesson_id`,
    [groupCourseId, fromDate, toDate],
  );
  return rows;
}

/** Lay a unit's lessons SEQUENTIALLY across a class's merged slot stream (3 slots/week ⇒ 3 lessons a
 *  week). `stream[i]` (date + which slot) receives lesson `i`. Stops when either runs out. */
export async function layLessonsAcrossClass(
  groupCourseId: number,
  lessons: Array<{ id: number; title: string }>,
  stream: Array<{ date: string; timetabledLessonId: number }>,
): Promise<LaidLesson[]> {
  const laid: LaidLesson[] = [];
  const n = Math.min(lessons.length, stream.length);
  for (let i = 0; i < n; i++) {
    const { date, timetabledLessonId } = stream[i]!;
    const lesson = lessons[i]!;
    const occId = await findOrCreateOccurrence(timetabledLessonId, date);
    const oc = (await getOccurrenceCourses(occId)).find((o) => Number(o.groupCourseId) === Number(groupCourseId));
    if (!oc) continue; // that slot no longer teaches this class — skip
    await setOccurrenceCoursePlan(oc.occurrenceCourseId, lesson.id);
    laid.push({ date, lessonPlanId: lesson.id, title: lesson.title });
  }
  return laid;
}

/** Phase 13.5: read the CURRENT plan bound at each position of a class's upcoming slot stream (null
 *  where nothing is bound yet) — the input the cascade maths rearranges. The `stream` comes from the
 *  pure `upcomingClassSlots`. One range query; positions keep the stream's order. */
export async function classPlacements(
  groupCourseId: number,
  stream: Array<{ date: string; timetabledLessonId: number }>,
): Promise<Placement[]> {
  if (!stream.length) return [];
  const bound = await classSchedule(groupCourseId, stream[0]!.date, stream[stream.length - 1]!.date);
  const byKey = new Map(bound.map((b) => [`${b.date}#${b.timetabledLessonId}`, b]));
  return stream.map((s) => {
    const e = byKey.get(`${s.date}#${s.timetabledLessonId}`);
    return {
      date: s.date,
      timetabledLessonId: s.timetabledLessonId,
      lessonPlanId: e?.lessonPlanId ?? null,
      locked: e?.locked ?? false,
    };
  });
}

/** Phase 13.5: pin/unpin a class's binding at one dated slot (so cascades flow around it). The
 *  occurrence must already exist (you can only lock something that's planned). Returns false if there
 *  is no occurrence_course for that class+slot+date. */
export async function setPlannerLock(groupCourseId: number, timetabledLessonId: number, date: string, locked: boolean): Promise<boolean> {
  const { rowCount } = await pool.query(
    `UPDATE occurrence_courses oc SET planner_locked = $4
     FROM lesson_occurrences o
     WHERE o.id = oc.occurrence_id AND oc.group_course_id = $1 AND o.timetabled_lesson_id = $2 AND o.date = $3`,
    [groupCourseId, timetabledLessonId, date, locked],
  );
  return (rowCount ?? 0) > 0;
}

/** Phase 13.5: persist the placements the cascade maths returned — bind (or clear, when null) each
 *  position's occurrence for this class. Creates occurrences on demand. Returns how many were written.
 *  BUG-021: the actual binding rewrite is ALL-OR-NOTHING. Occurrence/occurrence_course creation is
 *  idempotent and additive, so it stays outside the transaction (phase 1); the plan-binding UPDATEs that
 *  embody the cascade are then applied together in one transaction, serialised per class by an advisory
 *  lock — so a cascade can never be left half-applied (a crash/error rolls the whole shift back), and two
 *  concurrent planner writes for the same class queue rather than interleave. */
export async function applyPlacements(groupCourseId: number, changes: Placement[]): Promise<number> {
  // Phase 1 (idempotent): ensure each target occurrence_course exists and resolve its id.
  const updates: Array<{ ocId: number; planId: number | null }> = [];
  for (const c of changes) {
    const occId = await findOrCreateOccurrence(c.timetabledLessonId, c.date);
    const oc = (await getOccurrenceCourses(occId)).find((o) => Number(o.groupCourseId) === Number(groupCourseId));
    if (!oc) continue; // that slot no longer teaches this class
    updates.push({ ocId: oc.occurrenceCourseId, planId: c.lessonPlanId });
  }
  if (!updates.length) return 0;
  // Phase 2 (atomic): apply every binding change in one transaction.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`planner:${groupCourseId}`]);
    for (const u of updates) {
      await client.query(`UPDATE occurrence_courses SET lesson_plan_id = $2 WHERE id = $1`, [u.ocId, u.planId]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
  return updates.length;
}

/** C3 map drag-to-shift: move ONE lesson's binding between weeks of a slot+group. If the target week
 *  already holds a lesson the two SWAP; an empty target just receives it (source cleared). Returns
 *  false when there's nothing bound at `fromDate`. Callers must keep both dates today-or-future. */
export async function moveBinding(timetabledLessonId: number, groupCourseId: number, fromDate: string, toDate: string): Promise<boolean> {
  if (fromDate === toDate) return false;
  const fromOccId = await findOccurrence(timetabledLessonId, fromDate);
  if (fromOccId == null) return false;
  const fromOc = (await getOccurrenceCourses(fromOccId)).find((o) => Number(o.groupCourseId) === Number(groupCourseId));
  if (!fromOc || fromOc.lessonPlanId == null) return false;
  const movingPlan = fromOc.lessonPlanId;
  const toOccId = await findOrCreateOccurrence(timetabledLessonId, toDate);
  const toOc = (await getOccurrenceCourses(toOccId)).find((o) => Number(o.groupCourseId) === Number(groupCourseId));
  if (!toOc) return false;
  const displaced = toOc.lessonPlanId; // null when the target week was empty
  await setOccurrenceCoursePlan(toOc.occurrenceCourseId, movingPlan);
  await setOccurrenceCoursePlan(fromOc.occurrenceCourseId, displaced); // swap, or clear when empty
  return true;
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
