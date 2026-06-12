import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { resolveNow, termProgress, type NowState, type TermDate } from '../services/clock';
import { getClockContext, getSelfLessonAt, type NowLesson } from '../repos/clock';
import {
  findOrCreateOccurrence,
  getLastStoppingPoints,
  getOccurrenceCourses,
  getOccurrenceNotes,
} from '../repos/occurrence';
import { getFollowupsForOccurrence } from '../repos/notes';
import { renderNewNoteButton, renderNotesList, type FollowupItem, type NoteItem } from '../lib/notesView';
import type { LastStop, OccurrenceCourseRow } from '../services/occurrence';
import { beforeNextBell, URGENCY_LABELS, type BellTask } from '../services/task';
import { getGroupSlots, listBellTasks } from '../repos/tasks';
import { daysUntil, dueSoon, type UpcomingEvent } from '../services/event';
import { listUpcoming } from '../repos/events';
import { getRunningTimer } from '../repos/timeEntries';
import { renderTimerBanner } from './timer';
import { getDayChecklist, type PrepItem } from '../repos/prep';
import { renderPrepList } from '../lib/prepView';
import { resurfacing, type CapturedItem } from '../services/captured';
import { listForResurfacing } from '../repos/captured';
import { listExceptionsBetween } from '../repos/exceptions';
import { getPeriodDefinitions, getTimetabledLessons } from '../repos/timetable';
import type { LessonRow, PeriodRow } from '../services/timetable';
import { toMinutes, weekdayOf } from '../lib/time';

function purposeLabel(purpose: string): string {
  const map: Record<string, string> = {
    free: 'Free period',
    form: 'Form',
    club: 'Computing Club',
    open_room: 'Open room',
    duty: 'Duty',
    meeting: 'Meeting',
  };
  return map[purpose] ?? 'Lesson';
}

function lessonName(l: NowLesson | null): string {
  if (!l) return '—';
  return l.groupName ?? purposeLabel(l.purpose);
}

function nowLabels(now: Date, tz: string): { dateLabel: string; clock: string } {
  return {
    dateLabel: new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' }).format(now),
    clock: new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now),
  };
}

// A signature of "what the Now page is showing" — the day, the current period/lesson and the next
// teaching slot. It deliberately excludes the minutes countdown, so the 30s poll only forces a full
// refresh when the lesson genuinely changes (the bell rings, a gap starts, the day rolls over).
function nowSignature(state: NowState, current: NowLesson | null, next: NowLesson | null): string {
  return [
    state.isoDate,
    state.isSchoolDay ? '1' : '0',
    state.current?.slotOrder ?? '',
    current?.lessonId ?? '',
    next?.lessonId ?? '',
    state.nextTeaching?.date ?? '',
  ].join('|');
}

function renderStrip(state: NowState, current: NowLesson | null, next: NowLesson | null, now: Date, tz: string, terms: TermDate[]): string {
  const { dateLabel, clock } = nowLabels(now, tz);
  const sig = nowSignature(state, current, next);
  const tp = termProgress(state.isoDate, terms);
  const weekBadge = tp ? ` · <span class="now-week" title="${esc(tp.name)}">wk ${tp.week}/${tp.weeksTotal}</span>` : '';

  let nowLine: string;
  if (!state.isSchoolDay) {
    nowLine = `<strong>No school today</strong> <span class="muted">(${esc(state.dayKind.replace('_', ' '))})</span>`;
  } else if (state.current) {
    const mins = state.minutesRemaining;
    const who = current ? ` · ${esc(lessonName(current))}` : '';
    const left = mins != null ? ` · <span class="now-mins">${mins} min left</span>` : '';
    nowLine = `<strong>NOW</strong> ${esc(state.current.label)}${who}${left}`;
  } else {
    nowLine = `<strong>Outside lesson time</strong>`;
  }

  let nextLine = '';
  if (state.nextTeaching && next) {
    const href = `/lesson?lesson=${next.lessonId}&date=${esc(state.nextTeaching.date)}`;
    nextLine = ` &nbsp;·&nbsp; <strong>NEXT</strong> ${esc(state.nextTeaching.label)} ${esc(lessonName(next))} <a href="${href}">open</a>`;
  }

  return `<div id="now-strip" class="now-strip" hx-get="/now/clock?sig=${encodeURIComponent(sig)}" hx-trigger="every 30s" hx-swap="outerHTML">
    <span class="now-when">${esc(dateLabel)} · ${esc(clock)}</span>${weekBadge} &nbsp;·&nbsp; ${nowLine}${nextLine}
  </div>`;
}

