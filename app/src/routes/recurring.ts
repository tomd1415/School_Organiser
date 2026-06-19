import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { layout } from '../lib/html';
import { listGroups } from '../repos/tasks';
import {
  createRecurring,
  deleteRecurring,
  getRecurring,
  listRecurring,
  setRecurringActive,
  updateRecurringField,
} from '../repos/recurringTasks';
import { renderNewRecurringButton, renderRecurringItem, renderRecurringList } from '../lib/recurringView';
import { renderSavedStatus, renderSaveError } from '../lib/notesView';

const idParam = z.object({ id: z.coerce.number().int().positive() });

export function registerRecurringRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/recurring', { preHandler: requireAuth }, async (_req, reply) => {
    const csrf = reply.generateCsrf();
    let listHtml: string;
    try {
      const [defs, groups] = await Promise.all([listRecurring(), listGroups()]);
      listHtml = renderRecurringList(defs, groups);
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      listHtml = `<p class="muted">Recurring tasks are unavailable — the database is not reachable.</p>`;
    }
    const body = `
      <section class="card" hx-headers='{"x-csrf-token":"${csrf}"}'>
        <div class="ld-notes-head"><h1>Recurring tasks</h1>${renderNewRecurringButton()}</div>
        <p class="muted">Weekly admin and per-lesson jobs (e.g. "assign to Teams" before every 9X lesson). Instances auto-appear in your inbox ahead of their due date. <a href="/tasks">← back to Tasks</a></p>
        ${listHtml}
      </section>`;
    return reply.type('text/html').send(layout({ title: 'Recurring', body, authed: true, csrfToken: csrf }));
  });

  app.post('/recurring', guard, async (_req, reply) => {
    const id = await createRecurring();
    const [def, groups] = await Promise.all([getRecurring(id), listGroups()]);
    return reply.type('text/html').send(def ? renderRecurringItem(def, groups) : '');
  });

  app.post('/recurring/:id', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const body = (req.body ?? {}) as Record<string, unknown>;
    for (const [field, raw] of Object.entries(body)) {
      if (field === '_csrf') continue;
      if (field === 'title' && (typeof raw !== 'string' || raw.trim() === '')) {
        return reply.type('text/html').send(renderSaveError(`recur-${id.data.id}-status`, 'Title can’t be empty.'));
      }
      await updateRecurringField(id.data.id, field, typeof raw === 'string' ? raw : null);
    }
    return reply.type('text/html').send(renderSavedStatus(`recur-${id.data.id}-status`));
  });

  for (const [path, active] of [['activate', true], ['deactivate', false]] as const) {
    app.post(`/recurring/:id/${path}`, guard, async (req, reply) => {
      const id = idParam.safeParse(req.params);
      if (!id.success) return reply.code(400).send('');
      await setRecurringActive(id.data.id, active);
      const [def, groups] = await Promise.all([getRecurring(id.data.id), listGroups()]);
      return reply.type('text/html').send(def ? renderRecurringItem(def, groups) : '');
    });
  }

  app.post('/recurring/:id/delete', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    await deleteRecurring(id.data.id);
    return reply.type('text/html').send('');
  });
}
