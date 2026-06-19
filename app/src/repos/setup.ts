// Phase 6.2: SQL for the Setup editors — academic years, terms, day shapes, rooms, staff,
// courses, groups and enrolments. Everything the seed used to hard-code becomes editable.
// Year-scoped editors always take an explicit academic_year_id so next September can be built
// as a draft alongside the live year.
import { pool } from '../db/pool';

// ── academic years ───────────────────────────────────────────────────────────────────────────

export interface YearRow {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export async function listYears(): Promise<YearRow[]> {
  const { rows } = await pool.query<YearRow>(
    `SELECT id, name, to_char(start_date,'YYYY-MM-DD') AS "startDate",
            to_char(end_date,'YYYY-MM-DD') AS "endDate", is_current AS "isCurrent"
     FROM academic_years ORDER BY start_date`,
  );
  return rows;
}

export async function getCurrentYearId(): Promise<number | null> {
  const { rows } = await pool.query<{ id: number }>(`SELECT id FROM academic_years WHERE is_current`);
  return rows[0]?.id ?? null;
}

export async function createYear(name: string, startDate: string, endDate: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO academic_years (name, start_date, end_date, is_current)
     VALUES ($1,$2,$3, NOT EXISTS (SELECT 1 FROM academic_years)) RETURNING id`,
    [name.slice(0, 50), startDate, endDate],
  );
  return rows[0]!.id;
}

export async function updateYearField(id: number, field: string, value: string): Promise<boolean> {
  const col = ({ name: 'name', start_date: 'start_date', end_date: 'end_date' } as Record<string, string>)[field];
  if (!col) return false;
  await pool.query(`UPDATE academic_years SET ${col} = $2 WHERE id = $1`, [id, value]);
  return true;
}

/** Go live: exactly one current year. Validates + locks the target FIRST, so a stale/forged/deleted id
 *  aborts without clearing the current flag — we never commit a state with no current year (BUG-024).
 *  Returns false if the id does not exist. (At-most-one is enforced by the partial unique index.) */
export async function makeYearCurrent(id: number): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT 1 FROM academic_years WHERE id = $1 FOR UPDATE', [id]);
    if (found.rowCount === 0) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query(`UPDATE academic_years SET is_current = false WHERE is_current`);
    await client.query(`UPDATE academic_years SET is_current = true WHERE id = $1`, [id]);
    await client.query('COMMIT');
    return true;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ── term dates ───────────────────────────────────────────────────────────────────────────────

export interface TermRow {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  kind: string;
}

export async function listTerms(yearId: number): Promise<TermRow[]> {
  const { rows } = await pool.query<TermRow>(
    `SELECT id, name, to_char(start_date,'YYYY-MM-DD') AS "startDate",
            to_char(end_date,'YYYY-MM-DD') AS "endDate", kind
     FROM term_dates WHERE academic_year_id = $1 ORDER BY start_date`,
    [yearId],
  );
  return rows;
}

// Recurring names are fine (multiple INSET days, three "Half term"s); only an exact (name + start
// date) duplicate is rejected — returned as null so the route can say so instead of erroring out.
export async function createTerm(yearId: number, name: string, startDate: string, endDate: string, kind: string): Promise<number | null> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO term_dates (academic_year_id, name, start_date, end_date, kind) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (academic_year_id, name, start_date) DO NOTHING RETURNING id`,
    [yearId, name.slice(0, 100), startDate, endDate, kind],
  );
  return rows[0]?.id ?? null;
}

export async function updateTermField(id: number, field: string, value: string): Promise<boolean> {
  const col = ({ name: 'name', start_date: 'start_date', end_date: 'end_date', kind: 'kind' } as Record<string, string>)[field];
  if (!col) return false;
  try {
    await pool.query(`UPDATE term_dates SET ${col} = $2 WHERE id = $1`, [id, value]);
    return true;
  } catch (e) {
    if ((e as { code?: string }).code === '23505') return false; // an exact (name + start date) duplicate — soft-fail, no crash
    throw e;
  }
}

