import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { resolveNow, termProgress, classifyDay, type NowState, type TermDate } from '../services/clock';
import { getClockContext, getSelfLessonAt, type NowLesson } from '../repos/clock';
import {
  countTaughtLessons,
  findOrCreateOccurrence,
  getLastStoppingPoints,
  getOccurrenceCourses,
  getOccurrenceNotes,
} from '../repos/occurrence';
import { getSetting } from '../repos/settings';
import { getExperienceMode, shouldShowExperienceNudge } from '../lib/nav';
import { getFollowupsForOccurrence } from '../repos/notes';
import type { LastStop, OccurrenceCourseRow } from '../services/occurrence';
import { beforeNextBell, type BellTask } from '../services/task';
import { getGroupSlots, listBellTasks } from '../repos/tasks';
import type { UpcomingEvent } from '../services/event';
import { listUpcoming } from '../repos/events';
import { getRunningTimer } from '../repos/timeEntries';
import { getDayChecklist } from '../repos/prep';
import { marksEnabled } from '../auth/marksGate';
import { marksBacklog } from '../repos/marking';
import { resurfacing } from '../services/captured';
import { listForResurfacing } from '../repos/captured';
import { currentInterests } from '../services/currentInterests';
import { listExceptionsBetween } from '../repos/exceptions';
import { indexDayExceptions, exceptionForLesson, describeException, NO_EXCEPTION, type ExceptionEffect } from '../services/exceptions';
import { getPeriodDefinitions, getTimetabledLessons } from '../repos/timetable';
import { coverageAtRisk } from '../repos/brief';
import { openReviewCount } from '../repos/reviews';
import { buildBrief } from '../services/brief';
import { addDays, weekdayOf, tzDateToEpoch } from '../lib/time';
import {
  renderNowNext,
  renderStrip,
  renderTimelineCard,
  renderTimelineShell,
  renderCurrentCard,
  renderNextCard,
  renderDayList,
  purposeLabel,
  lessonName,
  nextSchoolDayInfo,
  nowSignature,
  nowLabels,
} from '../lib/nowView';
import { type FollowupItem, type NoteItem } from '../lib/notesView';

async function resolveNowLessons(now: Date) {
  const ctx = await getClockContext();
  const state = resolveNow(now, ctx);
  const current = state.isSchoolDay && state.current ? await getSelfLessonAt(state.current.weekday, state.current.slotOrder) : null;
  const next = state.nextTeaching ? await getSelfLessonAt(state.nextTeaching.weekday, state.nextTeaching.slotOrder) : null;
  return { ctx, state, current, next };
}

async function nowExceptions(
  isoDate: string,
  current: NowLesson | null,
  next: NowLesson | null,
): Promise<{ count: number; curEx: ExceptionEffect; nextEx: ExceptionEffect }> {
  const rows = await listExceptionsBetween(isoDate, isoDate);
  const dx = indexDayExceptions(rows);
  return {
    count: rows.length,
    curEx: describeException(exceptionForLesson(dx, current?.lessonId)),
    nextEx: describeException(exceptionForLesson(dx, next?.lessonId)),
  };
}

