import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { applyPlacements, classPlacements, classSchedule, classSlots, getSlotWeekday, layLessonsAcrossClass, layLessonsIntoSlot, listAllSlots, listSlotsForCourse, moveBinding } from '../../src/repos/delivery';
import { findOrCreateOccurrence, getOccurrenceCourses } from '../../src/repos/occurrence';
import { setGroupCourse } from '../../src/repos/setup';
import { cascadeInsert, pullForward } from '../../src/services/delivery';
import { addDays, weekdayOf } from '../../src/lib/time';

// 5.4: laying a unit's lessons into a group's weekly slot. Uses a real slot (read-only) and a
// throwaway scheme; binds to far-future dates (2099) so the live calendar is never touched.
let slotLessonId = 0;
let groupCourseId = 0;
let courseId = 0;
let schemeId = 0;
let unitId = 0;
const planIds: number[] = [];
let dates: string[] = [];

function nextDatesOnWeekday(weekday: number, from: string, count: number): string[] {
  const out: string[] = [];
  let d = from;
  while (out.length < count) {
    if (weekdayOf(d) === weekday) out.push(d);
    d = addDays(d, 1);
  }
  return out;
}

describe('calendar lay-down (5.4 — integration, needs the dev DB up)', () => {
  beforeAll(async () => {
    // A real weekly teaching slot and its course/group_course.
    const slot = await pool.query<{ lessonId: number; groupCourseId: number; courseId: number }>(
      `SELECT tl.id AS "lessonId", gc.id AS "groupCourseId", gc.course_id AS "courseId"
       FROM timetabled_lesson_courses tlc
       JOIN timetabled_lessons tl ON tl.id = tlc.timetabled_lesson_id
       JOIN group_courses gc ON gc.id = tlc.group_course_id
       WHERE tl.purpose = 'teaching'
       ORDER BY tl.id LIMIT 1`,
    );
    slotLessonId = Number(slot.rows[0]!.lessonId);
    groupCourseId = Number(slot.rows[0]!.groupCourseId);
    courseId = Number(slot.rows[0]!.courseId);

    // Throwaway unit with three ordered lessons under that course.
    const s = await pool.query<{ id: number }>(
      `INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, 'TEST lay scheme', 97, false) RETURNING id`,
      [courseId],
    );
    schemeId = Number(s.rows[0]!.id);
    const u = await pool.query<{ id: number }>(
      `INSERT INTO units (scheme_id, title, display_order) VALUES ($1, 'TEST lay unit', 1) RETURNING id`,
      [schemeId],
    );
    unitId = Number(u.rows[0]!.id);
    for (const [i, t] of ['LAY-L1', 'LAY-L2', 'LAY-L3'].entries()) {
      const p = await pool.query<{ id: number }>(
        `INSERT INTO lesson_plans (unit_id, course_id, title, display_order) VALUES ($1, $2, $3, $4) RETURNING id`,
        [unitId, courseId, t, i + 1],
      );
      planIds.push(Number(p.rows[0]!.id));
    }
    const weekday = (await getSlotWeekday(slotLessonId))!;
    dates = nextDatesOnWeekday(weekday, '2099-06-01', 3);
  });

  afterAll(async () => {
    await pool.query(`UPDATE occurrence_courses SET lesson_plan_id = NULL WHERE lesson_plan_id = ANY($1)`, [planIds]);
    await pool.query(`DELETE FROM lesson_occurrences WHERE date = ANY($1)`, [dates]);
    await pool.query(`DELETE FROM lesson_plans WHERE id = ANY($1)`, [planIds]);
    await pool.query(`DELETE FROM units WHERE id = $1`, [unitId]);
    await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [schemeId]);
    await pool.end();
  });

  it('lists the weekly slots that teach a course', async () => {
    const slots = await listSlotsForCourse(courseId);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.some((s) => Number(s.lessonId) === slotLessonId && Number(s.groupCourseId) === groupCourseId)).toBe(true);
    const first = slots[0]!;
    expect(first.weekday).toBeGreaterThanOrEqual(1);
    expect(first.weekday).toBeLessThanOrEqual(5);
  });

  it('binds each lesson, in order, to the slot dates', async () => {
    const lessons = planIds.map((id, i) => ({ id, title: `LAY-L${i + 1}` }));
    const laid = await layLessonsIntoSlot(slotLessonId, groupCourseId, lessons, dates);
    expect(laid.length).toBe(3);
    expect(laid.map((l) => l.date)).toEqual(dates);
    // The occurrences exist and the right plan is on the right week, for the right group_course.
    const bound = await pool.query<{ date: string; lesson_plan_id: string }>(
      `SELECT to_char(o.date, 'YYYY-MM-DD') AS date, oc.lesson_plan_id
       FROM occurrence_courses oc JOIN lesson_occurrences o ON o.id = oc.occurrence_id
       WHERE oc.group_course_id = $1 AND o.date = ANY($2) ORDER BY o.date`,
      [groupCourseId, dates],
    );
    expect(bound.rows.map((r) => Number(r.lesson_plan_id))).toEqual(planIds);
  });

  it('lays down only what fits when dates run short', async () => {
    const lessons = planIds.map((id, i) => ({ id, title: `LAY-L${i + 1}` }));
    const laid = await layLessonsIntoSlot(slotLessonId, groupCourseId, lessons, dates.slice(0, 2));
    expect(laid.length).toBe(2);
  });

  it('re-laying overwrites the bindings (shifted start)', async () => {
    // Re-lay with the lessons reversed: the same weeks now point at the new order.
    const reversed = [...planIds].reverse().map((id) => ({ id, title: 't' }));
    const laid = await layLessonsIntoSlot(slotLessonId, groupCourseId, reversed, dates);
    expect(laid.length).toBe(3);
    const bound = await pool.query<{ lesson_plan_id: string }>(
      `SELECT oc.lesson_plan_id
       FROM occurrence_courses oc JOIN lesson_occurrences o ON o.id = oc.occurrence_id
       WHERE oc.group_course_id = $1 AND o.date = ANY($2) ORDER BY o.date`,
      [groupCourseId, dates],
    );
    expect(bound.rows.map((r) => Number(r.lesson_plan_id))).toEqual([...planIds].reverse());
  });

  it('drag-to-shift moves a lesson, swapping with an occupied target week (C3)', async () => {
    // state from the previous test: dates [0,1,2] hold [p3, p2, p1]. Move week 0 onto week 2 → swap.
    const moved = await moveBinding(slotLessonId, groupCourseId, dates[0]!, dates[2]!);
    expect(moved).toBe(true);
    const bound = await pool.query<{ lesson_plan_id: string }>(
      `SELECT oc.lesson_plan_id FROM occurrence_courses oc JOIN lesson_occurrences o ON o.id = oc.occurrence_id
       WHERE oc.group_course_id = $1 AND o.date = ANY($2) ORDER BY o.date`,
      [groupCourseId, dates],
    );
    // [p3,p2,p1] with weeks 0 and 2 swapped ⇒ [p1,p2,p3] (the original order)
    expect(bound.rows.map((r) => Number(r.lesson_plan_id))).toEqual(planIds);
    // nothing bound at the source date ⇒ refuses (returns false)
    await pool.query(`UPDATE occurrence_courses SET lesson_plan_id = NULL WHERE group_course_id = $1 AND occurrence_id = (SELECT id FROM lesson_occurrences WHERE timetabled_lesson_id = $2 AND date = $3)`, [groupCourseId, slotLessonId, dates[1]]);
    expect(await moveBinding(slotLessonId, groupCourseId, dates[1]!, dates[0]!)).toBe(false);
  });

  it('classSlots returns ALL of a class\'s weekly slots — multi-slot for GCSE (13.1)', async () => {
    // the class with the most weekly teaching slots (a GCSE/Post-16 class has 3)
    const top = await pool.query<{ gc: string; n: string }>(
      `SELECT tlc.group_course_id AS gc, count(*) AS n
       FROM timetabled_lesson_courses tlc JOIN timetabled_lessons tl ON tl.id = tlc.timetabled_lesson_id
       WHERE tl.purpose = 'teaching'
       GROUP BY tlc.group_course_id ORDER BY n DESC, gc LIMIT 1`,
    );
    const gc = Number(top.rows[0]!.gc);
    const n = Number(top.rows[0]!.n);
    const slots = await classSlots(gc);
    expect(slots.length).toBe(n);
    expect(new Set(slots.map((s) => s.timetabledLessonId)).size).toBe(n); // distinct weekly periods
    expect(n).toBeGreaterThanOrEqual(2); // confirms multi-lesson-per-week classes exist in the data
  });

  it('deactivating a group_course drops it from forward slot lists but keeps historic occurrences (BUG-023)', async () => {
    const gid = Number((await pool.query<{ group_id: number }>(`SELECT group_id FROM group_courses WHERE id = $1`, [groupCourseId])).rows[0]!.group_id);
    const HIST = '2099-07-06';
    const FUTURE = '2099-07-13';
    // active → present in the course's slot list, and a materialised occurrence carries it (historic record)
    expect((await listSlotsForCourse(courseId)).some((s) => Number(s.groupCourseId) === groupCourseId)).toBe(true);
    const histOcc = await findOrCreateOccurrence(slotLessonId, HIST);
    expect((await getOccurrenceCourses(histOcc)).some((o) => Number(o.groupCourseId) === groupCourseId)).toBe(true);
    try {
      await setGroupCourse(gid, courseId, false);
      // forward-planning slot lists no longer surface the deactivated class
      expect((await listSlotsForCourse(courseId)).some((s) => Number(s.groupCourseId) === groupCourseId)).toBe(false);
      expect((await listAllSlots()).some((s) => Number(s.groupCourseId) === groupCourseId)).toBe(false);
      // a NEW occurrence opened after deactivation does NOT revive it…
      const futureOcc = await findOrCreateOccurrence(slotLessonId, FUTURE);
      expect((await getOccurrenceCourses(futureOcc)).some((o) => Number(o.groupCourseId) === groupCourseId)).toBe(false);
      // …but the historic occurrence_course (created while active) is preserved
      expect((await getOccurrenceCourses(histOcc)).some((o) => Number(o.groupCourseId) === groupCourseId)).toBe(true);
    } finally {
      await setGroupCourse(gid, courseId, true); // restore for the other tests + real data
      await pool.query(`DELETE FROM lesson_occurrences WHERE timetabled_lesson_id = $1 AND date = ANY($2)`, [slotLessonId, [HIST, FUTURE]]);
    }
  });

  it('layLessonsAcrossClass binds the stream and classSchedule reads it back, date-ordered (13.1)', async () => {
    const lessons = planIds.map((id, i) => ({ id, title: `LAY-L${i + 1}` }));
    const stream = dates.map((d) => ({ date: d, timetabledLessonId: slotLessonId }));
    const laid = await layLessonsAcrossClass(groupCourseId, lessons, stream);
    expect(laid.map((l) => l.date)).toEqual(dates);
    const sched = await classSchedule(groupCourseId, dates[0]!, dates[2]!);
    expect(sched.map((e) => e.lessonPlanId)).toEqual(planIds);
    expect(sched.every((e) => e.timetabledLessonId === slotLessonId)).toBe(true);
  });

  it('cascadeInsert "all move along one" then pullForward, round-tripped through the DB (13.5)', async () => {
    const weekday = (await getSlotWeekday(slotLessonId))!;
    const four = nextDatesOnWeekday(weekday, '2099-06-01', 4); // three filled positions + a trailing gap
    const stream = four.map((d) => ({ date: d, timetabledLessonId: slotLessonId }));
    const p4 = Number(
      (await pool.query<{ id: number }>(`INSERT INTO lesson_plans (unit_id, course_id, title, display_order) VALUES ($1, $2, 'LAY-L4', 4) RETURNING id`, [unitId, courseId])).rows[0]!.id,
    );
    try {
      // seed: p1,p2,p3 at the first three weeks, the fourth empty
      await applyPlacements(
        groupCourseId,
        planIds.map((id, i) => ({ date: four[i]!, timetabledLessonId: slotLessonId, lessonPlanId: id })),
      );
      const before = await classPlacements(groupCourseId, stream);
      expect(before.map((p) => p.lessonPlanId)).toEqual([planIds[0], planIds[1], planIds[2], null]);

      // drop p4 at the front → everything shifts along one into the trailing gap
      await applyPlacements(groupCourseId, cascadeInsert(before, 0, p4));
      const after = await classPlacements(groupCourseId, stream);
      expect(after.map((p) => p.lessonPlanId)).toEqual([p4, planIds[0], planIds[1], planIds[2]]);

      // pull the front back out → the gap closes again (inverse)
      await applyPlacements(groupCourseId, pullForward(after, 0));
      const closed = await classPlacements(groupCourseId, stream);
      expect(closed.map((p) => p.lessonPlanId)).toEqual([planIds[0], planIds[1], planIds[2], null]);
    } finally {
      await pool.query(
        `UPDATE occurrence_courses SET lesson_plan_id = NULL WHERE group_course_id = $1
         AND occurrence_id IN (SELECT id FROM lesson_occurrences WHERE timetabled_lesson_id = $2 AND date = ANY($3))`,
        [groupCourseId, slotLessonId, four],
      );
      await pool.query(`DELETE FROM lesson_occurrences WHERE date = ANY($1)`, [four]);
      await pool.query(`DELETE FROM lesson_plans WHERE id = $1`, [p4]);
    }
  });
});
