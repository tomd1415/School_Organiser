// 5.6: the medium-term plan / curriculum map — for one group's weekly slot, the term calendar of
// which lesson lands which week: recently taught (with stopping points), today, and the upcoming
// weeks (holiday-aware), with adapted-for-this-group marked. Read-only; editing stays on the
// lesson screen and the schemes page.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { getClockContext } from '../repos/clock';
import { localParts, addDays } from '../lib/time';
import { getCurrentYearEnd, layLessonsIntoSlot, listAllSlots, moveBinding, slotSchedule } from '../repos/delivery';
import { upcomingSlotDates } from '../services/delivery';
import { renderMapPage, slotKey } from '../lib/mapView';

const PAST_WEEKS = 6;
const FUTURE_WEEKS = 12;

export function registerMapRoutes(app: FastifyInstance): void {
  app.get('/map', { preHandler: requireAuth }, async (req, reply) => {
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const slots = await listAllSlots();
      if (slots.length === 0) {
        body = '<section class="card"><h1>Curriculum map</h1><p class="muted">No weekly teaching slots yet.</p></section>';
      } else {
        const q = z.object({ slot: z.string().regex(/^\d+:\d+$/).optional() }).safeParse(req.query);
        const chosen = (q.success && q.data.slot && slots.find((s) => slotKey(s) === q.data.slot)) || slots[0]!;
        const ctx = await getClockContext();
        const today = localParts(new Date(), ctx.tz).isoDate;

        // Past + today come from real occurrences; future weeks from the holiday-aware date walk.
        const pastFrom = addDays(today, -7 * PAST_WEEKS);
        const entries = await slotSchedule(chosen.lessonId, chosen.groupCourseId, pastFrom, addDays(today, 7 * FUTURE_WEEKS));
        const yearEnd = await getCurrentYearEnd();
        const futureDates = upcomingSlotDates(chosen.weekday, addDays(today, 1), FUTURE_WEEKS, ctx.terms).filter(
          (d) => !yearEnd || d <= yearEnd,
        );

        // C1: a kit checklist for the weeks ahead — every bound lesson from today on that names kit, so
        // the teacher can gather equipment in advance (only materialised/bound weeks carry a plan + kit).
        const upcomingKit = entries
          .filter((e) => e.date >= today && e.lessonPlanId != null && (e.kitNeeded ?? '').trim() !== '')
          .map((e) => ({ date: e.date, kit: (e.kitNeeded ?? '').trim() }));

        body = renderMapPage({
          slots,
          chosen,
          entries,
          futureDates,
          today,
          upcomingKit,
          pastWeeks: PAST_WEEKS,
          futureWeeks: FUTURE_WEEKS,
          csrf,
        });
      }
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      body = '<section class="card"><h1>Curriculum map</h1><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Map', body, authed: true, csrfToken: csrf }));
  });

  // 5.9 carry-over: the lesson at `date` didn't finish → it repeats at the slot's next occurrence
  // and every later bound lesson shifts back one school week. Never rebinds anything before today.
  app.post('/map/shift', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const b = z
      .object({ slot: z.string().regex(/^\d+:\d+$/), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    const [lessonId, groupCourseId] = b.data.slot.split(':').map(Number) as [number, number];
    const slots = await listAllSlots();
    const chosen = slots.find((s) => Number(s.lessonId) === lessonId && Number(s.groupCourseId) === groupCourseId);
    if (!chosen) return reply.code(404).send('');
    const ctx = await getClockContext();
    const today = localParts(new Date(), ctx.tz).isoDate;

    // The bound sequence from `date` onwards, in date order — this is what shifts.
    const entries = (await slotSchedule(lessonId, groupCourseId, b.data.date, addDays(b.data.date, 7 * 60)))
      .filter((e) => e.lessonPlanId != null);
    if (!entries.length) return reply.code(400).send('nothing bound on that date');
    const seq = entries.map((e) => ({ id: e.lessonPlanId as number, title: e.planTitle ?? '' }));

    // New dates start after `date`, but never before today (history is never rewritten).
    const from = addDays(b.data.date, 1) < today ? today : addDays(b.data.date, 1);
    const yearEnd = await getCurrentYearEnd();
    const dates = upcomingSlotDates(chosen.weekday, from, seq.length, ctx.terms).filter((d) => !yearEnd || d <= yearEnd);
    await layLessonsIntoSlot(lessonId, groupCourseId, seq, dates);
    // If the shift pushes the tail past the end of the year, those lessons can't be re-placed and their
    // bindings are dropped — tell the teacher instead of losing them silently (#22).
    const overflow = seq.length - dates.length;
    if (overflow > 0) {
      return reply
        .type('text/html')
        .send(`<p class="error">Shifted what fits — but the last ${overflow} lesson${overflow === 1 ? '' : 's'} fall past the end of the school year and weren't re-placed; re-lay ${overflow === 1 ? 'it' : 'them'} next year. <a href="/map?slot=${esc(b.data.slot)}">view the map →</a></p>`);
    }
    reply.header('HX-Redirect', `/map?slot=${b.data.slot}`);
    return reply.send('');
  });

  // C3 drag-to-shift: move ONE lesson's binding from one future week to another (swap if occupied).
  app.post('/map/move', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const b = z
      .object({
        slot: z.string().regex(/^\d+:\d+$/),
        from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    const [lessonId, groupCourseId] = b.data.slot.split(':').map(Number) as [number, number];
    const slots = await listAllSlots();
    if (!slots.some((s) => Number(s.lessonId) === lessonId && Number(s.groupCourseId) === groupCourseId)) return reply.code(404).send('');
    const ctx = await getClockContext();
    const today = localParts(new Date(), ctx.tz).isoDate;
    if (b.data.from < today || b.data.to < today) return reply.code(400).send('history is fixed'); // never rewrite past weeks
    await moveBinding(lessonId, groupCourseId, b.data.from, b.data.to);
    reply.header('HX-Redirect', `/map?slot=${b.data.slot}`);
    return reply.send('');
  });
}
