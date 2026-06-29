import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { addDays, localParts, weekdayOf } from '../lib/time';
import { getPeriodDefinitions, getTimetabledLessons, getTermDatesAll, listTeacherClasses, getGroupSelfLessons } from '../repos/timetable';
import { listExceptionsBetween, addException, type ExceptionRow } from '../repos/exceptions';
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
    let classes: { id: number; name: string }[] = [];
    try {
      const years = await listYears();
      // Which academic year owns this week? Looking ahead to next September shows next year's (draft)
      // structure; looking back shows the archived one. An explicit ?year= (setup preview) overrides.
      const weekYear = explicitYear
        ? years.find((y) => y.id === explicitYear)
        : years.find((y) => weekDates[0]! >= y.startDate && weekDates[0]! <= y.endDate)
          ?? years.find((y) => weekDates[4]! >= y.startDate && weekDates[4]! <= y.endDate);
      const structureYearId = explicitYear ?? weekYear?.id;
      const [periods, lessons, exRows, terms, teacherClasses] = await Promise.all([
        getPeriodDefinitions(structureYearId),
        getTimetabledLessons(structureYearId),
        listExceptionsBetween(weekDates[0]!, weekDates[4]!),
        getTermDatesAll(),
        listTeacherClasses(structureYearId),
      ]);
      // Calendar: a holiday / half-term / INSET / bank holiday (all term_dates overlays) or any day
      // outside term suppresses that day's lessons — the timetable must never show teaching then.
      const dayInfo = weekDates.map((d) => classifyDay(d, weekdayOf(d), terms));
      // Offer the "mark class away" picker only on a week that actually has teaching (a set-up year with
      // at least one school day) — never on a holiday/INSET week or a week beyond every year, where no
      // lessons render and the class list would otherwise be the only thing leaking into the page.
      classes = structureYearId && dayInfo.some((d) => d.isSchoolDay) ? teacherClasses : [];
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

    const awayDefault = today >= weekDates[0]! && today <= weekDates[4]! ? today : weekDates[0]!;
    const body = renderTimetableNext({
      table,
      yearLabel,
      prev,
      next,
      yearQ,
      explicitYear,
      csrf: reply.generateCsrf(),
      classes,
      awayFrom: awayDefault,
      awayTo: awayDefault,
    });
    return reply.type('text/html').send(layout({ title: 'Timetable', body, authed: true, csrfToken: reply.generateCsrf(), width: 'full' }));
  });

  // Mark a whole class away (trip/exam) across a date range — writes the existing `free` exception to
  // every self-taught slot that class has on each affected date. Idempotent: a slot that already has an
  // exception for that date is skipped (never stomped). On success HX-Refresh reloads the grid so the
  // "Free (class away)" badges appear (noted_bugs2 #1, Option A — no schema change).
  const AwayBody = z.object({
    groupId: z.coerce.number().int().positive(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    note: z.string().trim().max(200).optional(),
  });
  app.post('/timetable/class-away', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const b = AwayBody.safeParse(req.body);
    // Feedback is swapped into #tt-away-status, so user-facing errors return 200 (HTMX won't swap non-2xx).
    if (!b.success) return reply.type('text/html').send('<span class="form-error">Pick a class and valid dates.</span>');
    const from = b.data.dateFrom <= b.data.dateTo ? b.data.dateFrom : b.data.dateTo;
    const to = b.data.dateFrom <= b.data.dateTo ? b.data.dateTo : b.data.dateFrom;
    // Guard the fan-out: a 60-day span is already generous for a trip; anything larger is a slip.
    const span = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
    if (span > 60) return reply.type('text/html').send('<span class="form-error">That range is too long — please keep it to 60 days.</span>');

    try {
      const [lessons, existing] = await Promise.all([
        getGroupSelfLessons(b.data.groupId),
        listExceptionsBetween(from, to),
      ]);
      if (lessons.length === 0) return reply.type('text/html').send('<span class="muted">That class has no lessons I teach.</span>');
      // Slots that already carry an exception for a date (per-lesson OR a whole-day off-timetable) — skip
      // them so we never duplicate or override an existing deviation.
      const taken = new Set<string>();
      const wholeDay = new Set<string>();
      for (const e of existing) {
        if (e.timetabledLessonId == null) {
          if (e.kind === 'off_timetable') wholeDay.add(e.date);
        } else {
          taken.add(`${e.date}:${e.timetabledLessonId}`);
        }
      }
      const note = b.data.note && b.data.note.length > 0 ? b.data.note : null;
      const byWeekday = new Map<number, number[]>();
      for (const l of lessons) {
        const arr = byWeekday.get(l.weekday) ?? [];
        arr.push(l.lessonId);
        byWeekday.set(l.weekday, arr);
      }
      let written = 0;
      let skipped = 0;
      for (let d = from; d <= to; d = addDays(d, 1)) {
        if (wholeDay.has(d)) continue; // whole day already off-timetable
        const ids = byWeekday.get(weekdayOf(d)) ?? [];
        for (const lessonId of ids) {
          if (taken.has(`${d}:${lessonId}`)) {
            skipped++;
            continue;
          }
          await addException({ date: d, timetabledLessonId: lessonId, kind: 'free', roomId: null, staffId: null, note });
          written++;
        }
      }
      if (written === 0) {
        return reply
          .type('text/html')
          .send(`<span class="muted">No new slots to mark${skipped ? ` (${skipped} already had an exception)` : ' (no lessons fall in that range)'}.</span>`);
      }
      // Reload the page so the freshly-written "Free" badges render in the grid.
      reply.header('HX-Refresh', 'true');
      return reply.type('text/html').send(`<span class="form-ok">Marked away — ${written} slot${written === 1 ? '' : 's'} freed${skipped ? `, ${skipped} skipped` : ''}.</span>`);
    } catch (err) {
      app.log.error({ err }, 'class-away write failed');
      return reply.code(500).type('text/html').send('<span class="form-error">Could not mark the class away — try again.</span>');
    }
  });
}
