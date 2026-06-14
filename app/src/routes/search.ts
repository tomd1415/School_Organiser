// Phase 10.19 + Rail & Stage command palette — the global-search dropdown. Live results as the teacher
// types: matching navigation destinations ("go to …") first, then content hits (deep links). The nav
// rows search the WHOLE menu, including the Advanced pages hidden from the everyday rail, so every page
// stays reachable by name — "everyday" never means locked out. Teacher-only; no AI.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc } from '../lib/html';
import { searchEverything } from '../repos/search';
import { NAV_MODEL } from '../lib/nav';

/** Nav destinations whose label matches the query (across the whole menu, any tier). */
function navMatches(query: string): Array<{ href: string; label: string }> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return NAV_MODEL.filter((i) => i.label.toLowerCase().includes(q))
    .slice(0, 6)
    .map((i) => ({ href: i.href, label: i.label }));
}

export function registerSearchRoutes(app: FastifyInstance): void {
  app.get('/search', { preHandler: requireAuth }, async (req, reply) => {
    const q = z.object({ q: z.string().max(120).optional() }).safeParse(req.query);
    const query = (q.success && q.data.q) || '';
    if (query.trim().length < 2) return reply.type('text/html').send('');
    const navHits = navMatches(query);
    const { hits } = await searchEverything(query);
    if (navHits.length === 0 && hits.length === 0) {
      return reply.type('text/html').send(`<div class="search-panel"><p class="search-empty">No matches for “${esc(query.trim())}”.</p></div>`);
    }
    const navRows = navHits
      .map(
        (n) => `<a class="search-hit search-nav" href="${esc(n.href)}">
          <span class="search-type">go to</span>
          <span class="search-label">${esc(n.label)}</span></a>`,
      )
      .join('');
    const rows = hits
      .map(
        (h) => `<a class="search-hit" href="${esc(h.href)}">
          <span class="search-type">${esc(h.type)}</span>
          <span class="search-label">${esc(h.label)}</span>
          ${h.sub ? `<span class="search-sub">${esc(h.sub)}</span>` : ''}</a>`,
      )
      .join('');
    return reply.type('text/html').send(`<div class="search-panel">${navRows}${rows}</div>`);
  });
}
