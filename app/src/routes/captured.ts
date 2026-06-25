import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { listGroups } from '../repos/tasks';
import { createCaptured, getCaptured, listCaptured, promoteCapturedToTask, toggleCapturedFlag, updateCapturedField } from '../repos/captured';
import { renderCaptureBar, renderCapturedChips, renderCapturedItem, renderCapturedList } from '../lib/capturedView';
import { CAPTURED_CATEGORIES } from '../services/captured';
import { renderSavedStatus } from '../lib/notesView';
import { callLLMStructured } from '../llm/client';
import { modelForFeature } from '../repos/settings';
import { guardMatch } from '../lib/markSafetyGate';
import { CAPTURED_CATEGORISE_SYSTEM, CAPTURED_CATEGORISE_VERSION, capturedInstruction, capturedItems } from '../llm/prompts/capturedCategorise';
import { capturedCategoriseSchema } from '../llm/schemas/capturedCategorise';

const idParam = z.object({ id: z.coerce.number().int().positive() });

export function registerCapturedRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/captured', { preHandler: requireAuth }, async (req, reply) => {
    const q = z.object({ category: z.enum(CAPTURED_CATEGORIES).optional() }).safeParse(req.query);
    const category = q.success ? q.data.category : undefined;
    const csrf = reply.generateCsrf();

    let listHtml: string;
    let chipsHtml = '';
    try {
      const [all, groups] = await Promise.all([listCaptured(), listGroups()]);
      const counts: Record<string, number> = {};
      for (const it of all) if (it.category) counts[it.category] = (counts[it.category] ?? 0) + 1;
      const shown = category ? all.filter((i) => i.category === category) : all;
      chipsHtml = renderCapturedChips(counts, category);
      listHtml = renderCapturedList(shown, groups);
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      listHtml = `<p class="muted">Captured info is unavailable — the database is not reachable.</p>`;
    }

    const body = `
      <section class="card" hx-headers='{"x-csrf-token":"${csrf}"}'>
        <div class="ld-notes-head"><h1>Captured</h1></div>
        ${renderCaptureBar()}
        ${chipsHtml}
        ${listHtml}
      </section>`;
    return reply.type('text/html').send(layout({ title: 'Captured', body, authed: true, csrfToken: csrf, width: 'reading' }));
  });

  // 10.20 — capture from ANYWHERE: the topbar quick-capture box writes straight to the store, so a
  // mid-corridor "jot this now" never needs a context switch to /captured. Empty input is ignored.
  app.post('/capture-quick', guard, async (req, reply) => {
    const b = z.object({ body: z.string().max(2000).optional() }).safeParse(req.body);
    const text = (b.success && b.data.body ? b.data.body : '').trim();
    if (!text) return reply.type('text/html').send('<span class="qc-status">type something first</span>');
    await createCaptured(text);
    return reply.type('text/html').send('<span class="qc-status saved">captured ✓ — find it in <a href="/captured">Captured</a></span>');
  });

  // The capture bar posts the typed line here; create it, then return the freshly-built card to prepend.
  app.post('/captured', guard, async (req, reply) => {
    const b = z.object({ body: z.string().max(2000).optional() }).safeParse(req.body);
    const text = (b.success && b.data.body ? b.data.body : '').trim();
    if (!text) return reply.code(400).type('text/html').send('');
    const id = await createCaptured(text);
    const [item, groups] = await Promise.all([getCaptured(id), listGroups()]);
    if (!item) return reply.code(500).type('text/html').send('');
    return reply.type('text/html').send(renderCapturedItem(item, groups));
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

  // 10.17 — AI suggests category / resurface date / class for a captured note. SAFEGUARDING is
  // screened LOCALLY first (the 10.5 model): a disclosure-tripping note is flagged without any AI
  // call. The teacher always sees the result as editable fields — a suggestion, not a decision.
  app.post('/captured/:id/suggest', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const item = await getCaptured(id.data.id);
    if (!item) return reply.code(404).send('');
    const groups = await listGroups();
    if (!item.body.trim()) return reply.type('text/html').send(renderCapturedItem(item, groups));

    if (guardMatch(item.body)) {
      // Possible disclosure — never send it to the AI. File it as safeguarding locally.
      await updateCapturedField(id.data.id, 'category', 'safeguarding');
      if (!item.safeguarding) await toggleCapturedFlag(id.data.id, 'safeguarding');
      return reply.type('text/html').send(renderCapturedItem((await getCaptured(id.data.id)) ?? item, groups));
    }

    const result = await callLLMStructured(
      {
        feature: 'captured_categorise',
        model: await modelForFeature('captured_categorise', 'cheap'),
        promptVersion: CAPTURED_CATEGORISE_VERSION,
        system: CAPTURED_CATEGORISE_SYSTEM,
        context: capturedItems(item.body),
        instruction: capturedInstruction(new Date().toISOString().slice(0, 10), groups.map((g) => g.name)),
        maxTokens: 300,
      },
      capturedCategoriseSchema,
    );
    if (result.status !== 'ok' || !result.data) {
      return reply.type('text/html').send(renderCapturedItem(item, groups) + `<span class="note-status conflict" id="cap-${id.data.id}-status" hx-swap-oob="true">${esc(result.message ?? 'AI unavailable')}</span>`);
    }
    const s = result.data;
    await updateCapturedField(id.data.id, 'category', s.category);
    if (s.surfaceOn && /^\d{4}-\d{2}-\d{2}$/.test(s.surfaceOn)) await updateCapturedField(id.data.id, 'surface_on', s.surfaceOn);
    const g = s.groupName ? groups.find((x) => x.name.toLowerCase() === s.groupName!.toLowerCase()) : null;
    if (g) await updateCapturedField(id.data.id, 'group_id', String(g.id));
    if (s.safeguarding && !item.safeguarding) await toggleCapturedFlag(id.data.id, 'safeguarding');
    return reply.type('text/html').send(renderCapturedItem((await getCaptured(id.data.id)) ?? item, groups) + `<span class="note-status saved" id="cap-${id.data.id}-status" hx-swap-oob="true">✨ suggested — adjust if needed</span>`);
  });
}
