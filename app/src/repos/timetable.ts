// SQL access for the timetable. Thin functions over pg (no ORM), matching the
// exam_questions convention. The current build seeds a single academic year, so
// every timetabled lesson is current; a year filter joins via groups when needed.
import { pool } from '../db/pool';
import type { LessonRow, PeriodRow } from '../services/timetable';

export async function getPeriodDefinitions(): Promise<PeriodRow[]> {
  const { rows } = await pool.query<PeriodRow>(`
    SELECT weekday,
           slot_order   AS "slotOrder",
           slot_type    AS "slotType",
           label,
           lesson_index AS "lessonIndex",
           to_char(start_time, 'HH24:MI') AS start,
           to_char(end_time,   'HH24:MI') AS "end",
           teachable
    FROM period_definitions
    ORDER BY weekday, slot_order
  `);
  return rows;
}

export async function getTimetabledLessons(): Promise<LessonRow[]> {
  const { rows } = await pool.query<LessonRow>(`
    SELECT tl.id        AS "lessonId",
           tl.purpose,
           p.weekday,
           p.slot_order AS "slotOrder",
           s.is_self    AS "isSelf",
           s.name       AS "staffName",
           g.name       AS "groupName",
           COALESCE(
             json_agg(json_build_object('name', c.name, 'colour', c.colour) ORDER BY c.name)
               FILTER (WHERE c.id IS NOT NULL),
             '[]'
           ) AS courses
    FROM timetabled_lessons tl
    JOIN period_definitions p ON p.id = tl.period_definition_id
    JOIN staff s              ON s.id = tl.staff_id
    LEFT JOIN groups g                     ON g.id  = tl.group_id
    LEFT JOIN timetabled_lesson_courses tlc ON tlc.timetabled_lesson_id = tl.id
    LEFT JOIN group_courses gc             ON gc.id = tlc.group_course_id
    LEFT JOIN courses c                    ON c.id  = gc.course_id
    GROUP BY tl.id, p.weekday, p.slot_order, s.is_self, s.name, g.name
    ORDER BY p.weekday, p.slot_order
  `);
  return rows;
}
