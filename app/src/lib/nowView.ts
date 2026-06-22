import { esc } from './html';
import { NowState, TermDate, classifyDay, termProgress } from '../services/clock';
import { NowLesson } from '../repos/clock';
import { OccurrenceCourseRow } from '../services/occurrence';
import { LastStop } from '../services/occurrence';
import { NoteItem, renderNotesList, renderNewNoteButton } from './notesView';
import { ExceptionEffect, NO_EXCEPTION, describeException } from '../services/exceptions';
import { BellTask, URGENCY_LABELS } from '../services/task';
import { UpcomingEvent } from '../services/event';
import { CapturedItem } from '../services/captured';
import { LessonRow, PeriodRow } from '../services/timetable';
import { MarksBacklogRow } from '../repos/marking';
import { InterestItem } from '../services/currentInterests';
import { PrepItem } from '../repos/prep';
import { BriefItem } from '../services/brief';
import { renderPrepList, renderPrepAdd } from './prepView';
import { renderTimerBanner } from '../routes/timer';
import { markOpenAttrs } from '../routes/markModal';
import { addDays, toMinutes, weekdayOf, fromMinutes } from './time';

export interface NeedsRow {
  rank: number; // 0 = safeguarding (always top), then overdue/urgent → routine
  html: string;
}

export function purposeLabel(purpose: string): string {
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

export function lessonName(l: NowLesson | null): string {
  if (!l) return '—';
  return l.groupName ?? purposeLabel(l.purpose);
}

export function nowLabels(now: Date, tz: string): { dateLabel: string; clock: string } {
  return {
    dateLabel: new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' }).format(now),
    clock: new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now),
  };
}

export function nowSignature(state: NowState, current: NowLesson | null, next: NowLesson | null): string {
  return [
    state.isoDate,
    state.isSchoolDay ? '1' : '0',
    state.current?.slotOrder ?? '',
    current?.lessonId ?? '',
    next?.lessonId ?? '',
    state.nextTeaching?.date ?? '',
  ].join('|');
}

export function renderStrip(
  state: NowState,
  current: NowLesson | null,
  next: NowLesson | null,
  now: Date,
  tz: string,
  terms: TermDate[],
  changed = false,
  curEx: ExceptionEffect = NO_EXCEPTION,
  nextEx: ExceptionEffect = NO_EXCEPTION
): string {
  const { dateLabel, clock } = nowLabels(now, tz);
  const sig = nowSignature(state, current, next);
  const tp = termProgress(state.isoDate, terms);
  const weekBadge = tp ? ` · <span class="now-week" title="${esc(tp.name)}">wk ${tp.week}/${tp.weeksTotal}</span>` : '';

  let nowLine: string;
  if (!state.isSchoolDay) {
    nowLine = `<strong>No school today</strong> <span class="muted">(${esc(state.dayKind.replace('_', ' '))})</span>`;
  } else if (state.current) {
    const mins = state.minutesRemaining;
    const left = mins != null ? ` · <span class="now-mins">${mins} min left</span>` : '';
    let who = current ? ` · ${esc(lessonName(current))}` : '';
    if (curEx.mode === 'free') who = ` · <span class="now-ex-free">Free</span>${curEx.detail ? ` <span class="muted">(${esc(curEx.detail)})</span>` : ''}`;
    else if (curEx.mode === 'cover') who = ` · <span class="now-ex-cover">On cover</span>${curEx.detail ? ` <span class="muted">(${esc(curEx.detail)})</span>` : ''}`;
    else if (curEx.mode === 'room' && current) who = ` · ${esc(lessonName(current))} <span class="muted">→ ${esc(curEx.roomName ?? '')}</span>`;
    nowLine = `<strong>NOW</strong> ${esc(state.current.label)}${who}${left}`;
  } else {
    nowLine = `<strong>Outside lesson time</strong>`;
  }

  let nextLine = '';
  if (state.nextTeaching && next) {
    const href = `/lesson?lesson=${next.lessonId}&date=${esc(state.nextTeaching.date)}`;
    const what =
      nextEx.mode === 'free' ? `<span class="now-ex-free">Free</span>${nextEx.detail ? ` <span class="muted">(${esc(nextEx.detail)})</span>` : ''}`
      : nextEx.mode === 'cover' ? `<span class="now-ex-cover">On cover</span>${nextEx.detail ? ` <span class="muted">(${esc(nextEx.detail)})</span>` : ''}`
      : esc(lessonName(next));
    nextLine = ` &nbsp;·&nbsp; <strong>NEXT</strong> ${esc(state.nextTeaching.label)} ${what} <a href="${href}">open</a>`;
  }

  const poll = changed ? '' : ` data-bg-poll hx-get="/now/clock?sig=${encodeURIComponent(sig)}" hx-trigger="every 30s" hx-swap="outerHTML"`;
  const notice = changed ? ` &nbsp;·&nbsp; <a class="now-changed" href="/">↻ the lesson has changed — refresh</a>` : '';
  return `<div id="now-strip" class="now-strip"${poll}>
    <span class="now-when">${esc(dateLabel)} · ${esc(clock)}</span>${weekBadge} &nbsp;·&nbsp; ${nowLine}${nextLine}${notice}
  </div>`;
}

