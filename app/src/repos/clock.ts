// SQL the Now screen needs: the clock context (periods + term dates + tz) and the
// self lesson sitting in a given weekday/slot.
import { pool } from '../db/pool';
import { toMinutes } from '../lib/time';
import type { PeriodDefinition, TermDate } from '../services/clock';

export interface NowLesson {
  lessonId: number;
  purpose: string;
  groupName: string | null;
  roomName: string | null;
  courses: Array<{ name: string; colour: string | null }>;
}

export async function getClockContext(): Promise<{ periods: PeriodDefinition[]; terms: TermDate[]; tz: string }> {
  const periodsRes = await pool.query<{
    weekday: number;
    slotOrder: number;
    slotType: string;
    label: string;
    lessonIndex: number | null;
    start: string;
    end: string;
    teachable: boolean;
  }>(
    `SELECT weekday, slot_order AS "slotOrder", slot_type AS "slotType", label,
            lesson_index AS "lessonIndex",
            to_char(start_time, 'HH24:MI') AS start, to_char(end_time, 'HH24:MI') AS "end", teachable
     FROM period_definitions`,
  );
  const periods: PeriodDefinition[] = periodsRes.rows.map((p) => ({
    weekday: p.weekday,
    slotOrder: p.slotOrder,
    slotType: p.slotType,
    label: p.label,
    lessonIndex: p.lessonIndex,
    startMin: toMinutes(p.start),
    endMin: toMinutes(p.end),
    teachable: p.teachable,
  }));

  const termsRes = await pool.query<TermDate>(
    `SELECT to_char(start_date, 'YYYY-MM-DD') AS "startDate",
            to_char(end_date,   'YYYY-MM-DD') AS "endDate", kind, name
     FROM term_dates`,
  );

  const tzRes = await pool.query<{ value: string }>(`SELECT value FROM settings WHERE key = 'timezone'`);
  const tz = tzRes.rows[0]?.value ?? 'Europe/London';

  return { periods, terms: termsRes.rows, tz };
}

export async function getSelfLessonAt(weekday: number, slotOrder: number): Promise<NowLesson | null> {
  const { rows } = await pool.query<NowLesson>(
    `SELECT tl.id AS "lessonId", tl.purpose, g.name AS "groupName", r.name AS "roomName",
            COALESCE(
              json_agg(json_build_object('name', c.name, 'colour', c.colour) ORDER BY c.name)
                FILTER (WHERE c.id IS NOT NULL),
              '[]'
            ) AS courses
     FROM timetabled_lessons tl
     JOIN period_definitions p ON p.id = tl.period_definition_id
     JOIN staff s              ON s.id = tl.staff_id AND s.is_self
     LEFT JOIN groups g        ON g.id = tl.group_id
     LEFT JOIN rooms r         ON r.id = tl.room_id
     LEFT JOIN timetabled_lesson_courses tlc ON tlc.timetabled_lesson_id = tl.id
     LEFT JOIN group_courses gc ON gc.id = tlc.group_course_id
     LEFT JOIN courses c        ON c.id = gc.course_id
     WHERE p.weekday = $1 AND p.slot_order = $2
     GROUP BY tl.id, g.name, r.name
     LIMIT 1`,
    [weekday, slotOrder],
  );
  return rows[0] ?? null;
}
