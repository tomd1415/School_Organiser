import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import {
  findOrCreateOccurrence,
  getLastStoppingPoints,
  getOccurrenceCourses,
  getOccurrenceHeader,
  getOccurrenceNotes,
} from '../repos/occurrence';
import { getFollowupsForOccurrence } from '../repos/notes';
import { buildLessonDetail, type CourseSection, type LessonDetail } from '../services/occurrence';
import { renderNewNoteButton, renderNotesList, type FollowupItem, type NoteItem } from '../lib/notesView';
import { listOccurrencePrep, type PrepItem } from '../repos/prep';
import { renderPrepList } from '../lib/prepView';

const TZ = 'Europe/London';
const Query = z.object({
  lesson: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

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

function fmtLong(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${iso}T12:00:00Z`));
}

function errorPage(reply: { generateCsrf: () => string }, code: number, message: string) {
  const body = `<section class="card"><h1>Lesson</h1><p>${esc(message)}</p><p><a href="/timetable">← Timetable</a></p></section>`;
  return { code, html: layout({ title: 'Lesson', body, authed: true, csrfToken: reply.generateCsrf() }) };
}

function renderSection(s: CourseSection): string {
  const colour = s.colour ?? '#94a3b8';
  const plan = s.hasPlan ? 'set' : '<em>none yet (Phase 3)</em>';
  const last = s.lastStop
    ? `<p class="ld-last">Last time → stopped at <strong>${esc(s.lastStop.stoppingPoint)}</strong> <span class="muted">(${esc(s.lastStop.date)})</span></p>`
    : '';
  const oc = s.occurrenceCourseId;
  return `
    <section class="ld-course" style="border-left-color:${esc(colour)}">
      <h2>${esc(s.courseName)}</h2>
      <p class="muted">Plan: ${plan} · Resources: <em>Phase 3</em></p>
      ${last}
      <label class="stop-label">Stopping point
        <input class="stop-input" name="stopping_point" value="${esc(s.stoppingPoint ?? '')}" placeholder="where we got to…"
          hx-post="/occurrence-course/${oc}/stopping" hx-trigger="input changed delay:800ms, blur" hx-swap="none">
        <span class="note-status" id="oc-${oc}-status"></span>
      </label>
    </section>`;
}

function renderDetail(detail: LessonDetail, notes: NoteItem[], prep: PrepItem[], csrf: string): string {
  const h = detail.header;
  const heading = h.groupName ? esc(h.groupName) : esc(purposeLabel(h.purpose));
  const flag = h.isSelf ? '' : '⚑ ';
  const meta = [fmtLong(h.date), h.periodLabel, h.start && h.end ? `${h.start}–${h.end}` : '', h.roomName ?? '']
    .filter(Boolean)
    .map((x) => esc(x))
    .join(' · ');

  const sections =
    detail.sections.length > 0
      ? detail.sections.map(renderSection).join('')
      : `<p class="muted">${h.purpose === 'free' ? 'Free period — protected work time.' : 'No courses attached to this slot.'}</p>`;

  const listId = `notes-list-${h.occurrenceId}`;
  return `
    <section class="ld" hx-headers='{"x-csrf-token":"${csrf}"}'>
      <p class="kicker">${flag}${h.isSelf ? 'Lesson' : 'Lesson I oversee'}</p>
      <h1>${heading}</h1>
      <p class="ld-meta">${meta}</p>
      ${sections}
      ${prep.length ? `<section class="ld-notesblock"><h2>Before the bell</h2>${renderPrepList(prep, '/prep', 'prep', `prep-${detail.header.occurrenceId}`)}</section>` : ''}
      <section class="ld-notesblock">
        <div class="ld-notes-head"><h2>Notes</h2>${renderNewNoteButton(listId, { kind: 'lesson', occurrence: h.occurrenceId })}</div>
        ${renderNotesList(listId, notes)}
      </section>
      <p><a href="/timetable">← Timetable</a></p>
    </section>`;
}

export function registerLessonRoutes(app: FastifyInstance): void {
  app.get('/lesson', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = Query.safeParse(req.query);
    if (!parsed.success) {
      const e = errorPage(reply, 400, 'That lesson reference looks wrong.');
      return reply.code(e.code).type('text/html').send(e.html);
    }
    const { lesson, date } = parsed.data;

    try {
      const occurrenceId = await findOrCreateOccurrence(lesson, date);
      const header = await getOccurrenceHeader(occurrenceId);
      if (!header) {
        const e = errorPage(reply, 404, 'That lesson no longer exists.');
        return reply.code(e.code).type('text/html').send(e.html);
      }
      const [courses, lastStops, noteRows, followups, prep] = await Promise.all([
        getOccurrenceCourses(occurrenceId),
        getLastStoppingPoints(header.lessonId, date),
        getOccurrenceNotes(occurrenceId),
        getFollowupsForOccurrence(occurrenceId),
        listOccurrencePrep(occurrenceId),
      ]);

      const fuByNote = new Map<number, FollowupItem[]>();
      for (const f of followups) {
        const arr = fuByNote.get(f.noteId) ?? [];
        arr.push({ id: f.id, text: f.text, done: f.done });
        fuByNote.set(f.noteId, arr);
      }
      const noteItems: NoteItem[] = noteRows.map((n) => ({
        id: n.id,
        body: n.body,
        time: n.time,
        followups: fuByNote.get(n.id) ?? [],
      }));

      const detail = buildLessonDetail(header, courses, lastStops);
      const csrf = reply.generateCsrf();
      const title = header.groupName ?? purposeLabel(header.purpose);
      return reply.type('text/html').send(layout({ title, body: renderDetail(detail, noteItems, prep, csrf), authed: true, csrfToken: csrf }));
    } catch {
      const body = `<section class="card"><h1>Lesson</h1><p class="muted">Lesson detail is unavailable — the database is not reachable.</p><p><a href="/timetable">← Timetable</a></p></section>`;
      return reply.type('text/html').send(layout({ title: 'Lesson', body, authed: true, csrfToken: reply.generateCsrf() }));
    }
  });
}
