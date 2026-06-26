import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { classCohort, listRosterClasses } from '../../src/repos/cohort';

// Pupils §11 cohort analytics — the full SQL path (level join · completion = done/delivered · ATL trend ·
// ability midpoint) against a crafted scratch class. Needs the dev DB up; never calls AI.

let courseId = 0, groupId = 0, gcId = 0, oc1 = 0, oc2 = 0;
const pupilIds: Record<string, number> = {};
const today = '2030-01-01'; // both occurrences are before this → "delivered"

beforeAll(async () => {
  const yr = await pool.query<{ id: number }>(`SELECT id FROM academic_years WHERE is_current`);
  const yearId = Number(yr.rows[0]!.id);
  courseId = Number((await pool.query<{ id: number }>(`INSERT INTO courses (name) VALUES ('ZZCOHORT course') RETURNING id`)).rows[0]!.id);
  groupId = Number((await pool.query<{ id: number }>(`INSERT INTO groups (name, academic_year_id, active) VALUES ('ZZCOHORT-GRP', $1, true) RETURNING id`, [yearId])).rows[0]!.id);
  gcId = Number((await pool.query<{ id: number }>(`INSERT INTO group_courses (group_id, course_id) VALUES ($1, $2) RETURNING id`, [groupId, courseId])).rows[0]!.id);

  for (const [key, name, token, level] of [
    ['a', 'ZZCohort A', 'PUPIL_ZC1', 'support'],
    ['b', 'ZZCohort B', 'PUPIL_ZC2', 'core'],
    ['c', 'ZZCohort C', 'PUPIL_ZC3', 'challenge'],
  ] as const) {
    const id = Number((await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token) VALUES ($1, $2) RETURNING id`, [name, token])).rows[0]!.id);
    pupilIds[key] = id;
    await pool.query(`INSERT INTO enrolments (pupil_id, group_id, active) VALUES ($1, $2, true)`, [id, groupId]);
    await pool.query(`INSERT INTO pupil_levels (pupil_id, group_course_id, level) VALUES ($1, $2, $3)`, [id, gcId, level]);
  }

  // two delivered (past) occurrence-courses for this class
  const mkOcc = async (date: string): Promise<number> => {
    const occId = Number((await pool.query<{ id: number }>(
      `INSERT INTO lesson_occurrences (timetabled_lesson_id, date) SELECT id, $1 FROM timetabled_lessons ORDER BY id LIMIT 1 RETURNING id`, [date])).rows[0]!.id);
    return Number((await pool.query<{ id: number }>(
      `INSERT INTO occurrence_courses (occurrence_id, group_course_id) VALUES ($1, $2) RETURNING id`, [occId, gcId])).rows[0]!.id);
  };
  oc1 = await mkOcc('2001-04-04');
  oc2 = await mkOcc('2001-04-11');

  // completion: A done both (100%), B done one (50%), C none (0%)
  await pool.query(`INSERT INTO pupil_done (pupil_id, occurrence_course_id) VALUES ($1,$2),($1,$3)`, [pupilIds.a, oc1, oc2]);
  await pool.query(`INSERT INTO pupil_done (pupil_id, occurrence_course_id) VALUES ($1,$2)`, [pupilIds.b, oc1]);

  // ATL: A 2→4 (up), B 3→3 (flat), C 4→2 (down)
  const atl = async (p: number, s1: number, s2: number) =>
    pool.query(`INSERT INTO pupil_atl (pupil_id, occurrence_course_id, score) VALUES ($1,$2,$3),($1,$4,$5)`, [p, oc1, s1, oc2, s2]);
  await atl(pupilIds.a, 2, 4);
  await atl(pupilIds.b, 3, 3);
  await atl(pupilIds.c, 4, 2);
});

afterAll(async () => {
  await pool.query(`DELETE FROM pupil_atl WHERE occurrence_course_id IN ($1,$2)`, [oc1, oc2]);
  await pool.query(`DELETE FROM pupil_done WHERE occurrence_course_id IN ($1,$2)`, [oc1, oc2]);
  await pool.query(`DELETE FROM occurrence_courses WHERE group_course_id = $1`, [gcId]);
  await pool.query(`DELETE FROM lesson_occurrences WHERE date IN ('2001-04-04','2001-04-11') AND id NOT IN (SELECT occurrence_id FROM occurrence_courses)`);
  await pool.query(`DELETE FROM pupil_levels WHERE group_course_id = $1`, [gcId]);
  await pool.query(`DELETE FROM enrolments WHERE group_id = $1`, [groupId]);
  await pool.query(`DELETE FROM pupils WHERE ai_token LIKE 'PUPIL_ZC%'`);
  await pool.query(`DELETE FROM group_courses WHERE id = $1`, [gcId]);
  await pool.query(`DELETE FROM groups WHERE id = $1`, [groupId]);
  await pool.query(`DELETE FROM courses WHERE id = $1`, [courseId]);
  await pool.end();
});

describe('cohort analytics (integration)', () => {
  it('listRosterClasses includes the class with its pupil count', async () => {
    const cls = (await listRosterClasses()).find((c) => c.groupCourseId === gcId);
    expect(cls).toBeTruthy();
    expect(cls!.pupilCount).toBe(3);
    expect(cls!.courseName).toBe('ZZCOHORT course');
  });

  it('computes level, completion % and ATL trend per pupil + the ability midpoint', async () => {
    const cohort = await classCohort(gcId, today);
    expect(cohort.deliveredLessons).toBe(2);
    expect(cohort.abilityMidpoint).toBe('core'); // median of support/core/challenge
    const by = Object.fromEntries(cohort.pupils.map((p) => [p.displayName, p]));
    expect(by['ZZCohort A']).toMatchObject({ level: 'support', completionPct: 100, atlTrend: 'up' });
    expect(by['ZZCohort B']).toMatchObject({ level: 'core', completionPct: 50, atlTrend: 'flat' });
    expect(by['ZZCohort C']).toMatchObject({ level: 'challenge', completionPct: 0, atlTrend: 'down' });
  });
});
