// Phase 10.19 — the global-search dropdown. Live results as the teacher types in the topbar box;
// each hit is a deep link. Teacher-only; no AI.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc } from '../lib/html';
import { searchEverything } from '../repos/search';

export function registerSearchRoutes(app: FastifyInstance): void {
  app.get('/search', { preHandler: requireAuth }, async (req, reply) => {
    const q = z.object({ q: z.string().max(120).optional() }).safeParse(req.query);
    const query = (q.success && q.data.q) || '';
    if (query.trim().length < 2) return reply.type('text/html').send('');
    const { hits } = await searchEverything(query);
    if (hits.length === 0) {
      return reply.type('text/html').send(`<div class="search-panel"><p class="search-empty">No matches for “${esc(query.trim())}”.</p></div>`);
    }
    const rows = hits
      .map(
        (h) => `<a class="search-hit" href="${esc(h.href)}">
          <span class="search-type">${esc(h.type)}</span>
          <span class="search-label">${esc(h.label)}</span>
          ${h.sub ? `<span class="search-sub">${esc(h.sub)}</span>` : ''}</a>`,
      )
      .join('');
    return reply.type('text/html').send(`<div class="search-panel">${rows}</div>`);
  });
}
