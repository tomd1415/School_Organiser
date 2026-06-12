import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { layout } from '../lib/html';
import { listGroups } from '../repos/tasks';
import { createCaptured, listCaptured, promoteCapturedToTask, toggleCapturedFlag, updateCapturedField } from '../repos/captured';
import { renderCapturedItem, renderCapturedList, renderNewCapturedButton } from '../lib/capturedView';
import { CAPTURED_CATEGORIES, CATEGORY_LABELS } from '../services/captured';
import { renderSavedStatus } from '../lib/notesView';

const idParam = z.object({ id: z.coerce.number().int().positive() });

export function registerCapturedRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/captured', { preHandler: requireAuth }, async (req, reply) => {
    const q = z.object({ category: z.enum(CAPTURED_CATEGORIES).optional() }).safeParse(req.query);
    const category = q.success ? q.data.category : undefined;
    const csrf = reply.generateCsrf();

    let listHtml: string;
    try {
      const [items, groups] = await Promise.all([listCaptured(category), listGroups()]);
      listHtml = renderCapturedList(items, groups);
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      listHtml = `<p class="muted">Captured info is unavailable — the database is not reachable.</p>`;
    }

    const tab = (c: string | undefined, label: string) =>
      `<a href="/captured${c ? `?category=${c}` : ''}"${c === category ? ' class="active"' : ''}>${label}</a>`;
    const tabs = [tab(undefined, 'All'), ...CAPTURED_CATEGORIES.map((c) => tab(c, CATEGORY_LABELS[c] ?? c))].join(' ');
    const body = `
      <section class="card" hx-headers='{"x-csrf-token":"${csrf}"}'>
        <div class="ld-notes-head"><h1>Captured</h1>${renderNewCapturedButton()}</div>
        <p class="muted">Things you were told but can't action yet. Pick a category, set when it should resurface, or make it a task. ⚑ safeguarding stays out of AI (Phase 4).</p>
        <nav class="task-tabs">${tabs}</nav>
        ${listHtml}
      </section>`;
    return reply.type('text/html').send(layout({ title: 'Captured', body, authed: true, csrfToken: csrf }));
  });

  app.post('/captured', guard, async (_req, reply) => {
    const id = await createCaptured('');
    const groups = await listGroups();
    return reply.type('text/html').send(
      renderCapturedItem({ id, body: '', category: null, surfaceOn: null, groupId: null, groupName: null, safeguarding: false, interest: false, archived: false }, groups),
    );
  });

  app.post('/captured/:id', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const body = (req.body ?? {}) as Record<string, unknown>;
    for (const [field, raw] of Object.entries(body)) {
      if (field === '_csrf') continue;
      await updateCapturedField(id.data.id, field, typeof raw === 'string' ? raw : null);
    }
    return reply.type('text/html').send(renderSavedStatus(`cap-${id.data.id}-status`));
  });

  app.post('/captured/:id/flag/:flag', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const flag = (req.params as { flag: string }).flag;
    if (!id.success) return reply.code(400).send('');
    const item = await toggleCapturedFlag(id.data.id, flag);
    if (!item || flag === 'archived' || item.archived) return reply.type('text/html').send('');
    const groups = await listGroups();
    return reply.type('text/html').send(renderCapturedItem(item, groups));
  });

  app.post('/captured/:id/to-task', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    await promoteCapturedToTask(id.data.id);
    return reply.type('text/html').send(''); // archived + moved to Tasks
  });
}