export function renderCurrentCard(
  current: NowLesson,
  courses: OccurrenceCourseRow[],
  lastStops: LastStop[],
  notes: NoteItem[],
  occurrenceId: number,
  state: NowState,
  ex: ExceptionEffect
): string {
  const lastByGc = new Map<number, LastStop>(lastStops.map((ls) => [ls.groupCourseId, ls]));
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

  const exBanner = ex.mode !== 'none'
    ? `<p class="now-exbanner now-ex-${ex.mode}">⚠ <strong>${esc(ex.label)}</strong>${ex.detail ? ` — ${esc(ex.detail)}` : ''}</p>`
    : '';
  const isFreeOrCover = ex.mode === 'free' || ex.mode === 'cover';
  const heading = ex.mode === 'free' ? 'Free' : ex.mode === 'cover' ? 'On cover' : esc(current.groupName ?? purposeLabel(current.purpose));
  const wasLine = isFreeOrCover && current.groupName ? `<p class="muted now-ex-was">${ex.mode === 'free' ? 'was ' : 'instead of '}${esc(current.groupName)}</p>` : '';
  return `<div class="now-card">
    <p class="kicker">Now${state.current ? ' · ' + esc(state.current.label) : ''}</p>
    ${exBanner}
    <h1>${heading}</h1>
    ${wasLine}
    ${meta && !isFreeOrCover ? `<p class="ld-meta">${meta}</p>` : ''}
    ${isFreeOrCover ? '' : lastLines}
    <div class="now-notes">
      <div class="ld-notes-head"><h2>Quick note</h2>${renderNewNoteButton(listId, { kind: 'lesson', occurrence: occurrenceId })}</div>
      ${renderNotesList(listId, notes)}
    </div>
    <p><a href="${openHref}">Open lesson detail →</a></p>
  </div>`;
}

export function renderNextCard(
  next: NowLesson,
  state: NowState,
  courses: OccurrenceCourseRow[],
  lastStops: LastStop[],
  slot: { date: string; label: string; startMin: number },
  ex: ExceptionEffect
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
    ? `${fromMinutes(slot.startMin)} · <span class="now-mins">in ${Math.max(0, slot.startMin - state.minutes)} min</span>`
    : esc(slot.date);
  const room = next.roomName ? ` · ${esc(next.roomName)}` : '';
  const openHref = `/lesson?lesson=${next.lessonId}&date=${esc(slot.date)}`;
  const exBanner = ex.mode !== 'none'
    ? `<p class="now-exbanner now-ex-${ex.mode}">⚠ <strong>${esc(ex.label)}</strong>${ex.detail ? ` — ${esc(ex.detail)}` : ''}</p>`
    : '';
  const isFreeOrCover = ex.mode === 'free' || ex.mode === 'cover';
  const heading = ex.mode === 'free' ? 'Free' : ex.mode === 'cover' ? 'On cover' : esc(next.groupName ?? purposeLabel(next.purpose));
  return `<div class="now-card now-next">
    <p class="kicker">Next · ${esc(slot.label)}</p>
    ${exBanner}
    <h2>${heading}</h2>
    <p class="ld-meta">${when}${room}</p>
    ${isFreeOrCover ? '' : courseBlocks ? `<ul class="next-courses">${courseBlocks}</ul>` : ''}
    <p><a href="${openHref}">Open next lesson →</a></p>
  </div>`;
}

