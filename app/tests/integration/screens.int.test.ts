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

    // 5.7: the assign block is on the panel, and a slot that doesn't teach the course is rejected
    // up front (before any AI spend)
    expect(page.body).toContain('assign_slot');
    const badSlot = await app.inject({
      method: 'POST',
      url: `/schemes/course/${courseId}/convert`,
      headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
      payload: `folder=${encodeURIComponent(folder)}&assign_slot=999999%3A999999&assign_start=2099-06-01`,
    });
    expect(badSlot.body).toContain('teach this course'); // (apostrophe is HTML-escaped)
    // degrade with a VALID assign target still writes neither unit nor bindings
    const slotRow = await pool.query<{ lessonId: number; groupCourseId: number }>(
      `SELECT tl.id AS "lessonId", gc.id AS "groupCourseId"
       FROM timetabled_lesson_courses tlc
       JOIN timetabled_lessons tl ON tl.id = tlc.timetabled_lesson_id
       JOIN group_courses gc ON gc.id = tlc.group_course_id
       WHERE gc.course_id = $1 LIMIT 1`,
      [courseId],
    );
    if (slotRow.rows[0]) {
      const { lessonId, groupCourseId } = slotRow.rows[0];
      const beforeOcc = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM lesson_occurrences WHERE date >= '2099-01-01'`);
      const deg = await app.inject({
        method: 'POST',
        url: `/schemes/course/${courseId}/convert`,
        headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
        payload: `folder=${encodeURIComponent(folder)}&assign_slot=${lessonId}%3A${groupCourseId}&assign_start=2099-06-01`,
      });
      expect(deg.body).toContain('class="error"'); // AI degrade (no key)
      const afterUnits = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM units`);
      expect(afterUnits.rows[0]!.n).toBe(before.rows[0]!.n);
      const afterOcc = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM lesson_occurrences WHERE date >= '2099-01-01'`);
      expect(afterOcc.rows[0]!.n).toBe(beforeOcc.rows[0]!.n); // no bindings either
    }
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

      // per-class resources: same nudge without an adaptation…
      const resNudge = await post(`/lesson/adapt/${groupCourseId}/${planId}/resources-ai`);
      expect(resNudge.body).toContain('Adapt the lesson for this class first');
      // …and with one but no API key, degrade writes nothing
      await pool.query(
        `INSERT INTO lesson_adaptations (group_course_id, lesson_plan_id, objectives, outline) VALUES ($1, $2, 'GO', 'GL')
         ON CONFLICT (group_course_id, lesson_plan_id) DO NOTHING`,
        [groupCourseId, planId],
      );
      const beforeRes = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM resources`);
      const resDeg = await post(`/lesson/adapt/${groupCourseId}/${planId}/resources-ai`);
      expect(resDeg.statusCode).toBe(200);
      expect(resDeg.body).not.toContain('class copies ready');
      const afterRes = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM resources`);
      expect(afterRes.rows[0]!.n).toBe(beforeRes.rows[0]!.n);
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

  it('Kit page: renders, add/edit/archive round-trip, panel on Schemes (5.8)', async () => {
    const page = await app.inject({ method: 'GET', url: '/kit', headers: { cookie: session } });
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain('Kit — classroom equipment');
    const token = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
    const cookie = firstCookie(page.headers['set-cookie']) || session;
    const hdrs = { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' };
    // add
    const added = await app.inject({ method: 'POST', url: '/kit/add', headers: hdrs, payload: 'name=TEST+kit+item&category=robotics' });
    expect(added.body).toContain('TEST kit item');
    const r = await pool.query<{ id: number }>(`SELECT id FROM equipment WHERE name = 'TEST kit item'`);
    const id = Number(r.rows[0]!.id);
    try {
      // autosave a field + invalid numeric rejected
      const save = await app.inject({ method: 'POST', url: `/kit/${id}`, headers: hdrs, payload: 'field=qty_total&value=12' });
      expect(save.body).toContain('saved');
      const bad = await app.inject({ method: 'POST', url: `/kit/${id}`, headers: hdrs, payload: 'field=qty_total&value=-3' });
      expect(bad.statusCode).toBe(400);
      const nofield = await app.inject({ method: 'POST', url: `/kit/${id}`, headers: hdrs, payload: 'field=id&value=99' });
      expect(nofield.statusCode).toBe(400); // whitelist holds
      // checked-today stamp
      const checked = await app.inject({ method: 'POST', url: `/kit/${id}/checked`, headers: hdrs, payload: '' });
      expect(checked.body).not.toContain('never');
      // schemes panel lists it
      const panel = await app.inject({ method: 'GET', url: '/kit/panel', headers: { cookie: session } });
      expect(panel.body).toContain('TEST kit item');
      // archive → leaves the active list (and the AI input)
      await app.inject({ method: 'POST', url: `/kit/${id}/archive`, headers: hdrs, payload: '' });
      const panel2 = await app.inject({ method: 'GET', url: '/kit/panel', headers: { cookie: session } });
      expect(panel2.body).not.toContain('TEST kit item');
      // schemes page hosts the collapsed kit panel
      const schemes = await app.inject({ method: 'GET', url: '/schemes', headers: { cookie: session } });
      expect(schemes.body).toContain('kit-avail');
    } finally {
      await pool.query(`DELETE FROM equipment WHERE id = $1`, [id]);
    }
  });

  it('Map carry-over: "continue next week" repeats the lesson and shifts the rest (5.9)', async () => {
    // a real slot + its course
    const slot = await pool.query<{ lessonId: number; groupCourseId: number; courseId: number; weekday: number }>(
      `SELECT tl.id AS "lessonId", gc.id AS "groupCourseId", gc.course_id AS "courseId", p.weekday
       FROM timetabled_lesson_courses tlc
       JOIN timetabled_lessons tl ON tl.id = tlc.timetabled_lesson_id
       JOIN period_definitions p ON p.id = tl.period_definition_id
       JOIN group_courses gc ON gc.id = tlc.group_course_id
       WHERE tl.purpose = 'teaching' ORDER BY tl.id LIMIT 1`,
    );
    const { lessonId, groupCourseId, courseId, weekday } = slot.rows[0]!;
    // a temporary 2099 term so the holiday-aware date walk has school days, far from the live calendar
    const yr = await pool.query<{ id: number }>(`SELECT id FROM academic_years ORDER BY id LIMIT 1`);
    const term = await pool.query<{ id: number }>(
      `INSERT INTO term_dates (academic_year_id, name, start_date, end_date, kind) VALUES ($1, 'TEST 2099 term', '2099-06-01', '2099-07-31', 'term') RETURNING id`,
      [yr.rows[0]!.id],
    );
    const termId = Number(term.rows[0]!.id);
    // 6.1 clamps shifts to the current year's end — stretch it over the test dates, restore after.
    const yearEndBefore = await pool.query<{ d: string }>(
      `SELECT to_char(end_date, 'YYYY-MM-DD') d FROM academic_years WHERE is_current`,
    );
    await pool.query(`UPDATE academic_years SET end_date = '2099-12-31' WHERE is_current`);
    const s = await pool.query<{ id: number }>(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, 'TEST shift', 93, false) RETURNING id`, [courseId]);
    const schemeId = Number(s.rows[0]!.id);
    const u = await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1, 'U', 1) RETURNING id`, [schemeId]);
    const unitId = Number(u.rows[0]!.id);
    const planIds: number[] = [];
    for (const [i, t] of ['SH-L1', 'SH-L2', 'SH-L3'].entries()) {
      const p = await pool.query<{ id: number }>(
        `INSERT INTO lesson_plans (unit_id, course_id, title, display_order) VALUES ($1, $2, $3, $4) RETURNING id`,
        [unitId, courseId, t, i + 1],
      );
      planIds.push(Number(p.rows[0]!.id));
    }
    // first four slot dates inside the 2099 term
    const dates: string[] = [];
    {
      let d = '2099-06-01';
      while (dates.length < 4) {
        if (new Date(`${d}T00:00:00Z`).getUTCDay() === (weekday === 7 ? 0 : weekday)) dates.push(d);
        const nd = new Date(`${d}T00:00:00Z`);
        nd.setUTCDate(nd.getUTCDate() + 1);
        d = nd.toISOString().slice(0, 10);
      }
    }
    const { layLessonsIntoSlot } = await import('../../src/repos/delivery');
    try {
      await layLessonsIntoSlot(lessonId, groupCourseId, planIds.map((id, i) => ({ id, title: `SH-L${i + 1}` })), dates.slice(0, 3));
      const page = await app.inject({ method: 'GET', url: '/schemes', headers: { cookie: session } });
      const token = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
      const cookie = firstCookie(page.headers['set-cookie']) || session;
      const res = await app.inject({
        method: 'POST',
        url: '/map/shift',
        headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
        payload: `slot=${lessonId}%3A${groupCourseId}&date=${dates[0]}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['hx-redirect']).toContain('/map?slot=');
      const bound = await pool.query<{ date: string; lesson_plan_id: string }>(
        `SELECT to_char(o.date, 'YYYY-MM-DD') AS date, oc.lesson_plan_id
         FROM occurrence_courses oc JOIN lesson_occurrences o ON o.id = oc.occurrence_id
         WHERE oc.group_course_id = $1 AND o.date = ANY($2) ORDER BY o.date`,
        [groupCourseId, dates],
      );
      const byDate = new Map(bound.rows.map((r) => [r.date, Number(r.lesson_plan_id)]));
      expect(byDate.get(dates[0]!)).toBe(planIds[0]); // the unfinished week keeps its record
      expect(byDate.get(dates[1]!)).toBe(planIds[0]); // …and repeats next week
      expect(byDate.get(dates[2]!)).toBe(planIds[1]); // the rest shift back one week
      expect(byDate.get(dates[3]!)).toBe(planIds[2]);
    } finally {
      await pool.query(`UPDATE occurrence_courses SET lesson_plan_id = NULL WHERE lesson_plan_id = ANY($1)`, [planIds]);
      await pool.query(`DELETE FROM lesson_occurrences WHERE date = ANY($1)`, [dates]);
      await pool.query(`DELETE FROM lesson_plans WHERE id = ANY($1)`, [planIds]);
      await pool.query(`DELETE FROM units WHERE id = $1`, [unitId]);
      await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [schemeId]);
      await pool.query(`DELETE FROM term_dates WHERE id = $1`, [termId]);
      await pool.query(`UPDATE academic_years SET end_date = $1 WHERE is_current`, [yearEndBefore.rows[0]!.d]);
    }
  });

  it('Per-class teaching-context: form + autosave round-trip (5.9)', async () => {
    const gc = await pool.query<{ id: number }>(`SELECT id FROM group_courses ORDER BY id LIMIT 1`);
    const gcId = Number(gc.rows[0]!.id);
    const before = await pool.query<{ tc: string | null }>(`SELECT teaching_context tc FROM group_courses WHERE id = $1`, [gcId]);
    const form = await app.inject({ method: 'GET', url: `/lesson/group-context/${gcId}`, headers: { cookie: session } });
    expect(form.statusCode).toBe(200);
    expect(form.body).toContain('never an individual pupil');
    const page = await app.inject({ method: 'GET', url: '/schemes', headers: { cookie: session } });
    const token = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
    const cookie = firstCookie(page.headers['set-cookie']) || session;
    try {
      const save = await app.inject({
        method: 'POST',
        url: `/lesson/group-context/${gcId}`,
        headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
        payload: 'text=TEST+class+ctx+%E2%80%94+movement+breaks',
      });
      expect(save.body).toContain('saved');
      const after = await pool.query<{ tc: string | null }>(`SELECT teaching_context tc FROM group_courses WHERE id = $1`, [gcId]);
      expect(after.rows[0]!.tc).toContain('TEST class ctx');
    } finally {
      await pool.query(`UPDATE group_courses SET teaching_context = $2 WHERE id = $1`, [gcId, before.rows[0]!.tc]);
    }
  });

  it('Pupil archive/restore re-renders the row (regression: BIGINT id comparison)', async () => {
    const { createPupil } = await import('../../src/repos/pupils');
    const pupil = await createPupil('TEST Pupilrow');
    const page = await app.inject({ method: 'GET', url: '/pupils', headers: { cookie: session } });
    const token = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
    const cookie = firstCookie(page.headers['set-cookie']) || session;
    try {
      // Before the pool-level BIGINT parser, this returned '' (the row vanished from the page).
      const off = await app.inject({ method: 'POST', url: `/pupils/${pupil.id}/deactivate`, headers: { cookie, 'x-csrf-token': token }, payload: '' });
      expect(off.body).toContain('TEST Pupilrow');
      const on = await app.inject({ method: 'POST', url: `/pupils/${pupil.id}/activate`, headers: { cookie, 'x-csrf-token': token }, payload: '' });
      expect(on.body).toContain('TEST Pupilrow');
    } finally {
      await pool.query(`DELETE FROM pupils WHERE id = $1`, [pupil.id]);
    }
  });

  it('Year-scoping: a draft next year never bleeds into the live views (6.1)', async () => {
    // build a draft year with its own day shape, group and lesson
    const y = await pool.query<{ id: number }>(
      `INSERT INTO academic_years (name, start_date, end_date, is_current) VALUES ('2098/99', '2098-09-01', '2099-08-31', false) RETURNING id`,
    );
    const yearId = Number(y.rows[0]!.id);
    const p = await pool.query<{ id: number }>(
      `INSERT INTO period_definitions (weekday, slot_order, slot_type, label, lesson_index, start_time, end_time, teachable, academic_year_id)
       VALUES (1, 1, 'lesson', 'DRAFT L1', 1, '09:00', '09:50', true, $1) RETURNING id`,
      [yearId],
    );
    const g = await pool.query<{ id: number }>(
      `INSERT INTO groups (name, year_group, academic_year_id) VALUES ('DRAFT-GRP', 'Y7', $1) RETURNING id`,
      [yearId],
    );
    const self = await pool.query<{ id: number }>(`SELECT id FROM staff WHERE is_self`);
    const tl = await pool.query<{ id: number }>(
      `INSERT INTO timetabled_lessons (period_definition_id, purpose, group_id, staff_id) VALUES ($1, 'teaching', $2, $3) RETURNING id`,
      [p.rows[0]!.id, g.rows[0]!.id, self.rows[0]!.id],
    );
    try {
      const { getPeriodDefinitions, getTimetabledLessons } = await import('../../src/repos/timetable');
      // current-year queries see none of it…
      expect((await getPeriodDefinitions()).some((r) => r.label === 'DRAFT L1')).toBe(false);
      expect((await getTimetabledLessons()).some((r) => r.groupName === 'DRAFT-GRP')).toBe(false);
      const tt = await app.inject({ method: 'GET', url: '/timetable', headers: { cookie: session } });
      expect(tt.body).not.toContain('DRAFT-GRP');
      const map = await app.inject({ method: 'GET', url: '/map', headers: { cookie: session } });
      expect(map.body).not.toContain('DRAFT-GRP');
      // …but the year-targeted editor query does
      expect((await getPeriodDefinitions(yearId)).some((r) => r.label === 'DRAFT L1')).toBe(true);
      expect((await getTimetabledLessons(yearId)).some((r) => r.groupName === 'DRAFT-GRP')).toBe(true);
    } finally {
      await pool.query(`DELETE FROM timetabled_lessons WHERE id = $1`, [tl.rows[0]!.id]);
      await pool.query(`DELETE FROM groups WHERE id = $1`, [g.rows[0]!.id]);
      await pool.query(`DELETE FROM period_definitions WHERE id = $1`, [p.rows[0]!.id]);
      await pool.query(`DELETE FROM academic_years WHERE id = $1`, [yearId]);
    }
  });

  it('Setup: tabs render; draft-year terms + day shape + group round-trip (6.2)', async () => {
    const page = await app.inject({ method: 'GET', url: '/setup', headers: { cookie: session } });
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain('Academic years');
    const token = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
    const cookie = firstCookie(page.headers['set-cookie']) || session;
    const hdrs = { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' };
    // create a draft year
    const added = await app.inject({ method: 'POST', url: '/setup/year/add', headers: hdrs, payload: 'name=TEST%2FYR&start=2097-09-01&end=2098-08-31' });
    expect(added.body).toContain('TEST/YR');
    const y = await pool.query<{ id: number }>(`SELECT id FROM academic_years WHERE name = 'TEST/YR'`);
    const yearId = Number(y.rows[0]!.id);
    try {
      // term + period + group in the draft year
      const t = await app.inject({ method: 'POST', url: `/setup/term/add?year=${yearId}`, headers: hdrs, payload: 'name=TEST+Autumn&kind=term&start=2097-09-01&end=2097-12-19' });
      expect(t.body).toContain('TEST Autumn');
      const pd = await app.inject({ method: 'POST', url: `/setup/period/add?year=${yearId}&weekday=1`, headers: hdrs, payload: '' });
      expect(pd.body).toContain('New period');
      const g = await app.inject({ method: 'POST', url: `/setup/group/add?year=${yearId}`, headers: hdrs, payload: 'name=TEST-7XX&year_group=Y7' });
      expect(g.body).toContain('TEST-7XX');
      // the draft never bleeds into the live timetable
      const tt = await app.inject({ method: 'GET', url: '/timetable', headers: { cookie: session } });
      expect(tt.body).not.toContain('TEST-7XX');
      // current year is untouched
      const cur = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM academic_years WHERE is_current AND name = 'TEST/YR'`);
      expect(cur.rows[0]!.n).toBe(0);
    } finally {
      await pool.query(`DELETE FROM groups WHERE academic_year_id = $1`, [yearId]);
      await pool.query(`DELETE FROM period_definitions WHERE academic_year_id = $1`, [yearId]);
      await pool.query(`DELETE FROM term_dates WHERE academic_year_id = $1`, [yearId]);
      await pool.query(`DELETE FROM academic_years WHERE id = $1`, [yearId]);
    }
  });

  it('Rollover: a class moves up with pupils, courses + context; history stays (6.4)', async () => {
    // source: a real active group with a course; target: a draft year
    const src = await pool.query<{ id: number; name: string }>(
      `SELECT g.id, g.name FROM groups g
       WHERE g.active AND g.academic_year_id = (SELECT id FROM academic_years WHERE is_current)
         AND EXISTS (SELECT 1 FROM group_courses gc WHERE gc.group_id = g.id AND gc.active)
       ORDER BY g.id LIMIT 1`,
    );
    const srcId = Number(src.rows[0]!.id);
    const y = await pool.query<{ id: number }>(
      `INSERT INTO academic_years (name, start_date, end_date, is_current) VALUES ('TEST/RO', '2096-09-01', '2097-08-31', false) RETURNING id`,
    );
    const yearId = Number(y.rows[0]!.id);
    // give the source group a class context + a pupil so the carry is observable
    const ctxBefore = await pool.query<{ gc: number; tc: string | null }>(
      `SELECT id AS gc, teaching_context AS tc FROM group_courses WHERE group_id = $1 AND active LIMIT 1`,
      [srcId],
    );
    await pool.query(`UPDATE group_courses SET teaching_context = 'TEST carry ctx' WHERE id = $1`, [ctxBefore.rows[0]!.gc]);
    const pup = await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token) VALUES ('TEST Rollover Pupil', 'PUPIL_TEST_RO') RETURNING id`);
    await pool.query(`INSERT INTO enrolments (pupil_id, group_id, active) VALUES ($1, $2, true) ON CONFLICT (pupil_id, group_id) DO UPDATE SET active = true`, [pup.rows[0]!.id, srcId]);
    const { rolloverGroup, bumpName } = await import('../../src/repos/setup');
    try {
      const newName = bumpName(src.rows[0]!.name) === src.rows[0]!.name ? `${src.rows[0]!.name}-NEXT` : bumpName(src.rows[0]!.name);
      const newId = await rolloverGroup(srcId, yearId, newName);
      expect(newId).not.toBeNull();
      // predecessor chain set
      const chain = await pool.query<{ p: number }>(`SELECT predecessor_group_id p FROM groups WHERE id = $1`, [newId]);
      expect(Number(chain.rows[0]!.p)).toBe(srcId);
      // pupils followed
      const enr = await pool.query<{ n: number }>(
        `SELECT count(*)::int n FROM enrolments WHERE group_id = $1 AND active AND pupil_id = $2`,
        [newId, pup.rows[0]!.id],
      );
      expect(enr.rows[0]!.n).toBe(1);
      // courses + class context followed
      const ctx = await pool.query<{ tc: string | null }>(
        `SELECT teaching_context tc FROM group_courses WHERE group_id = $1 AND course_id = (SELECT course_id FROM group_courses WHERE id = $2)`,
        [newId, ctxBefore.rows[0]!.gc],
      );
      expect(ctx.rows[0]!.tc).toBe('TEST carry ctx');
      // the source group + its enrolments are untouched (history intact)
      const srcStill = await pool.query<{ active: boolean }>(`SELECT active FROM groups WHERE id = $1`, [srcId]);
      expect(srcStill.rows[0]!.active).toBe(true);
      // idempotent: same name again → skipped
      expect(await rolloverGroup(srcId, yearId, newName)).toBeNull();
      // the wizard page renders the moved class as done
      const page = await app.inject({ method: 'GET', url: `/setup/rollover?from=${(await pool.query<{ id: number }>(`SELECT id FROM academic_years WHERE is_current`)).rows[0]!.id}&to=${yearId}`, headers: { cookie: session } });
      expect(page.body).toContain('moved up');
    } finally {
      await pool.query(`DELETE FROM enrolments WHERE pupil_id = $1`, [pup.rows[0]!.id]);
      await pool.query(`DELETE FROM pupils WHERE id = $1`, [pup.rows[0]!.id]);
      await pool.query(`UPDATE group_courses SET teaching_context = $2 WHERE id = $1`, [ctxBefore.rows[0]!.gc, ctxBefore.rows[0]!.tc]);
      await pool.query(`DELETE FROM enrolments WHERE group_id IN (SELECT id FROM groups WHERE academic_year_id = $1)`, [yearId]);
      await pool.query(`DELETE FROM group_courses WHERE group_id IN (SELECT id FROM groups WHERE academic_year_id = $1)`, [yearId]);
      await pool.query(`DELETE FROM groups WHERE academic_year_id = $1`, [yearId]);
      await pool.query(`DELETE FROM academic_years WHERE id = $1`, [yearId]);
    }
  });

  it('Onboarding: configured instance shows the checklist; identity endpoint is dead (6.5)', async () => {
    // this suite runs with the env password set → /welcome is the authed checklist, not the form
    const w = await app.inject({ method: 'GET', url: '/welcome', headers: { cookie: session } });
    expect(w.statusCode).toBe(200);
    expect(w.body).toContain('Getting set up');
    expect(w.body).toContain('Academic year');
    // unauthenticated → login (never the identity form once a password exists)
    const anon = await app.inject({ method: 'GET', url: '/welcome' });
    expect(anon.statusCode).toBe(302);
    expect(anon.headers.location).toBe('/login');
    // the one-time identity endpoint refuses once configured
    const page = await app.inject({ method: 'GET', url: '/setup', headers: { cookie: session } });
    const token = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
    const cookie = firstCookie(page.headers['set-cookie']) || session;
    const id = await app.inject({
      method: 'POST',
      url: '/welcome/identity',
      headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
      payload: 'name=X&school=Y&password=longenough1&password2=longenough1',
    });
    expect(id.statusCode).toBe(403);
  });

  it('Lesson resources: empty-plan guard + degrade writes nothing (resource generation)', async () => {
    const c = await pool.query<{ id: number }>(`SELECT id FROM courses WHERE active ORDER BY id LIMIT 1`);
    const s = await pool.query<{ id: number }>(
      `INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, 'TEST res-gen', 92, false) RETURNING id`,
      [c.rows[0]!.id],
    );
    const u = await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1, 'U', 1) RETURNING id`, [s.rows[0]!.id]);
    const empty = await pool.query<{ id: number }>(
      `INSERT INTO lesson_plans (unit_id, course_id, title, display_order) VALUES ($1, $2, 'Empty plan', 1) RETURNING id`,
      [u.rows[0]!.id, c.rows[0]!.id],
    );
    const full = await pool.query<{ id: number }>(
      `INSERT INTO lesson_plans (unit_id, course_id, title, display_order, objectives, outline) VALUES ($1, $2, 'Full plan', 2, 'O', '1. step (5 min)') RETURNING id`,
      [u.rows[0]!.id, c.rows[0]!.id],
    );
    const page = await app.inject({ method: 'GET', url: '/schemes', headers: { cookie: session } });
    const token = /x-csrf-token":"([^"]+)"/.exec(page.body)?.[1] ?? '';
    const cookie = firstCookie(page.headers['set-cookie']) || session;
    const post = (url: string) => app.inject({ method: 'POST', url, headers: { cookie, 'x-csrf-token': token }, payload: '' });
    try {
      // no objectives/outline → guard message before any AI call
      const r1 = await post(`/schemes/plan/${empty.rows[0]!.id}/resources-ai`);
      expect(r1.body).toContain('resources are generated from them');
      // with content but no key → degrades, creates nothing
      const before = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM resources`);
      const r2 = await post(`/schemes/plan/${full.rows[0]!.id}/resources-ai`);
      expect(r2.statusCode).toBe(200);
      expect(r2.body).not.toContain('resources ready');
      const after = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM resources`);
      expect(after.rows[0]!.n).toBe(before.rows[0]!.n);
      const links = await pool.query<{ n: number }>(`SELECT count(*)::int n FROM resource_links WHERE lesson_plan_id = $1`, [full.rows[0]!.id]);
      expect(links.rows[0]!.n).toBe(0);
    } finally {
      await pool.query(`DELETE FROM lesson_plans WHERE unit_id = $1`, [u.rows[0]!.id]);
      await pool.query(`DELETE FROM units WHERE id = $1`, [u.rows[0]!.id]);
      await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [s.rows[0]!.id]);
    }
  });

  it('Curriculum history: coverage follows the predecessor chain across years', async () => {
    const { getCourseCurriculumHistory } = await import('../../src/repos/curriculumHistory');
    // throwaway course + a two-year class chain with one taught lesson in the OLD year
    const course = await pool.query<{ id: number }>(`INSERT INTO courses (name) VALUES ('TEST hist course') RETURNING id`);
    const cId = Number(course.rows[0]!.id);
    const curYear = await pool.query<{ id: number }>(`SELECT id FROM academic_years WHERE is_current`);
    const oldYear = await pool.query<{ id: number }>(
      `INSERT INTO academic_years (name, start_date, end_date, is_current) VALUES ('TEST/HIST', '2000-09-01', '2001-08-31', false) RETURNING id`,
    );
    const gOld = await pool.query<{ id: number }>(
      `INSERT INTO groups (name, academic_year_id) VALUES ('TEST-7H', $1) RETURNING id`,
      [oldYear.rows[0]!.id],
    );
    const gNew = await pool.query<{ id: number }>(
      `INSERT INTO groups (name, academic_year_id, predecessor_group_id) VALUES ('TEST-8H', $1, $2) RETURNING id`,
      [curYear.rows[0]!.id, gOld.rows[0]!.id],
    );
    const gcOld = await pool.query<{ id: number }>(`INSERT INTO group_courses (group_id, course_id) VALUES ($1, $2) RETURNING id`, [gOld.rows[0]!.id, cId]);
    await pool.query(`INSERT INTO group_courses (group_id, course_id) VALUES ($1, $2)`, [gNew.rows[0]!.id, cId]);
    const sch = await pool.query<{ id: number }>(
      `INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, 'TEST hist scheme', 1, true) RETURNING id`,
    [cId]);
    const unit = await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1, 'Old unit', 1) RETURNING id`, [sch.rows[0]!.id]);
    const plan = await pool.query<{ id: number }>(
      `INSERT INTO lesson_plans (unit_id, course_id, title, display_order) VALUES ($1, $2, 'Taught last year', 1) RETURNING id`,
      [unit.rows[0]!.id, cId],
    );
    // a taught occurrence in the old year, bound to the old group's group_course
    const slot = await pool.query<{ id: number }>(`SELECT id FROM timetabled_lessons WHERE purpose='teaching' ORDER BY id LIMIT 1`);
    const occ = await pool.query<{ id: number }>(
      `INSERT INTO lesson_occurrences (timetabled_lesson_id, date) VALUES ($1, '2001-01-08')
       ON CONFLICT (timetabled_lesson_id, date) DO UPDATE SET timetabled_lesson_id = EXCLUDED.timetabled_lesson_id RETURNING id`,
      [slot.rows[0]!.id],
    );
    await pool.query(
      `INSERT INTO occurrence_courses (occurrence_id, group_course_id, lesson_plan_id) VALUES ($1, $2, $3)
       ON CONFLICT (occurrence_id, group_course_id) DO UPDATE SET lesson_plan_id = EXCLUDED.lesson_plan_id`,
      [occ.rows[0]!.id, gcOld.rows[0]!.id, plan.rows[0]!.id],
    );
    try {
      const h = await getCourseCurriculumHistory(cId);
      expect(h.priorSchemes.some((s) => s.title === 'TEST hist scheme' && s.unitTitles.includes('Old unit'))).toBe(true);
      // the CURRENT-year class (TEST-8H) reports last year's lesson via its predecessor
      const cls = h.classCoverage.find((c) => c.groupName === 'TEST-8H');
      expect(cls).toBeDefined();
      expect(cls!.coveredCount).toBe(1);
      expect(cls!.recentCovered).toContain('Taught last year');
    } finally {
      await pool.query(`DELETE FROM lesson_occurrences WHERE date = '2001-01-08'`);
      await pool.query(`DELETE FROM lesson_plans WHERE id = $1`, [plan.rows[0]!.id]);
      await pool.query(`DELETE FROM units WHERE id = $1`, [unit.rows[0]!.id]);
      await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [sch.rows[0]!.id]);
      await pool.query(`DELETE FROM group_courses WHERE course_id = $1`, [cId]);
      await pool.query(`DELETE FROM groups WHERE id IN ($1, $2)`, [gNew.rows[0]!.id, gOld.rows[0]!.id]);
      await pool.query(`DELETE FROM academic_years WHERE id = $1`, [oldYear.rows[0]!.id]);
      await pool.query(`DELETE FROM courses WHERE id = $1`, [cId]);
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

  it('Resource where-used: badge count + usage panel list plans/units (review fix)', async () => {
    // a resource linked to a plan (any) — or link one temporarily
    const linked = await pool.query<{ rid: number }>(
      `SELECT rl.resource_id AS rid FROM resource_links rl WHERE rl.lesson_plan_id IS NOT NULL LIMIT 1`,
    );
    let rid = linked.rows[0]?.rid;
    let tempLink = false;
    if (!rid) {
      const r = await pool.query<{ id: number }>(`SELECT id FROM resources WHERE active ORDER BY id LIMIT 1`);
      const p = await pool.query<{ id: number }>(`SELECT id FROM lesson_plans ORDER BY id LIMIT 1`);
      await pool.query(`INSERT INTO resource_links (resource_id, lesson_plan_id) VALUES ($1, $2)`, [r.rows[0]!.id, p.rows[0]!.id]);
      rid = r.rows[0]!.id;
      tempLink = true;
    }
    try {
      const usage = await app.inject({ method: 'GET', url: `/resources/${rid}/usage`, headers: { cookie: session } });
      expect(usage.statusCode).toBe(200);
      expect(usage.body).toMatch(/lesson|unit source/);
      expect(usage.body).toContain('/schemes?course=');
    } finally {
      if (tempLink) await pool.query(`DELETE FROM resource_links WHERE resource_id = $1 AND lesson_plan_id IS NOT NULL`, [rid]);
    }
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
