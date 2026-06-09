import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { layout } from '../lib/html';
import {
  addVersion,
  countResources,
  createResource,
  findResourceByChecksum,
  getCurrentVersion,
  getResource,
  listKinds,
  searchResources,
} from '../repos/resources';
import { checksum, readStored, relPathFor, storeBuffer } from '../lib/resourceStore';
import { kindFromFilename, mimeFromFilename, previewKind, safeFilename } from '../services/resource';
import { renderResourceItem, renderResourceListPaged, renderSearchBar, renderUploadForm } from '../lib/resourceView';
import { convertToPdf } from '../lib/officePreview';

const idParam = z.object({ id: z.coerce.number().int().positive() });

const PAGE_SIZE = 50;

function parseQuery(raw: unknown): { q: string; kind: string; page: number } {
  const s = (raw ?? {}) as Record<string, string | undefined>;
  const page = Math.max(1, Number.parseInt(s.page ?? '1', 10) || 1);
  return { q: (s.q ?? '').trim().slice(0, 100), kind: (s.kind ?? '').trim().slice(0, 40), page };
}

async function loadPage(q: string, kind: string, page: number) {
  const [total, rows] = await Promise.all([
    countResources({ q, kind }),
    searchResources({ q, kind }, PAGE_SIZE, (page - 1) * PAGE_SIZE),
  ]);
  return { rows, total, page, pageSize: PAGE_SIZE, q, kind };
}

export function registerResourceRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/resources', { preHandler: requireAuth }, async (req, reply) => {
    const csrf = reply.generateCsrf();
    const { q, kind, page } = parseQuery(req.query);
    let body: string;
    try {
      const [kinds, paged] = await Promise.all([listKinds(), loadPage(q, kind, page)]);
      body = `<section class="card" hx-headers='{"x-csrf-token":"${csrf}"}'>
        <h1>Resources</h1>
        <p class="muted">The single source of truth — uploaded, versioned, downloadable. PDFs/images preview in the browser; Office files preview as PDF. Bulk-import with <code>npm run import-resources</code>.</p>
        ${renderUploadForm()}
        ${renderSearchBar(kinds, q, kind)}
        ${renderResourceListPaged(paged)}
      </section>`;
    } catch {
      body = `<section class="card"><h1>Resources</h1><p class="muted">Resources are unavailable — the database is not reachable.</p></section>`;
    }
    return reply.type('text/html').send(layout({ title: 'Resources', body, authed: true, csrfToken: csrf }));
  });

  // HTMX partial: the #res-list block, driven by the search box and the pager links.
  app.get('/resources/list', { preHandler: requireAuth }, async (req, reply) => {
    const { q, kind, page } = parseQuery(req.query);
    const paged = await loadPage(q, kind, page);
    return reply.type('text/html').send(renderResourceListPaged(paged));
  });

  app.post('/resources', guard, async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.code(400).type('text/html').send('<li class="muted">No file received.</li>');
    const buf = await data.toBuffer();
    const filename = safeFilename(data.filename || 'file');
    const sum = checksum(buf);
    const dup = await findResourceByChecksum(sum);
    const id = await createResource(filename, kindFromFilename(filename), data.mimetype || mimeFromFilename(filename), 'uploaded');
    const rel = relPathFor(id, 1, filename);
    await storeBuffer(rel, buf);
    await addVersion(id, rel, buf.length, sum, 'teacher', 'uploaded');
    const r = await getResource(id);
    const warn = dup ? `<li class="muted">⚠ a copy already existed (resource #${dup}).</li>` : '';
    return reply.type('text/html').send((r ? renderResourceItem(r) : '') + warn);
  });

  app.post('/resources/:id/version', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const data = await req.file();
    if (!data) return reply.code(400).send('');
    const buf = await data.toBuffer();
    const filename = safeFilename(data.filename || 'file');
    const r = await getResource(id.data.id);
    if (!r) return reply.code(404).send('');
    const nextNo = (r.versionNo ?? 0) + 1;
    const rel = relPathFor(id.data.id, nextNo, filename);
    await storeBuffer(rel, buf);
    await addVersion(id.data.id, rel, buf.length, checksum(buf), 'teacher', 'new version');
    const updated = await getResource(id.data.id);
    return reply.type('text/html').send(updated ? renderResourceItem(updated) : '');
  });

  app.get('/resources/:id/download', { preHandler: requireAuth }, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const [r, v] = await Promise.all([getResource(id.data.id), getCurrentVersion(id.data.id)]);
    if (!r || !v) return reply.code(404).send('Not found');
    const buf = await readStored(v.storagePath);
    return reply
      .header('Content-Disposition', `attachment; filename="${encodeURIComponent(r.title)}"`)
      .type(r.mimeType ?? 'application/octet-stream')
      .send(buf);
  });

  app.get('/resources/:id/view', { preHandler: requireAuth }, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const [r, v] = await Promise.all([getResource(id.data.id), getCurrentVersion(id.data.id)]);
    if (!r || !v) return reply.code(404).send('Not found');
    const pk = previewKind(r.mimeType, r.title);
    if (pk === 'pdf' || pk === 'image') {
      const buf = await readStored(v.storagePath);
      return reply
        .header('Content-Disposition', `inline; filename="${encodeURIComponent(r.title)}"`)
        .type(r.mimeType ?? 'application/octet-stream')
        .send(buf);
    }
    if (pk === 'office') {
      const pdf = await convertToPdf(await readStored(v.storagePath), r.title);
      if (pdf) return reply.header('Content-Disposition', 'inline; filename="preview.pdf"').type('application/pdf').send(pdf);
    }
    // No inline preview available → download the original.
    return reply.redirect(`/resources/${id.data.id}/download`);
  });
}