export function renderDayList(
  lessons: LessonRow[],
  periods: PeriodRow[],
  weekday: number,
  afterMin: number | null,
  date: string,
  heading: string
): string {
  const startOf = new Map(periods.filter((p) => p.weekday === weekday).map((p) => [p.slotOrder, p.start]));
  const rows = lessons
    .filter((l) => l.weekday === weekday && l.isSelf && ['teaching', 'form', 'club'].includes(l.purpose))
    .map((l) => ({ ...l, start: startOf.get(l.slotOrder) ?? '' }))
    .filter((l) => l.start && (afterMin === null || toMinutes(l.start) > afterMin))
    // Order by clock time, not slot_order — slot_order isn't reliably chronological (same fix as the
    // timetable grid, see services/timetable.ts buildWeekGrid). "HH:MM" sorts lexically = chronologically.
    .sort((a, b) => a.start.localeCompare(b.start));
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

export function needsMeRows(marks: MarksBacklogRow[], bell: BellTask[], events: UpcomingEvent[], heads: CapturedItem[], today: string): NeedsRow[] {
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
    rows.push({ rank: 2, html: `<li class="nm-row"><span class="nm-tag">marks</span><button type="button" class="nm-text nm-mark" ${markOpenAttrs(`/lesson/oc/${r.occurrenceCourseId}/mark`)} title="open marking">${esc(r.groupName)} · ${esc(r.courseName)} <span class="muted">${esc(bits.join(', '))}</span>${flag}</button></li>` });
  }
  for (const i of heads.filter((h) => !h.safeguarding).slice(0, 6)) {
    rows.push({ rank: 4, html: `<li class="nm-row"><span class="nm-tag">heads-up</span><span class="nm-text">${esc(i.body || '(captured note)')}${i.groupName ? ` <span class="muted">· ${esc(i.groupName)}</span>` : ''}</span></li>` });
  }
  return rows.sort((a, b) => a.rank - b.rank);
}

function dueSoon(events: UpcomingEvent[], today: string): UpcomingEvent[] {
  return events.filter((e) => e.date && daysUntil(e.date, today) <= 7);
}

function daysUntil(d1: string, d2: string): number {
  return Math.round((new Date(d1).getTime() - new Date(d2).getTime()) / (24 * 3600 * 1000));
}

