import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { setSetting, getSetting } from '../../src/repos/settings';
import { createResource, addVersion, linkResourceToPlan } from '../../src/repos/resources';
import { storeBuffer, checksum, relPathFor } from '../../src/lib/resourceStore';

// Phase 8 teacher side + AI loop: the Pupil-work review grid (completion math, level chips with
// the IDOR enrolment check, read-back marking seen, mark-all-seen), the AI "summarise" degrade
// path (the integration env forces an empty key, so it must fail gracefully — never 500), and
// TA NAMED accounts logging in. All scratch rows torn down; pupil_access_enabled snapshot/restored.
let app: FastifyInstance;
let savedAccess: string | null = null;
let groupId = 0;
let groupCourseId = 0;
let occurrenceCourseId = 0;
let lessonPlanId = 0;
let resourceId = 0;
let schemeId = 0;
let unitId = 0;
let inPupil = 0;
let outPupil = 0;
let taId = 0;

const WS_MD = `# Lists worksheet

## Before you start
Type your answers in the boxes.

| Name | Type your name here |
|------|---------------------|

## 🟢 Support Task

| Question | Type your answer here |
|----------|----------------------|
| What is a list? | |

### 🟢 Success checklist
- [ ] I answered

## 🟡 Core Task

| Question | Type your answer here |
|----------|----------------------|
| Give an example list. | |
| How many items? | |
`;

function firstCookie(setCookie: string | string[] | undefined): string {
  const v = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return (v ?? '').split(';')[0] ?? '';
}

let teacherCookie = '';
let teacherToken = '';

// Defensively remove any 'ZZW' scratch rows a previous interrupted run may have left, so the
// test is self-healing (no manual DB cleanup needed between runs).
async function purgeScratch(): Promise<void> {
  await pool.query(`DELETE FROM pupil_answers WHERE pupil_id IN (SELECT id FROM pupils WHERE display_name LIKE 'ZZW %')`);
  await pool.query(`DELETE FROM pupil_lesson_feedback WHERE pupil_id IN (SELECT id FROM pupils WHERE display_name LIKE 'ZZW %')`);
  await pool.query(`DELETE FROM pupil_levels WHERE group_course_id IN (SELECT gc.id FROM group_courses gc JOIN courses c ON c.id=gc.course_id WHERE c.name LIKE 'ZZW%')`);
  await pool.query(`DELETE FROM occurrence_courses WHERE group_course_id IN (SELECT gc.id FROM group_courses gc JOIN courses c ON c.id=gc.course_id WHERE c.name LIKE 'ZZW%')`);
  await pool.query(`DELETE FROM resource_links WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE 'ZZW%')`);
  // resources.current_version_id ↔ resource_versions is circular — break it before deleting.
  await pool.query(`UPDATE resources SET current_version_id = NULL WHERE title LIKE 'ZZW%'`);
  await pool.query(`DELETE FROM resource_versions WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE 'ZZW%')`);
  await pool.query(`DELETE FROM resources WHERE title LIKE 'ZZW%'`);
  await pool.query(`DELETE FROM lesson_plans WHERE title LIKE 'ZZW%'`);
  await pool.query(`DELETE FROM units WHERE title LIKE 'ZZW%'`);
  await pool.query(`DELETE FROM schemes_of_work WHERE title LIKE 'ZZW%'`);
  await pool.query(`DELETE FROM enrolments WHERE group_id IN (SELECT id FROM groups WHERE name LIKE 'ZZW%')`);
  await pool.query(`DELETE FROM group_courses WHERE course_id IN (SELECT id FROM courses WHERE name LIKE 'ZZW%')`);
  await pool.query(`DELETE FROM pupils WHERE display_name LIKE 'ZZW %'`);
  await pool.query(`DELETE FROM groups WHERE name LIKE 'ZZW%'`);
  await pool.query(`DELETE FROM courses WHERE name LIKE 'ZZW%'`);
  await pool.query(`DELETE FROM ta_accounts WHERE name LIKE 'ZZW%'`);
}