export async function deleteTerm(id: number): Promise<void> {
  await pool.query(`DELETE FROM term_dates WHERE id = $1`, [id]);
}

// ── day shape (period definitions) ───────────────────────────────────────────────────────────

export interface PeriodEditRow {
  id: number;
  weekday: number;
  slotOrder: number;
  slotType: string;
  label: string;
  lessonIndex: number | null;
  start: string;
  end: string;
  teachable: boolean;
}

export async function listPeriods(yearId: number): Promise<PeriodEditRow[]> {
  const { rows } = await pool.query<PeriodEditRow>(
    `SELECT id, weekday, slot_order AS "slotOrder", slot_type AS "slotType", label,
            lesson_index AS "lessonIndex",
            to_char(start_time,'HH24:MI') AS start, to_char(end_time,'HH24:MI') AS "end", teachable
     FROM period_definitions WHERE academic_year_id = $1 ORDER BY weekday, slot_order`,
    [yearId],
  );
  return rows;
}

export async function createPeriod(yearId: number, weekday: number): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO period_definitions (academic_year_id, weekday, slot_order, slot_type, label, start_time, end_time, teachable)
     VALUES ($1, $2, COALESCE((SELECT max(slot_order)+1 FROM period_definitions WHERE academic_year_id=$1 AND weekday=$2), 1),
             'lesson', 'New period', '09:00', '09:50', true)
     RETURNING id`,
    [yearId, weekday],
  );
  return rows[0]!.id;
}

const PERIOD_FIELDS: Record<string, string> = {
  label: 'label',
  slot_type: 'slot_type',
  lesson_index: 'lesson_index',
  start_time: 'start_time',
  end_time: 'end_time',
  teachable: 'teachable',
};

export async function updatePeriodField(id: number, field: string, value: string | null): Promise<boolean> {
  const col = PERIOD_FIELDS[field];
  if (!col) return false;
  let v: string | number | boolean | null = value && value.trim() !== '' ? value.trim() : null;
  if (col === 'lesson_index' && v !== null) {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) return false;
    v = n;
  }
  if (col === 'teachable') v = v === 'true' || v === 'on' || v === '1';
  if ((col === 'label' || col === 'slot_type') && v === null) return false;
  await pool.query(`UPDATE period_definitions SET ${col} = $2 WHERE id = $1`, [id, v]);
  return true;
}

/** Delete a period — only when nothing is timetabled on it. Returns false if in use. */
export async function deletePeriod(id: number): Promise<boolean> {
  const used = await pool.query<{ n: number }>(
    `SELECT count(*)::int n FROM timetabled_lessons WHERE period_definition_id = $1`,
    [id],
  );
  if (used.rows[0]!.n > 0) return false;
  await pool.query(`DELETE FROM period_definitions WHERE id = $1`, [id]);
  return true;
}

/** Copy a whole day shape between years (rollover step 2; skips weekdays that already have rows). */
export async function copyDayShape(fromYearId: number, toYearId: number): Promise<number> {
  const { rowCount } = await pool.query(
    `INSERT INTO period_definitions (academic_year_id, weekday, slot_order, slot_type, label, lesson_index, start_time, end_time, teachable)
     SELECT $2, weekday, slot_order, slot_type, label, lesson_index, start_time, end_time, teachable
     FROM period_definitions p
     WHERE p.academic_year_id = $1
       AND NOT EXISTS (SELECT 1 FROM period_definitions q
                       WHERE q.academic_year_id = $2 AND q.weekday = p.weekday AND q.slot_order = p.slot_order)`,
    [fromYearId, toYearId],
  );
  return rowCount ?? 0;
}

export interface ApplyModelDayResult {
  /** the weekday used as the template (1 = Mon … 5 = Fri) */
  model: number;
  /** weekdays whose shape was replaced with a copy of the model day's */
  applied: number[];
  /** weekdays left untouched because they already have timetabled lessons */
  blocked: number[];
  /** how many periods the model day had (0 ⇒ nothing was copied) */
  modelPeriods: number;
}

/**
 * Stamp one weekday's "model" day shape onto the other weekdays of the same year. Each target
 * weekday's period_definitions are replaced with copies of the model day's (slot order, type,
 * label, lesson index and times — NOT any class/lesson assignment), so the structure matches but
 * classes are entered per day afterwards. Target weekdays that already have timetabled lessons are
 * protected and skipped (deleting their periods would break the FK and drop class assignments).
 * Transactional and idempotent: re-running with the same model converges.
 */
export async function applyModelDay(yearId: number, modelWeekday: number): Promise<ApplyModelDayResult> {
  const targets = [1, 2, 3, 4, 5].filter((wd) => wd !== modelWeekday);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: cnt } = await client.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM period_definitions WHERE academic_year_id = $1 AND weekday = $2`,
      [yearId, modelWeekday],
    );
    const modelPeriods = cnt[0]!.n;
    if (modelPeriods === 0) {
      await client.query('ROLLBACK');
      return { model: modelWeekday, applied: [], blocked: [], modelPeriods: 0 };
    }
    // Days with classes assigned are protected — never silently dropped.
    const { rows: blockedRows } = await client.query<{ weekday: number }>(
      `SELECT DISTINCT p.weekday
         FROM period_definitions p
         JOIN timetabled_lessons tl ON tl.period_definition_id = p.id
        WHERE p.academic_year_id = $1 AND p.weekday = ANY($2::int[])`,
      [yearId, targets],
    );
    const blocked = blockedRows.map((r) => r.weekday);
    const applied = targets.filter((wd) => !blocked.includes(wd));
    if (applied.length) {
      await client.query(
        `DELETE FROM period_definitions WHERE academic_year_id = $1 AND weekday = ANY($2::int[])`,
        [yearId, applied],
      );
      await client.query(
        `INSERT INTO period_definitions
           (academic_year_id, weekday, slot_order, slot_type, label, lesson_index, start_time, end_time, teachable)
         SELECT $1, t.wd, p.slot_order, p.slot_type, p.label, p.lesson_index, p.start_time, p.end_time, p.teachable
           FROM period_definitions p
           CROSS JOIN unnest($2::int[]) AS t(wd)
          WHERE p.academic_year_id = $1 AND p.weekday = $3`,
        [yearId, applied, modelWeekday],
      );
    }
    await client.query('COMMIT');
    return { model: modelWeekday, applied, blocked, modelPeriods };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── rooms / staff / courses ──────────────────────────────────────────────────────────────────