export function renderNeedsMe(marks: MarksBacklogRow[], bell: BellTask[], events: UpcomingEvent[], heads: CapturedItem[], today: string): string {
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
    <p class="nm-foot"><a href="/marking">✎ Marking</a> · <a href="/tasks">Tasks</a> · <a href="/events">Events</a> · <a href="/captured">Captured</a></p>
  </div>`;
}

export function renderDayCard(part: 'start' | 'end', items: PrepItem[], date: string): string {
  return `<details class="now-card now-daycard">
    <summary>${part === 'start' ? 'Start-of-day checklist' : 'End-of-day checklist'}${items.length ? ` (${items.length})` : ''}</summary>
    ${renderPrepList(items, '/day-checklist', 'day', `day-${part}`)}
    ${renderPrepAdd('/day-checklist/add', { date, part }, `day-${part}`)}
  </details>`;
}

export function renderMorningBrief(items: BriefItem[]): string {
  if (items.length === 0) return '';
  const rows = items
    .map((i) => `<li class="brief-${i.level}">${i.icon} ${i.href ? `<a href="${i.href}">${esc(i.text)}</a>` : esc(i.text)}</li>`)
    .join('');
  return `<div class="now-card now-brief">
    <p class="kicker">📋 Morning brief</p>
    <ul class="brief-list">${rows}</ul>
  </div>`;
}

export function renderCurrentInterests(items: InterestItem[]): string {
  if (items.length === 0) return '';
  const row = (i: InterestItem): string => {
    const href = i.kind === 'task' ? '/tasks?view=interest' : '/captured';
    return `<li class="${i.fresh ? 'ci-fresh' : 'ci-fading'}"><a href="${href}">${esc(i.label)}</a></li>`;
  };
  return `<div class="now-card ci-card">
    <p class="kicker">⭐ Current interests</p>
    <ul class="ci-list">${items.map(row).join('')}</ul>
  </div>`;
}

export interface NowNextData {
  state: NowState;
  current: NowLesson | null;
  next: NowLesson | null;
  card: string;
  nextCard: string;
  dayList: string;
  briefItems: BriefItem[];
  marksWaiting: MarksBacklogRow[];
  bell: BellTask[];
  events: UpcomingEvent[];
  heads: CapturedItem[];
  interests: InterestItem[];
  dayPart: 'start' | 'end';
  dayItems: PrepItem[];
  running: any;
  showNudge: boolean;
  exToday: number;
  csrf: string;
  now: Date;
  ctx: { tz: string; terms: TermDate[] };
  curEx: ExceptionEffect;
  nextEx: ExceptionEffect;
  allLessons?: LessonRow[];
  periods?: PeriodRow[];
  captured?: CapturedItem[];
}

export function renderTimelineCard(
  lessons: LessonRow[] | undefined,
  periods: PeriodRow[] | undefined,
  state: NowState,
  now: Date,
  tz: string
): string {
  if (!periods || !lessons) return '';
  
  // Filter target periods and sort by slotOrder/start time
  let targetWeekday = state.weekday;
  let targetLabel = "Today's Timetable";
  let isFuture = !state.isSchoolDay;

  let todayPeriods = periods.filter(p => p.weekday === targetWeekday).sort((a, b) => a.start.localeCompare(b.start));
  if (!todayPeriods.length) {
    // If today is a weekend/holiday and has no periods, default to the next teaching day's weekday
    if (state.nextTeaching) {
      targetWeekday = state.nextTeaching.weekday;
      const d = state.nextTeaching.date;
      const formattedDate = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric' }).format(new Date(`${d}T12:00:00Z`));
      targetLabel = `Timetable: ${formattedDate}`;
      isFuture = true;
    } else {
      // Fallback to Monday
      targetWeekday = 1;
      targetLabel = "Monday's Timetable";
      isFuture = true;
    }
    todayPeriods = periods.filter(p => p.weekday === targetWeekday).sort((a, b) => a.start.localeCompare(b.start));
  }
  if (!todayPeriods.length) return '';
  
  const todayLessons = lessons.filter(l => l.weekday === targetWeekday && l.isSelf);
  const lessonBySlot = new Map<number, LessonRow>();
  for (const l of todayLessons) {
    lessonBySlot.set(l.slotOrder, l);
  }

  const currentMinutes = isFuture ? -1 : state.minutes;

  const slotHtmls = todayPeriods.map(p => {
    const l = lessonBySlot.get(p.slotOrder);
    
    // Start and end minutes for checking active/done status
    const startMin = toMinutes(p.start);
    const endMin = toMinutes(p.end);
    
    let statusClass = '';
    let stateLabel = '';
    
    if (currentMinutes >= endMin) {
      statusClass = 'done';
      stateLabel = 'done';
    } else if (currentMinutes >= startMin && currentMinutes < endMin) {
      statusClass = 'active current';
      stateLabel = 'active';
    } else {
      statusClass = 'next';
      stateLabel = 'next';
    }

    const title = l ? (l.groupName ?? purposeLabel(l.purpose)) : purposeLabel(p.slotType);
    let detail = p.label;
    if (l && l.courses && l.courses.length > 0) {
      detail += ` · ${l.courses.map(c => c.name).join(', ')}`;
    }
    
    return `
      <li class="timeline-slot ${statusClass}">
        <time>${p.start}</time>
        <span class="node"></span>
        <div class="slot-details">
          <strong>${esc(title)}</strong>
          <small>${esc(detail)}</small>
          <span class="state">${stateLabel}</span>
        </div>
      </li>
    `;
  }).join('');

  return `
    <section class="card agenda-card">
      <div class="card-head">
        <h2>${esc(targetLabel)}</h2>
        <span class="badge good">${todayPeriods.length} slots</span>
      </div>
      <div class="agenda-timeline">
        <ol class="timeline-list">
          ${slotHtmls}
        </ol>
      </div>
    </section>
  `;
}

export function renderInboxQueueCard(captured: CapturedItem[] | undefined, csrf: string): string {
  if (!captured) return '';
  const activeItems = captured.filter(c => !c.archived);
  const count = activeItems.length;

  const listHtml = activeItems.slice(0, 5).map(item => {
    const badgeText = item.category ? (item.category.charAt(0).toUpperCase() + item.category.slice(1)) : 'Note';
    let badgeClass = '';
    if (item.category === 'safeguarding') badgeClass = 'red';
    else if (item.category === 'task') badgeClass = 'warn';
    else if (item.category === 'supply') badgeClass = 'ai';
    
    return `
      <div class="inbox-item-row" id="inbox-item-${item.id}">
        <div class="inbox-item-meta">
          <span class="badge ${badgeClass}">${esc(badgeText)}</span>
        </div>
        <p class="inbox-item-text">${esc(item.body || '(captured note)')}</p>
        <div class="inbox-item-actions" hx-headers='{"x-csrf-token":"${csrf}"}'>
          <button class="button small ghost" type="button" 
            hx-post="/captured/${item.id}/to-task" 
            hx-target="#inbox-item-${item.id}" 
            hx-swap="outerHTML">✓ Task</button>
          <button class="button small ghost" type="button" 
            hx-post="/captured/${item.id}/flag/archived" 
            hx-target="#inbox-item-${item.id}" 
            hx-swap="outerHTML">Archive</button>
        </div>
      </div>
    `;
  }).join('');

  const countBadge = count > 5 ? `<span class="badge warn" id="inbox-count-badge">${count} items (+${count - 5} more)</span>` : `<span class="badge warn" id="inbox-count-badge">${count} items</span>`;

  return `
    <section class="card inbox-queue-card">
      <div class="card-head">
        <h2>Inbox Queue</h2>
        ${countBadge}
      </div>
      <div class="inbox-list" id="inbox-items-container">
        ${listHtml || '<p class="muted">Inbox is empty</p>'}
      </div>
    </section>
  `;
}

export function renderMindDumpCard(csrf: string): string {
  return `
    <section class="card capture-dock-card">
      <div class="card-head">
        <div>
          <p class="eyebrow-accent">🧠 Mind Dump</p>
          <h2>Capture thought</h2>
        </div>
      </div>
      <form class="capture-form" hx-post="/capture-quick" hx-target="#qc-status" hx-swap="innerHTML" hx-on::after-request="if(window.htmxSaved(event))this.reset()" hx-headers='{"x-csrf-token":"${csrf}"}'>
        <div class="textarea-wrapper">
          <textarea name="body" placeholder="Jot down notes (e.g. 'Order green whiteboard markers' or 'Daniel Reed did great iteration today')..."></textarea>
        </div>
        <button class="button primary submit-inbox-btn" type="submit">📥 Capture to Inbox</button>
        <span id="qc-status"></span>
      </form>
    </section>
  `;
}

export function renderNowNext(data: NowNextData): string {
  const {
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
  } = data;

  const sig = nowSignature(state, current, next);

  const nudgeHtml = showNudge
    ? `<div class="exp-nudge" id="exp-nudge">
        <span class="exp-nudge-text">✨ You've taught 20+ lessons — ready for the planning &amp; AI tools?</span>
        <form hx-post="/settings/experience" hx-swap="none" hx-on::after-request="if(event.detail.successful)location.reload()">
          <input type="hidden" name="experience" value="power">
          <button type="submit" class="btn-secondary">Turn on advanced tools</button>
        </form>
        <button type="button" class="link" hx-post="/settings/experience-nudge/dismiss" hx-target="#exp-nudge" hx-swap="outerHTML">not now</button>
      </div>`
    : '';

  const exceptionBanner = exToday
    ? `<p class="ex-note">⚠ ${exToday} timetable exception${exToday === 1 ? '' : 's'} today — <a href="/timetable">see the week</a></p>`
    : '';

  return `<section class="now-screen" hx-headers='{"x-csrf-token":"${csrf}"}'>
    ${renderTimerBanner(running)}
    <!-- Hidden poll strip to preserve hx-get clock contract -->
    <div id="now-strip" class="now-strip" style="display: none;" hx-get="/now/clock?sig=${encodeURIComponent(sig)}" hx-trigger="every 30s" hx-swap="outerHTML"></div>

    ${nudgeHtml}
    ${exceptionBanner}

    <div class="now-grid">
      <!-- COLUMN 1: Contextual Action Cards -->
      <div class="now-col-left">
        ${card}
        ${dayList}
        ${renderDayCard(dayPart, dayItems, state.isoDate)}
      </div>

      <!-- COLUMN 2: Today's Agenda -->
      <div class="now-col-middle">
        ${renderTimelineCard(allLessons, periods, state, now, ctx.tz)}
      </div>

      <!-- COLUMN 3: Mind Clearing Capture & Processing -->
      <div class="now-col-right">
        ${renderMindDumpCard(csrf)}
        ${renderInboxQueueCard(captured, csrf)}
        ${renderMorningBrief(briefItems)}
        ${renderNeedsMe(marksWaiting, bell, events, heads, state.isoDate)}
        ${renderCurrentInterests(interests)}
      </div>
    </div>
  </section>`;
}

export function nextSchoolDayInfo(fromIso: string, terms: TermDate[], lessons: LessonRow[], tz: string): { label: string; teachingCount: number } | null {
  for (let i = 1; i <= 14; i++) {
    const d = addDays(fromIso, i);
    const wd = weekdayOf(d);
    if (!classifyDay(d, wd, terms).isSchoolDay) continue;
    const teachingCount = lessons.filter((l) => l.weekday === wd && l.isSelf && (l.purpose === 'teaching' || l.purpose === 'form')).length;
    const label = i === 1 ? 'Tomorrow' : new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${d}T12:00:00Z`));
    return { label, teachingCount };
  }
  return null;
}
