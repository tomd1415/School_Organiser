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
import { getCurrentYearEnd, layLessonsIntoSlot, listAllSlots, slotSchedule, type ScheduleEntry, type SlotOption } from '../repos/delivery';
import { upcomingSlotDates, weekdayName } from '../services/delivery';

const PAST_WEEKS = 6;
const FUTURE_WEEKS = 12;

function slotKey(s: SlotOption): string {
  return `${s.lessonId}:${s.groupCourseId}`;
}

function slotLabel(s: SlotOption): string {
  return `${s.groupName ?? 'group'} · ${s.courseName} · ${weekdayName(s.weekday)} ${s.periodLabel}`;
}

function renderRow(
  date: string,
  e: ScheduleEntry | undefined,
  kind: 'past' | 'today' | 'future',
  lessonId: number,
  courseId: number,
  shift?: { slotKey: string; today: string },
): string {
  const open = `/lesson?lesson=${lessonId}&date=${esc(date)}`;
  const title = e?.planTitle
    ? `<a href="${open}">${esc(e.planTitle)}</a>${e.adapted ? ' <span class="map-adapted">✏ adapted</span>' : ''}` +
      ` <a class="map-master" href="/schemes?course=${courseId}" title="edit the master lesson on the Schemes page">master ↗</a>`
    : `<a href="${open}" class="muted">— nothing planned</a>`;
  // 5.9: carry-over — a recent lesson that didn't finish repeats next week; the rest shift back.
  const canShift = shift && e?.planTitle && kind !== 'future' && date >= addDays(shift.today, -14);
  const shiftBtn = canShift
    ? ` <button type="button" class="link map-shift" hx-post="/map/shift" hx-vals='{"slot":"${shift.slotKey}","date":"${esc(date)}"}'
        hx-confirm="Continue this lesson next week? Everything after it shifts back one school week (holidays still skipped)." title="didn't finish — repeat next week, shift the rest">↻ continue next week</button>`
    : '';
  const status =
    kind === 'past'
      ? e?.stoppingPoint
        ? `<span class="map-stop">stopped at ${esc(e.stoppingPoint)}</span>${shiftBtn}`
        : `<span class="muted">no record</span>${shiftBtn}`
      : kind === 'today'
        ? `<strong class="map-today">today</strong>${shiftBtn}`
        : '';
  return `<tr class="map-${kind}"><td class="map-date">${esc(date)}</td><td>${title}</td><td>${status}</td></tr>`;
}

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
        const byDate = new Map(entries.map((e) => [e.date, e]));
        const yearEnd = await getCurrentYearEnd();
        const futureDates = upcomingSlotDates(chosen.weekday, addDays(today, 1), FUTURE_WEEKS, ctx.terms).filter(
          (d) => !yearEnd || d <= yearEnd,
        );

        const shift = { slotKey: slotKey(chosen), today };
        const pastRows = entries
          .filter((e) => e.date < today)
          .map((e) => renderRow(e.date, e, 'past', chosen.lessonId, chosen.courseId, shift));
        const todayRow = byDate.has(today) ? [renderRow(today, byDate.get(today), 'today', chosen.lessonId, chosen.courseId, shift)] : [];
        const futureRows = futureDates.map((d) => renderRow(d, byDate.get(d), 'future', chosen.lessonId, chosen.courseId));

        const opts = slots
          .map((s) => `<option value="${slotKey(s)}"${slotKey(s) === slotKey(chosen) ? ' selected' : ''}>${esc(slotLabel(s))}</option>`)
          .join('');
        const rows = [...pastRows, ...todayRow, ...futureRows].join('');
        body = `
          <section class="card map" hx-headers='{"x-csrf-token":"${csrf}"}'>
            <h1>Curriculum map</h1>
            <form method="get" action="/map" class="map-pick">
              <label>Group &amp; weekly slot
                <select name="slot" onchange="this.form.submit()">${opts}</select>
              </label>
              <noscript><button type="submit">Go</button></noscript>
            </form>
            <p class="muted">Last ${PAST_WEEKS} weeks taught, then the next ${FUTURE_WEEKS} school weeks (holidays skipped). ✏ = adapted for this group.
              <a href="/schemes?course=${chosen.courseId}">fill this slot from a downloaded unit →</a></p>
            <div class="table-scroll"><table class="map-table">
              <thead><tr><th>Week</th><th>Lesson</th><th></th></tr></thead>
              <tbody>${rows || '<tr><td colspan="3" class="muted">nothing recorded or planned in this window</td></tr>'}</tbody>
            </table></div>
          </section>`;
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
}
