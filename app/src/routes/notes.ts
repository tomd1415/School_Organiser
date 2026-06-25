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
import { renderFollowup, renderNoteItem, renderNoteCard, renderNotesGrid, renderNotesSearch, renderNotesChips, renderSavedStatus, renderRevUpdate, renderConflictStatus } from '../lib/notesView';

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
    const { id, rev } = await createNote({
      kind: parsed.data.kind,
      occurrenceId: parsed.data.occurrence ?? null,
      courseId: parsed.data.course ?? null,
      groupId: parsed.data.group ?? null,
    });
    // The /notes knowledge base appends a card; the lesson/cockpit list appends the inline editable item.
    const fresh = parsed.data.kind === 'general'
      ? renderNoteCard({ id, body: '', date: 'now', rev, courseName: null, groupName: null, pupilName: null, safeguarding: false })
      : renderNoteItem({ id, body: '', time: 'now', followups: [], rev });
    return reply.type('text/html').send(fresh);
  });

  // Autosave the body (10.10: optimistic-concurrency when the client sends its loaded `rev`). Returns
  // an out-of-band "saved" flash + the advanced rev, or a conflict flash if a newer edit exists.
  app.post('/notes/:id', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const body = z.object({ body: z.string().max(20000).default(''), rev: z.string().max(40).optional() }).safeParse(req.body);
    if (!id.success || !body.success) return reply.code(400).send('');
    const statusId = `note-${id.data.id}-status`;
    const res = await updateNoteBody(id.data.id, body.data.body, body.data.rev);
    if (!res.ok) {
      // Either a stale-tab clobber (rev mismatch) or the note was deleted elsewhere — never flash
      // "saved ✓" for a write that didn't land. The typed text stays on screen.
      return reply.type('text/html').send(renderConflictStatus(statusId));
    }
    return reply.type('text/html').send(renderSavedStatus(statusId) + (res.rev != null ? renderRevUpdate(id.data.id, res.rev) : ''));
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

  // General notes — a searchable knowledge base (SPEC §2). kind='general'.
  app.get('/notes', { preHandler: requireAuth }, async (req, reply) => {
    const q = z
      .object({
        q: z.string().max(200).optional(),
        link: z.enum(['course', 'group', 'pupil', 'general']).optional(),
        course: z.coerce.number().int().positive().optional(),
        group: z.coerce.number().int().positive().optional(),
      })
      .safeParse(req.query);
    const { q: search = '', link, course: courseId, group: groupId } = q.success ? q.data : {};
    const csrf = reply.generateCsrf();
    const isFragment = !!req.headers['hx-request']; // live search swaps just the grid

    let gridHtml: string;
    let chipsHtml = '';
    try {
      const shown = await listGeneralNotes({ q: search, link, courseId, groupId });
      gridHtml = renderNotesGrid(shown);
      if (!isFragment) {
        const all = await listGeneralNotes({});
        const counts = { course: 0, group: 0, pupil: 0, general: 0 };
        for (const n of all) {
          if (n.pupilName) counts.pupil++;
          else if (n.groupName) counts.group++;
          else if (n.courseName) counts.course++;
          else counts.general++;
        }
        chipsHtml = renderNotesChips(counts, link ?? '', search);
      }
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      gridHtml = `<ul class="notes-grid" id="notes-grid"><li class="muted">Notes are unavailable — the database is not reachable.</li></ul>`;
    }

    if (isFragment) return reply.type('text/html').send(gridHtml);

    const body = `
      <section class="card notes" hx-headers='{"x-csrf-token":"${csrf}"}'>
        <div class="ld-notes-head"><h1>Notes</h1></div>
        <p class="muted">Your searchable knowledge base. Notes made during a lesson live on that lesson's page and feed the per-class AI feedback loop.</p>
        ${renderNotesSearch(search, link ?? '')}
        ${chipsHtml}
        ${gridHtml}
      </section>`;
    return reply.type('text/html').send(layout({ title: 'Notes', body, authed: true, csrfToken: csrf, width: 'working' }));
  });
}
