// Phase 16A.2 — the Stages & strands admin: list schemes, view a scheme's Stage × Strand grid, and assign
// a scheme to each class. routes → repos → pure views (URLs via paths.ts). No AI, no pupil identity here.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { layout } from '../lib/html';
import { paths } from '../lib/paths';
import { renderProgressionAdmin, renderSchemeGrid } from '../lib/progressionView';
import { bindClassToScheme, listClassesWithScheme, listSchemes, listSchemesWithCounts, schemeGrid, unbindClassScheme } from '../repos/progression';

export function registerProgressionRoutes(app: FastifyInstance): void {
  app.get('/progression', { preHandler: requireAuth }, async (_req, reply) => {
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const [schemes, classes] = await Promise.all([listSchemesWithCounts(), listClassesWithScheme()]);
      body = renderProgressionAdmin({ schemes, classes, csrf });
    } catch (err) {
      app.log.error({ err }, 'progression admin render failed');
      body = '<section class="card"><h1>Stages &amp; strands</h1><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Stages & strands', body, authed: true, csrfToken: csrf, width: 'wide' }));
  });

  app.get('/progression/scheme/:id', { preHandler: requireAuth }, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
    const csrf = reply.generateCsrf();
    if (!p.success) return reply.code(400).type('text/html').send(layout({ title: 'Stages & strands', body: '<section class="card"><p class="error">Bad scheme id.</p></section>', authed: true, csrfToken: csrf }));
    let body: string;
    try {
      const scheme = (await listSchemes()).find((s) => s.id === p.data.id);
      if (!scheme) {
        body = `<section class="card"><p class="muted">No such scheme. <a class="link" href="${paths.progression()}">← all schemes</a></p></section>`;
      } else {
        body = renderSchemeGrid({ schemeName: scheme.name, grid: await schemeGrid(p.data.id) });
      }
    } catch (err) {
      app.log.error({ err }, 'progression scheme grid render failed');
      body = '<section class="card"><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Stages & strands', body, authed: true, csrfToken: csrf, width: 'wide' }));
  });

  app.post('/progression/assign', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const b = z
      .object({ gc: z.coerce.number().int().positive(), scheme: z.union([z.coerce.number().int().positive(), z.literal('')]).optional() })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send('Bad request.');
    const schemeId = b.data.scheme === '' || b.data.scheme == null ? null : b.data.scheme;
    if (schemeId == null) await unbindClassScheme(b.data.gc); // "— none —" clears the binding
    else await bindClassToScheme(b.data.gc, schemeId);
    reply.header('HX-Redirect', paths.progression());
    return reply.redirect(paths.progression());
  });
}