function renderCurrentCard(
  current: NowLesson,
  courses: OccurrenceCourseRow[],
  lastStops: LastStop[],
  notes: NoteItem[],
  occurrenceId: number,
  state: NowState,
): string {
  const lastByGc = new Map<number, LastStop>(lastStops.map((ls) => [ls.groupCourseId, ls]));
  const lastLines = courses
    .map((c) => {
      const ls = lastByGc.get(c.groupCourseId);
      return ls
        ? `<p class="ld-last"><strong>${esc(c.courseName)}</strong> — last time → ${esc(ls.stoppingPoint)} <span class="muted">(${esc(ls.date)})</span></p>`
        : '';
    })
    .join('');
  const courseList = current.courses.map((c) => esc(c.name)).join(' · ');
  const meta = [courseList || (current.purpose === 'free' ? 'Free — protected work time' : ''), current.roomName ? esc(current.roomName) : '']
    .filter(Boolean)
    .join(' · ');
  const listId = `notes-list-${occurrenceId}`;
  const openHref = `/lesson?lesson=${current.lessonId}&date=${esc(state.isoDate)}`;

  return `<div class="now-card">
    <p class="kicker">Now${state.current ? ' · ' + esc(state.current.label) : ''}</p>
    <h1>${esc(current.groupName ?? purposeLabel(current.purpose))}</h1>
    ${meta ? `<p class="ld-meta">${meta}</p>` : ''}
    ${lastLines}
    <div class="now-notes">
      <div class="ld-notes-head"><h2>Quick note</h2>${renderNewNoteButton(listId, { kind: 'lesson', occurrence: occurrenceId })}</div>
      ${renderNotesList(listId, notes)}
    </div>
    <p><a href="${openHref}">Open lesson detail →</a></p>
  </div>`;
}

function fmtMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// The "next session" column: what's coming, when, and where each group will pick up — so I can
// glance right and know what to set up next without opening the lesson.
function renderNextCard(
  next: NowLesson,
  state: NowState,
  courses: OccurrenceCourseRow[],
  lastStops: LastStop[],
  slot: { date: string; label: string; startMin: number },
): string {
  const lastByGc = new Map<number, LastStop>(lastStops.map((ls) => [ls.groupCourseId, ls]));
  const courseBlocks = courses
    .map((c) => {
      const ls = lastByGc.get(c.groupCourseId);
      const plan = c.planTitle ? `<span class="next-plan">📋 ${esc(c.planTitle)}</span>` : '<span class="muted">no plan bound</span>';
      const resume = ls ? `<div class="muted next-resume">resume → ${esc(ls.stoppingPoint)} <span class="next-when2">(${esc(ls.date)})</span></div>` : '';
      return `<li><strong>${esc(c.courseName)}</strong> ${plan}${resume}</li>`;
    })
    .join('');
  const sameDay = slot.date === state.isoDate;
  const when = sameDay
    ? `${fmtMin(slot.startMin)} · <span class="now-mins">in ${Math.max(0, slot.startMin - state.minutes)} min</span>`
    : esc(slot.date);
  const room = next.roomName ? ` · ${esc(next.roomName)}` : '';
  const openHref = `/lesson?lesson=${next.lessonId}&date=${esc(slot.date)}`;
  return `<div class="now-card now-next">
    <p class="kicker">Next · ${esc(slot.label)}</p>
    <h2>${esc(next.groupName ?? purposeLabel(next.purpose))}</h2>
    <p class="ld-meta">${when}${room}</p>
    ${courseBlocks ? `<ul class="next-courses">${courseBlocks}</ul>` : ''}
    <p><a href="${openHref}">Open next lesson →</a></p>
  </div>`;
}

