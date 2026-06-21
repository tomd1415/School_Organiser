// Club session workspace. A club (purpose='club') opens here — NOT the lesson interface: a free-text
// record of what happened ("where everyone got up to"), plus the recent history so the teacher keeps
// continuity across weeks.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { getLessonSlot } from '../repos/timetable';
import { getClubRecord, setClubRecord, listClubHistory } from '../repos/clubSessions';

const TZ = 'Europe/London';
const Slot = z.object({ lesson: z.coerce.number().int().positive(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${iso}T12:00:00Z`));
}

function missing(reply: import('fastify').FastifyReply, code: number, msg: string, csrf: string) {
  return reply.code(code).type('text/html').send(layout({ title: 'Club', body: `<section class="card"><h1>Club</h1><p>${esc(msg)}</p><p><a href="/timetable">← Timetable</a></p></section>`, authed: true, csrfToken: csrf }));
}

export function registerClubRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/club', { preHandler: requireAuth }, async (req, reply) => {
    const p = Slot.safeParse(req.query);
    const csrf = reply.generateCsrf();
    if (!p.success) return missing(reply, 400, 'That club reference looks wrong.', csrf);
    const { lesson, date } = p.data;
    const slot = await getLessonSlot(lesson);
    if (!slot) return missing(reply, 404, 'That club no longer exists.', csrf);

    const [record, history] = await Promise.all([getClubRecord(lesson, date), listClubHistory(lesson, date)]);
    const title = slot.groupName ? `${slot.groupName} — ${slot.label}` : slot.label;
    const time = slot.start && slot.end ? `${slot.start}–${slot.end}` : '';
    const historyHtml = history.length
      ? `<details class="club-history"><summary>Past sessions (${history.length})</summary>
          <ul>${history.map((h) => `<li><strong>${esc(h.date)}</strong><div class="club-history-rec">${esc(h.record)}</div></li>`).join('')}</ul>
         </details>`
      : '<p class="muted">No past sessions recorded yet.</p>';

    const body = `
      <section class="club-page card" hx-headers='{"x-csrf-token":"${csrf}"}'>
        <div class="club-head">
          <p class="eyebrow">Club · ${esc(fmtDate(date))}</p>
          <h1>${esc(title)}${time ? ` <span class="muted">${esc(time)}</span>` : ''}</h1>
        </div>
        <label class="club-record-label">What we did / where everyone got up to
          <textarea class="club-record" name="record" placeholder="Record this session — who came, what each pupil got up to, what to pick up next time…"
            hx-post="/club/record" hx-vals='{"lesson":"${lesson}","date":"${esc(date)}"}' hx-trigger="input changed delay:800ms, blur" hx-target="#club-status" hx-swap="outerHTML">${esc(record)}</textarea>
        </label>
        <span class="note-status" id="club-status"></span>
        ${historyHtml}
        <p class="free-back"><a href="/timetable?date=${esc(date)}">← Back to timetable</a></p>
      </section>`;
    return reply.type('text/html').send(layout({ title: `Club · ${title}`, body, authed: true, csrfToken: csrf }));
  });

  app.post('/club/record', guard, async (req, reply) => {
    const b = Slot.extend({ record: z.string().max(8000).optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    await setClubRecord(b.data.lesson, b.data.date, (b.data.record ?? '').trim());
    return reply.type('text/html').send('<span class="note-status" id="club-status">saved ✓</span>');
  });
}
