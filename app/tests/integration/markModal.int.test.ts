import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { setSetting, getSetting } from '../../src/repos/settings';
import { createResource, addVersion, linkResourceToPlan } from '../../src/repos/resources';
import { storeBuffer, checksum, relPathFor } from '../../src/lib/resourceStore';
import { saveAnswer } from '../../src/repos/pupilWork';
import { upsertScheme } from '../../src/repos/marking';
import { invalidateMarksGate } from '../../src/auth/marksGate';

// The per-pupil marking modal (markModal.ts): proves the modal renders each question with its MODEL
// answer + the pupil's answer + a mark control + the AI/checked badge, and that the save path records
// a teacher-confirmed mark. AI-free (the integration env forces an empty key). Fixture prefix 'ZZX'.
let app: FastifyInstance;
let session = '', csrf = '', csrfCookie = '';
let oc = 0, pupil = 0, savedMarks: string | null = null, savedAccess: string | null = null;
const WS_MD = `# Lists\n\n| Q | Type your answer here |\n|---|---|\n| What is a list? | |\n\n## Checklist\n- [ ] I answered\n`;

function firstCookie(s: string | string[] | undefined): string {
  const v = Array.isArray(s) ? s[0] : s;
  return (v ?? '').split(';')[0] ?? '';
}
async function purge(): Promise<void> {
  await pool.query(`DELETE FROM pupil_marks m USING pupil_answers a WHERE m.pupil_answer_id=a.id AND a.pupil_id IN (SELECT id FROM pupils WHERE display_name LIKE 'ZZX %')`);
  await pool.query(`DELETE FROM pupil_answers WHERE pupil_id IN (SELECT id FROM pupils WHERE display_name LIKE 'ZZX %')`);
  await pool.query(`DELETE FROM mark_schemes WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE 'ZZX%')`);
  await pool.query(`DELETE FROM occurrence_courses WHERE group_course_id IN (SELECT gc.id FROM group_courses gc JOIN courses c ON c.id=gc.course_id WHERE c.name LIKE 'ZZX%')`);
  await pool.query(`DELETE FROM lesson_occurrences WHERE date='2001-04-04'`);
  await pool.query(`DELETE FROM resource_links WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE 'ZZX%')`);
  await pool.query(`UPDATE resources SET current_version_id=NULL WHERE title LIKE 'ZZX%'`);
  await pool.query(`DELETE FROM resource_versions WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE 'ZZX%')`);
  await pool.query(`DELETE FROM resources WHERE title LIKE 'ZZX%'`);
  await pool.query(`DELETE FROM enrolments WHERE pupil_id IN (SELECT id FROM pupils WHERE display_name LIKE 'ZZX %')`);
  await pool.query(`DELETE FROM pupils WHERE display_name LIKE 'ZZX %'`);
  await pool.query(`DELETE FROM group_courses WHERE course_id IN (SELECT id FROM courses WHERE name LIKE 'ZZX%')`);
  await pool.query(`DELETE FROM groups WHERE name LIKE 'ZZX%'`);
  await pool.query(`DELETE FROM lesson_plans WHERE course_id IN (SELECT id FROM courses WHERE name LIKE 'ZZX%')`);
  await pool.query(`DELETE FROM units WHERE scheme_id IN (SELECT id FROM schemes_of_work WHERE course_id IN (SELECT id FROM courses WHERE name LIKE 'ZZX%'))`);
  await pool.query(`DELETE FROM schemes_of_work WHERE course_id IN (SELECT id FROM courses WHERE name LIKE 'ZZX%')`);
  await pool.query(`DELETE FROM courses WHERE name LIKE 'ZZX%'`);
}

