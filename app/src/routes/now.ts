import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { resolveNow, type NowState } from '../services/clock';
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
import { tzDateToEpoch } from '../lib/time';
import {
  renderNowNext,
  renderNowHero,
  renderTimelineCard,
  renderTimelineShell,
  renderCurrentCard,
  renderCurrentCardBody,
  renderCurrentChangedBody,
  currentCardSig,
  renderInboxQueueCard,
  renderNeedsMe,
  nextSchoolDayInfo,
  nowLabels,
} from '../lib/nowView';
import { type FollowupItem, type NoteItem } from '../lib/notesView';
import { paths } from '../lib/paths';

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

// The "Needs me" card's inputs — shared by the page render and the /now/needs-me poll fragment so the
// two can never drift: before-the-bell tasks, due events, resurfacing heads-ups, the marking backlog
// (plus the raw captured list, which the page also feeds to the inbox-queue card).
async function needsMeData(now: Date, ctx: { terms: Parameters<typeof beforeNextBell>[4]; tz: string }, state: NowState) {
  const [bellAll, groupSlots, events, captured, marksWaiting] = await Promise.all([
    listBellTasks(),
    getGroupSlots(),
    listUpcoming(),
    listForResurfacing(),
    marksEnabled().then((on) => (on ? marksBacklog() : [])),
  ]);
  const nextBell = state.nextTeaching
    ? { date: state.nextTeaching.date, startMin: state.nextTeaching.startMin }
    : null;
  const bell = beforeNextBell(bellAll, nextBell, now, groupSlots, ctx.terms, ctx.tz);
  const todayGroupIds = [...groupSlots.entries()]
    .filter(([, slots]) => slots.some((s) => s.weekday === state.weekday))
    .map(([gid]) => gid);
  const heads = resurfacing(captured, state.isoDate, todayGroupIds);
  return { bell, events, heads, marksWaiting, captured };
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
      } else {
        // No teaching lesson on now: the hero above already says what IS on ("Outside lesson time",
        // "No school today", "Duty"…), so no placeholder card — repeating it here was pure duplication.
        card = '';
      }

      const [running, allLessons, periods, { bell, events, heads, marksWaiting, captured }] = await Promise.all([
        getRunningTimer(),
        getTimetabledLessons(),
        getPeriodDefinitions(),
        needsMeData(now, ctx, state),
      ]);

      // Earned-unlock nudge: only do the count query when it could actually show (everyday + not yet
      // dismissed), so the common path stays cheap.
      const experience = getExperienceMode();
      const nudgeDismissed = (await getSetting('experience_nudge_dismissed').catch(() => null)) === 'true';
      const showNudge =
        experience === 'everyday' && !nudgeDismissed && shouldShowExperienceNudge(experience, false, await countTaughtLessons());

      const dayPart: 'start' | 'end' = state.minutes < 12 * 60 ? 'start' : 'end';
      const dayItems = await getDayChecklist(state.isoDate, dayPart);
      const interests = await currentInterests(now.getTime()); // D2: time-decaying current-interest profile

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

  // Auto-refreshing hero (every 30s). Recomputes now/next + exceptions with a FRESH clock so the
  // time-remaining countdown ticks down and the now/next lines advance across lesson boundaries. It
  // contains no inputs, so it re-renders freely (no signature/refresh-prompt dance needed) and never
  // stops polling — a transient DB blip returns a minimal shell that keeps the poller alive.
  app.get('/now/hero', { preHandler: requireAuth }, async (_req, reply) => {
    const now = new Date();
    try {
      const { state, current, next } = await resolveNowLessons(now);
      const { curEx, nextEx } = await nowExceptions(state.isoDate, current, next);
      return reply.type('text/html').send(renderNowHero(state, current, next, curEx, nextEx));
    } catch (err) {
      app.log.error({ err }, 'hero fragment render failed');
      return reply
        .type('text/html')
        .send(`<div id="now-hero" class="now-hero" hx-get="${paths.nowHero()}" hx-trigger="every 30s" hx-swap="outerHTML" hx-target="this"><div class="now-hero-main"><div class="now-hero-eyebrow">Now</div><div class="now-hero-title muted">unavailable</div></div></div>`);
    }
  });

  // Auto-refreshing "Needs me" card (every 60s — its queries fan across marking, tasks, events and
  // captured notes, so it polls at half the clock cadence). Buttons only, no text inputs → swap-safe.
  app.get('/now/needs-me', { preHandler: requireAuth }, async (_req, reply) => {
    const now = new Date();
    try {
      const { ctx, state } = await resolveNowLessons(now);
      const { bell, events, heads, marksWaiting } = await needsMeData(now, ctx, state);
      return reply.type('text/html').send(renderNeedsMe(marksWaiting, bell, events, heads, state.isoDate));
    } catch (err) {
      app.log.error({ err }, 'needs-me fragment render failed');
      // Keep the self-polling element alive on a transient DB blip rather than letting it vanish.
      return reply
        .type('text/html')
        .send(`<div id="now-needs" class="now-card now-needs" hx-get="${paths.nowNeedsMe()}" hx-trigger="every 60s" hx-swap="outerHTML" hx-target="this"><p class="kicker">Needs me</p><p class="muted">unavailable</p></div>`);
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

  // Auto-refreshing current-lesson card body (every 30s). Recomputes "what is on now" so the card
  // advances across lesson boundaries without a reload. The Quick-note form lives OUTSIDE the polled
  // body, so it is never wiped; but because a lesson change also invalidates that form's occurrence
  // binding, a signature mismatch returns a "refresh" prompt (which stops polling) instead of swapping
  // in the new lesson. resolveNowLessons resolves minutes in the school timezone (ctx.tz).
  app.get('/now/current', { preHandler: requireAuth }, async (req, reply) => {
    const now = new Date();
    const prevSig = typeof (req.query as { sig?: unknown }).sig === 'string' ? (req.query as { sig: string }).sig : null;
    try {
      const { state, current, next } = await resolveNowLessons(now);
      const { curEx } = await nowExceptions(state.isoDate, current, next);
      const isTeaching = !!current && (current.purpose === 'teaching' || current.purpose === 'free' || current.purpose === 'form');
      if (!isTeaching || !current) {
        // No teaching/free/form lesson on now any more — prompt a reload so the page rebuilds the
        // correct card (and the note form rebinds to the right occurrence).
        return reply.type('text/html').send(renderCurrentChangedBody());
      }
      const sig = currentCardSig(state, current, curEx);
      if (prevSig !== null && prevSig !== sig) {
        return reply.type('text/html').send(renderCurrentChangedBody());
      }
      const occurrenceId = await findOrCreateOccurrence(current.lessonId, state.isoDate);
      const [courses, lastStops] = await Promise.all([
        getOccurrenceCourses(occurrenceId),
        getLastStoppingPoints(current.lessonId, state.isoDate),
      ]);
      return reply.type('text/html').send(renderCurrentCardBody(current, courses, lastStops, state, curEx));
    } catch (err) {
      app.log.error({ err }, 'now/current fragment render failed');
      // Keep the poller alive (echo the prior signature) so a transient DB blip doesn't freeze the card.
      const retrySig = prevSig ?? '';
      return reply
        .type('text/html')
        .send(`<div id="now-current-body" class="now-current-body" hx-get="${paths.nowCurrent(retrySig)}" hx-trigger="every 30s" hx-swap="outerHTML" hx-target="this"><p class="kicker">This lesson</p><p class="muted">current lesson unavailable</p></div>`);
    }
  });

  // Auto-refreshing inbox queue card (every 30s). Re-runs the resurfacing query and re-renders so items
  // captured elsewhere appear without a reload. The card has no text inputs, so an outer-swap is safe.
  app.get('/now/inbox-queue', { preHandler: requireAuth }, async (_req, reply) => {
    const csrf = reply.generateCsrf();
    try {
      const captured = await listForResurfacing();
      return reply.type('text/html').send(renderInboxQueueCard(captured, csrf));
    } catch (err) {
      app.log.error({ err }, 'inbox-queue fragment render failed');
      // Keep the self-polling element alive on a transient DB blip rather than letting it vanish.
      return reply.type('text/html').send(renderInboxQueueCard([], csrf));
    }
  });

  app.get('/header-overhaul', { preHandler: requireAuth }, async (req, reply) => {
    const title = typeof (req.query as { title?: unknown }).title === 'string' ? (req.query as { title: string }).title : 'School Organiser';
    const now = new Date();
    try {
      const csrf = reply.generateCsrf();
      const ctx = await getClockContext();
      const state = resolveNow(now, ctx);

      let leftAnchorHtml = '';
      if (state.current) {
        const currentEndEpochMs = tzDateToEpoch(state.isoDate, state.current.endMin, ctx.tz);
        const dotColor = 'var(--green)';
        leftAnchorHtml = `
          <div class="context-scaffold-anchor">
            <span class="live-dot" id="scaffold-dot" style="background: ${dotColor}; box-shadow: 0 0 6px ${dotColor};"></span>
            <span class="scaffold-meta" id="scaffold-meta">Now: ${esc(state.current.label)}</span>
            <strong class="scaffold-title" id="scaffold-title">ends in <span data-epoch-ms="${currentEndEpochMs}">…</span></strong>
          </div>`;
      } else if (state.nextTeaching) {
        const nextEpochMs = tzDateToEpoch(state.nextTeaching.date, state.nextTeaching.startMin, ctx.tz);
        const dotColor = 'var(--amber)';
        leftAnchorHtml = `
          <div class="context-scaffold-anchor">
            <span class="live-dot" id="scaffold-dot" style="background: ${dotColor}; box-shadow: 0 0 6px ${dotColor};"></span>
            <span class="scaffold-meta" id="scaffold-meta">Next: ${esc(state.nextTeaching.label)}</span>
            <strong class="scaffold-title" id="scaffold-title">in <span data-epoch-ms="${nextEpochMs}">…</span></strong>
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

