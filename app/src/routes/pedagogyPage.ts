// A read-only reference of the NCCE 12 principles of computing pedagogy, rendered from the SAME
// constant the AI prompts use (src/llm/prompts/pedagogy.ts) — so what the teacher reads here is
// exactly what the AI is told to apply. Linked from the Schemes page (where AI authoring lives).
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { PEDAGOGY_PRINCIPLES, PEDAGOGY_SOURCE_URL } from '../llm/prompts/pedagogy';

export function registerPedagogyRoutes(app: FastifyInstance): void {
  app.get('/pedagogy', { preHandler: requireAuth }, async (_req, reply) => {
    const csrf = reply.generateCsrf();
    const cards = PEDAGOGY_PRINCIPLES.map(
      (p) => `<li class="ped-card"><span class="ped-n">${p.n}</span><div class="ped-body"><strong>${esc(p.name)}</strong><p>${esc(p.summary)}</p></div></li>`,
    ).join('');
    const body = `<section class="card pedagogy-container">
      <h1>Computing pedagogy</h1>
      <p class="muted">The AI planning here is grounded in the National Centre for Computing Education's
        <strong>12 Principles of Computing Pedagogy</strong>. When you ask it to author a scheme, draft
        or adapt a lesson, or generate resources, it is told to apply the principles that fit the topic
        and age group. Source: <a href="${esc(PEDAGOGY_SOURCE_URL)}" target="_blank" rel="noopener">teachcomputing.org/pedagogy</a>.</p>
      <ol class="ped-list">${cards}</ol>
    </section>`;
    return reply.type('text/html').send(layout({ title: 'Computing pedagogy', body, authed: true, csrfToken: csrf }));
  });
}