// Outside a teaching slot the main column would sit empty (very visible on the portrait monitor) —
// fill it with the rest of today's own lessons, or the next teaching day's, each one click away.
function renderDayList(
  lessons: LessonRow[],
  periods: PeriodRow[],
  weekday: number,
  afterMin: number | null, // only slots starting after this time (null = whole day)
  date: string,
  heading: string,
): string {
  const startOf = new Map(periods.filter((p) => p.weekday === weekday).map((p) => [p.slotOrder, p.start]));
  const rows = lessons
    .filter((l) => l.weekday === weekday && l.isSelf && ['teaching', 'form', 'club'].includes(l.purpose))
    .map((l) => ({ ...l, start: startOf.get(l.slotOrder) ?? '' }))
    .filter((l) => l.start && (afterMin === null || toMinutes(l.start) > afterMin))
    .sort((a, b) => a.slotOrder - b.slotOrder);
  if (!rows.length) return '';
  const items = rows
    .map((l) => {
      const courses = l.courses.map((c) => esc(c.name)).join(' · ');
      return `<li><a href="/lesson?lesson=${l.lessonId}&date=${esc(date)}">
        <span class="day-time">${esc(l.start)}</span>
        <span class="day-group">${esc(l.groupName ?? purposeLabel(l.purpose))}</span>
        ${courses ? `<span class="muted day-courses">${courses}</span>` : ''}
      </a></li>`;
    })
    .join('');
  return `<div class="now-card now-day">
    <p class="kicker">${esc(heading)}</p>
    <ul class="day-list">${items}</ul>
  </div>`;
}

function renderBell(tasks: BellTask[]): string {
  if (tasks.length === 0) return '';
  const items = tasks
    .map(
      (t) =>
        `<li id="bell-${t.id}" class="bell-task"><button type="button" class="link" title="Done" hx-post="/tasks/${t.id}/done" hx-target="#bell-${t.id}" hx-swap="outerHTML">✓</button> <span>${esc(t.title)}</span> <span class="muted bell-tag">${esc(URGENCY_LABELS[t.urgency] ?? t.urgency)}</span></li>`,
    )
    .join('');
  return `<div class="now-card now-bell">
    <p class="kicker">Before the next bell</p>
    <ul class="bell-list">${items}</ul>
    <p><a href="/tasks">All tasks →</a></p>
  </div>`;
}

function renderComingUp(events: UpcomingEvent[], today: string): string {
  const soon = dueSoon(events, today);
  if (soon.length === 0) return '';
  const items = soon
    .slice(0, 6)
    .map((e) => {
      const d = e.date ? daysUntil(e.date, today) : 0;
      const when = d < 0 ? `${-d}d overdue` : d === 0 ? 'today' : `in ${d}d`;
      return `<li><span>${esc(e.title)}</span><span class="coming-when">${esc(when)}</span></li>`;
    })
    .join('');
  return `<div class="now-card now-bell">
    <p class="kicker">Coming up</p>
    <ul class="coming-list">${items}</ul>
    <p><a href="/events">All events →</a></p>
  </div>`;
}

function renderHeadsUp(items: CapturedItem[]): string {
  if (items.length === 0) return '';
  const lis = items
    .slice(0, 6)
    .map(
      (i) =>
        `<li${i.safeguarding ? ' class="sg"' : ''}><span>${esc(i.body || '(captured note)')}</span>${i.groupName ? `<span class="muted bell-tag">${esc(i.groupName)}</span>` : ''}</li>`,
    )
    .join('');
  return `<div class="now-card now-bell">
    <p class="kicker">Heads up</p>
    <ul class="bell-list">${lis}</ul>
    <p><a href="/captured">All captured →</a></p>
  </div>`;
}

