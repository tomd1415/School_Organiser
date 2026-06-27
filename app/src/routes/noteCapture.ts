// Phase 11 idea 12 — smart capture. The Notes button / `n` open a modal; this files what's typed.
// Flow: POST /note/route proposes destinations (or files privately / falls back to general notes);
// the teacher confirms; POST /note/route/apply creates the ticked ones; /note/route/plain is the
// always-available "just put it in general notes". The modal shell itself lives in the layout.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc } from '../lib/html';
import { routeNote, applyDestinations, fileGeneralNote, filePrivate } from '../services/noteRoute';
import { noteRouteSchema, type NoteDestination, type NoteRoute } from '../llm/schemas/noteRoute';

const KIND_LABEL: Record<NoteDestination['kind'], string> = { task: 'Task', event: 'Event', captured: 'Captured', note: 'Note' };

function renderConfirm(text: string, destinations: NoteDestination[]): string {
  const cards = destinations
    .map((d, i) => {
      const facts = [
        d.kind === 'event' && d.dateIso ? `📅 ${esc(d.dateIso)}` : '',
        d.kind === 'task' && d.urgency ? esc(d.urgency.replace(/_/g, ' ')) : '',
        d.groupName ? `👥 ${esc(d.groupName)}` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      return `<label class="note-dest">
        <input type="checkbox" name="include_${i}" value="1" checked>
        <span class="note-dest-head"><span class="note-dest-kind">${KIND_LABEL[d.kind]}</span> <strong>${esc(d.title)}</strong>${facts ? ` <span class="muted">${facts}</span>` : ''}</span>
        ${d.summary ? `<span class="note-dest-sum">${esc(d.summary)}</span>` : ''}
      </label>`;
    })
    .join('');
  return `<form hx-post="/note/route/apply" hx-target="#note-modal-body" hx-swap="innerHTML">
    <input type="hidden" name="payload" value='${esc(JSON.stringify({ destinations }))}'>
    <p class="muted">I'll file this in ${destinations.length} place${destinations.length === 1 ? '' : 's'} — untick anything you don't want:</p>
    ${cards}
    <div class="note-modal-actions">
      <button type="submit" class="primary">Create ✓</button>
      <button type="button" class="link" hx-post="/note/route/plain" hx-vals='${esc(JSON.stringify({ text }))}' hx-target="#note-modal-body" hx-swap="innerHTML">just add to general notes instead</button>
    </div>
  </form>`;
}

export function registerNoteCaptureRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  // Propose destinations — or file privately, or fall back to general notes when AI can't/ shouldn't run.
  app.post('/note/route', guard, async (req, reply) => {
    const b = z.object({ text: z.string().max(4000).optional(), private: z.string().optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    const text = (b.data.text ?? '').trim();
    if (!text) return reply.type('text/html').send('<p class="muted">Type something first.</p>');
    if (b.data.private === 'on') {
      await filePrivate(text);
      return reply.type('text/html').send('<p class="ok">🔒 Filed privately to the safeguarding register — not sent to AI.</p>');
    }
    const r = await routeNote(text);
    if (r.status !== 'ok' || !r.data || r.data.destinations.length === 0) {
      await fileGeneralNote(text); // the pop-up must never lose what you typed
      const why = r.status === 'unavailable' ? 'AI is off' : r.status === 'blocked' ? 'AI declined to route this' : 'AI is unavailable';
      return reply.type('text/html').send(`<p class="ok">${why} — added to general notes ✓</p>`);
    }
    return reply.type('text/html').send(renderConfirm(text, r.data.destinations));
  });

  // Create the confirmed (ticked) destinations.
  app.post('/note/route/apply', guard, async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    let parsed: NoteRoute;
    try {
      parsed = noteRouteSchema.parse(JSON.parse(typeof body.payload === 'string' ? body.payload : ''));
    } catch {
      return reply.code(400).type('text/html').send('<p class="error">Could not read the proposal — please try again.</p>');
    }
    const chosen = parsed.destinations.filter((_, i) => body[`include_${i}`] != null);
    if (chosen.length === 0) return reply.type('text/html').send('<p class="muted">Nothing ticked — nothing filed.</p>');
    const made = await applyDestinations(chosen);
    return reply.type('text/html').send(`<p class="ok">Filed: ${esc(made.join(', '))} ✓</p>`);
  });

  // The always-available plain option (and the AI-off / "just add" path).
  app.post('/note/route/plain', guard, async (req, reply) => {
    const b = z.object({ text: z.string().max(4000) }).safeParse(req.body);
    if (!b.success || !b.data.text.trim()) return reply.code(400).send('');
    await fileGeneralNote(b.data.text.trim());
    return reply.type('text/html').send('<p class="ok">Added to general notes ✓</p>');
  });
}
