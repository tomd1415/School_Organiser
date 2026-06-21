import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { addDays, fromMinutes, localParts, weekdayOf } from '../lib/time';
import { classifyDay } from '../services/clock';
import { computeWindows, applyExceptions, type SlotEffect } from '../services/availability';
import { getClockContext } from '../repos/clock';
import { listAvailabilityEvents } from '../repos/events';
import { listExceptionsBetween } from '../repos/exceptions';
import { indexDayExceptions, describeException } from '../services/exceptions';
import {
  createWorkBlock,
  deleteWorkBlock,
  getDaySlots,
  getLeaveMinutes,
  getWorkBlock,
  listWorkBlocks,
  setWorkBlockStatus,
  updateWorkBlockField,
} from '../repos/workBlocks';
import { renderNewBlockButton, renderWorkBlockItem, renderWorkLog } from '../lib/workBlockView';
import { renderSavedStatus } from '../lib/notesView';

const idParam = z.object({ id: z.coerce.number().int().positive() });
const dateRe = /^\d{4}-\d{2}-\d{2}$/;

export function registerTimeRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/time', { preHandler: requireAuth }, async (req, reply) => {
    const q = z.object({ date: z.string().regex(dateRe).optional() }).safeParse(req.query);
    const csrf = reply.generateCsrf();

    let windowsHtml = '';
    let logHtml = '';
    let date = '';
    try {
      const ctx = await getClockContext();
      const today = localParts(new Date(), ctx.tz).isoDate;
      date = q.success && q.data.date ? q.data.date : today;
      const weekday = weekdayOf(date);
      const isSchoolDay = classifyDay(date, weekday, ctx.terms).isSchoolDay;

      const [slots, leave, blockingRaw, blocks, exRows] = await Promise.all([
        getDaySlots(weekday),
        getLeaveMinutes(),
        listAvailabilityEvents(date),
        listWorkBlocks(date),
        listExceptionsBetween(date, date),
      ]);
      // The after-school work window really runs to the leave time, not the seeded slot end.
      const adjusted = slots.map((s) => (s.slotType === 'after_school' ? { ...s, endMin: Math.max(s.endMin, leave) } : s));
      // Fold today's per-lesson cover/free exceptions into availability (whole-day off-timetable stays display-only).
      const dx = indexDayExceptions(exRows);
      const effectFor = (lessonId: number): SlotEffect => {
        const ex = dx.byLesson.get(lessonId);
        if (!ex) return 'none';
        const mode = describeException(ex).mode;
        return mode === 'free' ? 'free' : mode === 'cover' ? 'busy' : 'none';
      };
      const withEx = applyExceptions(adjusted, effectFor);
      const exAdjusted = withEx.some((s, i) => s.purpose !== adjusted[i]!.purpose);
      const blockingEvents = blockingRaw
        .filter((e) => e.startMin != null && e.endMin != null)
        .map((e) => ({ startMin: e.startMin as number, endMin: e.endMin as number }));
      const windows = computeWindows({ weekday, isSchoolDay, slots: withEx, blockingEvents, fortnightActive: true });

      const exNote = exAdjusted ? `<p class="muted win-ex-note">Adjusted for today's cover/free lessons.</p>` : '';
      windowsHtml =
        (windows.length
          ? `<ul class="windows">${windows
              .map(
                (w) =>
                  `<li><span class="win-time">${esc(fromMinutes(w.startMin))}–${esc(fromMinutes(w.endMin))}</span> <span>${esc(w.label)}</span> <span class="win-min muted">${w.minutes} min</span></li>`,
              )
              .join('')}</ul>`
          : `<p class="muted">${isSchoolDay ? 'No free work windows today.' : 'Not a school day.'}</p>`) + exNote;
      logHtml = renderWorkLog(blocks);
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      windowsHtml = `<p class="muted">Time is unavailable — the database is not reachable.</p>`;
      date = '';
    }

    const nav = date
      ? `<nav class="tt-weeknav"><a href="/time?date=${esc(addDays(date, -1))}">◀</a><a href="/time">today</a><a href="/time?date=${esc(addDays(date, 1))}">▶</a></nav>`
      : '';
    const body = `
      <section class="card time-avail" hx-headers='{"x-csrf-token":"${csrf}"}'>
        <div class="ld-notes-head"><h1>Time${date ? ` · ${esc(date)}` : ''}</h1>${nav}</div>
        <h2>Work windows</h2>
        <p class="muted">Free periods + before/after school, minus break, lunch, clubs, meetings and a 10-min buffer.</p>
        ${windowsHtml}
        <div class="ld-notes-head"><h2>Work log</h2>${date ? renderNewBlockButton(date) : ''}</div>
        <p class="muted">Planned vs. what you actually did — tap <strong>diverted</strong> when reality wins.</p>
        ${logHtml}
      </section>`;
    return reply.type('text/html').send(layout({ title: 'Time', body, authed: true, csrfToken: csrf }));
  });

  app.post('/work-blocks', guard, async (req, reply) => {
    const b = z.object({ date: z.string().regex(dateRe) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    const id = await createWorkBlock(b.data.date);
    const block = await getWorkBlock(id);
    return reply.type('text/html').send(block ? renderWorkBlockItem(block) : '');
  });

  app.post('/work-blocks/:id', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const body = (req.body ?? {}) as Record<string, unknown>;
    for (const [field, raw] of Object.entries(body)) {
      if (field === '_csrf') continue;
      await updateWorkBlockField(id.data.id, field, typeof raw === 'string' ? raw : null);
    }
    return reply.type('text/html').send(renderSavedStatus(`wblock-${id.data.id}-status`));
  });

  for (const [path, status] of [['done', 'done'], ['diverted', 'diverted']] as const) {
    app.post(`/work-blocks/:id/${path}`, guard, async (req, reply) => {
      const id = idParam.safeParse(req.params);
      if (!id.success) return reply.code(400).send('');
      await setWorkBlockStatus(id.data.id, status);
      const block = await getWorkBlock(id.data.id);
      return reply.type('text/html').send(block ? renderWorkBlockItem(block) : '');
    });
  }

  app.post('/work-blocks/:id/delete', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    await deleteWorkBlock(id.data.id);
    return reply.type('text/html').send('');
  });
}
