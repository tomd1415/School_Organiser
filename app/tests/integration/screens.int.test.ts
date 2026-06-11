import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { addPlan, addUnit } from '../../src/repos/schemes';
import { createTask } from '../../src/repos/tasks';
import { findOrCreateOccurrence, getOccurrenceCourses, setOccurrenceCoursePlan } from '../../src/repos/occurrence';

// End-to-end render of the authenticated screens against the dev DB. Logs in with
// the password "test" (its hash is set in vitest.integration.config.ts).
let app: FastifyInstance;
let session = '';
const LESSON_DATE = '2099-03-03';
const ADAPT_DATE = '2099-03-04';

function firstCookie(setCookie: string | string[] | undefined): string {
  const v = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return (v ?? '').split(';')[0] ?? '';
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  const page = await app.inject({ method: 'GET', url: '/login' });
  const token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
  const pre = firstCookie(page.headers['set-cookie']);
  const res = await app.inject({
    method: 'POST',
    url: '/login',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre },
    payload: `_csrf=${encodeURIComponent(token)}&password=test`,
  });
  expect(res.statusCode).toBe(302); // login succeeded
  session = firstCookie(res.headers['set-cookie']) || pre;
});

afterAll(async () => {
  await app.close();
  await pool.query(`DELETE FROM lesson_occurrences WHERE date = ANY($1)`, [[LESSON_DATE, ADAPT_DATE]]);
  await pool.end();
});

