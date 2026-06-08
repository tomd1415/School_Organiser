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
import { buildLessonDetail, type CourseSection, type LessonDetail } from '../services/occurrence';

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

function page(title: string, body: string, reply: { generateCsrf: () => string }): string {
  return layout({ title, body, authed: true, csrfToken: reply.generateCsrf() });
}

function renderSection(s: CourseSection): string {
  const colour = s.colour ?? '#94a3b8';
  const plan = s.hasPlan ? 'set' : '<em>none yet (Phase 3)</em>';
  const stop = s.stoppingPoint
    ? `<p class="ld-stop">Stopping point: <strong>${esc(s.stoppingPoint)}</strong></p>`
    : '';
  const last = s.lastStop
    ? `<p class="ld-last">Last time → stopped at <strong>${esc(s.lastStop.stoppingPoint)}</strong> <span class="muted">(${esc(s.lastStop.date)})</span></p>`
    : '';
  return `
    <section class="ld-course" style="border-left-color:${esc(colour)}">
      <h2>${esc(s.courseName)}</h2>
      <p class="muted">Plan: ${plan} · Resources: <em>Phase 3</em></p>
      ${stop}${last}
    </section>`;
}

function renderDetail(detail: LessonDetail): string {
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

  const notes =
    detail.notes.length > 0
      ? `<ul class="ld-notes">${detail.notes
          .map(
            (n) =>
              `<li><span class="ld-time">${esc(n.time)}</span> ${esc(n.body)}${
                n.stoppingPoint ? ` <span class="muted">— stopped at ${esc(n.stoppingPoint)}</span>` : ''
              }</li>`,
          )
          .join('')}</ul>`
      : `<p class="muted">No notes yet — fast capture arrives in Phase 1.6.</p>`;

  return `
    <section class="ld">
      <p class="kicker">${flag}${h.isSelf ? 'Lesson' : 'Lesson I oversee'}</p>
      <h1>${heading}</h1>
      <p class="ld-meta">${meta}</p>
      ${sections}
      <section class="ld-notesblock">
        <h2>Notes</h2>
        ${notes}
      </section>
      <p><a href="/timetable">← Timetable</a></p>
    </section>`;
}

export function registerLessonRoutes(app: FastifyInstance): void {
  app.get('/lesson', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = Query.safeParse(req.query);
    if (!parsed.success) {
      const body = `<section class="card"><h1>Lesson</h1><p>That lesson reference looks wrong.</p><p><a href="/timetable">← Timetable</a></p></section>`;
      return reply.code(400).type('text/html').send(page('Lesson', body, reply));
    }
    const { lesson, date } = parsed.data;

    try {
      const occurrenceId = await findOrCreateOccurrence(lesson, date);
      const header = await getOccurrenceHeader(occurrenceId);
      if (!header) {
        const body = `<section class="card"><h1>Lesson</h1><p>That lesson no longer exists.</p><p><a href="/timetable">← Timetable</a></p></section>`;
        return reply.code(404).type('text/html').send(page('Lesson', body, reply));
      }
      const [courses, lastStops, notes] = await Promise.all([
        getOccurrenceCourses(occurrenceId),
        getLastStoppingPoints(header.lessonId, date),
        getOccurrenceNotes(occurrenceId),
      ]);
      const detail = buildLessonDetail(header, courses, lastStops, notes);
      const title = header.groupName ?? purposeLabel(header.purpose);
      return reply.type('text/html').send(page(title, renderDetail(detail), reply));
    } catch {
      const body = `<section class="card"><h1>Lesson</h1><p class="muted">Lesson detail is unavailable — the database is not reachable.</p><p><a href="/timetable">← Timetable</a></p></section>`;
      return reply.type('text/html').send(page('Lesson', body, reply));
    }
  });
}
