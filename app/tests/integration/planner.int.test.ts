import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { getClockContext } from '../../src/repos/clock';
import { localParts } from '../../src/lib/time';
import { classPlacements, classSlots, getCurrentYearEnd } from '../../src/repos/delivery';
import { upcomingClassSlots } from '../../src/services/delivery';

// Drives the /planner page and its /planner/place endpoint (insert + pull) against the dev DB.
// To avoid disturbing real bindings it acts only on an EMPTY far-future position of a real class,
// and clears it again afterwards.
let app: FastifyInstance;
let session = '';

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
  expect(res.statusCode).toBe(302);
  session = firstCookie(res.headers['set-cookie']) || pre;
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('planner (13.5 — integration, needs the dev DB up)', () => {
  it('renders the week × slot timeline with a class picker', async () => {
    const res = await app.inject({ method: 'GET', url: '/planner', headers: { cookie: session } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Planner');
    // either a real grid (slots exist) or the friendly empty-state — both are valid environments
    expect(res.body).toMatch(/pl-grid|No weekly teaching slots/);
  });

  it('insert places a lesson at an empty slot, then pull removes it (round-trip through the route)', async () => {
    // the class with the most weekly slots (so the planner has real columns)
    const top = await pool.query<{ gc: number; course: number }>(
      `SELECT tlc.group_course_id AS gc, gc.course_id AS course
       FROM timetabled_lesson_courses tlc
       JOIN timetabled_lessons tl ON tl.id = tlc.timetabled_lesson_id
       JOIN group_courses gc ON gc.id = tlc.group_course_id
       WHERE tl.purpose = 'teaching'
       GROUP BY tlc.group_course_id, gc.course_id
       ORDER BY count(*) DESC, gc LIMIT 1`,
    );
    if (!top.rows[0]) return; // no teaching slots in this environment — nothing to drive
    const gc = Number(top.rows[0].gc);
    const courseId = Number(top.rows[0].course);

    // Reproduce the route's window and pick an EMPTY position far enough out to be safe to touch.
    const ctx = await getClockContext();
    const today = localParts(new Date(), ctx.tz).isoDate;
    const yearEnd = await getCurrentYearEnd();
    const cols = await classSlots(gc);
    const slots = cols.map((c) => ({ timetabledLessonId: c.timetabledLessonId, weekday: c.weekday, slotOrder: c.slotOrder }));
    const stream = upcomingClassSlots(slots, today, cols.length * 28, ctx.terms).filter((s) => !yearEnd || s.date <= yearEnd);
    const positions = await classPlacements(gc, stream);
    const empty = [...positions].reverse().find((p) => p.lessonPlanId == null);
    if (!empty) return; // fully booked — skip rather than disturb real bindings

    const plan = Number(
      (await pool.query<{ id: number }>(`INSERT INTO lesson_plans (course_id, title, display_order) VALUES ($1, 'PLANNER-TEST', 999) RETURNING id`, [courseId])).rows[0]!.id,
    );
    // a throwaway one-lesson unit, for the drag-a-whole-unit drop
    const schemeId = Number(
      (await pool.query<{ id: number }>(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1, 'PLANNER-TEST scheme', 96, false) RETURNING id`, [courseId])).rows[0]!.id,
    );
    const unitId = Number((await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1, 'PT unit', 1) RETURNING id`, [schemeId])).rows[0]!.id);
    const unitPlan = Number(
      (await pool.query<{ id: number }>(`INSERT INTO lesson_plans (unit_id, course_id, title, display_order) VALUES ($1, $2, 'PT-U1', 1) RETURNING id`, [unitId, courseId])).rows[0]!.id,
    );
    // a CSRF token + matching cookie from an authed page
    const seed = await app.inject({ method: 'GET', url: '/planner', headers: { cookie: session } });
    const csrf = /x-csrf-token":"([^"]+)"/.exec(seed.body)?.[1] ?? '';
    const cookie = firstCookie(seed.headers['set-cookie']) || session;
    const headers = { cookie, 'x-csrf-token': csrf, 'content-type': 'application/x-www-form-urlencoded' };
    const bound = async () =>
      (
        await pool.query<{ n: number }>(
          `SELECT count(*)::int n FROM occurrence_courses oc JOIN lesson_occurrences o ON o.id = oc.occurrence_id
           WHERE oc.group_course_id = $1 AND o.timetabled_lesson_id = $2 AND o.date = $3 AND oc.lesson_plan_id = $4`,
          [gc, empty.timetabledLessonId, empty.date, plan],
        )
      ).rows[0]!.n;

    try {
      const ins = await app.inject({
        method: 'POST',
        url: '/planner/place',
        headers,
        payload: `gc=${gc}&op=insert&date=${empty.date}&tll=${empty.timetabledLessonId}&plan=${plan}`,
      });
      expect(ins.statusCode).toBe(200);
      expect(ins.headers['hx-redirect']).toBe(`/planner?gc=${gc}`);
      expect(await bound()).toBe(1); // the lesson is now bound at that slot

      // undo the insert → the slot is empty again
      const undo = await app.inject({ method: 'POST', url: '/planner/place', headers, payload: `gc=${gc}&op=undo` });
      expect(undo.statusCode).toBe(200);
      expect(await bound()).toBe(0);
      // a second undo has nothing to restore
      const undo2 = await app.inject({ method: 'POST', url: '/planner/place', headers, payload: `gc=${gc}&op=undo` });
      expect(undo2.statusCode).toBe(400);
      // re-place it so the pull step below has something to remove
      await app.inject({ method: 'POST', url: '/planner/place', headers, payload: `gc=${gc}&op=insert&date=${empty.date}&tll=${empty.timetabledLessonId}&plan=${plan}` });
      expect(await bound()).toBe(1);

      const pull = await app.inject({
        method: 'POST',
        url: '/planner/place',
        headers,
        payload: `gc=${gc}&op=pull&date=${empty.date}&tll=${empty.timetabledLessonId}`,
      });
      expect(pull.statusCode).toBe(200);
      expect(await bound()).toBe(0); // removed again

      // validation: a past date is refused
      const past = await app.inject({ method: 'POST', url: '/planner/place', headers, payload: `gc=${gc}&op=insert&date=2000-01-03&tll=${empty.timetabledLessonId}&plan=${plan}` });
      expect(past.statusCode).toBe(400);

      // drag a WHOLE unit onto the empty slot → its (single) lesson lands there
      const unitDrop = await app.inject({ method: 'POST', url: '/planner/place', headers, payload: `gc=${gc}&op=unit&unit=${unitId}&date=${empty.date}&tll=${empty.timetabledLessonId}` });
      expect(unitDrop.statusCode).toBe(200);
      const unitBound = (
        await pool.query<{ n: number }>(
          `SELECT count(*)::int n FROM occurrence_courses oc JOIN lesson_occurrences o ON o.id = oc.occurrence_id
           WHERE oc.group_course_id = $1 AND o.timetabled_lesson_id = $2 AND o.date = $3 AND oc.lesson_plan_id = $4`,
          [gc, empty.timetabledLessonId, empty.date, unitPlan],
        )
      ).rows[0]!.n;
      expect(unitBound).toBe(1);
      // a unit op with no unit id is rejected
      const noUnit = await app.inject({ method: 'POST', url: '/planner/place', headers, payload: `gc=${gc}&op=unit&date=${empty.date}&tll=${empty.timetabledLessonId}` });
      expect(noUnit.statusCode).toBe(400);

      // the unit's lesson is now bound at the empty slot — pin it, then prove a pinned slot refuses writes
      const lock = await app.inject({ method: 'POST', url: '/planner/place', headers, payload: `gc=${gc}&op=lock&date=${empty.date}&tll=${empty.timetabledLessonId}` });
      expect(lock.statusCode).toBe(200);
      const lockedFlag = (
        await pool.query<{ planner_locked: boolean }>(
          `SELECT oc.planner_locked FROM occurrence_courses oc JOIN lesson_occurrences o ON o.id = oc.occurrence_id
           WHERE oc.group_course_id = $1 AND o.timetabled_lesson_id = $2 AND o.date = $3`,
          [gc, empty.timetabledLessonId, empty.date],
        )
      ).rows[0]!.planner_locked;
      expect(lockedFlag).toBe(true);
      const ontoPinned = await app.inject({ method: 'POST', url: '/planner/place', headers, payload: `gc=${gc}&op=insert&date=${empty.date}&tll=${empty.timetabledLessonId}&plan=${plan}` });
      expect(ontoPinned.statusCode).toBe(400); // can't drop onto a pinned slot
      const unlock = await app.inject({ method: 'POST', url: '/planner/place', headers, payload: `gc=${gc}&op=unlock&date=${empty.date}&tll=${empty.timetabledLessonId}` });
      expect(unlock.statusCode).toBe(200);
    } finally {
      // null the binding (pull already did, but be defensive) and drop the throwaway plan; the empty
      // far-future occurrence is harmless and reused across runs, so it's left in place.
      await pool.query(
        `UPDATE occurrence_courses SET lesson_plan_id = NULL, planner_locked = false WHERE group_course_id = $1
         AND occurrence_id IN (SELECT id FROM lesson_occurrences WHERE timetabled_lesson_id = $2 AND date = $3)`,
        [gc, empty.timetabledLessonId, empty.date],
      );
      await pool.query(`DELETE FROM lesson_plans WHERE id = ANY($1)`, [[plan, unitPlan]]);
      await pool.query(`DELETE FROM units WHERE id = $1`, [unitId]);
      await pool.query(`DELETE FROM schemes_of_work WHERE id = $1`, [schemeId]);
    }
  });
});
