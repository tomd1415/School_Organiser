// ATL (attitude to learning) entry: a 1–4 score per pupil per lesson, set TWO ways — inline in the
// marking modal (alongside each pupil's work) and via a live whole-class grid for use DURING the lesson.
// The 1–4 picker is a shared component so both surfaces look and behave identically.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { pool } from '../db/pool';
import { pupilWorkRows, pupilCanAccessOc } from '../repos/pupilWork';
import { getOccurrenceHeader } from '../repos/occurrence';
import { setPupilAtl, getClassAtl } from '../repos/atl';

// 1 = most concern, 4 = best. (Adjust the labels here if your school's ATL scale differs.)
export const ATL_LABELS: Record<number, string> = { 1: 'Concern', 2: 'Inconsistent', 3: 'Good', 4: 'Excellent' };

/** The shared 1–4 ATL picker for one pupil. Each button posts the score and swaps the picker back in, so
 *  it behaves the same inside the marking modal and the live class grid. `score` is the current value/null. */
export function renderAtlPicker(oc: number, pid: number, score: number | null): string {
  const scoreNum = score != null ? Number(score) : null;
  const btn = (n: number): string =>
    `<button type="button" class="atl-b atl-${n}${scoreNum === n ? ' on' : ''}"`
    + ` hx-post="/lesson/oc/${oc}/pupil/${pid}/atl" hx-vals='{"score":"${n}"}' hx-target="closest .atl" hx-swap="outerHTML"`
    + ` title="ATL ${n} — ${ATL_LABELS[n]}" aria-label="ATL ${n}: ${ATL_LABELS[n]}" aria-pressed="${scoreNum === n}">${n}</button>`;
  return `<div class="atl${scoreNum ? ' atl-set' : ''}" data-atl-pid="${pid}"><span class="atl-lbl" title="Attitude to learning (1–4)">ATL</span>${[1, 2, 3, 4].map(btn).join('')}</div>`;
}

async function ocClass(occurrenceCourseId: number): Promise<{ groupCourseId: number; occurrenceId: number } | null> {
  const { rows } = await pool.query<{ groupCourseId: number; occurrenceId: number }>(
    `SELECT group_course_id AS "groupCourseId", occurrence_id AS "occurrenceId" FROM occurrence_courses WHERE id = $1`,
    [occurrenceCourseId],
  );
  return rows[0] ?? null;
}

export function registerAtlRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };
  const params = z.object({ id: z.coerce.number().int().positive(), pid: z.coerce.number().int().positive() });

  // Save one pupil's ATL (1–4) for a lesson. Returns the refreshed picker (swapped in place).
  app.post('/lesson/oc/:id/pupil/:pid/atl', guard, async (req, reply) => {
    const p = params.safeParse(req.params);
    const b = z.object({ score: z.coerce.number().int().min(1).max(4) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).type('text/html').send('');
    if (!(await pupilCanAccessOc(p.data.pid, p.data.id))) return reply.code(403).type('text/html').send('');
    await setPupilAtl(p.data.pid, p.data.id, b.data.score);
    return reply.type('text/html').send(renderAtlPicker(p.data.id, p.data.pid, b.data.score));
  });

  // The live class ATL grid — every pupil with a 1–4 picker. For use DURING the lesson.
  app.get('/lesson/oc/:id/atl', { preHandler: requireAuth }, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).type('text/html').send('Bad reference.');
    const csrf = reply.generateCsrf();
    const info = await ocClass(p.data.id);
    if (!info) {
      return reply.type('text/html').send(layout({ title: 'ATL', body: '<section class="card"><p class="muted">That lesson isn’t available.</p></section>', authed: true, csrfToken: csrf }));
    }
    const [roster, scores, header] = await Promise.all([
      pupilWorkRows(p.data.id, info.groupCourseId),
      getClassAtl(p.data.id),
      getOccurrenceHeader(info.occurrenceId),
    ]);
    const className = header?.groupName ?? '';
    const dateStr = header?.date ?? '';
    const rowsHtml = roster
      .map((r) => `<li class="atl-row"><span class="atl-name">${esc(r.displayName)}</span>${renderAtlPicker(p.data.id, r.pupilId, scores.get(r.pupilId) ?? null)}</li>`)
      .join('');
    const body = `<section class="card atl-grid" hx-headers='{"x-csrf-token":"${csrf}"}'>
      <h1>Attitude to learning <span class="muted">— ${esc(className)}${dateStr ? ` · ${esc(dateStr)}` : ''}</span></h1>
      <p class="muted">Tap a score for each pupil — saved instantly. 1 = ${ATL_LABELS[1]}, 2 = ${ATL_LABELS[2]}, 3 = ${ATL_LABELS[3]}, 4 = ${ATL_LABELS[4]}.</p>
      <ul class="atl-list">${rowsHtml || '<li class="muted">No pupils in this class yet.</li>'}</ul>
    </section>`;
    return reply.type('text/html').send(layout({ title: `ATL · ${className}`, body, authed: true, csrfToken: csrf }));
  });
}
