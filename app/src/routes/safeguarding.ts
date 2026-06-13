// Phase 10.4 — the safeguarding register: one teacher-only page gathering every flagged item
// (disclosure answers, safeguarding-flagged captured items, TA feedback) with a record-of-handling.
// Nothing here is ever AI-bound. It is a place to SEE and RECORD, not a referral system.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { listSafeguardingItems, setSafeguardingStatus, getSafeguardingItem, type SafeguardingItem, type SgSource } from '../repos/safeguarding';

const SOURCE_LABEL: Record<SgSource, string> = { answer: 'pupil answer', captured: 'captured note', ta_feedback: 'TA feedback' };
const STATUSES = ['recorded', 'actioned', 'referred'] as const;
const STATUS_LABEL: Record<string, string> = { new: 'new', recorded: 'recorded', actioned: 'actioned', referred: 'referred to DSL' };

function rowId(i: SafeguardingItem): string {
  return `sg-${i.sourceType}-${i.sourceId}`;
}

function renderItem(i: SafeguardingItem): string {
  const sel = (s: string): string => STATUSES.map((v) => `<option value="${v}"${v === s ? ' selected' : ''}>${esc(STATUS_LABEL[v]!)}</option>`).join('');
  return `<li class="sg-item sg-${i.status}" id="${rowId(i)}">
    <div class="sg-meta">
      <span class="sg-status sg-badge-${i.status}">${esc(STATUS_LABEL[i.status] ?? i.status)}</span>
      <span class="sg-src">${esc(SOURCE_LABEL[i.sourceType])}</span>
      ${i.who ? `<span class="sg-who">${esc(i.who)}</span>` : ''}
      <span class="muted">${esc(i.at)}</span>
    </div>
    <div class="sg-text">${esc(i.text)}</div>
    <form class="sg-action" hx-post="/safeguarding/${i.sourceType}/${i.sourceId}" hx-target="#${rowId(i)}" hx-swap="outerHTML">
      <select name="status">${sel(i.status === 'new' ? 'recorded' : i.status)}</select>
      <input type="text" name="note" maxlength="500" placeholder="what was done (e.g. spoke to DSL, logged on CPOMS)" value="${esc(i.actionNote)}">
      <button type="submit" class="btn-secondary">Record</button>
    </form>
  </li>`;
}

export function registerSafeguardingRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/safeguarding', { preHandler: requireAuth }, async (_req, reply) => {
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const items = await listSafeguardingItems();
      const open = items.filter((i) => i.status === 'new').length;
      body = `<section class="card" hx-headers='{"x-csrf-token":"${csrf}"}'>
        <h1>Safeguarding register ${open > 0 ? `<span class="sg-count">${open} new</span>` : ''}</h1>
        <p class="muted">Everything the system has flagged — pupil answers withheld from the AI, and
          safeguarding-flagged captured notes and TA feedback — in one place. <strong>This is a record
          of handling, not a referral system</strong>: follow your school's safeguarding process (CPOMS/DSL)
          and note here what you did. Nothing on this page is ever sent to any AI service.</p>
        <ul class="sg-list">${items.map(renderItem).join('') || '<li class="muted">Nothing flagged. 🟢</li>'}</ul>
      </section>`;
    } catch (err) {
      app.log.error({ err }, 'safeguarding register render failed');
      body = `<section class="card"><h1>Safeguarding register</h1><p class="muted">Unavailable — the database is not reachable.</p></section>`;
    }
    return reply.type('text/html').send(layout({ title: 'Safeguarding', body, authed: true, csrfToken: csrf }));
  });

  app.post('/safeguarding/:type/:id', guard, async (req, reply) => {
    const p = z.object({ type: z.enum(['answer', 'captured', 'ta_feedback']), id: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const b = z.object({ status: z.enum(STATUSES), note: z.string().max(500).optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    await setSafeguardingStatus(p.data.type, p.data.id, b.data.status, (b.data.note ?? '').trim());
    const item = await getSafeguardingItem(p.data.type, p.data.id);
    return reply.type('text/html').send(item ? renderItem(item) : '');
  });
}
