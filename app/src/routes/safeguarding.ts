// Phase 10.4 — the safeguarding register: one teacher-only page gathering every flagged item
// (disclosure answers, safeguarding-flagged captured items, TA feedback) with a record-of-handling.
// Nothing here is ever AI-bound. It is a place to SEE and RECORD, not a referral system.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { listSafeguardingItems, setSafeguardingStatus, getSafeguardingItem, type SafeguardingItem, type SgSource } from '../repos/safeguarding';

import { getUiShell } from '../lib/nav';
import { renderItem, renderSafeguardingPage, STATUSES } from '../lib/safeguardingView';

export function registerSafeguardingRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/safeguarding', { preHandler: requireAuth }, async (_req, reply) => {
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const items = await listSafeguardingItems();
      const open = items.filter((i) => i.status === 'new').length;

      if (getUiShell() === 'next') {
        body = renderSafeguardingPage({ csrf, items, open });
        return reply.type('text/html').send(layout({ title: 'Safeguarding', body, authed: true, csrfToken: csrf }));
      }

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
