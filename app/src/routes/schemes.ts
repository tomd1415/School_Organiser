import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import {
  addPlan,
  addUnit,
  cloneSchemeNewVersion,
  createScheme,
  deletePlan,
  deleteUnit,
  getActiveScheme,
  getScheme,
  listCourses,
  listPlansForScheme,
  listSchemeVersions,
  listUnits,
  movePlan,
  moveUnit,
  schemeIdForPlan,
  schemeIdForUnit,
  updatePlanField,
  updateUnitField,
} from '../repos/schemes';
import {
  linkResourceToPlan,
  listResourcesForPlan,
  searchResources,
  unlinkResourceFromPlan,
} from '../repos/resources';
import { buildSchemeTree } from '../services/scheme';
import { renderSchemeTree } from '../lib/schemeView';
import { renderAttachResults, renderPlanResourcesBlock } from '../lib/resourceView';
import { renderSavedStatus } from '../lib/notesView';

const idParam = z.object({ id: z.coerce.number().int().positive() });
const dir = z.enum(['up', 'down']);

async function treeHtml(schemeId: number): Promise<string> {
  const [scheme, units, plans] = await Promise.all([getScheme(schemeId), listUnits(schemeId), listPlansForScheme(schemeId)]);
  if (!scheme) return '<div id="scheme-tree"><p class="muted">Scheme not found.</p></div>';
  return renderSchemeTree(scheme, buildSchemeTree(units, plans));
}