beforeAll(async () => {
  savedMarks = await getSetting('pupil_marks_enabled');
  savedAccess = await getSetting('pupil_access_enabled');
  await setSetting('pupil_marks_enabled', 'true');
  await setSetting('pupil_access_enabled', 'true');
  invalidateMarksGate();
  await purge();

  const yearId = Number((await pool.query<{ id: number }>(`SELECT id FROM academic_years WHERE is_current`)).rows[0]!.id);
  const courseId = Number((await pool.query<{ id: number }>(`INSERT INTO courses (name) VALUES ('ZZX course') RETURNING id`)).rows[0]!.id);
  const groupId = Number((await pool.query<{ id: number }>(`INSERT INTO groups (name, academic_year_id, active) VALUES ('ZZXGRP', $1, true) RETURNING id`, [yearId])).rows[0]!.id);
  const gc = Number((await pool.query<{ id: number }>(`INSERT INTO group_courses (group_id, course_id) VALUES ($1,$2) RETURNING id`, [groupId, courseId])).rows[0]!.id);
  const schemeId = Number((await pool.query<{ id: number }>(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1,'ZZX scheme',98,false) RETURNING id`, [courseId])).rows[0]!.id);
  const unitId = Number((await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1,'ZZX unit',1) RETURNING id`, [schemeId])).rows[0]!.id);
  const lessonPlanId = Number((await pool.query<{ id: number }>(`INSERT INTO lesson_plans (unit_id, course_id, title, display_order, objectives, outline) VALUES ($1,$2,'ZZX lesson',1,'o','s') RETURNING id`, [unitId, courseId])).rows[0]!.id);
  const resourceId = await createResource('ZZX worksheet', 'worksheet', 'text/markdown', 'ai_generated');
  const buf = Buffer.from(WS_MD, 'utf8');
  const rel = relPathFor(resourceId, 1, 'worksheet.md');
  await storeBuffer(rel, buf);
  await addVersion(resourceId, rel, buf.byteLength, checksum(buf), 'ai', 'test');
  await linkResourceToPlan(resourceId, lessonPlanId);
  pupil = Number((await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token) VALUES ('ZZX Ada','PUPIL_ZX1') RETURNING id`)).rows[0]!.id);
  await pool.query(`INSERT INTO enrolments (pupil_id, group_id, active) VALUES ($1,$2,true)`, [pupil, groupId]);
  const occId = Number((await pool.query<{ id: number }>(`INSERT INTO lesson_occurrences (timetabled_lesson_id, date) SELECT id,'2001-04-04' FROM timetabled_lessons ORDER BY id LIMIT 1 RETURNING id`)).rows[0]!.id);
  oc = Number((await pool.query<{ id: number }>(`INSERT INTO occurrence_courses (occurrence_id, group_course_id, lesson_plan_id) VALUES ($1,$2,$3) RETURNING id`, [occId, gc, lessonPlanId])).rows[0]!.id);
  await saveAnswer({ pupilId: pupil, occurrenceCourseId: oc, resourceId, versionNo: 1, fieldKey: 't1.r1.c2', value: 'a sequence of items' });
  await upsertScheme(resourceId, 1, 'teacher', 'ready', [
    { fieldKey: 't1.r1.c2', kind: 'keyword', expected: 'an ordered collection of items', alternatives: [], marks: 2, required: false },
  ]);
  // an AI suggestion sitting unconfirmed on that answer
  await pool.query(
    `INSERT INTO pupil_marks (pupil_answer_id, marks_awarded, marks_total, marker, confidence, status, feedback)
     SELECT id, 2, 2, 'ai', 0.8, 'suggested', 'Good — clear definition.' FROM pupil_answers WHERE pupil_id=$1 AND occurrence_course_id=$2 AND field_key='t1.r1.c2'`,
    [pupil, oc],
  );

  app = await buildApp();
  await app.ready();
  const page = await app.inject({ method: 'GET', url: '/login' });
  const token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
  const pre = firstCookie(page.headers['set-cookie']);
  const res = await app.inject({ method: 'POST', url: '/login', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre }, payload: `_csrf=${encodeURIComponent(token)}&password=test` });
  session = firstCookie(res.headers['set-cookie']) || pre;
  // a fresh csrf cookie + token (the layout embeds it on the mark-modal host) for the POST paths
  const mk = await app.inject({ method: 'GET', url: '/marking', headers: { cookie: session } });
  csrfCookie = firstCookie(mk.headers['set-cookie']);
  csrf = /x-csrf-token":"([^"]+)"/.exec(mk.body)?.[1] ?? '';
});

afterAll(async () => {
  await purge();
  if (savedMarks === null) await pool.query(`DELETE FROM settings WHERE key='pupil_marks_enabled'`); else await setSetting('pupil_marks_enabled', savedMarks);
  if (savedAccess === null) await pool.query(`DELETE FROM settings WHERE key='pupil_access_enabled'`); else await setSetting('pupil_access_enabled', savedAccess);
  invalidateMarksGate();
  await app.close();
  await pool.end();
});

describe('marking modal (integration)', () => {
  it('renders the question, its model answer, the pupil answer, a mark control and the AI badge', async () => {
    const r = await app.inject({ method: 'GET', url: `/lesson/oc/${oc}/pupil/${pupil}/mark`, headers: { cookie: session } });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('ZZX Ada'); // pupil name at the top
    expect(r.body).toContain('What is a list?'); // the question, as worded
    expect(r.body).toContain('an ordered collection of items'); // the model answer
    expect(r.body).toContain('a sequence of items'); // the pupil's answer
    expect(r.body).toMatch(/mm-(tick|num)/); // a place to mark
    expect(r.body).toContain('mm-sugg'); // pre-filled by AI, not yet checked
    expect(r.body).toContain('Confirm'); // confirm action present
  });

  it('opening at the oc (no pid) lands on the pupil with work', async () => {
    const r = await app.inject({ method: 'GET', url: `/lesson/oc/${oc}/mark`, headers: { cookie: session } });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('ZZX Ada');
    expect(r.body).toContain('What is a list?');
  });

  it('the comment-back textarea is named so its value posts, and the comment persists + reloads', async () => {
    // Regression (2026-06-24): the modal's comment textarea had no name= attribute, so HTMX never
    // serialised the typed value → the POST body was empty → the handler 400'd silently → nothing saved.
    const before = await app.inject({ method: 'GET', url: `/lesson/oc/${oc}/pupil/${pupil}/mark`, headers: { cookie: session } });
    expect(before.body).toContain('<textarea name="comment"'); // without this the value is never sent

    const note = 'Well done Ada, a clear definition.';
    const save = await app.inject({
      method: 'POST', url: `/lesson/oc/${oc}/pupil/${pupil}/comment`,
      headers: { cookie: `${session}; ${csrfCookie}`, 'content-type': 'application/x-www-form-urlencoded', 'x-csrf-token': csrf },
      payload: `comment=${encodeURIComponent(note)}`,
    });
    expect(save.statusCode).toBe(200);
    expect(save.body).toContain('comment saved');

    const after = await app.inject({ method: 'GET', url: `/lesson/oc/${oc}/pupil/${pupil}/mark`, headers: { cookie: session } });
    expect(after.body).toContain(note); // the saved comment is reloaded into the textarea
  });

  it('saving a mark records a teacher-confirmed mark (the "checked" state)', async () => {
    const aid = Number((await pool.query<{ id: number }>(`SELECT id FROM pupil_answers WHERE pupil_id=$1 AND occurrence_course_id=$2 AND field_key='t1.r1.c2'`, [pupil, oc])).rows[0]!.id);
    const r = await app.inject({
      method: 'POST', url: `/lesson/oc/${oc}/pupil/${pupil}/mark/save`,
      headers: { cookie: `${session}; ${csrfCookie}`, 'content-type': 'application/x-www-form-urlencoded', 'x-csrf-token': csrf },
      payload: `answerId=${aid}&marks=1&total=2`,
    });
    expect(r.statusCode).toBe(200);
    const m = (await pool.query<{ marks_awarded: number; marker: string; status: string }>(`SELECT marks_awarded, marker, status FROM pupil_marks WHERE pupil_answer_id=$1`, [aid])).rows[0]!;
    expect(m.marks_awarded).toBe(1);
    expect(m.marker).toBe('teacher');
    expect(m.status).toBe('confirmed');
    expect(r.body).toContain('mm-ok'); // the row now shows as checked
  });
});
