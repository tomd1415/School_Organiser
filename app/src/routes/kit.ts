// Phase 5.8: the classroom kit list (/kit) — what's in the room, how many work, where it lives.
// Inline-autosaving rows grouped by category, archive-not-delete, one-click "checked today".
// The read-only panel for the Schemes page lives here too (GET /kit/panel).
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { renderSavedStatus } from '../lib/notesView';
import {
  createEquipment,
  listEquipment,
  markEquipmentChecked,
  setEquipmentActive,
  updateEquipmentField,
  type EquipmentRow,
} from '../repos/equipment';
import { getClockContext } from '../repos/clock';
import { localParts, addDays } from '../lib/time';

const idParam = z.object({ id: z.coerce.number().int().positive() });
const CATEGORIES = ['physical-computing', 'robotics', 'computers', 'peripherals', 'av', 'consumables', 'other'];

function staleBefore(today: string): string {
  return addDays(today, -91); // ~a term ago
}

function renderRow(e: EquipmentRow, today: string): string {
  const save = (field: string) =>
    `hx-post="/kit/${e.id}" hx-vals='{"field":"${field}"}' hx-trigger="input changed delay:700ms, blur" hx-swap="none"`;
  const broken = e.qtyTotal != null && e.qtyWorking != null && e.qtyWorking < e.qtyTotal;
  const stale = !e.lastChecked || e.lastChecked < staleBefore(today);
  return `<tr class="kit-row${e.active ? '' : ' kit-archived'}" id="kit-${e.id}">
    <td><input class="kit-name" name="value" value="${esc(e.name)}" ${save('name')}></td>
    <td><input class="kit-qty${broken ? ' kit-broken' : ''}" name="value" inputmode="numeric" value="${e.qtyTotal ?? ''}" placeholder="—" title="how many we own" ${save('qty_total')}></td>
    <td><input class="kit-qty${broken ? ' kit-broken' : ''}" name="value" inputmode="numeric" value="${e.qtyWorking ?? ''}" placeholder="—" title="how many work" ${save('qty_working')}></td>
    <td><input name="value" value="${esc(e.location ?? '')}" placeholder="where…" ${save('location')}></td>
    <td><input name="value" value="${esc(e.notes ?? '')}" placeholder="notes…" ${save('notes')}></td>
    <td><input class="kit-tags" name="value" value="${esc(e.tags ?? '')}" placeholder="tags…" ${save('tags')}></td>
    <td class="kit-checked${stale ? ' kit-stale' : ''}" title="${stale ? 'not checked for over a term' : 'last stock-take'}">
      ${esc(e.lastChecked ?? 'never')}
      <button type="button" class="link" title="Mark counted/tested today" hx-post="/kit/${e.id}/checked" hx-target="#kit-${e.id}" hx-swap="outerHTML">✓ today</button>
    </td>
    <td>
      <span class="note-status" id="kit-${e.id}-status"></span>
      ${e.active
        ? `<button type="button" class="link danger" hx-post="/kit/${e.id}/archive" hx-target="#kit-${e.id}" hx-swap="outerHTML" hx-confirm="Archive ${esc(e.name)}? It stays in the records but leaves the planning list.">archive</button>`
        : `<button type="button" class="link" hx-post="/kit/${e.id}/restore" hx-target="#kit-${e.id}" hx-swap="outerHTML">restore</button>`}
    </td>
  </tr>`;
}

function groupByCategory(rows: EquipmentRow[]): Map<string, EquipmentRow[]> {
  const m = new Map<string, EquipmentRow[]>();
  for (const r of rows) {
    const arr = m.get(r.category) ?? [];
    arr.push(r);
    m.set(r.category, arr);
  }
  return m;
}

