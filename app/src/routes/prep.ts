import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { toggleDayChecklist, toggleOccurrencePrep } from '../repos/prep';
import { renderPrepItem } from '../lib/prepView';

const idParam = z.object({ id: z.coerce.number().int().positive() });

export function registerPrepRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.post('/prep/:id/toggle', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const item = await toggleOccurrencePrep(id.data.id);
    return reply.type('text/html').send(item ? renderPrepItem(item, '/prep', 'prep') : '');
  });

  app.post('/day-checklist/:id/toggle', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const item = await toggleDayChecklist(id.data.id);
    return reply.type('text/html').send(item ? renderPrepItem(item, '/day-checklist', 'day') : '');
  });
}