describe('authenticated screens (integration — needs the dev DB up)', () => {
  it('Timetable renders the real week (grid + a seeded group)', async () => {
    const res = await app.inject({ method: 'GET', url: '/timetable', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('tt-table');
    expect(res.body).toContain('8PFA');
  });

  it('Now clock strip renders', async () => {
    const res = await app.inject({ method: 'GET', url: '/now/clock', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('now-strip');
  });

  it('Oversee page renders the week of supervised lessons', async () => {
    const res = await app.inject({ method: 'GET', url: '/oversee', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Lessons I oversee');
    expect(res.body).toMatch(/ov-day|No lessons to oversee/);
  });

  it('Notes page renders with a new-note button', async () => {
    const res = await app.inject({ method: 'GET', url: '/notes', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('data-new-note');
  });

  it('Lesson detail renders with stopping point + notes composer', async () => {
    const { rows } = await pool.query<{ id: number }>(
      `SELECT id FROM timetabled_lessons WHERE purpose = 'teaching' ORDER BY id LIMIT 1`,
    );
    const lessonId = rows[0]?.id ?? 0;
    const res = await app.inject({
      method: 'GET',
      url: `/lesson?lesson=${lessonId}&date=${LESSON_DATE}`,
      headers: { cookie: session },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Stopping point');
    expect(res.body).toContain('data-new-note');
    expect(res.body).toContain('ld-res'); // bound plan's resources surface here (3.8)
  });

  it('Now page renders two columns with the next-session card (5.2 layout)', async () => {
    const res = await app.inject({ method: 'GET', url: '/', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('now-cols'); // two-column wrapper
    expect(res.body).toContain('now-col-now'); // current lesson, left
    expect(res.body).toContain('now-col-next'); // what's next, right
    expect(res.body).toContain('now-next'); // the next-session card itself
  });

  it('Lesson detail shows the per-group adaptation block, and adapt round-trips (5.2)', async () => {
    const lr = await pool.query<{ id: number }>(`SELECT id FROM timetabled_lessons WHERE purpose = 'teaching' ORDER BY id LIMIT 1`);
    const lessonId = lr.rows[0]!.id;
    const occId = await findOrCreateOccurrence(lessonId, ADAPT_DATE);
    const ocs = await getOccurrenceCourses(occId);
    expect(ocs.length).toBeGreaterThan(0);
    const oc = ocs[0]!;
    const gc = Number(oc.groupCourseId);
    // a throwaway master lesson under that course, bound to this occurrence
    const s = await pool.query<{ id: number }>(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, 'TEST adapt screen', 98, false) RETURNING id`, [oc.courseId]);
    const schemeId = Number(s.rows[0]!.id);
    const u = await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1, 'U', 1) RETURNING id`, [schemeId]);
    const unitId = Number(u.rows[0]!.id);
    const p = await pool.query<{ id: number }>(
      `INSERT INTO lesson_plans (unit_id, course_id, title, display_order, objectives, outline) VALUES ($1, $2, 'Screen master', 1, 'MASTER obj', 'MASTER out') RETURNING id`,
      [unitId, oc.courseId],
    );
    const planId = Number(p.rows[0]!.id);
    try {
      await setOccurrenceCoursePlan(oc.occurrenceCourseId, planId);
      // 1) renders the adaptation block, initially following the master
      const page = await app.inject({ method: 'GET', url: `/lesson?lesson=${lessonId}&date=${ADAPT_DATE}`, headers: { cookie: session } });
      expect(page.statusCode).toBe(200);
      expect(page.body).toContain(`id="adapt-${gc}-${planId}"`);
      expect(page.body).toContain('following the master');
      const token = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
      const cookie = firstCookie(page.headers['set-cookie']) || session;
      // 2) adapt for this group
      const save = await app.inject({
        method: 'POST',
        url: `/lesson/adapt/${gc}/${planId}`,
        headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
        payload: 'objectives=GROUP+only&outline=',
      });
      expect(save.statusCode).toBe(200);
      expect(save.body).toContain('adapted for this group');
      // 3) reload shows the saved adaptation + the change log records it
      const page2 = await app.inject({ method: 'GET', url: `/lesson?lesson=${lessonId}&date=${ADAPT_DATE}`, headers: { cookie: session } });
      expect(page2.body).toContain('GROUP only');
      expect(page2.body).toContain('adapted for this group');
      const hist = await app.inject({ method: 'GET', url: `/lesson/adapt/${gc}/${planId}/history`, headers: { cookie: session } });
      expect(hist.body).toContain('teacher edit');
    } finally {
      await pool.query(`DELETE FROM lesson_adaptations WHERE group_course_id = $1 AND lesson_plan_id = $2`, [gc, planId]);
      await pool.query(`UPDATE occurrence_courses SET lesson_plan_id = NULL WHERE lesson_plan_id = $1`, [planId]);
      await pool.query(`DELETE FROM lesson_plans WHERE id = $1`, [planId]);
      await pool.query(`DELETE FROM units WHERE id = $1`, [unitId]);
      await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [schemeId]);
    }
  });

  it('Tasks page renders with a new-task button', async () => {
    const res = await app.inject({ method: 'GET', url: '/tasks', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Tasks');
    expect(res.body).toContain('data-new-note');
  });

  it('Events page renders with a new-event button', async () => {
    const res = await app.inject({ method: 'GET', url: '/events', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain("What's coming");
    expect(res.body).toContain('data-new-note');
  });

  it('Time page renders work windows', async () => {
    const res = await app.inject({ method: 'GET', url: '/time', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Work windows');
  });

  it('Focus page renders', async () => {
    const res = await app.inject({ method: 'GET', url: '/focus', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('focus-inner');
    expect(res.body).toContain('id="timer-banner"'); // running timer now shown on focus too
    expect(res.body).toContain('focus-poll'); // self-poll element drives the auto-refresh
  });

  it('Now clock poll reloads only when the lesson changes (auto-refresh)', async () => {
    // initial poll (no sig) returns the strip with its current signature baked into the poll URL
    const first = await app.inject({ method: 'GET', url: '/now/clock', headers: { cookie: session } });
    expect(first.statusCode).toBe(200);
    expect(first.body).toContain('now-strip');
    const sig = /\/now\/clock\?sig=([^"&]+)/.exec(first.body)?.[1] ?? '';
    expect(sig).not.toBe('');
    // same signature → just the strip, no full-page reload
    const same = await app.inject({ method: 'GET', url: `/now/clock?sig=${sig}`, headers: { cookie: session } });
    expect(same.statusCode).toBe(200);
    expect(same.headers['hx-refresh']).toBeUndefined();
    expect(same.body).toContain('now-strip');
    // a stale signature (the lesson changed) → tell HTMX to reload the whole page
    const stale = await app.inject({ method: 'GET', url: '/now/clock?sig=stale-value', headers: { cookie: session } });
    expect(stale.headers['hx-refresh']).toBe('true');
  });

  it('Focus self-poll skips the swap when nothing changed, re-renders when it does (auto-refresh)', async () => {
    const page = await app.inject({ method: 'GET', url: '/focus', headers: { cookie: session } });
    const sig = /\/focus\/inner\?sig=([^"&]+)/.exec(page.body)?.[1] ?? '';
    expect(sig).not.toBe('');
    // matching signature → no swap (HTMX leaves the card, and any half-typed step, alone)
    const unchanged = await app.inject({ method: 'GET', url: `/focus/inner?sig=${sig}`, headers: { cookie: session } });
    expect(unchanged.headers['hx-reswap']).toBe('none');
    // a stale signature → re-render the focus card
    const changed = await app.inject({ method: 'GET', url: '/focus/inner?sig=stale-value', headers: { cookie: session } });
    expect(changed.statusCode).toBe(200);
    expect(changed.headers['hx-reswap']).toBeUndefined();
    expect(changed.body).toContain('task-tabs');
  });

  it('Captured page renders', async () => {
    const res = await app.inject({ method: 'GET', url: '/captured', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Captured');
    expect(res.body).toContain('data-new-note');
  });

  it('Recurring page renders', async () => {
    const res = await app.inject({ method: 'GET', url: '/recurring', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Recurring tasks');
  });

  it('Schemes page renders', async () => {
    const res = await app.inject({ method: 'GET', url: '/schemes', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Schemes of work');
    expect(res.body).toContain('scheme-tree');
    expect(res.body).toContain('scheme-course'); // explicit selected-course label
    expect(res.body).toContain('class="active"'); // the selected course tab highlights
    expect(res.body).toContain('teaching-ctx'); // per-course teaching-context editor (4.4.1)
    expect(res.body).toContain('all-schemes'); // the all-schemes overview (find/move/delete)
  });

  it('Unit lay-into-calendar: form renders slots, lay-down validates + runs (5.4)', async () => {
    // A course that actually has a weekly slot, so the form lists at least one target.
    const slot = await pool.query<{ courseId: number; lessonId: number; groupCourseId: number }>(
      `SELECT gc.course_id AS "courseId", tl.id AS "lessonId", gc.id AS "groupCourseId"
       FROM timetabled_lesson_courses tlc
       JOIN timetabled_lessons tl ON tl.id = tlc.timetabled_lesson_id
       JOIN group_courses gc ON gc.id = tlc.group_course_id
       WHERE tl.purpose = 'teaching' ORDER BY tl.id LIMIT 1`,
    );
    const { courseId, lessonId, groupCourseId } = slot.rows[0]!;
    const s = await pool.query<{ id: number }>(
      `INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, 'TEST lay screen', 96, false) RETURNING id`,
      [courseId],
    );
    const schemeId = Number(s.rows[0]!.id);
    const u = await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1, 'U', 1) RETURNING id`, [schemeId]);
    const unitId = Number(u.rows[0]!.id);
    const p = await pool.query<{ id: number }>(
      `INSERT INTO lesson_plans (unit_id, course_id, title, display_order) VALUES ($1, $2, 'Lay screen lesson', 1) RETURNING id`,
      [unitId, courseId],
    );
    const planId = Number(p.rows[0]!.id);
    try {
      // the form lists the slot and the lesson count
      const form = await app.inject({ method: 'GET', url: `/schemes/unit/${unitId}/lay-form`, headers: { cookie: session } });
      expect(form.statusCode).toBe(200);
      expect(form.body).toContain('lay-form');
      expect(form.body).toContain(`value="${lessonId}:${groupCourseId}"`);
      expect(form.body).toContain('Lay down 1 lesson');

      const page = await app.inject({ method: 'GET', url: '/schemes', headers: { cookie: session } });
      const token = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
      const cookie = firstCookie(page.headers['set-cookie']) || session;
      // a slot that doesn't teach this course is rejected
      const bad = await app.inject({
        method: 'POST',
        url: `/schemes/unit/${unitId}/lay-down`,
        headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
        payload: `slot=999999%3A999999&start=2099-06-01`,
      });
      expect(bad.body).toContain("doesn't teach this course");
      // a valid slot but a start beyond all term dates → runs the whole path, lays nothing,
      // and (deliberately) never writes to the real upcoming calendar from a test.
      const res = await app.inject({
        method: 'POST',
        url: `/schemes/unit/${unitId}/lay-down`,
        headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
        payload: `slot=${lessonId}%3A${groupCourseId}&start=2099-06-01`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('Nothing laid down');
    } finally {
      await pool.query(`DELETE FROM lesson_plans WHERE id = $1`, [planId]);
      await pool.query(`DELETE FROM units WHERE id = $1`, [unitId]);
      await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [schemeId]);
    }
  });

  it('Convert-a-downloaded-unit: panel renders, search finds units, convert degrades without a key (5.3)', async () => {
    const c = await pool.query<{ id: number }>(`SELECT id FROM courses WHERE active ORDER BY id LIMIT 1`);
    const courseId = Number(c.rows[0]!.id);
    // the panel is on the schemes page
    const page = await app.inject({ method: 'GET', url: `/schemes?course=${courseId}`, headers: { cookie: session } });
    expect(page.body).toContain('convert-panel');
    // search finds the imported KS3 unit folders
    const search = await app.inject({ method: 'GET', url: `/schemes/course/${courseId}/convert-search?q=year_7`, headers: { cookie: session } });
    expect(search.statusCode).toBe(200);
    expect(search.body).toContain('name="folder"');
    const folder = /value="([^"]+)"/.exec(search.body)?.[1] ?? '';
    expect(folder).toContain('year_7');
    // convert: no API key in tests → degrades to the panel with a message, creates nothing
    const before = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM units`);
    const token = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
    const cookie = firstCookie(page.headers['set-cookie']) || session;
    const res = await app.inject({
      method: 'POST',
      url: `/schemes/course/${courseId}/convert`,
      headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
      payload: `folder=${encodeURIComponent(folder)}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('convert-panel'); // the panel again, with the degrade message
    expect(res.body).toContain('class="error"');
    const after = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM units`);
    expect(after.rows[0]!.n).toBe(before.rows[0]!.n); // nothing materialised
    // a non-candidate folder is rejected before any AI call
    const bad = await app.inject({
      method: 'POST',
      url: `/schemes/course/${courseId}/convert`,
      headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
      payload: `folder=${encodeURIComponent('Not/A/Real/Unit')}`,
    });
    expect(bad.body).toContain('not a convertible unit');
  });

  it('AI adapt-for-this-group: no-history message, then degrade without a key; never writes (5.5)', async () => {
    const PAST = '2001-01-08';
    const lr = await pool.query<{ id: number }>(`SELECT id FROM timetabled_lessons WHERE purpose = 'teaching' ORDER BY id LIMIT 1`);
    const lessonId = lr.rows[0]!.id;
    // a fresh master lesson bound to nothing — and a gc with NO recorded history yet
    const slot = await pool.query<{ courseId: number; groupCourseId: number }>(
      `SELECT gc.course_id AS "courseId", gc.id AS "groupCourseId"
       FROM timetabled_lesson_courses tlc JOIN group_courses gc ON gc.id = tlc.group_course_id
       WHERE tlc.timetabled_lesson_id = $1 LIMIT 1`,
      [lessonId],
    );
    const { courseId, groupCourseId } = slot.rows[0]!;
    const s = await pool.query<{ id: number }>(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, 'TEST adapt-ai', 94, false) RETURNING id`, [courseId]);
    const schemeId = Number(s.rows[0]!.id);
    const u = await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1, 'U', 1) RETURNING id`, [schemeId]);
    const unitId = Number(u.rows[0]!.id);
    const pl = await pool.query<{ id: number }>(
      `INSERT INTO lesson_plans (unit_id, course_id, title, display_order, objectives, outline) VALUES ($1, $2, 'AI adapt target', 1, 'O', 'L') RETURNING id`,
      [unitId, courseId],
    );
    const planId = Number(pl.rows[0]!.id);
    const page = await app.inject({ method: 'GET', url: '/schemes', headers: { cookie: session } });
    const token = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
    const cookie = firstCookie(page.headers['set-cookie']) || session;
    const post = (url: string) =>
      app.inject({ method: 'POST', url, headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload: '' });
    try {
      // no taught lessons for this gc in the past → friendly message, no AI call attempted
      const gcFresh = await pool.query<{ id: number }>(
        `SELECT gc.id FROM group_courses gc
         WHERE NOT EXISTS (
           SELECT 1 FROM occurrence_courses oc JOIN lesson_occurrences o ON o.id = oc.occurrence_id
           WHERE oc.group_course_id = gc.id AND o.date <= CURRENT_DATE
             AND (oc.stopping_point IS NOT NULL OR EXISTS (SELECT 1 FROM notes n WHERE n.occurrence_id = o.id AND n.body <> '')))
         LIMIT 1`,
      );
      if (gcFresh.rows[0]) {
        const r0 = await post(`/lesson/adapt/${Number(gcFresh.rows[0].id)}/${planId}/ai`);
        expect(r0.body).toContain('No recent lessons recorded');
      }
      // give OUR gc some history (past occurrence with a stopping point), then the AI gate degrades
      const occ = await pool.query<{ id: number }>(
        `INSERT INTO lesson_occurrences (timetabled_lesson_id, date) VALUES ($1, $2)
         ON CONFLICT (timetabled_lesson_id, date) DO UPDATE SET timetabled_lesson_id = EXCLUDED.timetabled_lesson_id RETURNING id`,
        [lessonId, PAST],
      );
      await pool.query(
        `INSERT INTO occurrence_courses (occurrence_id, group_course_id, stopping_point) VALUES ($1, $2, 'slide 4')
         ON CONFLICT (occurrence_id, group_course_id) DO UPDATE SET stopping_point = 'slide 4'`,
        [occ.rows[0]!.id, groupCourseId],
      );
      const r1 = await post(`/lesson/adapt/${groupCourseId}/${planId}/ai`);
      expect(r1.statusCode).toBe(200);
      expect(r1.body).toContain('adapt-'); // the block re-rendered…
      expect(r1.body).not.toContain('adapted ✓'); // …but no success path without a key
      const rows = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM lesson_adaptations WHERE lesson_plan_id = $1`, [planId]);
      expect(rows.rows[0]!.n).toBe(0); // degrade wrote nothing

      // improve-master (5.5b): without an adaptation → nudge; apply-improvement writes the master
      const nudge = await post(`/lesson/adapt/${groupCourseId}/${planId}/improve-master`);
      expect(nudge.body).toContain('Adapt the lesson for this group first');
      const apply = await app.inject({
        method: 'POST',
        url: `/lesson/plan/${planId}/apply-improvement`,
        headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
        payload: 'objectives=NEW+MASTER+OBJ&outline=NEW+MASTER+OUT',
      });
      expect(apply.body).toContain('Master updated ✓');
      const m = await pool.query<{ objectives: string; outline: string }>(`SELECT objectives, outline FROM lesson_plans WHERE id = $1`, [planId]);
      expect(m.rows[0]!.objectives).toBe('NEW MASTER OBJ');
      expect(m.rows[0]!.outline).toBe('NEW MASTER OUT');
    } finally {
      await pool.query(`DELETE FROM lesson_occurrences WHERE date = $1`, [PAST]);
      await pool.query(`DELETE FROM lesson_adaptations WHERE lesson_plan_id = $1`, [planId]);
      await pool.query(`DELETE FROM lesson_plans WHERE id = $1`, [planId]);
      await pool.query(`DELETE FROM units WHERE id = $1`, [unitId]);
      await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [schemeId]);
    }
  });

  it('Curriculum map renders the slot picker + week table, and honours ?slot= (5.6)', async () => {
    const res = await app.inject({ method: 'GET', url: '/map', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Curriculum map');
    expect(res.body).toContain('map-pick');
    expect(res.body).toContain('map-table');
    const second = [...res.body.matchAll(/option value="(\d+:\d+)"/g)].map((m) => m[1])[1];
    if (second) {
      const r2 = await app.inject({ method: 'GET', url: `/map?slot=${second}`, headers: { cookie: session } });
      expect(r2.body).toContain(`value="${second}" selected`);
    }
  });

  it('Resources page renders with search bar + paged list', async () => {
    const res = await app.inject({ method: 'GET', url: '/resources', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Resources');
    expect(res.body).toContain('res-upload');
    expect(res.body).toContain('res-search');
    expect(res.body).toContain('id="res-list"');
    expect(res.body).toMatch(/\d+ resources?/);
  });

  it('Resources search partial filters and paginates', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/resources/list?q=lesson&kind=document&page=1',
      headers: { cookie: session },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('id="res-list"');
    expect(res.body).toContain('res-pager');
    expect(res.body).toMatch(/matching/); // the count line echoes the active filter
  });

  it('AI term-summary route responds without crashing (4.5, full route + CSRF)', async () => {
    const c = await pool.query<{ id: number }>(`SELECT id FROM courses WHERE active ORDER BY id LIMIT 1`);
    const page = await app.inject({ method: 'GET', url: '/schemes', headers: { cookie: session } });
    const token = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
    const cookie = firstCookie(page.headers['set-cookie']) || session;
    const res = await app.inject({
      method: 'POST',
      url: `/schemes/course/${c.rows[0]!.id}/summary`,
      headers: { cookie, 'x-csrf-token': token },
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatch(/No notes for this course|No API key configured|term-summary/);
  });

  it('AI resource-generation degrades cleanly with no API key (4.7, full route + CSRF)', async () => {
    const page = await app.inject({ method: 'GET', url: '/resources', headers: { cookie: session } });
    const token = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
    const cookie = firstCookie(page.headers['set-cookie']) || session;
    const res = await app.inject({
      method: 'POST',
      url: '/resources/generate',
      headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
      payload: `brief=${encodeURIComponent('a short worksheet on binary addition')}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('No API key configured');
  });

  it('AI task-breakdown degrades cleanly with no API key (4.6, full route + CSRF)', async () => {
    const taskId = await createTask('TEST breakdown task');
    try {
      const page = await app.inject({ method: 'GET', url: '/focus', headers: { cookie: session } });
      const token = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
      const cookie = firstCookie(page.headers['set-cookie']) || session;
      const res = await app.inject({ method: 'POST', url: `/focus/${taskId}/breakdown-ai`, headers: { cookie, 'x-csrf-token': token } });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('No API key configured');
    } finally {
      await pool.query(`DELETE FROM tasks WHERE id = $1`, [taskId]);
    }
  });

  it('Author-scheme degrades cleanly with no API key (full route + CSRF)', async () => {
    const c = await pool.query<{ id: number }>(`SELECT id FROM courses WHERE active ORDER BY id LIMIT 1`);
    const page = await app.inject({ method: 'GET', url: '/schemes', headers: { cookie: session } });
    const token = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
    const cookie = firstCookie(page.headers['set-cookie']) || session;
    const res = await app.inject({
      method: 'POST',
      url: `/schemes/author?course=${c.rows[0]!.id}`,
      headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
      payload: `brief=${encodeURIComponent('a KS3 scheme on online safety and productivity software')}`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('scheme-author'); // re-rendered the author form (no scheme created)
    expect(res.body).toContain('No API key configured');
  });

  it('Draft-with-AI degrades cleanly with no API key (full route + CSRF)', async () => {
    const c = await pool.query<{ id: number }>(`SELECT id FROM courses ORDER BY id LIMIT 1`);
    const s = await pool.query<{ id: number }>(
      `INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, 'TEST draft scheme', 98, false) RETURNING id`,
      [c.rows[0]!.id],
    );
    const unitId = await addUnit(s.rows[0]!.id, 'TEST unit');
    const planId = await addPlan(unitId, 'L1 Test lesson');
    try {
      const page = await app.inject({ method: 'GET', url: '/schemes', headers: { cookie: session } });
      const token = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
      const cookie = firstCookie(page.headers['set-cookie']) || session;
      const res = await app.inject({
        method: 'POST',
        url: `/schemes/plan/${planId}/draft`,
        headers: { cookie, 'x-csrf-token': token },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain(`plan-${planId}`); // re-rendered the plan row, did not crash
      expect(res.body).toContain('No API key configured'); // degraded message (key forced empty in tests)
    } finally {
      await pool.query(`DELETE FROM lesson_plans WHERE id = $1`, [planId]);
      await pool.query(`DELETE FROM units WHERE id = $1`, [unitId]);
      await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [s.rows[0]!.id]);
    }
  });

  it('attaches then detaches a resource on a lesson plan (3.8, authed + CSRF)', async () => {
    const c = await pool.query<{ id: number }>(`SELECT id FROM courses ORDER BY id LIMIT 1`);
    const lp = await pool.query<{ id: number }>(
      `INSERT INTO lesson_plans (course_id, title) VALUES ($1, 'TEST 3.8 plan') RETURNING id`,
      [c.rows[0]!.id],
    );
    const planId = lp.rows[0]!.id;
    const r = await pool.query<{ id: number }>(`SELECT id FROM resources WHERE active ORDER BY id LIMIT 1`);
    const resId = r.rows[0]!.id;
    try {
      // A CSRF token + the session cookie that carries its secret come from a page render.
      const page = await app.inject({ method: 'GET', url: '/schemes', headers: { cookie: session } });
      const token = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
      const cookie = firstCookie(page.headers['set-cookie']) || session;

      const attach = await app.inject({
        method: 'POST',
        url: `/schemes/plan/${planId}/resources`,
        headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
        payload: `resource_id=${resId}`,
      });
      expect(attach.statusCode).toBe(200);
      expect(attach.body).toContain(`plan-${planId}-res`);
      const linked = await pool.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM resource_links WHERE lesson_plan_id = $1 AND resource_id = $2`,
        [planId, resId],
      );
      expect(linked.rows[0]!.n).toBe(1);

      const detach = await app.inject({
        method: 'POST',
        url: `/schemes/plan/${planId}/resources/${resId}/detach`,
        headers: { cookie, 'x-csrf-token': token },
      });
      expect(detach.statusCode).toBe(200);
      expect(detach.body).toContain('no resources linked');
    } finally {
      await pool.query(`DELETE FROM resource_links WHERE lesson_plan_id = $1`, [planId]);
      await pool.query(`DELETE FROM lesson_plans WHERE id = $1`, [planId]);
    }
  });
});