function renderDayCard(part: 'start' | 'end', items: PrepItem[]): string {
  if (items.length === 0) return '';
  return `<div class="now-card now-bell">
    <p class="kicker">${part === 'start' ? 'Start of day' : 'End of day'}</p>
    ${renderPrepList(items, '/day-checklist', 'day', `day-${part}`)}
  </div>`;
}

async function resolveNowLessons(now: Date) {
  const ctx = await getClockContext();
  const state = resolveNow(now, ctx);
  const current = state.isSchoolDay && state.current ? await getSelfLessonAt(state.current.weekday, state.current.slotOrder) : null;
  const next = state.nextTeaching ? await getSelfLessonAt(state.nextTeaching.weekday, state.nextTeaching.slotOrder) : null;
  return { ctx, state, current, next };
}

export function registerNowRoutes(app: FastifyInstance): void {
  app.get('/', { preHandler: requireAuth }, async (_req, reply) => {
    const now = new Date();
    const csrf = reply.generateCsrf();
    try {
      const { ctx, state, current, next } = await resolveNowLessons(now);

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
        card = renderCurrentCard(current, courses, lastStops, noteItems, occurrenceId, state);
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

      const exToday = (await listExceptionsBetween(state.isoDate, state.isoDate)).length;
      const dayPart: 'start' | 'end' = state.minutes < 12 * 60 ? 'start' : 'end';
      const dayItems = await getDayChecklist(state.isoDate, dayPart);

      // The "next session" card for the right column.
      let nextCard: string;
      if (state.nextTeaching && next && (next.purpose === 'teaching' || next.purpose === 'free' || next.purpose === 'form')) {
        const nextOccId = await findOrCreateOccurrence(next.lessonId, state.nextTeaching.date);
        const [nextCourses, nextLastStops] = await Promise.all([
          getOccurrenceCourses(nextOccId),
          getLastStoppingPoints(next.lessonId, state.nextTeaching.date),
        ]);
        nextCard = renderNextCard(next, state, nextCourses, nextLastStops, state.nextTeaching);
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

      const body = `<section class="now-screen" hx-headers='{"x-csrf-token":"${csrf}"}'>
        ${renderTimerBanner(running)}
        ${renderStrip(state, current, next, now, ctx.tz, ctx.terms)}
        ${exToday ? `<p class="ex-note">⚠ ${exToday} timetable exception${exToday === 1 ? '' : 's'} today — <a href="/timetable">see the week</a></p>` : ''}
        <div class="now-cols">
          <div class="now-col now-col-now">
            <p class="now-focus"><a href="/focus">🎯 Focus — one thing now →</a></p>
            ${card}
            ${dayList}
          </div>
          <div class="now-col now-col-next">
            ${nextCard}
            ${renderBell(bell)}
            ${renderComingUp(events, state.isoDate)}
            ${renderHeadsUp(heads)}
            ${renderDayCard(dayPart, dayItems)}
          </div>
        </div>
      </section>`;
      return reply.type('text/html').send(layout({ title: 'Now', body, authed: true, csrfToken: csrf }));
    } catch {
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
      const prevSig = typeof (req.query as { sig?: unknown }).sig === 'string' ? (req.query as { sig: string }).sig : null;
      const sig = nowSignature(state, current, next);
      // The lesson/day changed since this strip was rendered → reload so every card is fresh.
      if (prevSig !== null && prevSig !== sig) {
        return reply.header('HX-Refresh', 'true').send('');
      }
      return reply.type('text/html').send(renderStrip(state, current, next, now, ctx.tz, ctx.terms));
    } catch {
      return reply.type('text/html').send('<div id="now-strip" class="now-strip muted">clock unavailable</div>');
    }
  });
}