export function registerNowRoutes(app: FastifyInstance): void {
  app.get('/', { preHandler: requireAuth }, async (_req, reply) => {
    const now = new Date();
    const csrf = reply.generateCsrf();
    try {
      const { ctx, state, current, next } = await resolveNowLessons(now);
      const { count: exToday, curEx, nextEx } = await nowExceptions(state.isoDate, current, next);

      let card: string;
      if (current && (current.purpose === 'teaching' || current.purpose === 'free' || current.purpose === 'form')) {
        const occurrenceId = await findOrCreateOccurrence(current.lessonId, state.isoDate);
        const [courses, lastStops, noteRows, followups] = await Promise.all([
          getOccurrenceCourses(occurrenceId),
          getLastStoppingPoints(current.lessonId, state.isoDate),
          getOccurrenceNotes(occurrenceId),
          getFollowupsForOccurrence(occurrenceId),
        ]);
        const fuByNote = new Map<number, FollowupItem[]>();
        for (const f of followups) {
          const arr = fuByNote.get(f.noteId) ?? [];
          arr.push({ id: f.id, text: f.text, done: f.done });
          fuByNote.set(f.noteId, arr);
        }
        const noteItems: NoteItem[] = noteRows.map((n) => ({ id: n.id, body: n.body, time: n.time, followups: fuByNote.get(n.id) ?? [] }));
        card = renderCurrentCard(current, courses, lastStops, noteItems, occurrenceId, state, curEx);
      } else if (current) {
        card = `<div class="now-card"><p class="kicker">Now${state.current ? ' · ' + esc(state.current.label) : ''}</p><h1>${esc(lessonName(current))}</h1><p class="muted">${esc(purposeLabel(current.purpose))} is on now — not a teaching slot.</p></div>`;
      } else {
        const heading = state.isSchoolDay ? 'No lesson right now' : 'No school today';
        card = `<div class="now-card"><h1>${esc(heading)}</h1><p class="muted">The next teaching slot is shown above.</p></div>`;
      }

      const [bellAll, groupSlots, events, running, captured, allLessons, periods] = await Promise.all([
        listBellTasks(),
        getGroupSlots(),
        listUpcoming(),
        getRunningTimer(),
        listForResurfacing(),
        getTimetabledLessons(),
        getPeriodDefinitions(),
      ]);
      const nextBell = state.nextTeaching
        ? { date: state.nextTeaching.date, startMin: state.nextTeaching.startMin }
        : null;
      const bell = beforeNextBell(bellAll, nextBell, now, groupSlots, ctx.terms, ctx.tz);
      const todayGroupIds = [...groupSlots.entries()]
        .filter(([, slots]) => slots.some((s) => s.weekday === state.weekday))
        .map(([gid]) => gid);
      const heads = resurfacing(captured, state.isoDate, todayGroupIds);

      // Earned-unlock nudge: only do the count query when it could actually show (everyday + not yet
      // dismissed), so the common path stays cheap.
      const experience = getExperienceMode();
      const nudgeDismissed = (await getSetting('experience_nudge_dismissed').catch(() => null)) === 'true';
      const showNudge =
        experience === 'everyday' && !nudgeDismissed && shouldShowExperienceNudge(experience, false, await countTaughtLessons());

      const dayPart: 'start' | 'end' = state.minutes < 12 * 60 ? 'start' : 'end';
      const dayItems = await getDayChecklist(state.isoDate, dayPart);
      const marksWaiting = (await marksEnabled()) ? await marksBacklog() : [];
      const interests = await currentInterests(now.getTime()); // D2: time-decaying current-interest profile

      // The "next session" card for the right column.
      let nextCard: string;
      if (state.nextTeaching && next && (next.purpose === 'teaching' || next.purpose === 'free' || next.purpose === 'form')) {
        const nextOccId = await findOrCreateOccurrence(next.lessonId, state.nextTeaching.date);
        const [nextCourses, nextLastStops] = await Promise.all([
          getOccurrenceCourses(nextOccId),
          getLastStoppingPoints(next.lessonId, state.nextTeaching.date),
        ]);
        nextCard = renderNextCard(next, state, nextCourses, nextLastStops, state.nextTeaching, nextEx);
      } else if (state.nextTeaching && next) {
        nextCard = `<div class="now-card now-next"><p class="kicker">Next · ${esc(state.nextTeaching.label)}</p><h2>${esc(lessonName(next))}</h2><p class="muted">${esc(state.nextTeaching.date)}</p></div>`;
      } else {
        nextCard = `<div class="now-card now-next"><p class="kicker">Next</p><p class="muted">${state.isSchoolDay ? 'No more teaching today.' : 'No school today.'}</p></div>`;
      }

      // When not in a lesson, fill the main column with what's coming: the rest of today's own
      // lessons, or (evenings/weekends/holidays) the next teaching day's list.
      let dayList = '';
      const inTeachingCard = current && (current.purpose === 'teaching' || current.purpose === 'free' || current.purpose === 'form');
      if (!inTeachingCard) {
        if (state.isSchoolDay) {
          dayList = renderDayList(allLessons, periods, state.weekday, state.minutes, state.isoDate, 'Rest of today');
        }
        if (!dayList && state.nextTeaching) {
          const d = state.nextTeaching.date;
          const label = new Intl.DateTimeFormat('en-GB', { timeZone: ctx.tz, weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(`${d}T12:00:00Z`));
          dayList = renderDayList(allLessons, periods, weekdayOf(d), null, d, `Next teaching day — ${label}`);
        }
      }

      // Wave 7.1 — forward-looking morning brief (coverage-at-risk + next day + marking); hidden when empty.
      const briefItems = buildBrief({
        today: state.isoDate,
        coverage: await coverageAtRisk(),
        nextSchoolDay: nextSchoolDayInfo(state.isoDate, ctx.terms, allLessons, ctx.tz),
        markingClasses: marksWaiting.length,
        openReviews: await openReviewCount(),
      });

        const body = renderNowNext({
          state,
          current,
          next,
          card,
          nextCard,
          dayList,
          briefItems,
          marksWaiting,
          bell,
          events,
          heads,
          interests,
          dayPart,
          dayItems,
          running,
          showNudge,
          exToday,
          csrf,
          now,
          ctx,
          curEx,
          nextEx,
          allLessons,
          periods,
          captured,
        });
        return reply.type('text/html').send(layout({ title: 'Now', body, authed: true, csrfToken: csrf, width: 'wide' }));
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      const body = `<section class="now"><p class="kicker">Now</p><h1>Now</h1><p class="muted">The database is not reachable — start the stack with <code>./start.sh</code>.</p></section>`;
      return reply.type('text/html').send(layout({ title: 'Now', body, authed: true, csrfToken: csrf }));
    }
  });

  // Auto-refreshing clock strip (every 30s) — never includes the note composer,
  // so a half-typed note is never wiped.
  app.get('/now/clock', { preHandler: requireAuth }, async (req, reply) => {
    const now = new Date();
    try {
      const { ctx, state, current, next } = await resolveNowLessons(now);
      const { curEx, nextEx } = await nowExceptions(state.isoDate, current, next);
      const prevSig = typeof (req.query as { sig?: unknown }).sig === 'string' ? (req.query as { sig: string }).sig : null;
      const sig = nowSignature(state, current, next);
      // The lesson/day changed since this strip was rendered → show a persistent "refresh" prompt
      // (and stop polling) rather than hard-reloading, which would wipe a half-typed note.
      if (prevSig !== null && prevSig !== sig) {
        return reply.type('text/html').send(renderStrip(state, current, next, now, ctx.tz, ctx.terms, true, curEx, nextEx));
      }
      return reply.type('text/html').send(renderStrip(state, current, next, now, ctx.tz, ctx.terms, false, curEx, nextEx));
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      return reply.type('text/html').send('<div id="now-strip" class="now-strip muted">clock unavailable</div>');
    }
  });

  // Auto-refreshing day timeline (every 30s). Re-renders the agenda card with a FRESH `now` so the
  // done/active/next markers advance through the day — INCLUDING across lesson boundaries. Unlike
  // /now/clock it never stops polling: the card has no text inputs, so swapping it can never wipe a
  // half-typed Mind Dump note (a separate column). resolveNowLessons resolves minutes in the SCHOOL
  // timezone (ctx.tz), so the markers stay correct regardless of the browser's clock/zone.
  app.get('/now/timeline', { preHandler: requireAuth }, async (_req, reply) => {
    const now = new Date();
    try {
      const { ctx, state } = await resolveNowLessons(now);
      const [allLessons, periods] = await Promise.all([getTimetabledLessons(), getPeriodDefinitions()]);
      const card = renderTimelineCard(allLessons, periods, state, now, ctx.tz) || renderTimelineShell();
      return reply.type('text/html').send(card);
    } catch (err) {
      app.log.error({ err }, 'timeline fragment render failed');
      // Keep the self-polling element alive so a transient DB blip doesn't freeze the timeline.
      return reply.type('text/html').send(renderTimelineShell());
    }
  });

  app.get('/header-overhaul', { preHandler: requireAuth }, async (req, reply) => {
    const title = typeof (req.query as { title?: unknown }).title === 'string' ? (req.query as { title: string }).title : 'School Organiser';
    const now = new Date();
    try {
      const csrf = reply.generateCsrf();
      const exp = getExperienceMode();
      const ctx = await getClockContext();
      const state = resolveNow(now, ctx);

      let leftAnchorHtml = '';
      if (state.current) {
        const currentLesson = await getSelfLessonAt(state.current.weekday, state.current.slotOrder);
        const currentLabel = currentLesson ? (currentLesson.groupName ?? purposeLabel(currentLesson.purpose)) : 'Lesson';
        const currentEndEpochMs = tzDateToEpoch(state.isoDate, state.current.endMin, ctx.tz);
        const dotColor = 'var(--green)';
        leftAnchorHtml = `
          <div class="context-scaffold-anchor">
            <span class="live-dot" id="scaffold-dot" style="background: ${dotColor}; box-shadow: 0 0 6px ${dotColor};"></span>
            <span class="scaffold-meta" id="scaffold-meta">Now: ${esc(state.current.label)}</span>
            <strong class="scaffold-title" id="scaffold-title">${esc(currentLabel)} (ends <span data-epoch-ms="${currentEndEpochMs}">...</span>)</strong>
          </div>`;
      } else if (state.nextTeaching) {
        const next = await getSelfLessonAt(state.nextTeaching.weekday, state.nextTeaching.slotOrder);
        const nextLabel = next ? (next.groupName ?? purposeLabel(next.purpose)) : 'Lesson';
        const nextEpochMs = tzDateToEpoch(state.nextTeaching.date, state.nextTeaching.startMin, ctx.tz);
        const dotColor = 'var(--amber)';
        leftAnchorHtml = `
          <div class="context-scaffold-anchor">
            <span class="live-dot" id="scaffold-dot" style="background: ${dotColor}; box-shadow: 0 0 6px ${dotColor};"></span>
            <span class="scaffold-meta" id="scaffold-meta">Next: ${esc(state.nextTeaching.label)}</span>
            <strong class="scaffold-title" id="scaffold-title">${esc(nextLabel)} (starts <span data-epoch-ms="${nextEpochMs}">...</span>)</strong>
          </div>`;
      } else {
        const dotColor = 'var(--blue)';
        leftAnchorHtml = `
          <div class="context-scaffold-anchor">
            <span class="live-dot" id="scaffold-dot" style="background: ${dotColor}; box-shadow: 0 0 6px ${dotColor};"></span>
            <span class="scaffold-meta" id="scaffold-meta">Done</span>
            <strong class="scaffold-title" id="scaffold-title">No more lessons today</strong>
          </div>`;
      }

      const [bellAll, groupSlots] = await Promise.all([
        listBellTasks(),
        getGroupSlots(),
      ]);
      const nextBell = state.nextTeaching
        ? { date: state.nextTeaching.date, startMin: state.nextTeaching.startMin }
        : null;
      const bell = beforeNextBell(bellAll, nextBell, now, groupSlots, ctx.terms, ctx.tz);
      const tasksCount = bell.length;

      const marksWaiting = (await marksEnabled()) ? await marksBacklog() : [];
      const markingCount = marksWaiting.length;

      const { dateLabel } = nowLabels(now, ctx.tz);
      const clockStr = new Intl.DateTimeFormat('en-GB', { timeZone: ctx.tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(now);

      const html = `<header id="context-header" class="dynamic-context-header">
        <div class="header-left">
          ${leftAnchorHtml}
        </div>
        <div class="header-middle">
          <form class="header-exp" role="group" aria-label="Experience level" hx-post="/settings/experience" hx-swap="none" hx-headers='{"x-csrf-token":"${esc(csrf)}"}' hx-on::after-request="if(event.detail.successful)location.reload()">
            <button type="submit" name="experience" value="everyday" class="seg${exp === 'everyday' ? ' is-on' : ''}"${exp === 'everyday' ? ' aria-current="true"' : ''} title="Everyday: the daily core">Everyday</button>
            <button type="submit" name="experience" value="power" class="seg${exp === 'power' ? ' is-on' : ''}"${exp === 'power' ? ' aria-current="true"' : ''} title="Power: reveal planning, authoring & admin">Power</button>
          </form>
          <div class="search-box">
            <input id="global-search" class="topbar-search" type="search" name="q" placeholder="Search or jump to a page…  press /" autocomplete="off" aria-label="Search or jump to a page"
              hx-get="/search" hx-trigger="input changed delay:250ms, focus" hx-target="#search-results" hx-swap="innerHTML">
            <div id="search-results" class="search-results"></div>
          </div>
          <button type="button" id="note-btn" class="chip chip-btn" title="Quick note (or press n)">📝 Note</button>
          <a href="/tasks" class="chip">Tasks: <span class="chip-count">${tasksCount}</span></a>
          <a href="/marking" class="chip">Marking: <span class="chip-count">${markingCount}</span></a>
          <button type="button" id="focus-mode-btn" class="chip chip-btn focus-mode-toggle" title="Toggle Focus Mode">🎯 Focus Mode</button>
        </div>
        <div class="header-clock-section">
          <span id="monospace-clock" class="clock-display" data-clock data-tz="${esc(ctx.tz)}">${esc(clockStr)}</span>
          <span id="monospace-date" class="date-display" data-clock-date>${esc(dateLabel)}</span>
        </div>
      </header>`;
      return reply.type('text/html').send(html);
    } catch (err) {
      app.log.error({ err }, 'header overhaul render failed');
      return reply.type('text/html').send('<header id="context-header" class="context-header"><div class="header-left">Unavailable</div></header>');
    }
  });
}

