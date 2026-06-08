import type { FastifyInstance } from 'fastify';
import { pool } from '../db/pool';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';

/** The home / "Now" screen. A Phase 0 placeholder that proves auth + DB work. */
export function registerNowRoutes(app: FastifyInstance): void {
  app.get('/', { preHandler: requireAuth }, async (_req, reply) => {
    let appName = 'School Organiser';
    let dbNote = 'database not reachable yet';
    try {
      const { rows } = await pool.query<{ value: string }>(
        `SELECT value FROM settings WHERE key = 'app_name'`,
      );
      if (rows[0]) {
        appName = rows[0].value;
        dbNote = 'database connected';
      }
    } catch {
      // Phase 0 still renders without a DB.
    }

    const body = `
      <section class="now">
        <p class="kicker">Phase 0 · skeleton</p>
        <h1>Nothing scheduled yet</h1>
        <p>The timetable, lessons and fast notes arrive in Phase 1. This screen will become
           your live <em>“what now, what next, what must I not forget”</em>.</p>
        <p class="muted">Signed in to <strong>${esc(appName)}</strong> · ${esc(dbNote)}.</p>
      </section>`;
    return reply.type('text/html').send(layout({ title: 'Now', body, authed: true, csrfToken: reply.generateCsrf() }));
  });
}