function renderKitPage(rows: EquipmentRow[], today: string, q: string, showArchived: boolean, csrf: string): string {
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? rows.filter((r) => [r.name, r.category, r.location, r.notes, r.tags].some((f) => f && f.toLowerCase().includes(needle)))
    : rows;
  const groups = [...groupByCategory(filtered).entries()];
  const head = `<tr><th>Item</th><th title="how many we own">Own</th><th title="how many currently work">Work</th><th>Location</th><th>Notes</th><th>Tags</th><th>Checked</th><th></th></tr>`;
  const tables = groups.length
    ? groups
        .map(
          ([cat, items]) => `<h2 class="kit-cat">${esc(cat)}</h2>
          <div class="table-scroll"><table class="kit-table"><thead>${head}</thead><tbody>${items.map((e) => renderRow(e, today)).join('')}</tbody></table></div>`,
        )
        .join('')
    : `<p class="muted">${needle ? 'Nothing matches the filter.' : 'No kit recorded yet — add the first item below.'}</p>`;
  const catOpts = CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('');
  return `
    <section class="card kit" hx-headers='{"x-csrf-token":"${csrf}"}'>
      <h1>Kit — classroom equipment</h1>
      <p class="muted">Referred to while planning, and given to the AI for every planning feature —
        practical work is planned within what's listed here. Archive (don't delete) anything that leaves the room.</p>
      <form method="get" action="/kit" class="kit-filter">
        <input type="search" name="q" value="${esc(q)}" placeholder="filter… name, notes, tags">
        <label><input type="checkbox" name="archived" value="1"${showArchived ? ' checked' : ''} onchange="this.form.submit()"> show archived</label>
        <noscript><button type="submit">Go</button></noscript>
      </form>
      ${tables}
      <form class="kit-add" hx-post="/kit/add" hx-target="closest section" hx-swap="outerHTML">
        <input type="text" name="name" placeholder="new item… e.g. micro:bit v2" required maxlength="200">
        <select name="category">${catOpts}</select>
        <button type="submit" class="btn-secondary">＋ add</button>
      </form>
    </section>`;
}

export function registerKitRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/kit', { preHandler: requireAuth }, async (req, reply) => {
    const csrf = reply.generateCsrf();
    const q = z.object({ q: z.string().max(100).optional(), archived: z.string().optional() }).safeParse(req.query);
    const filter = q.success ? (q.data.q ?? '') : '';
    const archived = q.success && q.data.archived === '1';
    let body: string;
    try {
      const ctx = await getClockContext();
      const today = localParts(new Date(), ctx.tz).isoDate;
      body = renderKitPage(await listEquipment(archived), today, filter, archived, csrf);
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      body = '<section class="card"><h1>Kit</h1><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Kit', body, authed: true, csrfToken: csrf }));
  });

  app.post('/kit/add', guard, async (req, reply) => {
    const b = z.object({ name: z.string().trim().min(1).max(200), category: z.string().trim().max(50).optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    await createEquipment(b.data.name, b.data.category || 'other');
    const ctx = await getClockContext();
    const today = localParts(new Date(), ctx.tz).isoDate;
    return reply.type('text/html').send(renderKitPage(await listEquipment(false), today, '', false, reply.generateCsrf()));
  });

  app.post('/kit/:id', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ field: z.string(), value: z.string().max(2000).optional() }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    const ok = await updateEquipmentField(p.data.id, b.data.field, b.data.value ?? null);
    if (!ok) return reply.code(400).send('');
    return reply.type('text/html').send(renderSavedStatus(`kit-${p.data.id}-status`));
  });

  const rerenderRow = async (id: number): Promise<string> => {
    const rows = await listEquipment(true);
    const row = rows.find((r) => Number(r.id) === Number(id));
    if (!row) return '';
    const ctx = await getClockContext();
    return renderRow(row, localParts(new Date(), ctx.tz).isoDate);
  };

  app.post('/kit/:id/archive', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    await setEquipmentActive(p.data.id, false);
    return reply.type('text/html').send(await rerenderRow(p.data.id));
  });

  app.post('/kit/:id/restore', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    await setEquipmentActive(p.data.id, true);
    return reply.type('text/html').send(await rerenderRow(p.data.id));
  });

  app.post('/kit/:id/checked', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const ctx = await getClockContext();
    await markEquipmentChecked(p.data.id, localParts(new Date(), ctx.tz).isoDate);
    return reply.type('text/html').send(await rerenderRow(p.data.id));
  });

  // The read-only "🔧 Kit available" panel on the Schemes page (lazy-loaded when opened).
  app.get('/kit/panel', { preHandler: requireAuth }, async (_req, reply) => {
    const rows = await listEquipment(false);
    if (!rows.length) return reply.type('text/html').send('<span class="muted">no kit recorded yet — add some on the <a href="/kit">Kit page</a></span>');
    const lines = rows
      .map((e) => {
        const broken = e.qtyTotal != null && e.qtyWorking != null && e.qtyWorking < e.qtyTotal;
        const n = e.qtyTotal == null && e.qtyWorking == null ? 'class set' : `${e.qtyWorking ?? e.qtyTotal}×${broken ? ` of ${e.qtyTotal}` : ''}`;
        return `<li>${esc(e.name)} — ${esc(n)}${e.location ? ` <span class="muted">(${esc(e.location)})</span>` : ''}</li>`;
      })
      .join('');
    return reply.type('text/html').send(`<ul class="kit-panel-list">${lines}</ul><p><a class="link" href="/kit">edit on the Kit page →</a></p>`);
  });
}
