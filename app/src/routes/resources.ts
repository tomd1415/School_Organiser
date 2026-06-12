import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import {
  addVersion,
  countResources,
  createResource,
  findResourceByChecksum,
  getCurrentVersion,
  getResource,
  listKinds,
  listUsageForResource,
  searchResources,
} from '../repos/resources';
import { checksum, readStored, relPathFor, storeBuffer } from '../lib/resourceStore';
import { kindFromFilename, mimeFromFilename, previewKind, safeFilename } from '../services/resource';
import { renderGenerateForm, renderResourceItem, renderResourceListPaged, renderSearchBar, renderUploadForm } from '../lib/resourceView';
import { renderMarkdown } from '../lib/markdown';
import { convertToPdf } from '../lib/officePreview';
import { modelFor } from '../repos/settings';
import { callLLMStructured } from '../llm/client';
import { generateResourceSchema } from '../llm/schemas/generateResource';
import { GENERATE_RESOURCE_SYSTEM, GENERATE_RESOURCE_VERSION } from '../llm/prompts/generateResource';
import { listActiveEquipment } from '../repos/equipment';
import { equipmentItem } from '../llm/prompts/equipment';

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
        ${renderGenerateForm()}
        ${renderSearchBar(kinds, q, kind)}
        ${renderResourceListPaged(paged)}
      </section>`;
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
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

  // Generate a new resource with AI (4.7) → store as an editable Markdown resource + v1.
  app.post('/resources/generate', guard, async (req, reply) => {
    const b = z.object({ brief: z.string().trim().min(1).max(2000) }).safeParse(req.body);
    if (!b.success) return reply.type('text/html').send('<li class="muted">Describe what to generate.</li>');
    const result = await callLLMStructured(
      {
        feature: 'generate_resource',
        model: await modelFor('plan'),
        promptVersion: GENERATE_RESOURCE_VERSION,
        system: GENERATE_RESOURCE_SYSTEM,
        context: [...equipmentItem(await listActiveEquipment()), { text: b.data.brief }],
        instruction: 'Generate the resource now.',
        maxTokens: 8000,
      },
      generateResourceSchema,
    );
    if (result.status !== 'ok' || !result.data || !result.data.content.trim()) {
      return reply.type('text/html').send(`<li class="muted">${esc(result.message ?? 'The AI could not generate that.')}</li>`);
    }
    const d = result.data;
    const base = safeFilename((d.filename || d.title || 'resource').replace(/\.(md|markdown|txt)$/i, ''));
    const filename = `${base || 'resource'}.md`;
    const buf = Buffer.from(d.content, 'utf8');
    const id = await createResource(filename, 'document', 'text/markdown', 'ai_generated');
    const rel = relPathFor(id, 1, filename);
    await storeBuffer(rel, buf);
    await addVersion(id, rel, buf.length, checksum(buf), 'ai', 'AI-generated');
    const r = await getResource(id);
    return reply.type('text/html').send(r ? renderResourceItem(r) : '');
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

  // Where-used: the plans this resource is attached to and the units it's a source for.
  app.get('/resources/:id/usage', { preHandler: requireAuth }, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const usage = await listUsageForResource(id.data.id);
    if (!usage.length) return reply.type('text/html').send('<span class="muted">not used in any plan or unit</span>');
    const items = usage
      .map(
        (u) =>
          `<li>${u.kind === 'plan' ? '📋 lesson' : u.kind === 'group' ? '✏ class copy' : '📦 unit source'}: <a href="/schemes?course=${u.courseId}">${esc(u.title)}</a> <span class="muted">(${esc(u.courseName)})</span></li>`,
      )
      .join('');
    return reply.type('text/html').send(`<ul class="res-usage-list">${items}</ul>`);
  });

  app.get('/resources/:id/download', { preHandler: requireAuth }, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const [r, v] = await Promise.all([getResource(id.data.id), getCurrentVersion(id.data.id)]);
    if (!r || !v) return reply.code(404).send('Not found');
    let buf: Buffer;
    try {
      buf = await readStored(v.storagePath);
    } catch (err) {
      app.log.error({ err, path: v.storagePath }, 'resource file missing from store');
      return reply.code(404).send('The stored file is missing from the resource store — restore it from a backup or re-upload it.');
    }
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
    try {
      // Generated documents (Markdown) render as a formatted, printable page in the browser.
      if (pk === 'markdown' || pk === 'text') {
        const text = (await readStored(v.storagePath)).toString('utf8');
        const inner = pk === 'markdown' ? renderMarkdown(text) : `<pre class="md-pre">${esc(text)}</pre>`;
        const body = `
          <article class="card md-doc${r.kind === 'slides' ? ' md-slides' : ''}">
            <div class="md-head">
              <span class="muted">${esc(r.title)} · v${r.versionNo ?? 1}</span>
              <span class="md-head-actions">
                <button type="button" class="link" onclick="window.print()">🖨 print</button>
                <a class="link" href="/resources/${id.data.id}/download">download</a>
              </span>
            </div>
            ${inner}
          </article>`;
        return reply.type('text/html').send(layout({ title: r.title, body, authed: true, csrfToken: reply.generateCsrf() }));
      }
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
    } catch (err) {
      app.log.error({ err, path: v.storagePath }, 'resource file missing from store');
      return reply.code(404).send('The stored file is missing from the resource store — restore it from a backup or re-upload it.');
    }
    // No inline preview available → download the original.
    return reply.redirect(`/resources/${id.data.id}/download`);
  });
}
