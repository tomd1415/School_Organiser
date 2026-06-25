import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { addDays, localParts, weekdayOf } from '../lib/time';
import { getPeriodDefinitions, getTimetabledLessons, getTermDatesAll } from '../repos/timetable';
import { listExceptionsBetween, type ExceptionRow } from '../repos/exceptions';
import { describeException, type ExceptionEffect } from '../services/exceptions';
import { buildWeekGrid, type GridCell, type GridLesson } from '../services/timetable';
import { weekReadiness, type LessonReadiness } from '../services/lessonReadiness';
import { classifyDay, type DayKind } from '../services/clock';
import { listYears } from '../repos/setup';

const TZ = 'Europe/London';
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const Query = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), year: z.coerce.number().int().positive().optional() });

import {
  mondayOf,
  fmtShort,
  dayKindLabel,
  renderCell,
  renderTimetableNext,
} from '../lib/timetableView';

export function registerTimetableRoutes(app: FastifyInstance): void {
  app.get('/timetable', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = Query.safeParse(req.query);
    const today = localParts(new Date(), TZ).isoDate;
    const ref = parsed.success && parsed.data.date ? parsed.data.date : today;
    const monday = mondayOf(ref);
    const weekDates = [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
    const prev = addDays(monday, -7);
    const next = addDays(monday, 7);
    // An explicit ?year= (setup "preview this year's structure") must survive week navigation, or one
    // Prev/Next click silently drops back to the date-derived/current year (BUG-036).
    const explicitYear = parsed.success ? parsed.data.year : undefined;
    const yearQ = explicitYear ? `&year=${explicitYear}` : '';

    let table: string;
    let yearLabel = '';
    try {
      const years = await listYears();
      // Which academic year owns this week? Looking ahead to next September shows next year's (draft)
      // structure; looking back shows the archived one. An explicit ?year= (setup preview) overrides.
      const weekYear = explicitYear
        ? years.find((y) => y.id === explicitYear)
        : years.find((y) => weekDates[0]! >= y.startDate && weekDates[0]! <= y.endDate)
          ?? years.find((y) => weekDates[4]! >= y.startDate && weekDates[4]! <= y.endDate);
      const structureYearId = explicitYear ?? weekYear?.id;
      const [periods, lessons, exRows, terms] = await Promise.all([
        getPeriodDefinitions(structureYearId),
        getTimetabledLessons(structureYearId),
        listExceptionsBetween(weekDates[0]!, weekDates[4]!),
        getTermDatesAll(),
      ]);
      // Calendar: a holiday / half-term / INSET / bank holiday (all term_dates overlays) or any day
      // outside term suppresses that day's lessons — the timetable must never show teaching then.
      const dayInfo = weekDates.map((d) => classifyDay(d, weekdayOf(d), terms));
      const wholeDayByDate = new Map<string, ExceptionRow>();
      const byDateLesson = new Map<string, ExceptionRow>();
      for (const e of exRows) {
        if (e.timetabledLessonId == null) {
          if (e.kind === 'off_timetable') wholeDayByDate.set(e.date, e);
        } else {
          byDateLesson.set(`${e.date}:${e.timetabledLessonId}`, e);
        }
      }
      const dayEx = new Set(wholeDayByDate.keys());
      const exForLesson = (d: string, lessonId: number): ExceptionEffect =>
        describeException(wholeDayByDate.get(d) ?? byDateLesson.get(`${d}:${lessonId}`) ?? null);
      // Per-date readiness dots (best-effort: a failure here must never blank the timetable).
      const readiness = await weekReadiness(weekDates).catch(() => new Map<string, LessonReadiness>());
      const readinessFor = (d: string, lessonId: number): LessonReadiness | undefined => readiness.get(`${d}:${lessonId}`);
      const grid = buildWeekGrid(periods, lessons);
      const head = `<tr><th class="tt-corner"></th>${weekDates
        .map((d, i) => {
          const off = !dayInfo[i]!.isSchoolDay ? dayKindLabel(dayInfo[i]!.dayKind) : '';
          const mark = off
            ? ` <span class="tt-daykind">${esc(off)}</span>`
            : dayEx.has(d) ? ' <span class="tt-ex" title="off-timetable day">⚠</span>' : '';
          return `<th${d === today ? ' class="tt-today"' : ''}>${esc(DAY_NAMES[i] ?? '')}${mark}<span class="tt-date">${esc(fmtShort(d))}</span></th>`;
        })
        .join('')}</tr>`;
      const body = grid.rows
        .map((row) => {
          const cells = row.cells
            .map((cell, i) => {
              const d = weekDates[i] ?? today;
              if (!dayInfo[i]!.isSchoolDay) return `<td class="tt-off${d === today ? ' tt-today' : ''}"></td>`; // holiday/INSET/etc.
              return renderCell(cell, d, d === today, exForLesson, readinessFor);
            })
            .join('');
          const h = Math.max(22, row.minutes); // scale row height to the period's duration (≈1px/min)
          return `<tr class="tt-row tt-kind-${esc(row.kind)}" style="height:${h}px"><th class="tt-time"><span class="tt-rl">${esc(row.label)}</span><span class="tt-clock">${esc(row.start)}</span></th>${cells}</tr>`;
        })
        .join('');
      table = `<div class="table-scroll"><table class="tt-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>`;
      yearLabel =
        explicitYear && weekYear ? ` <span class="muted">— ${esc(weekYear.name)} structure</span>`
        : weekYear && !weekYear.isCurrent ? ` <span class="muted">— ${esc(weekYear.name)}</span>`
        : !weekYear ? ' <span class="muted">— no academic year set up for this week</span>'
        : '';
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      table = `<p class="muted">The timetable is unavailable — the database is not reachable. Try <code>./start.sh</code>.</p>`;
    }

    const body = renderTimetableNext({
      table,
      yearLabel,
      prev,
      next,
      yearQ,
      explicitYear,
      csrf: reply.generateCsrf(),
    });
    return reply.type('text/html').send(layout({ title: 'Timetable', body, authed: true, csrfToken: reply.generateCsrf(), width: 'full' }));
  });
}