export function registerSchemeRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/schemes', { preHandler: requireAuth }, async (req, reply) => {
    const q = z
      .object({ course: z.coerce.number().int().positive().optional(), scheme: z.coerce.number().int().positive().optional() })
      .safeParse(req.query);
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const courses = await listCourses();
      const courseId = (q.success && q.data.course) || courses[0]?.id;
      if (!courseId) {
        body = `<section class="card"><h1>Schemes of work</h1><p class="muted">No courses yet.</p></section>`;
      } else {
        const scheme = q.success && q.data.scheme ? await getScheme(q.data.scheme) : await getActiveScheme(courseId);
        const versions = await listSchemeVersions(courseId);
        const tab = (c: { id: number; name: string }) =>
          `<a href="/schemes?course=${c.id}"${c.id === courseId ? ' class="active"' : ''}>${esc(c.name)}</a>`;
        const verLinks = versions
          .map((v) => `<a href="/schemes?course=${courseId}&scheme=${v.id}"${scheme && v.id === scheme.id ? ' class="active"' : ''}>v${v.version}${v.active ? '' : ' (draft)'}</a>`)
          .join(' ');
        const tree = scheme
          ? await treeHtml(scheme.id)
          : `<div id="scheme-tree"><p class="muted">No scheme of work yet for this course.</p><button type="button" class="btn-secondary" hx-post="/schemes/create?course=${courseId}">＋ Create scheme of work</button></div>`;
        body = `
          <section class="card" hx-headers='{"x-csrf-token":"${csrf}"}'>
            <h1>Schemes of work</h1>
            <nav class="task-tabs">${courses.map(tab).join(' ')}</nav>
            ${scheme ? `<p class="scheme-meta"><strong>${esc(scheme.title)}</strong> · ${verLinks} · <button type="button" class="link" hx-post="/schemes/${scheme.id}/version">＋ new version (draft)</button></p>` : ''}
            ${tree}
          </section>`;
      }
    } catch {
      body = `<section class="card"><h1>Schemes of work</h1><p class="muted">Unavailable — the database is not reachable.</p></section>`;
    }
    return reply.type('text/html').send(layout({ title: 'Schemes', body, authed: true, csrfToken: csrf }));
  });

  app.post('/schemes/create', guard, async (req, reply) => {
    const q = z.object({ course: z.coerce.number().int().positive() }).safeParse(req.query);
    if (!q.success) return reply.code(400).send('');
    const id = await createScheme(q.data.course);
    if (id) {
      reply.header('HX-Redirect', `/schemes?course=${q.data.course}&scheme=${id}`);
      return reply.send('');
    }
    return reply.type('text/html').send('');
  });

  // ── structural changes → re-render the whole tree ──
  app.post('/schemes/:id/unit', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    await addUnit(id.data.id, 'New unit');
    return reply.type('text/html').send(await treeHtml(id.data.id));
  });

  app.post('/schemes/unit/:id/plan', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    await addPlan(id.data.id, 'New lesson');
    const sid = await schemeIdForUnit(id.data.id);
    return reply.type('text/html').send(sid ? await treeHtml(sid) : '');
  });

  app.post('/schemes/unit/:id/move/:dir', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const d = dir.safeParse((req.params as { dir: string }).dir);
    if (!id.success || !d.success) return reply.code(400).send('');
    await moveUnit(id.data.id, d.data);
    const sid = await schemeIdForUnit(id.data.id);
    return reply.type('text/html').send(sid ? await treeHtml(sid) : '');
  });

  app.post('/schemes/unit/:id/delete', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const sid = await schemeIdForUnit(id.data.id);
    await deleteUnit(id.data.id);
    return reply.type('text/html').send(sid ? await treeHtml(sid) : '');
  });

  app.post('/schemes/unit/:id', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const body = (req.body ?? {}) as Record<string, unknown>;
    for (const [f, raw] of Object.entries(body)) {
      if (f === '_csrf') continue;
      await updateUnitField(id.data.id, f, typeof raw === 'string' ? raw : null);
    }
    return reply.type('text/html').send(renderSavedStatus(`unit-${id.data.id}-status`));
  });

  app.post('/schemes/plan/:id/move/:dir', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const d = dir.safeParse((req.params as { dir: string }).dir);
    if (!id.success || !d.success) return reply.code(400).send('');
    await movePlan(id.data.id, d.data);
    const sid = await schemeIdForPlan(id.data.id);
    return reply.type('text/html').send(sid ? await treeHtml(sid) : '');
  });

  app.post('/schemes/plan/:id/delete', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const sid = await schemeIdForPlan(id.data.id);
    await deletePlan(id.data.id);
    return reply.type('text/html').send(sid ? await treeHtml(sid) : '');
  });

  app.post('/schemes/plan/:id', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const body = (req.body ?? {}) as Record<string, unknown>;
    for (const [f, raw] of Object.entries(body)) {
      if (f === '_csrf') continue;
      await updatePlanField(id.data.id, f, typeof raw === 'string' ? raw : null);
    }
    return reply.type('text/html').send(renderSavedStatus(`plan-${id.data.id}-status`));
  });

  // ── resources attached to a lesson plan (3.8) ──
  // Lazy-loaded when a plan's <details> is first opened.
  app.get('/schemes/plan/:id/resources', { preHandler: requireAuth }, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    return reply.type('text/html').send(renderPlanResourcesBlock(id.data.id, await listResourcesForPlan(id.data.id)));
  });

  app.get('/schemes/plan/:id/resources/search', { preHandler: requireAuth }, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const q = ((req.query as { q?: string }).q ?? '').trim().slice(0, 100);
    const rows = q ? await searchResources({ q }, 8, 0) : [];
    return reply.type('text/html').send(renderAttachResults(id.data.id, rows));
  });

  app.post('/schemes/plan/:id/resources', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const b = z.object({ resource_id: z.coerce.number().int().positive() }).safeParse(req.body);
    if (!id.success || !b.success) return reply.code(400).send('');
    await linkResourceToPlan(b.data.resource_id, id.data.id);
    return reply.type('text/html').send(renderPlanResourcesBlock(id.data.id, await listResourcesForPlan(id.data.id)));
  });

  app.post('/schemes/plan/:id/resources/:rid/detach', guard, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive(), rid: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    await unlinkResourceFromPlan(p.data.rid, p.data.id);
    return reply.type('text/html').send(renderPlanResourcesBlock(p.data.id, await listResourcesForPlan(p.data.id)));
  });

  app.post('/schemes/:id/version', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const head = await getScheme(id.data.id);
    const newId = await cloneSchemeNewVersion(id.data.id);
    if (newId && head) {
      reply.header('HX-Redirect', `/schemes?course=${head.courseId}&scheme=${newId}`);
      return reply.send('');
    }
    return reply.type('text/html').send('');
  });
}
