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
import { listAllSlots, slotSchedule, type ScheduleEntry, type SlotOption } from '../repos/delivery';
import { upcomingSlotDates, weekdayName } from '../services/delivery';

const PAST_WEEKS = 6;
const FUTURE_WEEKS = 12;

function slotKey(s: SlotOption): string {
  return `${s.lessonId}:${s.groupCourseId}`;
}

function slotLabel(s: SlotOption): string {
  return `${s.groupName ?? 'group'} · ${s.courseName} · ${weekdayName(s.weekday)} ${s.periodLabel}`;
}

function renderRow(date: string, e: ScheduleEntry | undefined, kind: 'past' | 'today' | 'future', lessonId: number): string {
  const open = `/lesson?lesson=${lessonId}&date=${esc(date)}`;
  const title = e?.planTitle
    ? `<a href="${open}">${esc(e.planTitle)}</a>${e.adapted ? ' <span class="map-adapted">✏ adapted</span>' : ''}`
    : `<a href="${open}" class="muted">— nothing planned</a>`;
  const status =
    kind === 'past'
      ? e?.stoppingPoint
        ? `<span class="map-stop">stopped at ${esc(e.stoppingPoint)}</span>`
        : '<span class="muted">no record</span>'
      : kind === 'today'
        ? '<strong class="map-today">today</strong>'
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
        const futureDates = upcomingSlotDates(chosen.weekday, addDays(today, 1), FUTURE_WEEKS, ctx.terms);

        const pastRows = entries
          .filter((e) => e.date < today)
          .map((e) => renderRow(e.date, e, 'past', chosen.lessonId));
        const todayRow = byDate.has(today) ? [renderRow(today, byDate.get(today), 'today', chosen.lessonId)] : [];
        const futureRows = futureDates.map((d) => renderRow(d, byDate.get(d), 'future', chosen.lessonId));

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
            <p class="muted">Last ${PAST_WEEKS} weeks taught, then the next ${FUTURE_WEEKS} school weeks (holidays skipped). ✏ = adapted for this group. Lay units down from the <a href="/schemes">Schemes</a> page.</p>
            <table class="map-table">
              <thead><tr><th>Week</th><th>Lesson</th><th></th></tr></thead>
              <tbody>${rows || '<tr><td colspan="3" class="muted">nothing recorded or planned in this window</td></tr>'}</tbody>
            </table>
          </section>`;
      }
    } catch {
      body = '<section class="card"><h1>Curriculum map</h1><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Map', body, authed: true, csrfToken: csrf }));
  });
}
