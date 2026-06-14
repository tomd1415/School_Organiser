import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { addDayChecklist, addOccurrencePrep, toggleDayChecklist, toggleOccurrencePrep } from '../repos/prep';
import { renderPrepItem } from '../lib/prepView';

const idParam = z.object({ id: z.coerce.number().int().positive() });

export function registerPrepRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  // 10.20 — add a one-off prep item to a specific lesson, in the moment.
  app.post('/prep/add', guard, async (req, reply) => {
    const b = z.object({ occurrence: z.coerce.number().int().positive(), text: z.string().trim().min(1).max(200) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    return reply.type('text/html').send(renderPrepItem(await addOccurrencePrep(b.data.occurrence, b.data.text), '/prep', 'prep'));
  });

  // 10.20 — add a one-off start/end-of-day checklist item.
  app.post('/day-checklist/add', guard, async (req, reply) => {
    const b = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), part: z.enum(['start', 'end']), text: z.string().trim().min(1).max(200) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    return reply.type('text/html').send(renderPrepItem(await addDayChecklist(b.data.date, b.data.part, b.data.text), '/day-checklist', 'day'));
  });

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