export interface NamedRow {
  id: number;
  name: string;
  active: boolean;
}

export async function listRooms(): Promise<NamedRow[]> {
  const { rows } = await pool.query<NamedRow>(`SELECT id, name, active FROM rooms ORDER BY name`);
  return rows;
}

export async function createRoom(name: string): Promise<void> {
  await pool.query(`INSERT INTO rooms (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [name.slice(0, 100)]);
}

export async function setRoomActive(id: number, active: boolean): Promise<void> {
  await pool.query(`UPDATE rooms SET active = $2 WHERE id = $1`, [id, active]);
}

export interface StaffRow extends NamedRow {
  role: string;
  isSelf: boolean;
}

export async function listStaff(): Promise<StaffRow[]> {
  const { rows } = await pool.query<StaffRow>(
    `SELECT id, name, role, is_self AS "isSelf", active FROM staff ORDER BY is_self DESC, name`,
  );
  return rows;
}

export async function createStaff(name: string, role: string): Promise<void> {
  const r = ['ta', 'teacher', 'cover'].includes(role) ? role : 'ta';
  await pool.query(`INSERT INTO staff (name, role, is_self) VALUES ($1, $2, false) ON CONFLICT (name) DO NOTHING`, [name.slice(0, 100), r]);
}

export async function setStaffActive(id: number, active: boolean): Promise<void> {
  await pool.query(`UPDATE staff SET active = $2 WHERE id = $1 AND NOT is_self`, [id, active]);
}

export interface CourseRow {
  id: number;
  name: string;
  colour: string | null;
  active: boolean;
}

export async function listAllCourses(): Promise<CourseRow[]> {
  const { rows } = await pool.query<CourseRow>(`SELECT id, name, colour, active FROM courses ORDER BY name`);
  return rows;
}

export async function createCourse(name: string): Promise<void> {
  await pool.query(`INSERT INTO courses (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`, [name.slice(0, 100)]);
}

export async function updateCourseField(id: number, field: string, value: string | null): Promise<boolean> {
  const col = ({ name: 'name', colour: 'colour' } as Record<string, string>)[field];
  if (!col) return false;
  if (col === 'name' && (!value || !value.trim())) return false;
  await pool.query(`UPDATE courses SET ${col} = $2 WHERE id = $1`, [id, value?.trim() || null]);
  return true;
}

export async function setCourseActive(id: number, active: boolean): Promise<void> {
  await pool.query(`UPDATE courses SET active = $2 WHERE id = $1`, [id, active]);
}

// ── groups (year-scoped) + enrolments ────────────────────────────────────────────────────────

export interface GroupRow {
  id: number;
  name: string;
  yearGroup: string | null;
  active: boolean;
  predecessorGroupId: number | null;
  predecessorName: string | null;
  pupilCount: number;
  courseNames: string | null;
}

export async function listGroups(yearId: number, includeArchived = false): Promise<GroupRow[]> {
  const { rows } = await pool.query<GroupRow>(
    `SELECT g.id, g.name, g.year_group AS "yearGroup", g.active,
            g.predecessor_group_id AS "predecessorGroupId", pg.name AS "predecessorName",
            (SELECT count(*)::int FROM enrolments e WHERE e.group_id = g.id AND e.active) AS "pupilCount",
            (SELECT string_agg(c.name, ', ' ORDER BY c.name) FROM group_courses gc JOIN courses c ON c.id = gc.course_id
             WHERE gc.group_id = g.id AND gc.active) AS "courseNames"
     FROM groups g LEFT JOIN groups pg ON pg.id = g.predecessor_group_id
     WHERE g.academic_year_id = $1 ${includeArchived ? '' : 'AND g.active'}
     ORDER BY g.name`,
    [yearId],
  );
  return rows;
}

export async function createGroup(yearId: number, name: string, yearGroup: string | null, predecessorId: number | null): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO groups (name, year_group, academic_year_id, predecessor_group_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (academic_year_id, name) DO UPDATE SET year_group = EXCLUDED.year_group
     RETURNING id`,
    [name.slice(0, 50), yearGroup, yearId, predecessorId],
  );
  return rows[0]!.id;
}

export async function updateGroupField(id: number, field: string, value: string | null): Promise<boolean> {
  const col = ({ name: 'name', year_group: 'year_group' } as Record<string, string>)[field];
  if (!col) return false;
  if (col === 'name' && (!value || !value.trim())) return false;
  await pool.query(`UPDATE groups SET ${col} = $2 WHERE id = $1`, [id, value?.trim() || null]);
  return true;
}

export async function setGroupActive(id: number, active: boolean): Promise<void> {
  await pool.query(`UPDATE groups SET active = $2 WHERE id = $1`, [id, active]);
}

export interface EnrolledPupil {
  enrolmentId: number;
  pupilId: number;
  displayName: string;
}

export async function listEnrolled(groupId: number): Promise<EnrolledPupil[]> {
  const { rows } = await pool.query<EnrolledPupil>(
    `SELECT e.id AS "enrolmentId", p.id AS "pupilId", p.display_name AS "displayName"
     FROM enrolments e JOIN pupils p ON p.id = e.pupil_id
     WHERE e.group_id = $1 AND e.active ORDER BY p.display_name`,
    [groupId],
  );
  return rows;
}

export async function enrolPupil(pupilId: number, groupId: number): Promise<void> {
  await pool.query(
    `INSERT INTO enrolments (pupil_id, group_id, active) VALUES ($1, $2, true)
     ON CONFLICT (pupil_id, group_id) DO UPDATE SET active = true`,
    [pupilId, groupId],
  );
}

export async function unenrolPupil(enrolmentId: number): Promise<void> {
  await pool.query(`UPDATE enrolments SET active = false WHERE id = $1`, [enrolmentId]);
}

/**
 * Move a pupil straight from one class to another within the SAME academic year: deactivates the
 * source enrolment and (re)activates the pupil's enrolment in the target group. Returns false for an
 * unknown enrolment, the same group, or a target group in a different year. Transactional.
 */
export async function moveEnrolment(enrolmentId: number, targetGroupId: number): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cur = await client.query<{ pupilId: number; groupId: number; yearId: number }>(
      `SELECT e.pupil_id AS "pupilId", e.group_id AS "groupId", g.academic_year_id AS "yearId"
         FROM enrolments e JOIN groups g ON g.id = e.group_id WHERE e.id = $1`,
      [enrolmentId],
    );
    const row = cur.rows[0];
    if (!row || targetGroupId === row.groupId) {
      await client.query('ROLLBACK');
      return false;
    }
    const tgt = await client.query<{ id: number }>(
      `SELECT id FROM groups WHERE id = $1 AND academic_year_id = $2`,
      [targetGroupId, row.yearId],
    );
    if (!tgt.rows[0]) {
      await client.query('ROLLBACK');
      return false;
    }
    await client.query(`UPDATE enrolments SET active = false WHERE id = $1`, [enrolmentId]);
    await client.query(
      `INSERT INTO enrolments (pupil_id, group_id, active) VALUES ($1, $2, true)
       ON CONFLICT (pupil_id, group_id) DO UPDATE SET active = true`,
      [row.pupilId, targetGroupId],
    );
    await client.query('COMMIT');
    return true;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ── September rollover (6.4) ────────────────────────────────────────────────────────────────

export interface RolloverGroupRow {
  id: number;
  name: string;
  yearGroup: string | null;
  pupilCount: number;
  courseNames: string | null;
  successorId: number | null;
  successorName: string | null;
}

/** Source-year groups with their already-created successors in the target year (idempotent UI). */
export async function listRolloverGroups(sourceYearId: number, targetYearId: number): Promise<RolloverGroupRow[]> {
  const { rows } = await pool.query<RolloverGroupRow>(
    `SELECT g.id, g.name, g.year_group AS "yearGroup",
            (SELECT count(*)::int FROM enrolments e WHERE e.group_id = g.id AND e.active) AS "pupilCount",
            (SELECT string_agg(c.name, ', ' ORDER BY c.name) FROM group_courses gc JOIN courses c ON c.id = gc.course_id
             WHERE gc.group_id = g.id AND gc.active) AS "courseNames",
            sg.id AS "successorId", sg.name AS "successorName"
     FROM groups g
     LEFT JOIN groups sg ON sg.predecessor_group_id = g.id AND sg.academic_year_id = $2
     WHERE g.academic_year_id = $1 AND g.active
     ORDER BY g.name`,
    [sourceYearId, targetYearId],
  );
  return rows;
}

/** "7ARO" → "8ARO", "Y7" → "Y8"; names without a leading number come back unchanged. */
export function bumpName(name: string): string {
  return name.replace(/^(Y?)(\d+)/i, (_, pre: string, n: string) => `${pre}${Number(n) + 1}`);
}

/** Move one class up: new group in the target year (predecessor chain set), same pupils, same
 * courses, teaching contexts copied. The knowledge follows the group; history stays where it was. */
export async function rolloverGroup(sourceGroupId: number, targetYearId: number, newName: string): Promise<number | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const src = await client.query<{ yearGroup: string | null }>(
      `SELECT year_group AS "yearGroup" FROM groups WHERE id = $1`,
      [sourceGroupId],
    );
    if (!src.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    const exists = await client.query<{ id: number }>(
      `SELECT id FROM groups WHERE academic_year_id = $1 AND name = $2`,
      [targetYearId, newName],
    );
    if (exists.rows[0]) {
      await client.query('ROLLBACK');
      return null; // name already taken in the target year — surfaced by the wizard
    }
    // Idempotent on re-run (the wizard is re-enterable): if this source already has a successor in the
    // target year, do NOT create a second one — even when the teacher re-runs with a different name
    // (the rollover dup hole, #39). The name-taken check above already covers the same-name re-run.
    const succ = await client.query<{ id: number }>(
      `SELECT id FROM groups WHERE academic_year_id = $1 AND predecessor_group_id = $2`,
      [targetYearId, sourceGroupId],
    );
    if (succ.rows[0]) {
      await client.query('ROLLBACK');
      return null; // already rolled over to this year — don't duplicate the successor
    }
    const yearGroup = src.rows[0].yearGroup ? bumpName(src.rows[0].yearGroup) : null;
    const g = await client.query<{ id: number }>(
      `INSERT INTO groups (name, year_group, academic_year_id, predecessor_group_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [newName.slice(0, 50), yearGroup, targetYearId, sourceGroupId],
    );
    const newId = g.rows[0]!.id;
    await client.query(
      `INSERT INTO enrolments (pupil_id, group_id, active)
       SELECT e.pupil_id, $2, true FROM enrolments e WHERE e.group_id = $1 AND e.active
       ON CONFLICT (pupil_id, group_id) DO NOTHING`,
      [sourceGroupId, newId],
    );
    await client.query(
      `INSERT INTO group_courses (group_id, course_id, lessons_per_week, active, teaching_context)
       SELECT $2, gc.course_id, gc.lessons_per_week, true, gc.teaching_context
       FROM group_courses gc WHERE gc.group_id = $1 AND gc.active
       ON CONFLICT (group_id, course_id) DO NOTHING`,
      [sourceGroupId, newId],
    );
    await client.query('COMMIT');
    return newId;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ── timetable editor (6.3) ───────────────────────────────────────────────────────────────────

export interface EditorLesson {
  id: number;
  periodId: number;
  purpose: string;
  groupId: number | null;
  groupName: string | null;
  roomId: number | null;
  staffId: number;
  staffName: string;
  isSelf: boolean;
  courseIds: number[]; // course ids via timetabled_lesson_courses → group_courses
  occurrenceCount: number;
}

export async function listEditorLessons(yearId: number): Promise<EditorLesson[]> {
  const { rows } = await pool.query<EditorLesson>(
    `SELECT tl.id, tl.period_definition_id AS "periodId", tl.purpose,
            tl.group_id AS "groupId", g.name AS "groupName",
            tl.room_id AS "roomId", tl.staff_id AS "staffId", s.name AS "staffName", s.is_self AS "isSelf",
            COALESCE((SELECT json_agg(gc.course_id) FROM timetabled_lesson_courses tlc
                      JOIN group_courses gc ON gc.id = tlc.group_course_id
                      WHERE tlc.timetabled_lesson_id = tl.id), '[]') AS "courseIds",
            (SELECT count(*)::int FROM lesson_occurrences o WHERE o.timetabled_lesson_id = tl.id) AS "occurrenceCount"
     FROM timetabled_lessons tl
     JOIN period_definitions p ON p.id = tl.period_definition_id
     JOIN staff s ON s.id = tl.staff_id
     LEFT JOIN groups g ON g.id = tl.group_id
     WHERE p.academic_year_id = $1
     ORDER BY p.weekday, p.slot_order, tl.id`,
    [yearId],
  );
  return rows;
}

export async function createLessonOnPeriod(periodId: number): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO timetabled_lessons (period_definition_id, purpose, staff_id)
     VALUES ($1, 'teaching', (SELECT id FROM staff WHERE is_self)) RETURNING id`,
    [periodId],
  );
  return rows[0]!.id;
}

const LESSON_PURPOSES = ['teaching', 'free', 'duty', 'meeting', 'club', 'open_room', 'form'];

export async function updateLessonField(id: number, field: string, value: string | null): Promise<boolean> {
  if (field === 'purpose') {
    if (!value || !LESSON_PURPOSES.includes(value)) return false;
    await pool.query(`UPDATE timetabled_lessons SET purpose = $2 WHERE id = $1`, [id, value]);
    return true;
  }
  const col = ({ group_id: 'group_id', room_id: 'room_id', staff_id: 'staff_id' } as Record<string, string>)[field];
  if (!col) return false;
  const v = value && value !== '' ? Number(value) : null;
  if (v !== null && !Number.isInteger(v)) return false;
  if (col === 'staff_id' && v === null) return false;
  await pool.query(`UPDATE timetabled_lessons SET ${col} = $2 WHERE id = $1`, [id, v]);
  // group changed → its old courses no longer apply
  if (col === 'group_id') await pool.query(`DELETE FROM timetabled_lesson_courses WHERE timetabled_lesson_id = $1`, [id]);
  return true;
}

/** Delete a slot lesson — blocked once it has taught history (occurrences). */
export async function deleteLesson(id: number): Promise<boolean> {
  const used = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM lesson_occurrences WHERE timetabled_lesson_id = $1`, [id]);
  if (used.rows[0]!.n > 0) return false;
  await pool.query(`DELETE FROM timetabled_lesson_courses WHERE timetabled_lesson_id = $1`, [id]);
  await pool.query(`DELETE FROM timetabled_lessons WHERE id = $1`, [id]);
  return true;
}

/** Tick/untick a course for a lesson's group (creating the group_courses row when needed). */
export async function toggleLessonCourse(lessonId: number, courseId: number, on: boolean): Promise<boolean> {
  const g = await pool.query<{ groupId: number | null }>(`SELECT group_id AS "groupId" FROM timetabled_lessons WHERE id = $1`, [lessonId]);
  const groupId = g.rows[0]?.groupId;
  if (!groupId) return false;
  if (on) {
    const gc = await pool.query<{ id: number }>(
      `INSERT INTO group_courses (group_id, course_id, active) VALUES ($1, $2, true)
       ON CONFLICT (group_id, course_id) DO UPDATE SET active = true RETURNING id`,
      [groupId, courseId],
    );
    await pool.query(
      `INSERT INTO timetabled_lesson_courses (timetabled_lesson_id, group_course_id)
       SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM timetabled_lesson_courses WHERE timetabled_lesson_id = $1 AND group_course_id = $2)`,
      [lessonId, gc.rows[0]!.id],
    );
  } else {
    await pool.query(
      `DELETE FROM timetabled_lesson_courses
       WHERE timetabled_lesson_id = $1
         AND group_course_id IN (SELECT id FROM group_courses WHERE group_id = $2 AND course_id = $3)`,
      [lessonId, groupId, courseId],
    );
  }
  return true;
}

// ── group_courses (which courses a group takes, per year via the group) ─────────────────────

export async function setGroupCourse(groupId: number, courseId: number, on: boolean): Promise<void> {
  if (on) {
    await pool.query(
      `INSERT INTO group_courses (group_id, course_id, active) VALUES ($1, $2, true)
       ON CONFLICT (group_id, course_id) DO UPDATE SET active = true`,
      [groupId, courseId],
    );
  } else {
    await pool.query(`UPDATE group_courses SET active = false WHERE group_id = $1 AND course_id = $2`, [groupId, courseId]);
  }
}