beforeAll(async () => {
  savedAccess = await getSetting('pupil_access_enabled');
  await setSetting('pupil_access_enabled', 'true');
  app = await buildApp();
  await app.ready();
  await purgeScratch();

  // Teacher session (the integration env sets the password hash for "test").
  const page = await app.inject({ method: 'GET', url: '/login' });
  teacherToken = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
  const pre = firstCookie(page.headers['set-cookie']);
  const res = await app.inject({
    method: 'POST', url: '/login',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre },
    payload: `_csrf=${encodeURIComponent(teacherToken)}&password=test`,
  });
  teacherCookie = firstCookie(res.headers['set-cookie']) || pre;

  // Scratch course/group/group_course, a plan, a stored+linked worksheet, an occurrence-course.
  const yr = await pool.query<{ id: number }>(`SELECT id FROM academic_years WHERE is_current`);
  const yearId = Number(yr.rows[0]!.id);
  const c = await pool.query<{ id: number }>(`INSERT INTO courses (name) VALUES ('ZZW course') RETURNING id`);
  const courseId = Number(c.rows[0]!.id);
  const g = await pool.query<{ id: number }>(
    `INSERT INTO groups (name, academic_year_id, active) VALUES ('ZZWGRP', $1, true) RETURNING id`, [yearId],
  );
  groupId = Number(g.rows[0]!.id);
  groupCourseId = Number((await pool.query<{ id: number }>(
    `INSERT INTO group_courses (group_id, course_id) VALUES ($1, $2) RETURNING id`, [groupId, courseId])).rows[0]!.id);
  schemeId = Number((await pool.query<{ id: number }>(
    `INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, 'ZZW scheme', 99, false) RETURNING id`, [courseId])).rows[0]!.id);
  unitId = Number((await pool.query<{ id: number }>(
    `INSERT INTO units (scheme_id, title, display_order) VALUES ($1, 'ZZW unit', 1) RETURNING id`, [schemeId])).rows[0]!.id);
  lessonPlanId = Number((await pool.query<{ id: number }>(
    `INSERT INTO lesson_plans (unit_id, course_id, title, display_order, objectives, outline)
     VALUES ($1, $2, 'ZZW lesson', 1, 'o', 's') RETURNING id`, [unitId, courseId])).rows[0]!.id);

  // a real stored worksheet, linked to the plan
  resourceId = await createResource('ZZW worksheet', 'worksheet', 'text/markdown', 'ai_generated');
  const buf = Buffer.from(WS_MD, 'utf8');
  const rel = relPathFor(resourceId, 1, 'worksheet.md');
  await storeBuffer(rel, buf);
  await addVersion(resourceId, rel, buf.byteLength, checksum(buf), 'ai', 'test');
  await linkResourceToPlan(resourceId, lessonPlanId);

  // two enrolled pupils + one NOT enrolled (for the IDOR check)
  inPupil = Number((await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token) VALUES ('ZZW In', 'PUPIL_ZW1') RETURNING id`)).rows[0]!.id);
  outPupil = Number((await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token) VALUES ('ZZW Out', 'PUPIL_ZW2') RETURNING id`)).rows[0]!.id);
  await pool.query(`INSERT INTO enrolments (pupil_id, group_id, active) VALUES ($1, $2, true)`, [inPupil, groupId]);

  // occurrence-course bound to the plan
  const occId = Number((await pool.query<{ id: number }>(
    `INSERT INTO lesson_occurrences (timetabled_lesson_id, date)
     SELECT id, '2001-04-04' FROM timetabled_lessons ORDER BY id LIMIT 1 RETURNING id`)).rows[0]!.id);
  occurrenceCourseId = Number((await pool.query<{ id: number }>(
    `INSERT INTO occurrence_courses (occurrence_id, group_course_id, lesson_plan_id) VALUES ($1, $2, $3) RETURNING id`,
    [occId, groupCourseId, lessonPlanId])).rows[0]!.id);

  // the enrolled pupil has typed one answer + ticked a checkbox + given feedback
  const { saveAnswer, upsertPupilFeedback } = await import('../../src/repos/pupilWork');
  await saveAnswer({ pupilId: inPupil, occurrenceCourseId, resourceId, versionNo: 1, fieldKey: 't1.r1.c2', value: 'Ada' });
  await saveAnswer({ pupilId: inPupil, occurrenceCourseId, resourceId, versionNo: 1, fieldKey: 't2.r1.c2', value: 'a sequence' });
  await saveAnswer({ pupilId: inPupil, occurrenceCourseId, resourceId, versionNo: 1, fieldKey: 'task.1', value: 'x' });
  await upsertPupilFeedback({ pupilId: inPupil, occurrenceCourseId, rating: 4, liked: 'practical', disliked: '', comment: '' });

  // a named TA account
  const { createTaAccount } = await import('../../src/repos/taAccounts');
  const { hashPassword } = await import('../../src/lib/passwords');
  taId = (await createTaAccount('ZZW Assistant', hashPassword('ta-named-pass-1'), null)).id;
});

afterAll(async () => {
  await pool.query(`DELETE FROM notes WHERE occurrence_id IN (SELECT occurrence_id FROM occurrence_courses WHERE group_course_id IN (SELECT gc.id FROM group_courses gc JOIN courses c ON c.id=gc.course_id WHERE c.name LIKE 'ZZW%'))`);
  await pool.query(`DELETE FROM lesson_occurrences WHERE date = '2001-04-04'`);
  await purgeScratch(); // correctly-ordered, breaks the resources↔versions cycle and group_courses↔courses
  if (savedAccess === null) await pool.query(`DELETE FROM settings WHERE key = 'pupil_access_enabled'`);
  else await setSetting('pupil_access_enabled', savedAccess);
  await app.close();
  await pool.end();
});

