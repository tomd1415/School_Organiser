import type { FastifyInstance, FastifyReply } from 'fastify';
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
  taMayAccessResource,
} from '../repos/resources';
import { checksum, readStored, relPathFor, storeBuffer } from '../lib/resourceStore';
import { kindFromFilename, mimeFromFilename, previewKind, safeFilename } from '../services/resource';
import { renderGenerateForm, renderResourceItem, renderResourceListPaged, renderSearchBar, renderUploadForm } from '../lib/resourceView';
import { renderMarkdown } from '../lib/markdown';
import { renderWorksheet, type Level } from '../lib/worksheetForm';
import { parseBlocks, serialiseBlocks, blocksSchema } from '../lib/worksheetBlocks';
import { markdownToDocx } from '../lib/docx';
import { convertToPdf } from '../lib/officePreview';
import { modelForFeature } from '../repos/settings';
import { callLLMStructured } from '../llm/client';
import { generateResourceSchema } from '../llm/schemas/generateResource';
import { GENERATE_RESOURCE_SYSTEM, GENERATE_RESOURCE_VERSION } from '../llm/prompts/generateResource';
import { listActiveEquipment } from '../repos/equipment';
import { equipmentItem } from '../llm/prompts/equipment';

const idParam = z.object({ id: z.coerce.number().int().positive() });

const PAGE_SIZE = 50;

// Security: a limited TA may only fetch resources for lessons they may see (their own or today's).
// Teachers are unrestricted. Returns true when the request was DENIED (a response has been sent).
async function taResourceDenied(
  req: { session: { get(k: string): unknown } },
  reply: FastifyReply,
  resourceId: number,
): Promise<boolean> {
  if (req.session.get('role') !== 'ta') return false;
  const taStaffId = Number(req.session.get('taStaffId') ?? 0);
  if (await taMayAccessResource(resourceId, taStaffId)) return false;
  reply.code(403).type('text/html').send('Not available — this resource is not part of one of your lessons.');
  return true;
}

// ── In-browser editing of generated Markdown resources (slides + worksheets) ───────────────────
// The teacher edits the raw Markdown on the left; the right pane shows it rendered EXACTLY as it
// appears in use — a worksheet as the per-level pupil form, a deck as slide cards, anything else as
// the formatted document — updating live as they type. Saving writes a new version (reversible).

