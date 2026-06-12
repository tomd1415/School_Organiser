import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { addDays, localParts, weekdayOf } from '../lib/time';
import { getPeriodDefinitions, getTimetabledLessons } from '../repos/timetable';
import { buildOverseenWeek, type OverseenLesson } from '../services/timetable';

const TZ = 'Europe/London';
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const Query = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

/** Monday of the week containing `isoDate`; on the weekend, the upcoming Monday. */
function mondayOf(isoDate: string): string {
  const wd = weekdayOf(isoDate);
  return wd >= 6 ? addDays(isoDate, 8 - wd) : addDays(isoDate, 1 - wd);
}

function fmtShort(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'short' }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

function renderLesson(l: OverseenLesson, date: string): string {
  const colour = l.courses[0]?.colour ?? '#94a3b8';
  const heading = l.groupName ? esc(l.groupName) : esc(l.purpose);
  const courses = l.courses.map((c) => esc(c.name)).join(' · ');
  return `<li class="ov-item" style="border-left-color:${esc(colour)}">
    <a href="/lesson?lesson=${l.lessonId}&date=${esc(date)}">
      <span class="ov-time">${esc(l.start)}–${esc(l.end)}</span>
      <span class="ov-group">⚑ ${heading}</span>
      ${courses ? `<span class="ov-course">${courses}</span>` : ''}
      ${l.staffName ? `<span class="ov-staff muted">${esc(l.staffName)}</span>` : ''}
    </a></li>`;
}

export function registerOverseeRoutes(app: FastifyInstance): void {
  app.get('/oversee', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = Query.safeParse(req.query);
    const today = localParts(new Date(), TZ).isoDate;
    const ref = parsed.success && parsed.data.date ? parsed.data.date : today;
    const monday = mondayOf(ref);
    const weekDates = [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
    const prev = addDays(monday, -7);
    const next = addDays(monday, 7);

    let content: string;
    try {
      const [periods, lessons] = await Promise.all([getPeriodDefinitions(), getTimetabledLessons()]);
      const byDay = new Map<number, OverseenLesson[]>();
      for (const o of buildOverseenWeek(periods, lessons)) {
        const arr = byDay.get(o.weekday) ?? [];
        arr.push(o);
        byDay.set(o.weekday, arr);
      }
      const days = [1, 2, 3, 4, 5]
        .map((wd, i) => {
          const list = byDay.get(wd) ?? [];
          if (list.length === 0) return '';
          const date = weekDates[i] ?? today;
          return `<section class="ov-day${date === today ? ' ov-today' : ''}">
            <h2>${esc(DAY_NAMES[i] ?? '')} <span class="muted">${esc(fmtShort(date))}</span></h2>
            <ul class="ov-list">${list.map((l) => renderLesson(l, date)).join('')}</ul>
          </section>`;
        })
        .join('');
      content = days || '<p class="muted">No lessons to oversee this week.</p>';
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      content = '<p class="muted">Unavailable — the database is not reachable.</p>';
    }

    const body = `
      <section class="card">
        <div class="tt-head">
          <h1>Lessons I oversee</h1>
          <nav class="tt-weeknav">
            <a href="/oversee?date=${esc(prev)}">◀ Prev</a>
            <a href="/oversee">This week</a>
            <a href="/oversee?date=${esc(next)}">Next ▶</a>
          </nav>
        </div>
        <p class="muted">TA-led lessons you supervise rather than teach. Open one for its plan, resources and notes.</p>
        ${content}
      </section>`;
    return reply.type('text/html').send(layout({ title: 'Lessons I oversee', body, authed: true, csrfToken: reply.generateCsrf() }));
  });
}
