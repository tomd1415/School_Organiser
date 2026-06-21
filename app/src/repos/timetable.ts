// SQL access for the timetable. Thin functions over pg (no ORM), matching the
// exam_questions convention. The current build seeds a single academic year, so
// every timetabled lesson is current; a year filter joins via groups when needed.
import { pool } from '../db/pool';
import type { LessonRow, PeriodRow } from '../services/timetable';
import type { TermDate } from '../services/clock';

// Year-scoped (6.1): no year given ⇒ the current year. Editors pass a specific year so next
// September can be built in advance without touching the live timetable.
const CURRENT_YEAR = `(SELECT id FROM academic_years WHERE is_current)`;

export async function getPeriodDefinitions(yearId?: number): Promise<PeriodRow[]> {
  const { rows } = await pool.query<PeriodRow>(
    `SELECT weekday,
           slot_order   AS "slotOrder",
           slot_type    AS "slotType",
           label,
           lesson_index AS "lessonIndex",
           to_char(start_time, 'HH24:MI') AS start,
           to_char(end_time,   'HH24:MI') AS "end",
           teachable
    FROM period_definitions
    WHERE academic_year_id = COALESCE($1, ${CURRENT_YEAR})
    ORDER BY weekday, slot_order`,
    [yearId ?? null],
  );
  return rows;
}

export interface LessonSlot {
  lessonId: number;
  purpose: string;
  label: string;
  start: string;
  end: string;
  weekday: number;
  groupName: string | null;
}

/** One timetabled slot's period info — for the free-period screen, which has no occurrence to read. */
export async function getLessonSlot(lessonId: number): Promise<LessonSlot | null> {
  const { rows } = await pool.query<LessonSlot>(
    `SELECT tl.id AS "lessonId", tl.purpose, p.label, p.weekday,
            to_char(COALESCE(tl.start_time, p.start_time), 'HH24:MI') AS start,
            to_char(COALESCE(tl.end_time, p.end_time), 'HH24:MI') AS "end",
            g.name AS "groupName"
     FROM timetabled_lessons tl
     JOIN period_definitions p ON p.id = tl.period_definition_id
     LEFT JOIN groups g ON g.id = tl.group_id
     WHERE tl.id = $1`,
    [lessonId],
  );
  return rows[0] ?? null;
}

export async function getTimetabledLessons(yearId?: number): Promise<LessonRow[]> {
  const { rows } = await pool.query<LessonRow>(
    `SELECT tl.id        AS "lessonId",
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
    WHERE p.academic_year_id = COALESCE($1, ${CURRENT_YEAR})
    GROUP BY tl.id, p.weekday, p.slot_order, s.is_self, s.name, g.name
    ORDER BY p.weekday, p.slot_order`,
    [yearId ?? null],
  );
  return rows;
}

// Every term-date overlay across all years (term / half_term / holiday / inset). The timetable uses
// these to grey out non-teaching days; spanning all years means a week viewed in any year classifies
// correctly (including the Aug→Sep boundary week).
export async function getTermDatesAll(): Promise<TermDate[]> {
  const { rows } = await pool.query<TermDate>(
    `SELECT to_char(start_date, 'YYYY-MM-DD') AS "startDate",
            to_char(end_date,   'YYYY-MM-DD') AS "endDate", kind, name
     FROM term_dates`,
  );
  return rows;
}