/** Render slides the way they present — one card per `## ` heading (a preview of the deck). */
function renderSlidesPreview(text: string): string {
  const parts = text.replace(/\r\n/g, '\n').split(/\n(?=## )/);
  const cards = parts
    .map((p) => renderMarkdown(p))
    .filter((h) => h.trim() !== '')
    .map((h) => `<section class="edit-slide">${h}</section>`)
    .join('');
  return `<div class="edit-slides">${cards || '<p class="muted">Start a slide with a <code>## heading</code>.</p>'}</div>`;
}

/** The "as it appears" preview for a resource's content, by kind. With a level, a worksheet previews
 * just that level's pupil view (the block editor's level focus); without, the whole document. */
function previewForKind(kind: string, title: string, text: string, level?: Level): string {
  if (kind === 'worksheet' || /worksheet/i.test(title)) {
    return `<div class="ws-doc ws-doc-preview">${renderWorksheet(text, { mode: 'preview', level }).html}</div>`;
  }
  if (kind === 'slides') return renderSlidesPreview(text);
  return `<div class="md-doc">${renderMarkdown(text)}</div>`;
}

/** The split editor: raw Markdown + a live "as it appears" preview, with a save-new-version action.
 *  hx-headers carries the CSRF token so both the live-preview POST and the save POST are authorised. */
function renderEditor(id: number, r: { title: string; kind: string; versionNo: number | null }, text: string, csrf: string): string {
  return `<article class="card md-edit" hx-headers='{"x-csrf-token":"${esc(csrf)}"}'>
    <div class="md-head">
      <span class="muted">✏ Editing: ${esc(r.title)} · v${r.versionNo ?? 1}</span>
      <span class="md-head-actions">
        ${r.kind === 'slides' ? `<a class="link" href="/resources/${id}/present" target="_blank" rel="noopener">▶ present</a>` : ''}
        <a class="link" href="/resources/${id}/view">↩ back to view</a>
      </span>
    </div>
    <form hx-post="/resources/${id}/edit" hx-target="#edit-status" hx-swap="innerHTML">
      <div class="md-edit-grid">
        <textarea name="content" class="md-edit-area" rows="28" spellcheck="true" aria-label="Markdown source"
          hx-post="/resources/${id}/edit/preview" hx-trigger="input changed delay:400ms" hx-target="#md-prev" hx-swap="innerHTML">${esc(text)}</textarea>
        <div id="md-prev" class="md-edit-preview">${previewForKind(r.kind, r.title, text)}</div>
      </div>
      <div class="md-edit-actions">
        <button type="submit" class="btn">💾 Save new version</button>
        <span id="edit-status" class="note-status" aria-live="polite"></span>
        <span class="muted edit-hint">Edits are saved as a new version — the old one is kept.</span>
      </div>
    </form>
  </article>`;
}

/** The block (WYSIWYG-style) editor: each instruction / question / screenshot / heading / image is an
 * editable card (worksheetEditor.js), drag images straight in, reorder, change type, focus a level.
 * The parsed blocks are seeded inline; the client serialises back to Markdown on save (server side via
 * /edit-blocks) so auto-marking field keys are preserved. A "raw markdown" link is the escape hatch. */
function renderBlockEditor(id: number, r: { title: string; kind: string; versionNo: number | null }, text: string, csrf: string): string {
  const blocks = parseBlocks(text);
  const json = JSON.stringify(blocks).replace(/</g, '\\u003c');
  return `<article class="card ws-ed" data-res="${id}">
    <div class="md-head">
      <span class="muted">✏ Editing: ${esc(r.title)} · v${r.versionNo ?? 1}</span>
      <span class="md-head-actions">
        ${r.kind === 'slides' ? `<a class="link" href="/resources/${id}/present" target="_blank" rel="noopener">▶ present</a>` : ''}
        <a class="link" href="/resources/${id}/edit?raw=1">✎ raw markdown</a>
        <a class="link" href="/resources/${id}/view">↩ back to view</a>
      </span>
    </div>
    <div class="ws-ed-bar">
      <span class="ws-ed-levels">Show: <button type="button" class="ws-ed-lvl on" data-lvl="all">All</button><button type="button" class="ws-ed-lvl" data-lvl="support">🟢 Support</button><button type="button" class="ws-ed-lvl" data-lvl="core">🟡 Core</button><button type="button" class="ws-ed-lvl" data-lvl="challenge">🔴 Challenge</button></span>
      <span class="ws-ed-acts">
        <button type="button" class="btn-soft" id="ws-ed-preview-toggle">👁 Preview</button>
        <button type="button" class="btn" id="ws-ed-save">💾 Save</button>
        <span id="ws-ed-status" class="note-status" aria-live="polite"></span>
      </span>
    </div>
    <div class="ws-ed-grid">
      <div id="ws-ed-list" class="ws-ed-list" aria-label="Worksheet blocks"></div>
      <div id="ws-ed-preview" class="ws-ed-preview" hidden></div>
    </div>
    <script>window.__WSRES__=${id};window.__WSKIND__=${JSON.stringify(r.kind)};window.__WSCSRF__=${JSON.stringify(csrf)};window.__WSBLOCKS__=${json};</script>
    <script src="/static/worksheetEditor.js" defer></script>
  </article>`;
}

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
        model: await modelForFeature('generate_resource', 'plan'),
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

  // The in-browser editor for a generated Markdown resource (slides / worksheet / document).
  // Teacher-only: the global lockdown hook bounces TA/pupil roles from non-allowlisted paths.
  app.get('/resources/:id/edit', { preHandler: requireAuth }, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const [r, v] = await Promise.all([getResource(id.data.id), getCurrentVersion(id.data.id)]);
    if (!r || !v) return reply.code(404).send('Not found');
    if (previewKind(r.mimeType, r.title) !== 'markdown') return reply.redirect(`/resources/${id.data.id}/view`); // only Markdown is editable here
    let text: string;
    try {
      text = (await readStored(v.storagePath)).toString('utf8');
    } catch (err) {
      app.log.error({ err, path: v.storagePath }, 'resource file missing from store');
      return reply.code(404).send('The stored file is missing from the resource store.');
    }
    const csrf = reply.generateCsrf();
    // Default to the block (WYSIWYG-style) editor; ?raw=1 is the raw-Markdown escape hatch.
    const raw = (req.query as { raw?: unknown })?.raw === '1';
    const body = raw ? renderEditor(id.data.id, r, text, csrf) : renderBlockEditor(id.data.id, r, text, csrf);
    return reply.type('text/html').send(layout({ title: `Edit · ${r.title}`, body, authed: true, csrfToken: csrf }));
  });

  // Live preview for the block editor: serialise the posted blocks → render the pupil view (a level
  // focus shows just that level). Never saves.
  app.post('/resources/:id/preview-blocks', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const r = await getResource(id.data.id);
    if (!r) return reply.code(404).send('');
    const body = (req.body ?? {}) as { blocks?: unknown; level?: unknown };
    const parsed = blocksSchema.safeParse(body.blocks);
    if (!parsed.success) return reply.code(400).type('text/html').send('<p class="muted">Could not preview.</p>');
    const level = body.level === 'support' || body.level === 'core' || body.level === 'challenge' ? body.level : undefined;
    return reply.type('text/html').send(previewForKind(r.kind, r.title, serialiseBlocks(parsed.data), level));
  });

  // Save the edited blocks → serialise to Markdown → a NEW version (reversible; marking keys preserved).
  app.post('/resources/:id/edit-blocks', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const r = await getResource(id.data.id);
    if (!r) return reply.code(404).send('');
    if (previewKind(r.mimeType, r.title) !== 'markdown') return reply.code(400).type('application/json').send(JSON.stringify({ error: 'not editable' }));
    const parsed = blocksSchema.safeParse((req.body as { blocks?: unknown })?.blocks);
    if (!parsed.success) return reply.code(400).type('application/json').send(JSON.stringify({ error: 'bad blocks' }));
    const nextNo = (r.versionNo ?? 0) + 1;
    const buf = Buffer.from(serialiseBlocks(parsed.data), 'utf8');
    const rel = relPathFor(id.data.id, nextNo, r.title);
    await storeBuffer(rel, buf);
    await addVersion(id.data.id, rel, buf.length, checksum(buf), 'teacher', 'edited in browser (blocks)');
    return reply.type('application/json').send(JSON.stringify({ ok: true, version: nextNo }));
  });

  // Live "as it appears" preview while typing — renders only, never saves.
  app.post('/resources/:id/edit/preview', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const r = await getResource(id.data.id);
    if (!r) return reply.code(404).send('');
    const b = z.object({ content: z.string().max(200_000).optional() }).safeParse(req.body);
    return reply.type('text/html').send(previewForKind(r.kind, r.title, (b.success && b.data.content) || ''));
  });

  // Save the edited Markdown as a NEW version (reversible — the old version is kept).
  app.post('/resources/:id/edit', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const r = await getResource(id.data.id);
    if (!r) return reply.code(404).send('');
    if (previewKind(r.mimeType, r.title) !== 'markdown') return reply.code(400).type('text/html').send('<span class="note-status">Only Markdown documents can be edited here.</span>');
    const b = z.object({ content: z.string().min(1).max(200_000) }).safeParse(req.body);
    if (!b.success) return reply.type('text/html').send('<span class="note-status">Could not save — the document is empty or too long.</span>');
    const nextNo = (r.versionNo ?? 0) + 1;
    const buf = Buffer.from(b.data.content, 'utf8');
    const rel = relPathFor(id.data.id, nextNo, r.title);
    await storeBuffer(rel, buf);
    await addVersion(id.data.id, rel, buf.length, checksum(buf), 'teacher', 'edited in browser');
    return reply.type('text/html').send(`<span class="note-status saved">saved ✓ — now v${nextNo}</span>`);
  });

  // Upload an image for the worksheet editor (teacher drags/drops a picture in). Stored as an image
  // resource; returns the URL to embed. Served via /lesson-image (below) so PUPILS and TAs can see it.
  const EDITOR_IMG_EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
  app.post('/resources/:id/image', guard, async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.code(400).send('no image');
    const ext = EDITOR_IMG_EXT[data.mimetype];
    if (!ext) return reply.code(400).send('that file type isn’t allowed'); // raster only; no SVG
    const buf = await data.toBuffer();
    if (buf.length > 12 * 1024 * 1024) return reply.code(413).send('that image is too big');
    const name = safeFilename(data.filename || `image.${ext}`);
    const imgId = await createResource(name, 'image', data.mimetype, 'uploaded');
    const rel = relPathFor(imgId, 1, name);
    await storeBuffer(rel, buf);
    await addVersion(imgId, rel, buf.length, checksum(buf), 'teacher', 'worksheet image');
    return reply.type('application/json').send(JSON.stringify({ url: `/lesson-image/${imgId}`, alt: name.replace(/\.[a-z0-9]+$/i, '') }));
  });

  // Serve a lesson illustration image (kind='image' only) inline, to ANY authed session — pupils and
  // TAs included (these are teaching visuals, not pupil work). Kind-gated so it can't fetch a
  // worksheet/answers/ta_notes doc; SVG forced to download (stored-XSS), nosniff on everything.
  app.get('/lesson-image/:id', { preHandler: requireAuth }, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const [r, v] = await Promise.all([getResource(id.data.id), getCurrentVersion(id.data.id)]);
    if (!r || !v || r.kind !== 'image') return reply.code(404).send('Not found');
    const isSvg = /svg/i.test(r.mimeType ?? '') || /\.svg$/i.test(r.title);
    try {
      const buf = await readStored(v.storagePath);
      return reply
        .header('Content-Disposition', `${isSvg ? 'attachment' : 'inline'}; filename="${encodeURIComponent(r.title)}"`)
        .header('X-Content-Type-Options', 'nosniff')
        .type(r.mimeType ?? 'application/octet-stream')
        .send(buf);
    } catch {
      return reply.code(404).send('Not found');
    }
  });



  // Word export for generated (Markdown) documents — pupils open the worksheet in Word and type
  // their answers straight into the table cells.
  app.get('/resources/:id/download.docx', { preHandler: requireAuth }, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    if (await taResourceDenied(req, reply, id.data.id)) return;
    const [r, v] = await Promise.all([getResource(id.data.id), getCurrentVersion(id.data.id)]);
    if (!r || !v) return reply.code(404).send('Not found');
    if (previewKind(r.mimeType, r.title) !== 'markdown') return reply.code(400).send('Only generated (Markdown) documents export to Word.');
    let text: string;
    try {
      text = (await readStored(v.storagePath)).toString('utf8');
    } catch (err) {
      app.log.error({ err, path: v.storagePath }, 'resource file missing from store');
      return reply.code(404).send('The stored file is missing from the resource store.');
    }
    const docx = markdownToDocx(text);
    const base = r.title.replace(/\.md$/i, '');
    return reply
      .header('Content-Disposition', `attachment; filename="${encodeURIComponent(base)}.docx"`)
      .type('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      .send(docx);
  });

  // Presentation mode: a generated slides document, one slide at a time, full screen.
  // ←/→ (or space / click) to move, N toggles the teacher "Say:" notes, F fullscreen, Esc exits.
  app.get('/resources/:id/present', { preHandler: requireAuth }, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    if (await taResourceDenied(req, reply, id.data.id)) return;
    const [r, v] = await Promise.all([getResource(id.data.id), getCurrentVersion(id.data.id)]);
    if (!r || !v) return reply.code(404).send('Not found');
    let text: string;
    try {
      text = (await readStored(v.storagePath)).toString('utf8');
    } catch (err) {
      app.log.error({ err, path: v.storagePath }, 'resource file missing from store');
      return reply.code(404).send('The stored file is missing from the resource store.');
    }
    // split on `## ` slide headings; anything before the first heading is the title slide
    const parts = text.replace(/\r\n/g, '\n').split(/\n(?=## )/);
    const slides = parts
      .map((p) => renderMarkdown(p))
      .filter((h) => h.trim() !== '')
      .map(
        (h, i) =>
          `<section class="deck-slide${i === 0 ? ' deck-current' : ''}">${h.replace(/<p><em>Say:<\/em>/g, '<p class="deck-note"><em>Say:</em>')}</section>`,
      );
    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(r.title)} — present</title>
<link rel="stylesheet" href="/static/styles.css">
</head><body class="deck">
  <a class="deck-exit" href="/resources/${id.data.id}/view" title="back to the document">✕</a>
  ${slides.join('\n')}
  <div class="deck-counter"><span id="deck-n">1</span> / ${slides.length}</div>
  <script>
    (function () {
      var slides = Array.prototype.slice.call(document.querySelectorAll('.deck-slide'));
      var n = 0;
      function show(i) {
        n = Math.max(0, Math.min(slides.length - 1, i));
        slides.forEach(function (s, j) { s.classList.toggle('deck-current', j === n); });
        document.getElementById('deck-n').textContent = String(n + 1);
      }
      document.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); show(n + 1); }
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); show(n - 1); }
        else if (e.key.toLowerCase() === 'n') document.body.classList.toggle('deck-show-notes');
        else if (e.key.toLowerCase() === 'f') {
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen();
        }
      });
      document.addEventListener('click', function (e) {
        if (e.target.closest('a')) return;
        show(e.clientX > window.innerWidth / 3 ? n + 1 : n - 1);
      });
    })();
  </script>
</body></html>`;
    return reply.type('text/html').send(html);
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
    if (await taResourceDenied(req, reply, id.data.id)) return;
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
    if (await taResourceDenied(req, reply, id.data.id)) return;
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
                ${pk === 'markdown' ? `<a class="link" href="/resources/${id.data.id}/edit"><strong>✏ edit</strong></a>` : ''}
                ${r.kind === 'slides' ? `<a class="link" href="/resources/${id.data.id}/present"><strong>▶ present</strong></a>` : ''}
                ${pk === 'markdown' ? `<a class="link" href="/resources/${id.data.id}/download.docx">⬇ Word (.docx)</a>` : ''}
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
        // An inline SVG can carry <script> that runs in our origin (stored-XSS). Force SVG to DOWNLOAD
        // (a downloaded file is never rendered as a same-origin document); nosniff stops other types
        // being content-sniffed into something executable.
        const isSvg = /svg/i.test(r.mimeType ?? '') || /\.svg$/i.test(r.title);
        return reply
          .header('Content-Disposition', `${isSvg ? 'attachment' : 'inline'}; filename="${encodeURIComponent(r.title)}"`)
          .header('X-Content-Type-Options', 'nosniff')
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
