import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc } from '../lib/html';
import { getRunningTimer, startTaskTimer, stopRunningTimer, type RunningTimer } from '../repos/timeEntries';

/** The running-timer banner (swapped in/out by HTMX). Lives on Now and Tasks. */
export function renderTimerBanner(running: RunningTimer | null): string {
  if (!running) return `<div id="timer-banner"></div>`;
  return `<div id="timer-banner" class="timer-banner">
    <span>⏱ Timing: <strong>${esc(running.taskTitle ?? 'a task')}</strong></span>
    <button type="button" class="link" hx-post="/timer/stop" hx-target="#timer-banner" hx-swap="outerHTML">stop</button>
  </div>`;
}

export function registerTimerRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.post('/timer/start', guard, async (req, reply) => {
    const b = z.object({ task: z.coerce.number().int().positive() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    await startTaskTimer(b.data.task);
    return reply.type('text/html').send(renderTimerBanner(await getRunningTimer()));
  });

  app.post('/timer/stop', guard, async (_req, reply) => {
    await stopRunningTimer();
    return reply.type('text/html').send(renderTimerBanner(null));
  });
}
