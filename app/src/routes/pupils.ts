import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { createPupil, listPupils, setPupilActive, type RosterEntry } from '../repos/pupils';
import { HAS_API_KEY } from '../config/llm';

function renderPupil(p: RosterEntry): string {
  return `<li class="pupil${p.active ? '' : ' inactive'}" id="pupil-${p.id}">
    <span class="pupil-name">${esc(p.displayName)}</span>
    <span class="muted pupil-token">${esc(p.aiToken)}</span>
    <button type="button" class="link" hx-post="/pupils/${p.id}/${p.active ? 'deactivate' : 'activate'}" hx-target="#pupil-${p.id}" hx-swap="outerHTML">${p.active ? 'archive' : 'restore'}</button>
  </li>`;
}

export function registerPupilRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };
  const idParam = z.object({ id: z.coerce.number().int().positive() });

  app.get('/pupils', { preHandler: requireAuth }, async (_req, reply) => {
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const pupils = await listPupils();
      const keyNote = HAS_API_KEY
        ? ''
        : ' <strong>No AI key is configured yet</strong>, so nothing is sent anywhere regardless.';
      body = `<section class="card" hx-headers='{"x-csrf-token":"${csrf}"}'>
        <h1>Pupils (roster)</h1>
        <p class="muted">Names are stored <strong>locally only</strong>. Each gets a stable token
          (<code>PUPIL_1</code>…) — the only thing any AI feature ever sees in place of the name.${keyNote}</p>
        <form class="pupil-add" hx-post="/pupils" hx-target="#pupil-list" hx-swap="afterbegin" hx-on::after-request="this.reset()">
          <input type="text" name="name" placeholder="Pupil name…" autocomplete="off" required>
          <button type="submit" class="btn-secondary">Add</button>
        </form>
        <ul class="pupil-list" id="pupil-list">${pupils.map(renderPupil).join('')}</ul>
      </section>`;
    } catch {
      body = `<section class="card"><h1>Pupils</h1><p class="muted">Unavailable — the database is not reachable.</p></section>`;
    }
    return reply.type('text/html').send(layout({ title: 'Pupils', body, authed: true, csrfToken: csrf }));
  });

  app.post('/pupils', guard, async (req, reply) => {
    const b = z.object({ name: z.string().trim().min(1).max(120) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    return reply.type('text/html').send(renderPupil(await createPupil(b.data.name)));
  });

  for (const [verb, active] of [
    ['activate', true],
    ['deactivate', false],
  ] as const) {
    app.post(`/pupils/:id/${verb}`, guard, async (req, reply) => {
      const id = idParam.safeParse(req.params);
      if (!id.success) return reply.code(400).send('');
      await setPupilActive(id.data.id, active);
      const p = (await listPupils()).find((x) => x.id === id.data.id);
      return reply.type('text/html').send(p ? renderPupil(p) : '');
    });
  }
}
