import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { resolveNow, termProgress, type NowState, type TermDate } from '../services/clock';
import { getClockContext, getSelfLessonAt, type NowLesson } from '../repos/clock';
import {
  countTaughtLessons,
  findOrCreateOccurrence,
  getLastStoppingPoints,
  getOccurrenceCourses,
  getOccurrenceNotes,
} from '../repos/occurrence';
import { getSetting } from '../repos/settings';
import { getExperienceMode, shouldShowExperienceNudge, EXPERIENCE_NUDGE_AT } from '../lib/nav';
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
import { marksEnabled } from '../auth/marksGate';
import { marksBacklog, type MarksBacklogRow } from '../repos/marking';
import { renderPrepList, renderPrepAdd } from '../lib/prepView';
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

function renderStrip(state: NowState, current: NowLesson | null, next: NowLesson | null, now: Date, tz: string, terms: TermDate[], changed = false): string {
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

  // When the lesson/day has changed, stop the poll and show a persistent manual-refresh prompt instead
  // of hard-reloading — a reload would wipe a half-typed (not-yet-autosaved) note. The teacher refreshes
  // when ready; the strip itself already shows the new NOW.
  const poll = changed ? '' : ` data-bg-poll hx-get="/now/clock?sig=${encodeURIComponent(sig)}" hx-trigger="every 30s" hx-swap="outerHTML"`;
  const notice = changed ? ` &nbsp;·&nbsp; <a class="now-changed" href="/">↻ the lesson has changed — refresh</a>` : '';
  return `<div id="now-strip" class="now-strip"${poll}>
    <span class="now-when">${esc(dateLabel)} · ${esc(clock)}</span>${weekBadge} &nbsp;·&nbsp; ${nowLine}${nextLine}${notice}
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
  // The resume point is the single most useful mid-lesson fact — promote it from a muted footnote to a
  // prominent boxed line so it's the first thing the eye lands on at the bell.
  const lastLines = courses
    .map((c) => {
      const ls = lastByGc.get(c.groupCourseId);
      return ls
        ? `<div class="now-resume"><span class="now-resume-k">Last time</span> ${current.courses.length > 1 ? `<strong>${esc(c.courseName)}</strong> → ` : ''}${esc(ls.stoppingPoint)} <span class="muted">(${esc(ls.date)})</span></div>`
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

// Rail & Stage redesign — the six flickering right-column cards (Marks, Bell, Coming-up, Heads-up …)
// collapse into ONE calm "Needs me" list: ≤6 one-line rows, urgency-sorted, each tagged with its
// source, safeguarding pinned first and visually alarming. Each row keeps its native action (the bell
// ✓-done, the marks link), so nothing is lost — only the noise.
interface NeedsRow {
  rank: number; // 0 = safeguarding (always top), then overdue/urgent → routine
  html: string;
}

function needsMeRows(marks: MarksBacklogRow[], bell: BellTask[], events: UpcomingEvent[], heads: CapturedItem[], today: string): NeedsRow[] {
  const rows: NeedsRow[] = [];
  for (const i of heads.filter((h) => h.safeguarding)) {
    rows.push({ rank: 0, html: `<li class="nm-row nm-sg"><span class="nm-tag nm-tag-sg">⚑ safeguarding</span><span class="nm-text">${esc(i.body || '(flagged note)')}</span></li>` });
  }
  for (const t of bell) {
    rows.push({
      rank: 1,
      html: `<li id="bell-${t.id}" class="nm-row"><button type="button" class="link nm-done" title="Mark done" aria-label="Mark done" hx-post="/tasks/${t.id}/done" hx-target="#bell-${t.id}" hx-swap="outerHTML">✓</button><span class="nm-tag">${esc(URGENCY_LABELS[t.urgency] ?? t.urgency)}</span><span class="nm-text">${esc(t.title)}</span></li>`,
    });
  }
  for (const e of dueSoon(events, today).slice(0, 6)) {
    const d = e.date ? daysUntil(e.date, today) : 0;
    const when = d < 0 ? `${-d}d overdue` : d === 0 ? 'today' : `in ${d}d`;
    rows.push({ rank: d < 0 ? 1 : 3, html: `<li class="nm-row"><span class="nm-tag">event</span><span class="nm-text">${esc(e.title)} <span class="muted">· ${esc(when)}</span></span></li>` });
  }
  for (const r of marks) {
    const bits: string[] = [];
    if (r.suggested > 0) bits.push(`${r.suggested} to confirm`);
    if (r.unreleased) bits.push('ready to release');
    const flag = r.needsReview > 0 ? ` <span class="mk-review" title="${r.needsReview} need your eyes">⚠${r.needsReview}</span>` : '';
    rows.push({ rank: 2, html: `<li class="nm-row"><span class="nm-tag">marks</span><a class="nm-text" href="/lesson?lesson=${r.lessonId}&date=${esc(r.date)}">${esc(r.groupName)} · ${esc(r.courseName)} <span class="muted">${esc(bits.join(', '))}</span>${flag}</a></li>` });
  }
  for (const i of heads.filter((h) => !h.safeguarding).slice(0, 6)) {
    rows.push({ rank: 4, html: `<li class="nm-row"><span class="nm-tag">heads-up</span><span class="nm-text">${esc(i.body || '(captured note)')}${i.groupName ? ` <span class="muted">· ${esc(i.groupName)}</span>` : ''}</span></li>` });
  }
  return rows.sort((a, b) => a.rank - b.rank);
}

function renderNeedsMe(marks: MarksBacklogRow[], bell: BellTask[], events: UpcomingEvent[], heads: CapturedItem[], today: string): string {
  const rows = needsMeRows(marks, bell, events, heads, today);
  if (rows.length === 0) {
    return `<div class="now-card now-needs"><p class="kicker">Needs me</p><p class="muted nm-clear">Nothing needs you before the bell. ✓</p></div>`;
  }
  const CAP = 6;
  const shown = rows.slice(0, CAP).map((r) => r.html).join('');
  const more = rows.length > CAP ? `<li class="nm-row nm-more muted">+ ${rows.length - CAP} more</li>` : '';
  return `<div class="now-card now-needs">
    <p class="kicker">Needs me</p>
    <ul class="nm-list">${shown}${more}</ul>
    <p class="nm-foot"><a href="/tasks">Tasks</a> · <a href="/events">Events</a> · <a href="/captured">Captured</a></p>
  </div>`;
}

// The start/end-of-day checklist isn't lesson-live content, so it leaves the live column and sits in a
// collapsed disclosure — one click away without competing for the eye.
function renderDayCard(part: 'start' | 'end', items: PrepItem[], date: string): string {
  return `<details class="now-card now-daycard">
    <summary>${part === 'start' ? 'Start-of-day checklist' : 'End-of-day checklist'}${items.length ? ` (${items.length})` : ''}</summary>
    ${renderPrepList(items, '/day-checklist', 'day', `day-${part}`)}
    ${renderPrepAdd('/day-checklist/add', { date, part }, `day-${part}`)}
  </details>`;
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

      // Earned-unlock nudge: only do the count query when it could actually show (everyday + not yet
      // dismissed), so the common path stays cheap.
      const experience = getExperienceMode();
      const nudgeDismissed = (await getSetting('experience_nudge_dismissed').catch(() => null)) === 'true';
      const showNudge =
        experience === 'everyday' && !nudgeDismissed && shouldShowExperienceNudge(experience, false, await countTaughtLessons());

      const exToday = (await listExceptionsBetween(state.isoDate, state.isoDate)).length;
      const dayPart: 'start' | 'end' = state.minutes < 12 * 60 ? 'start' : 'end';
      const dayItems = await getDayChecklist(state.isoDate, dayPart);
      const marksWaiting = (await marksEnabled()) ? await marksBacklog() : [];

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
        ${
          showNudge
            ? `<div class="exp-nudge" id="exp-nudge">
                <span class="exp-nudge-text">✨ You've taught ${EXPERIENCE_NUDGE_AT}+ lessons — ready for the planning &amp; AI tools?</span>
                <form hx-post="/settings/experience" hx-swap="none" hx-on::after-request="if(event.detail.successful)location.reload()">
                  <input type="hidden" name="experience" value="power">
                  <button type="submit" class="btn-secondary">Turn on advanced tools</button>
                </form>
                <button type="button" class="link" hx-post="/settings/experience-nudge/dismiss" hx-target="#exp-nudge" hx-swap="outerHTML">not now</button>
              </div>`
            : ''
        }
        ${exToday ? `<p class="ex-note">⚠ ${exToday} timetable exception${exToday === 1 ? '' : 's'} today — <a href="/timetable">see the week</a></p>` : ''}
        <div class="now-cols">
          <div class="now-col now-col-now">
            <p class="now-focus"><a href="/focus">🎯 Focus — one thing now →</a></p>
            ${card}
            ${dayList}
          </div>
          <div class="now-col now-col-next">
            ${nextCard}
            ${renderNeedsMe(marksWaiting, bell, events, heads, state.isoDate)}
            ${renderDayCard(dayPart, dayItems, state.isoDate)}
          </div>
        </div>
      </section>`;
      return reply.type('text/html').send(layout({ title: 'Now', body, authed: true, csrfToken: csrf }));
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
      const prevSig = typeof (req.query as { sig?: unknown }).sig === 'string' ? (req.query as { sig: string }).sig : null;
      const sig = nowSignature(state, current, next);
      // The lesson/day changed since this strip was rendered → show a persistent "refresh" prompt
      // (and stop polling) rather than hard-reloading, which would wipe a half-typed note.
      if (prevSig !== null && prevSig !== sig) {
        return reply.type('text/html').send(renderStrip(state, current, next, now, ctx.tz, ctx.terms, true));
      }
      return reply.type('text/html').send(renderStrip(state, current, next, now, ctx.tz, ctx.terms));
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      return reply.type('text/html').send('<div id="now-strip" class="now-strip muted">clock unavailable</div>');
    }
  });
}
