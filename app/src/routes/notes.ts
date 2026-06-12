import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { layout } from '../lib/html';
import {
  addFollowup,
  createNote,
  deleteNote,
  listGeneralNotes,
  setOccurrenceCourseStopping,
  toggleFollowup,
  updateNoteBody,
} from '../repos/notes';
import { renderFollowup, renderNewNoteButton, renderNoteItem, renderNotesList, renderSavedStatus } from '../lib/notesView';

const idParam = z.object({ id: z.coerce.number().int().positive() });

export function registerNoteRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  // Create a (blank) note. Returns the editable item for HTMX to append.
  app.post('/notes', guard, async (req, reply) => {
    const parsed = z
      .object({
        kind: z.enum(['lesson', 'general']).default('lesson'),
        occurrence: z.coerce.number().int().positive().optional(),
        course: z.coerce.number().int().positive().optional(),
        group: z.coerce.number().int().positive().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success) return reply.code(400).send('');
    const id = await createNote({
      kind: parsed.data.kind,
      occurrenceId: parsed.data.occurrence ?? null,
      courseId: parsed.data.course ?? null,
      groupId: parsed.data.group ?? null,
    });
    return reply.type('text/html').send(renderNoteItem({ id, body: '', time: 'now', followups: [] }));
  });

  // Autosave the body. Returns just an out-of-band "saved" flash (textarea untouched).
  app.post('/notes/:id', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const body = z.object({ body: z.string().max(20000).default('') }).safeParse(req.body);
    if (!id.success || !body.success) return reply.code(400).send('');
    await updateNoteBody(id.data.id, body.data.body);
    return reply.type('text/html').send(renderSavedStatus(`note-${id.data.id}-status`));
  });

  app.post('/notes/:id/delete', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    await deleteNote(id.data.id);
    return reply.type('text/html').send(''); // empty body removes the targeted element
  });

  app.post('/notes/:id/followups', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const body = z.object({ text: z.string().trim().max(2000) }).safeParse(req.body);
    if (!id.success || !body.success || body.data.text === '') return reply.type('text/html').send('');
    const fu = await addFollowup(id.data.id, body.data.text);
    return reply.type('text/html').send(renderFollowup(fu));
  });

  app.post('/followups/:id/toggle', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const fu = await toggleFollowup(id.data.id);
    return reply.type('text/html').send(fu ? renderFollowup(fu) : '');
  });

  app.post('/occurrence-course/:id/stopping', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const body = z.object({ stopping_point: z.string().max(2000).default('') }).safeParse(req.body);
    if (!id.success || !body.success) return reply.code(400).send('');
    await setOccurrenceCourseStopping(id.data.id, body.data.stopping_point.trim());
    return reply.type('text/html').send(renderSavedStatus(`oc-${id.data.id}-status`));
  });

  // General notes list + capture (§9). kind='general'.
  app.get('/notes', { preHandler: requireAuth }, async (req, reply) => {
    const q = z
      .object({ course: z.coerce.number().int().positive().optional(), group: z.coerce.number().int().positive().optional() })
      .safeParse(req.query);
    const filter = q.success ? { courseId: q.data.course, groupId: q.data.group } : {};
    const csrf = reply.generateCsrf();
    let listHtml: string;
    try {
      const rows = await listGeneralNotes(filter);
      const items = rows.map((n) => ({ id: n.id, body: n.body, time: n.date, followups: [] }));
      listHtml = renderNotesList('notes-list-general', items);
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      listHtml = `<p class="muted">Notes are unavailable — the database is not reachable.</p>`;
    }
    const body = `
      <section class="card" hx-headers='{"x-csrf-token":"${csrf}"}'>
        <div class="ld-notes-head"><h1>Notes</h1>${renderNewNoteButton('notes-list-general', { kind: 'general' })}</div>
        <p class="muted">General notes and the knowledge base. Notes made during a lesson live on that lesson's page and feed the per-class AI feedback loop.</p>
        ${listHtml}
      </section>`;
    return reply.type('text/html').send(layout({ title: 'Notes', body, authed: true, csrfToken: csrf }));
  });
}
