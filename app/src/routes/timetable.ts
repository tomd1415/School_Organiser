import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { addDays, localParts, weekdayOf } from '../lib/time';
import { getPeriodDefinitions, getTimetabledLessons } from '../repos/timetable';
import { listExceptionsBetween } from '../repos/exceptions';
import { buildWeekGrid, type GridCell, type GridLesson } from '../services/timetable';

const TZ = 'Europe/London';
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const Query = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), year: z.coerce.number().int().positive().optional() });

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

function purposeLabel(purpose: string): string {
  switch (purpose) {
    case 'free':
      return 'Free';
    case 'form':
      return 'Form';
    case 'club':
      return 'Computing Club';
    case 'open_room':
      return 'Open room';
    case 'duty':
      return 'Duty';
    case 'meeting':
      return 'Meeting';
    default:
      return purpose;
  }
}

function renderLesson(l: GridLesson, date: string, flagged = false): string {
  const colour = l.courses[0]?.colour ?? '#94a3b8';
  const flag = l.isSelf ? '' : '⚑ ';
  const heading = l.groupName ? esc(l.groupName) : esc(purposeLabel(l.purpose));
  const courses = l.courses.map((c) => esc(c.name)).join(' · ');
  const exMark = flagged ? '<span class="tt-ex" title="exception on this date — open the lesson">⚠</span>' : '';
  const inner = `<span class="tt-group">${flag}${heading}${exMark}</span>${courses ? `<span class="tt-course">${courses}</span>` : ''}`;
  const style = `border-left-color:${esc(colour)}`;
  // Teaching / free / form lessons open the lesson detail; clubs/duties are just shown.
  if (l.purpose === 'teaching' || l.purpose === 'free' || l.purpose === 'form') {
    return `<a class="tt-lesson tt-${esc(l.purpose)}" style="${style}" href="/lesson?lesson=${l.lessonId}&date=${esc(date)}">${inner}</a>`;
  }
  return `<span class="tt-lesson tt-${esc(l.purpose)}" style="${style}">${inner}</span>`;
}

function renderCell(cell: GridCell, date: string, isToday: boolean, exKeys?: Set<string>): string {
  const td = isToday ? '<td class="tt-today">' : '<td>';
  if (cell.lessons.length === 0) {
    return `${isToday ? '<td class="tt-empty tt-today">' : '<td class="tt-empty">'}<span class="tt-band">${esc(cell.periodLabel)}</span></td>`;
  }
  return `${td}${cell.lessons.map((l) => renderLesson(l, date, exKeys?.has(`${date}:${l.lessonId}`) ?? false)).join('')}</td>`;
}

export function registerTimetableRoutes(app: FastifyInstance): void {
  app.get('/timetable', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = Query.safeParse(req.query);
    const today = localParts(new Date(), TZ).isoDate;
    const ref = parsed.success && parsed.data.date ? parsed.data.date : today;
    const monday = mondayOf(ref);
    const weekDates = [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
    const prev = addDays(monday, -7);
    const next = addDays(monday, 7);

    let table: string;
    try {
      const yearId = parsed.success ? parsed.data.year : undefined;
      const [periods, lessons, exRows] = await Promise.all([
        getPeriodDefinitions(yearId),
        getTimetabledLessons(yearId),
        listExceptionsBetween(weekDates[0]!, weekDates[4]!),
      ]);
      const exKeys = new Set(exRows.filter((e) => e.timetabledLessonId != null).map((e) => `${e.date}:${e.timetabledLessonId}`));
      const dayEx = new Set(exRows.filter((e) => e.timetabledLessonId == null).map((e) => e.date));
      const grid = buildWeekGrid(periods, lessons);
      const head = `<tr><th class="tt-corner"></th>${weekDates
        .map((d, i) => `<th${d === today ? ' class="tt-today"' : ''}>${esc(DAY_NAMES[i] ?? '')}${dayEx.has(d) ? ' <span class="tt-ex" title="off-timetable day">⚠</span>' : ''}<span class="tt-date">${esc(fmtShort(d))}</span></th>`)
        .join('')}</tr>`;
      const body = grid.rows
        .map((row) => {
          const cells = row.cells
            .map((cell, i) => {
              const d = weekDates[i] ?? today;
              return renderCell(cell, d, d === today, exKeys);
            })
            .join('');
          return `<tr class="tt-row tt-kind-${esc(row.kind)}"><th class="tt-time"><span class="tt-rl">${esc(row.label)}</span><span class="tt-clock">${esc(row.start)}</span></th>${cells}</tr>`;
        })
        .join('');
      table = `<div class="table-scroll"><table class="tt-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      table = `<p class="muted">The timetable is unavailable — the database is not reachable. Try <code>./start.sh</code>.</p>`;
    }

    const body = `
      <section class="tt">
        <div class="tt-head">
          <h1>Timetable${parsed.success && parsed.data.year ? ' <span class="muted">— archive/draft year structure</span>' : ''}</h1>
          <nav class="tt-weeknav">
            <a href="/timetable?date=${esc(prev)}">◀ Prev</a>
            <a href="/timetable">This week</a>
            <a href="/timetable?date=${esc(next)}">Next ▶</a>
          </nav>
        </div>
        ${table}
        <p class="tt-legend"><span class="tt-key tt-free"></span> Free (protected) · <span class="tt-key tt-oversee">⚑</span> Lesson I oversee · colour = course</p>
      </section>`;
    return reply.type('text/html').send(layout({ title: 'Timetable', body, authed: true, csrfToken: reply.generateCsrf() }));
  });
}
