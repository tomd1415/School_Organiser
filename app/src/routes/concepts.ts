// Phase 11 idea 1.1 — the teaching-concepts library (/concepts). Cohort-level ideas the AI weaves
// into generated lessons "where they fit". Inline-autosaving rows, archive-not-delete, each scoped to
// one course or global (NULL). Mirrors the kit/equipment page. Cohort/curriculum prose only — never
// an individual pupil (a UI hint says so; the egress assert in the wrapper is the real backstop).
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { renderSavedStatus } from '../lib/notesView';
import { createConcept, listConcepts, setConceptActive, setConceptCourse, updateConceptField, type ConceptRow } from '../repos/concepts';
import { listCourses } from '../repos/schemes';

const idParam = z.object({ id: z.coerce.number().int().positive() });

function courseOptions(courses: { id: number; name: string }[], selected: number | null): string {
  const opts = [`<option value=""${selected == null ? ' selected' : ''}>All courses</option>`];
  for (const c of courses) opts.push(`<option value="${c.id}"${selected === c.id ? ' selected' : ''}>${esc(c.name)}</option>`);
  return opts.join('');
}

function renderRow(c: ConceptRow, courses: { id: number; name: string }[]): string {
  const save = (field: string) =>
    `hx-post="/concepts/${c.id}" hx-vals='{"field":"${field}"}' hx-trigger="input changed delay:700ms, blur" hx-swap="none"`;
  return `<tr class="concept-row${c.active ? '' : ' kit-archived'}" id="concept-${c.id}">
    <td><input class="kit-name" name="value" value="${esc(c.title)}" placeholder="concept…" ${save('title')}></td>
    <td><textarea name="value" rows="2" placeholder="how to teach it / the analogy / why it helps…" ${save('body')}>${esc(c.body ?? '')}</textarea></td>
    <td><select name="value" hx-post="/concepts/${c.id}/course" hx-trigger="change" hx-swap="none">${courseOptions(courses, c.courseId)}</select></td>
    <td><input class="kit-tags" name="value" value="${esc(c.tags ?? '')}" placeholder="tags…" ${save('tags')}></td>
    <td>
      <span class="note-status" id="concept-${c.id}-status"></span>
      ${c.active
        ? `<button type="button" class="link danger" hx-post="/concepts/${c.id}/archive" hx-target="#concept-${c.id}" hx-swap="outerHTML" hx-confirm="Archive this concept? It stays in the records but stops being woven into lessons.">archive</button>`
        : `<button type="button" class="link" hx-post="/concepts/${c.id}/restore" hx-target="#concept-${c.id}" hx-swap="outerHTML">restore</button>`}
    </td>
  </tr>`;
}

function renderPage(rows: ConceptRow[], courses: { id: number; name: string }[], csrf: string): string {
  const head = `<tr><th>Concept</th><th>How to teach it</th><th>Course</th><th>Tags</th><th></th></tr>`;
  const table = rows.length
    ? `<div class="table-scroll"><table class="kit-table"><thead>${head}</thead><tbody>${rows.map((c) => renderRow(c, courses)).join('')}</tbody></table></div>`
    : `<p class="muted">No teaching concepts yet — add the first one below. They're woven into generated lessons where they fit.</p>`;
  return `
    <section class="card kit" hx-headers='{"x-csrf-token":"${csrf}"}'>
      <h1>Teaching concepts</h1>
      <p class="muted">Cohort-level teaching ideas, analogies and "always do this" approaches. They're given to
        the AI for every lesson/scheme generation and woven in <em>where they fit</em>, without lengthening the
        lesson. Scope each to one course or leave it global. <strong>Never name an individual pupil</strong> —
        keep these about the class/topic. Archive (don't delete) ones you stop using.</p>
      ${table}
      <form class="kit-add" hx-post="/concepts/add" hx-target="closest section" hx-swap="outerHTML">
        <input type="text" name="title" placeholder="new concept… e.g. CPU as a busy office" required maxlength="300">
        <select name="course">${courseOptions(courses, null)}</select>
        <button type="submit" class="btn-secondary">＋ add</button>
      </form>
    </section>`;
}

export function registerConceptRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/concepts', { preHandler: requireAuth }, async (_req, reply) => {
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const [rows, courses] = await Promise.all([listConcepts(true), listCourses()]);
      body = renderPage(rows, courses, csrf);
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      body = '<section class="card"><h1>Teaching concepts</h1><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Teaching concepts', body, authed: true, csrfToken: csrf }));
  });

  app.post('/concepts/add', guard, async (req, reply) => {
    const b = z.object({ title: z.string().trim().min(1).max(300), course: z.string().optional() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    const courseId = b.data.course && b.data.course !== '' ? Number(b.data.course) : null;
    await createConcept(b.data.title, Number.isFinite(courseId) ? courseId : null);
    const [rows, courses] = await Promise.all([listConcepts(true), listCourses()]);
    return reply.type('text/html').send(renderPage(rows, courses, reply.generateCsrf()));
  });

  app.post('/concepts/:id', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ field: z.string(), value: z.string().max(4000).optional() }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    const ok = await updateConceptField(p.data.id, b.data.field, b.data.value ?? '');
    if (!ok) return reply.code(400).send('');
    return reply.type('text/html').send(renderSavedStatus(`concept-${p.data.id}-status`));
  });

  app.post('/concepts/:id/course', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ value: z.string().optional() }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    const courseId = b.data.value && b.data.value !== '' ? Number(b.data.value) : null;
    await setConceptCourse(p.data.id, Number.isFinite(courseId) ? courseId : null);
    return reply.type('text/html').send(renderSavedStatus(`concept-${p.data.id}-status`));
  });

  const rerenderRow = async (id: number): Promise<string> => {
    const [rows, courses] = await Promise.all([listConcepts(true), listCourses()]);
    const row = rows.find((r) => Number(r.id) === Number(id));
    return row ? renderRow(row, courses) : '';
  };

  app.post('/concepts/:id/archive', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    await setConceptActive(p.data.id, false);
    return reply.type('text/html').send(await rerenderRow(p.data.id));
  });

  app.post('/concepts/:id/restore', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    await setConceptActive(p.data.id, true);
    return reply.type('text/html').send(await rerenderRow(p.data.id));
  });
}
