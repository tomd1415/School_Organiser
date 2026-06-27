// Phase 16B — the teacher homework surface: set a lesson's worksheet as homework, and chase who still owes
// it. routes → repos → pure view. Pupil-facing homework lists live on /me; marking reuses the worksheet
// pipeline (objective auto-mark + the redacted AI queue for open answers) — no new AI path here.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { layout } from '../lib/html';
import { paths } from '../lib/paths';
import { renderHomeworkChase } from '../lib/homeworkView';
import { clearHomework, listHomeworkChase, recentOccurrencesForHomework, setHomework } from '../repos/homework';
import { getClockContext } from '../repos/clock';
import { localParts } from '../lib/time';

export function registerHomeworkRoutes(app: FastifyInstance): void {
  app.get('/homework', { preHandler: requireAuth }, async (_req, reply) => {
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const ctx = await getClockContext();
      const todayIso = localParts(new Date(), ctx.tz).isoDate;
      const [rows, options] = await Promise.all([listHomeworkChase(), recentOccurrencesForHomework()]);
      body = renderHomeworkChase({ rows, options, todayIso, csrf });
    } catch (err) {
      app.log.error({ err }, 'homework page render failed');
      body = '<section class="card"><h1>Homework</h1><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Homework', body, authed: true, csrfToken: csrf, width: 'wide' }));
  });

  app.post('/homework/set', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const b = z.object({ oc: z.coerce.number().int().positive(), due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('Bad request.');
    await setHomework(b.data.oc, `${b.data.due}T23:59:00Z`);
    reply.header('HX-Redirect', paths.homework());
    return reply.redirect(paths.homework());
  });

  app.post('/homework/clear', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const b = z.object({ oc: z.coerce.number().int().positive() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('Bad request.');
    await clearHomework(b.data.oc);
    reply.header('HX-Redirect', paths.homework());
    return reply.redirect(paths.homework());
  });
}
