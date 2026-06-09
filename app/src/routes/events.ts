import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { layout } from '../lib/html';
import { createEvent, listUpcoming, setEventStatus, updateEventField } from '../repos/events';
import { renderEventItem, renderEventList, renderNewEventButton } from '../lib/eventView';
import { renderSavedStatus } from '../lib/notesView';
import type { UpcomingEvent } from '../services/event';

const idParam = z.object({ id: z.coerce.number().int().positive() });

export function registerEventRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/events', { preHandler: requireAuth }, async (_req, reply) => {
    const csrf = reply.generateCsrf();
    let listHtml: string;
    try {
      listHtml = renderEventList(await listUpcoming());
    } catch {
      listHtml = `<p class="muted">Events are unavailable — the database is not reachable.</p>`;
    }
    const body = `
      <section class="card" hx-headers='{"x-csrf-token":"${csrf}"}'>
        <div class="ld-notes-head"><h1>What's coming</h1>${renderNewEventButton()}</div>
        <p class="muted">Parents' evenings, deadlines, exams, INSET, trips — and contact you owe. "Blocks work" removes the overlapping work window.</p>
        ${listHtml}
      </section>`;
    return reply.type('text/html').send(layout({ title: "What's coming", body, authed: true, csrfToken: csrf }));
  });

  app.post('/events', guard, async (_req, reply) => {
    const id = await createEvent();
    const created: UpcomingEvent =
      (await listUpcoming()).find((x) => x.id === id) ??
      { id, kind: 'other', title: 'New event', date: null, leadDays: null, affectsAvailability: false, status: 'upcoming' };
    return reply.type('text/html').send(renderEventItem(created));
  });

  app.post('/events/:id', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const body = (req.body ?? {}) as Record<string, unknown>;
    for (const [field, raw] of Object.entries(body)) {
      if (field === '_csrf') continue;
      const value = typeof raw === 'string' ? raw : raw == null ? null : String(raw);
      await updateEventField(id.data.id, field, value);
    }
    return reply.type('text/html').send(renderSavedStatus(`event-${id.data.id}-status`));
  });

  for (const [path, status] of [['done', 'done'], ['cancel', 'cancelled']] as const) {
    app.post(`/events/:id/${path}`, guard, async (req, reply) => {
      const id = idParam.safeParse(req.params);
      if (!id.success) return reply.code(400).send('');
      await setEventStatus(id.data.id, status);
      return reply.type('text/html').send('');
    });
  }
}
