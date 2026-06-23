// Per-date "is this lesson ready to teach?" status for the timetable dots. Computed for the week on
// show, for the teacher's OWN teaching lessons, from cheap aggregate queries plus a bounded scan of the
// week's already-bound resources. Three independent signals (a lesson can raise more than one):
//   🔴 noScheme  — the course has no active scheme of work (it should be planned into one)
//   🟣 noPlan    — no fully-developed plan is bound for THIS date (no plan, or one missing objectives/outline)
//   🔵 needsEdit — a resource bound to this date's plan still has an image placeholder to fill in
import { pool } from '../db/pool';
import { readStored } from '../lib/resourceStore';
import { findImagePlaceholders } from '../lib/worksheetForm';

export interface LessonReadiness {
  noScheme: boolean;
  noPlan: boolean;
  needsEdit: boolean;
}

/** key = `${date}:${lessonId}`; only present for a teaching lesson with at least one issue. */
export async function weekReadiness(weekDates: string[]): Promise<Map<string, LessonReadiness>> {
  const out = new Map<string, LessonReadiness>();
  if (!weekDates.length) return out;

  // A — the teacher's own teaching lessons → their group-courses + courses (current year structure).
  const { rows: lc } = await pool.query<{ lessonId: number; courseId: number; groupCourseId: number }>(
    `SELECT tl.id AS "lessonId", gc.course_id AS "courseId", gc.id AS "groupCourseId"
     FROM timetabled_lessons tl
     JOIN staff st ON st.id = tl.staff_id AND st.is_self
     JOIN timetabled_lesson_courses tlc ON tlc.timetabled_lesson_id = tl.id
     JOIN group_courses gc ON gc.id = tlc.group_course_id
     JOIN period_definitions p ON p.id = tl.period_definition_id
     WHERE tl.purpose = 'teaching' AND tl.active
       AND p.academic_year_id = (SELECT id FROM academic_years WHERE is_current)`,
  );
  if (!lc.length) return out;
  const lessonCourses = new Map<number, Array<{ courseId: number; groupCourseId: number }>>();
  for (const r of lc) {
    const arr = lessonCourses.get(r.lessonId) ?? [];
    arr.push({ courseId: r.courseId, groupCourseId: r.groupCourseId });
    lessonCourses.set(r.lessonId, arr);
  }

  // B — courses that already have an active scheme of work.
  const { rows: sch } = await pool.query<{ courseId: number }>(
    `SELECT DISTINCT course_id AS "courseId" FROM schemes_of_work WHERE active`,
  );
  const schemed = new Set(sch.map((r) => r.courseId));

  // C — developed plans bound per (date, lesson, group-course) across the week's occurrences.
  const { rows: bound } = await pool.query<{ date: string; lessonId: number; groupCourseId: number; lessonPlanId: number | null; developed: boolean }>(
    `SELECT to_char(o.date,'YYYY-MM-DD') AS date, o.timetabled_lesson_id AS "lessonId",
            oc.group_course_id AS "groupCourseId", oc.lesson_plan_id AS "lessonPlanId",
            (lp.objectives IS NOT NULL AND btrim(lp.objectives) <> ''
             AND lp.outline IS NOT NULL AND btrim(lp.outline) <> '') AS developed
     FROM lesson_occurrences o
     JOIN occurrence_courses oc ON oc.occurrence_id = o.id
     LEFT JOIN lesson_plans lp ON lp.id = oc.lesson_plan_id
     WHERE o.date = ANY($1) AND NOT o.is_test /* TEST-LAB-GUARD */`,
    [weekDates],
  );
  const developedGC = new Map<string, Set<number>>(); // `${date}:${lessonId}` → group-courses with a developed plan
  const boundPlanIds = new Set<number>();
  for (const r of bound) {
    if (r.lessonPlanId != null) boundPlanIds.add(r.lessonPlanId);
    if (r.developed && r.lessonPlanId != null) {
      const key = `${r.date}:${r.lessonId}`;
      (developedGC.get(key) ?? developedGC.set(key, new Set()).get(key)!).add(r.groupCourseId);
    }
  }

  // D — which bound plans still carry an image placeholder (blue). Bounded by the week's bound plans.
  const planNeedsEdit = new Set<number>();
  if (boundPlanIds.size) {
    const { rows: res } = await pool.query<{ lessonPlanId: number; storagePath: string }>(
      `SELECT DISTINCT rl.lesson_plan_id AS "lessonPlanId", v.storage_path AS "storagePath"
       FROM resource_links rl
       JOIN resources r ON r.id = rl.resource_id AND r.active
       JOIN resource_versions v ON v.id = r.current_version_id
       WHERE rl.lesson_plan_id = ANY($1)`,
      [[...boundPlanIds]],
    );
    await Promise.all(
      res.map(async (row) => {
        if (planNeedsEdit.has(row.lessonPlanId)) return;
        try {
          const buf = await readStored(row.storagePath);
          if (findImagePlaceholders(buf.toString('utf8')).length) planNeedsEdit.add(row.lessonPlanId);
        } catch {
          /* a missing file is not a readiness signal */
        }
      }),
    );
  }
  const lessonNeedsEdit = new Set<string>();
  for (const r of bound) {
    if (r.lessonPlanId != null && planNeedsEdit.has(r.lessonPlanId)) lessonNeedsEdit.add(`${r.date}:${r.lessonId}`);
  }

  // Compose per (date, lesson). A lesson with all its courses developed + schemed + edited is omitted.
  for (const date of weekDates) {
    for (const [lessonId, courses] of lessonCourses) {
      const key = `${date}:${lessonId}`;
      const noScheme = courses.some((c) => !schemed.has(c.courseId));
      const dev = developedGC.get(key);
      const noPlan = courses.some((c) => !dev || !dev.has(c.groupCourseId));
      const needsEdit = lessonNeedsEdit.has(key);
      if (noScheme || noPlan || needsEdit) out.set(key, { noScheme, noPlan, needsEdit });
    }
  }
  return out;
}
