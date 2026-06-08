import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { resolveNow, type NowState } from '../services/clock';
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

function renderStrip(state: NowState, current: NowLesson | null, next: NowLesson | null, now: Date, tz: string): string {
  const { dateLabel, clock } = nowLabels(now, tz);

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

  return `<div id="now-strip" class="now-strip" hx-get="/now/clock" hx-trigger="every 30s" hx-swap="outerHTML">
    <span class="now-when">${esc(dateLabel)} · ${esc(clock)}</span> &nbsp;·&nbsp; ${nowLine}${nextLine}
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

      const body = `<section class="now-screen" hx-headers='{"x-csrf-token":"${csrf}"}'>
        ${renderStrip(state, current, next, now, ctx.tz)}
        ${card}
      </section>`;
      return reply.type('text/html').send(layout({ title: 'Now', body, authed: true, csrfToken: csrf }));
    } catch {
      const body = `<section class="now"><p class="kicker">Now</p><h1>Now</h1><p class="muted">The database is not reachable — start the stack with <code>./start.sh</code>.</p></section>`;
      return reply.type('text/html').send(layout({ title: 'Now', body, authed: true, csrfToken: csrf }));
    }
  });

  // Auto-refreshing clock strip (every 30s) — never includes the note composer,
  // so a half-typed note is never wiped.
  app.get('/now/clock', { preHandler: requireAuth }, async (_req, reply) => {
    const now = new Date();
    try {
      const { ctx, state, current, next } = await resolveNowLessons(now);
      return reply.type('text/html').send(renderStrip(state, current, next, now, ctx.tz));
    } catch {
      return reply.type('text/html').send('<div id="now-strip" class="now-strip muted">clock unavailable</div>');
    }
  });
}
