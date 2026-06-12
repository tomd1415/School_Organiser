// Idempotent seed of the real timetable (docs/PHASE_1_PLAN.md §3). Re-runnable:
// every row upserts on a natural key, so running twice converges. Safe to re-run
// after the year rolls over (it just updates the same rows).
import { pool } from '../db/pool';
import {
  ACADEMIC_YEARS,
  TERM_DATES,
  ROOMS,
  STAFF,
  COURSES,
  GROUPS,
  GRID,
  OVERSEEN,
  SETTINGS,
  EXPECTED,
  buildPeriodDefinitions,
} from './data';
import { PREP_TEMPLATE_DEFAULTS } from '../services/prep';

function req<T>(v: T | undefined, what: string): T {
  if (v === undefined) throw new Error(`seed: missing reference: ${what}`);
  return v;
}

function idOf(result: { rows: Array<{ id: number }> }): number {
  const row = result.rows[0];
  if (!row) throw new Error('seed: expected a RETURNING row');
  return row.id;
}

async function main(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── academic years ──
    const yearId = new Map<string, number>();
    for (const y of ACADEMIC_YEARS) {
      yearId.set(
        y.name,
        idOf(
          await client.query<{ id: number }>(
            `INSERT INTO academic_years (name, start_date, end_date, is_current) VALUES ($1,$2,$3,$4)
             ON CONFLICT (name) DO UPDATE SET start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date, is_current=EXCLUDED.is_current
             RETURNING id`,
            [y.name, y.startDate, y.endDate, y.isCurrent],
          ),
        ),
      );
    }
    const currentYear = req(
      ACADEMIC_YEARS.find((y) => y.isCurrent),
      'a current academic year',
    );
    const currentYearId = req(yearId.get(currentYear.name), currentYear.name);

    // ── term dates ──
    for (const t of TERM_DATES) {
      await client.query(
        `INSERT INTO term_dates (academic_year_id, name, start_date, end_date, kind) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (academic_year_id, name) DO UPDATE SET start_date=EXCLUDED.start_date, end_date=EXCLUDED.end_date, kind=EXCLUDED.kind`,
        [req(yearId.get(t.year), t.year), t.name, t.start, t.end, t.kind],
      );
    }

    // ── rooms ──
    const roomId = new Map<string, number>();
    for (const name of ROOMS) {
      roomId.set(
        name,
        idOf(
          await client.query<{ id: number }>(
            `INSERT INTO rooms (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
            [name],
          ),
        ),
      );
    }
    const u1 = req(roomId.get('U1'), 'room U1');

    // ── staff ──
    const staffId = new Map<string, number>();
    for (const s of STAFF) {
      staffId.set(
        s.name,
        idOf(
          await client.query<{ id: number }>(
            `INSERT INTO staff (name, role, is_self) VALUES ($1,$2,$3)
             ON CONFLICT (name) DO UPDATE SET role=EXCLUDED.role, is_self=EXCLUDED.is_self RETURNING id`,
            [s.name, s.role, s.isSelf],
          ),
        ),
      );
    }
    const selfId = req(staffId.get('Me'), 'self staff');
    const otherId = req(staffId.get('Other teacher'), 'overseeing staff');

    // ── courses ──
    const courseId = new Map<string, number>();
    for (const c of COURSES) {
      courseId.set(
        c.name,
        idOf(
          await client.query<{ id: number }>(
            `INSERT INTO courses (name, key_stage, qualification, exam_board, colour) VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (name) DO UPDATE SET key_stage=EXCLUDED.key_stage, qualification=EXCLUDED.qualification, exam_board=EXCLUDED.exam_board, colour=EXCLUDED.colour
             RETURNING id`,
            [c.name, c.keyStage, c.qualification ?? null, c.examBoard ?? null, c.colour],
          ),
        ),
      );
    }

    // ── period definitions ── (key by L:weekday:lessonIndex and S:weekday:slotType)
    const periodId = new Map<string, number>();
    for (const p of buildPeriodDefinitions()) {
      const id = idOf(
        await client.query<{ id: number }>(
          `INSERT INTO period_definitions (weekday, slot_order, slot_type, label, lesson_index, start_time, end_time, teachable, academic_year_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (academic_year_id, weekday, slot_order) DO UPDATE SET slot_type=EXCLUDED.slot_type, label=EXCLUDED.label, lesson_index=EXCLUDED.lesson_index, start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time, teachable=EXCLUDED.teachable
           RETURNING id`,
          [p.weekday, p.slotOrder, p.slotType, p.label, p.lessonIndex, p.start, p.end, p.teachable, currentYearId],
        ),
      );
      if (p.lessonIndex != null) periodId.set(`L:${p.weekday}:${p.lessonIndex}`, id);
      else periodId.set(`S:${p.weekday}:${p.slotType}`, id);
    }

    // ── groups (attached to the current year) ──
    const groupId = new Map<string, number>();
    for (const g of GROUPS) {
      groupId.set(
        g.name,
        idOf(
          await client.query<{ id: number }>(
            `INSERT INTO groups (name, year_group, academic_year_id, default_room_id) VALUES ($1,$2,$3,$4)
             ON CONFLICT (academic_year_id, name) DO UPDATE SET year_group=EXCLUDED.year_group, default_room_id=EXCLUDED.default_room_id RETURNING id`,
            [g.name, g.yearGroup, currentYearId, u1],
          ),
        ),
      );
    }

    // ── group_courses (derived from the grid + overseen, counting lessons/week) ──
    const gcCount = new Map<string, number>();
    const bump = (group: string, course: string) => {
      const key = `${group}|${course}`;
      gcCount.set(key, (gcCount.get(key) ?? 0) + 1);
    };
    for (let weekday = 1; weekday <= 5; weekday++) {
      for (const cell of req(GRID[weekday], `grid weekday ${weekday}`)) {
        if (cell.kind === 'teach') for (const c of cell.courses) bump(cell.group, c);
      }
    }
    for (const o of OVERSEEN) bump(o.group, o.course);

    const groupCourseId = new Map<string, number>();
    for (const [key, count] of gcCount) {
      const [group, course] = key.split('|');
      groupCourseId.set(
        key,
        idOf(
          await client.query<{ id: number }>(
            `INSERT INTO group_courses (group_id, course_id, lessons_per_week) VALUES ($1,$2,$3)
             ON CONFLICT (group_id, course_id) DO UPDATE SET lessons_per_week=EXCLUDED.lessons_per_week RETURNING id`,
            [req(groupId.get(req(group, 'group')), `group ${group}`), req(courseId.get(req(course, 'course')), `course ${course}`), count],
          ),
        ),
      );
    }

    // ── timetabled lessons + their courses ──
    const upsertLesson = async (
      pid: number,
      purpose: string,
      group: number | null,
      staff: number,
      room: number | null,
    ): Promise<number> =>
      idOf(
        await client.query<{ id: number }>(
          `INSERT INTO timetabled_lessons (period_definition_id, purpose, group_id, room_id, staff_id) VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (period_definition_id, staff_id) DO UPDATE SET purpose=EXCLUDED.purpose, group_id=EXCLUDED.group_id, room_id=EXCLUDED.room_id RETURNING id`,
          [pid, purpose, group, room, staff],
        ),
      );
    const linkCourse = async (lessonId: number, gcKey: string): Promise<void> => {
      await client.query(
        `INSERT INTO timetabled_lesson_courses (timetabled_lesson_id, group_course_id) VALUES ($1,$2)
         ON CONFLICT (timetabled_lesson_id, group_course_id) DO NOTHING`,
        [lessonId, req(groupCourseId.get(gcKey), gcKey)],
      );
    };

    for (let weekday = 1; weekday <= 5; weekday++) {
      const cells = req(GRID[weekday], `grid weekday ${weekday}`);
      for (let i = 0; i < cells.length; i++) {
        const cell = req(cells[i], `cell ${weekday}:${i}`);
        const pid = req(periodId.get(`L:${weekday}:${i + 1}`), `period L:${weekday}:${i + 1}`);
        if (cell.kind === 'free') {
          await upsertLesson(pid, 'free', null, selfId, null);
        } else if (cell.kind === 'form') {
          await upsertLesson(pid, 'form', req(groupId.get(cell.group), cell.group), selfId, u1);
        } else {
          const lid = await upsertLesson(pid, 'teaching', req(groupId.get(cell.group), cell.group), selfId, u1);
          for (const c of cell.courses) await linkCourse(lid, `${cell.group}|${c}`);
        }
      }
      // daily non-lesson commitments
      await upsertLesson(req(periodId.get(`S:${weekday}:form_am`), 'form_am'), 'form', req(groupId.get('9TDU'), '9TDU'), selfId, u1);
      await upsertLesson(req(periodId.get(`S:${weekday}:break`), 'break'), 'open_room', null, selfId, u1);
      await upsertLesson(req(periodId.get(`S:${weekday}:lunch`), 'lunch'), 'club', null, selfId, u1);
    }

    for (const o of OVERSEEN) {
      const pid = req(periodId.get(`L:${o.weekday}:${o.lessonIndex}`), `period L:${o.weekday}:${o.lessonIndex}`);
      const lid = await upsertLesson(pid, 'teaching', req(groupId.get(o.group), o.group), otherId, u1);
      await linkCourse(lid, `${o.group}|${o.course}`);
    }

    // ── settings ──
    const settingsRows: Array<[string, string]> = [
      ['timezone', 'Europe/London'],
      ['current_academic_year_id', String(currentYearId)],
      ['default_arrival', SETTINGS.default_arrival],
      ['default_leave', SETTINGS.default_leave],
      ['target_leave', SETTINGS.target_leave],
    ];
    for (const [k, v] of settingsRows) {
      await client.query(
        `INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`,
        [k, v],
      );
    }

    // prep templates (global "before the bell")
    for (const text of PREP_TEMPLATE_DEFAULTS) {
      await client.query(
        `INSERT INTO prep_templates (scope, text) SELECT 'global', $1
         WHERE NOT EXISTS (SELECT 1 FROM prep_templates WHERE scope = 'global' AND text = $1)`,
        [text],
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // ── integrity summary (compared against the typed EXPECTED) ──
  const { rows } = await pool.query<Record<string, number>>(`
    SELECT
      (SELECT count(*)::int FROM academic_years) AS "academicYears",
      (SELECT count(*)::int FROM academic_years WHERE is_current) AS "currentYears",
      (SELECT count(*)::int FROM term_dates) AS "termDates",
      (SELECT count(*)::int FROM period_definitions) AS periods,
      (SELECT count(*)::int FROM courses) AS courses,
      (SELECT count(*)::int FROM groups) AS groups,
      (SELECT count(*)::int FROM group_courses) AS "groupCourses",
      (SELECT count(*)::int FROM timetabled_lessons) AS "timetabledLessons",
      (SELECT count(*)::int FROM timetabled_lessons tl
         JOIN period_definitions p ON p.id = tl.period_definition_id
         JOIN staff s ON s.id = tl.staff_id
        WHERE p.slot_type = 'lesson' AND s.is_self) AS "selfLessonSlots",
      (SELECT count(*)::int FROM timetabled_lessons WHERE purpose = 'teaching') AS teaching,
      (SELECT count(*)::int FROM timetabled_lessons WHERE purpose = 'free') AS free,
      (SELECT count(*)::int FROM timetabled_lesson_courses) AS "lessonCourses"
  `);
  const actual = rows[0];
  if (!actual) throw new Error('seed: integrity query returned no row');
  const mismatches: string[] = [];
  for (const [key, want] of Object.entries(EXPECTED)) {
    const got = actual[key];
    const mark = got === want ? 'ok' : 'MISMATCH';
    if (got !== want) mismatches.push(`${key}: expected ${want}, got ${got}`);
    console.log(`  ${mark.padEnd(8)} ${key.padEnd(20)} ${got}`);
  }
  await pool.end();
  if (mismatches.length) {
    console.error(`\nseed integrity FAILED:\n  ${mismatches.join('\n  ')}`);
    process.exit(1);
  }
  console.log('\nseed complete — integrity OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