const teacher = () => ({ cookie: teacherCookie, 'x-csrf-token': teacherToken, 'content-type': 'application/x-www-form-urlencoded' });

describe('teacher Pupil-work grid + AI loop (integration)', () => {
  it('renders the grid with completion counts (text fields only) and the rating', async () => {
    const res = await app.inject({ method: 'GET', url: `/lesson/oc/${occurrenceCourseId}/pupil-work`, headers: { cookie: teacherCookie } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('ZZW In');
    // default level is core → 2 text fields (name is shared + 1 core question... shared name + core 2 = 3);
    // the pupil filled name + one core answer = 2 text answers (the ticked box is NOT counted).
    expect(res.body).toMatch(/2 \/ 3/);
    expect(res.body).toContain('😀'); // rating 4
  });

  it('changes a pupil level, but refuses a pupil not enrolled in the class (IDOR)', async () => {
    const ok = await app.inject({
      method: 'POST', url: `/lesson/oc/${occurrenceCourseId}/pupil/${inPupil}/level`,
      headers: teacher(), payload: 'level=support',
    });
    expect(ok.statusCode).toBe(200);
    const lvl = await pool.query<{ level: string }>(`SELECT level FROM pupil_levels WHERE pupil_id=$1 AND group_course_id=$2`, [inPupil, groupCourseId]);
    expect(lvl.rows[0]?.level).toBe('support');

    const bad = await app.inject({
      method: 'POST', url: `/lesson/oc/${occurrenceCourseId}/pupil/${outPupil}/level`,
      headers: teacher(), payload: 'level=challenge',
    });
    expect(bad.statusCode).toBe(403);
    const none = await pool.query(`SELECT 1 FROM pupil_levels WHERE pupil_id=$1`, [outPupil]);
    expect(none.rowCount).toBe(0); // nothing written for the outsider
  });

  it('read-back renders the pupil answers and marks them seen', async () => {
    const res = await app.inject({ method: 'GET', url: `/lesson/oc/${occurrenceCourseId}/pupil/${inPupil}/work`, headers: { cookie: teacherCookie } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('a sequence'); // their typed answer in the read-back
    const unseen = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM pupil_answers WHERE occurrence_course_id=$1 AND pupil_id=$2 AND NOT seen_by_teacher`, [occurrenceCourseId, inPupil]);
    expect(unseen.rows[0]!.n).toBe(0); // opening the sheet cleared the unseen flag
  });

  it('refuses read-back of a pupil not in the class (IDOR)', async () => {
    const res = await app.inject({ method: 'GET', url: `/lesson/oc/${occurrenceCourseId}/pupil/${outPupil}/work`, headers: { cookie: teacherCookie } });
    expect(res.statusCode).toBe(403);
  });

  it('printable login cards show the actual PIN (so pupils know it), not a blank', async () => {
    const { setPupilPin } = await import('../../src/repos/pupilCredentials');
    await setPupilPin(inPupil, '7531');
    const res = await app.inject({ method: 'GET', url: `/pupils/cards/${groupId}`, headers: { cookie: teacherCookie } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('7531'); // the real PIN prints
    expect(res.body).not.toContain('>____<'); // not the old blank placeholder
  });

  it('the AI summary degrades gracefully when no key is configured (never 500)', async () => {
    const res = await app.inject({
      method: 'POST', url: `/lesson/oc/${occurrenceCourseId}/summarise`, headers: teacher(),
    });
    expect(res.statusCode).toBe(200); // graceful HTML, not a crash
    expect(res.body.toLowerCase()).toMatch(/unavailable|no answers|key|ai/);
    expect(res.body).not.toContain('Error: '); // not a stack/500
  });
});

describe('TA named accounts (integration)', () => {
  it('a named TA logs in with their own password and lands on /ta', async () => {
    const page = await app.inject({ method: 'GET', url: '/login' });
    const token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
    const pre = firstCookie(page.headers['set-cookie']);
    const res = await app.inject({
      method: 'POST', url: '/login',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre },
      payload: `_csrf=${encodeURIComponent(token)}&password=ta-named-pass-1`,
    });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/ta');
    const cookie = firstCookie(res.headers['set-cookie']) || pre;
    // locked down: a teacher route bounces back to /ta
    const probe = await app.inject({ method: 'GET', url: '/settings', headers: { cookie } });
    expect(probe.statusCode).toBe(302);
    expect(probe.headers.location).toBe('/ta');
  });
});
