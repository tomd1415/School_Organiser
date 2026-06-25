// Phase 11 idea 10 (slice 1, AI-free) — the curriculum-coverage page. Paste a course's spec points,
// tick which lessons cover each, and see what's still uncovered. No AI: this is the deterministic
// source of truth that later slices (AI authoring / gap-check) build on.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { renderSavedStatus } from '../lib/notesView';
import { listCourses, getActiveScheme } from '../repos/schemes';
import { suggestCoverage, type CoverageSuggestion } from '../services/coverageCheck';
import { renderCoverageReport, type CoverageFilter } from '../lib/coverageView';

type SchemeLike = { id: number; title: string; version: number };
import { parseSpecPoints } from '../lib/specImport';
import {
  importSpecPoints,
  listSpecPoints,
  setSpecPointActive,
  schemeCoverage,
  schemeLessons,
  getPlanSpecPointIds,
  setPlanSpecPoint,
  getPlanCourse,
  getCourseExamDate,
  setCourseExamDate,
  type SpecPointRow,
  type CoverageRow,
  type SchemeLessonRow,
} from '../repos/specPoints';
import { extractDocText } from '../lib/docText';
import { addCourseDoc, listCourseDocs, getCourseDoc, getCourseDocCourse, updateCourseDocContent, deleteCourseDoc, isDocRole, type CourseDocRow } from '../repos/courseDocs';

const idParam = z.object({ id: z.coerce.number().int().positive() });

const DOC_ROLE_LABEL: Record<string, string> = { spec: 'Spec', examiners_report: "Examiners'", past_paper: 'Past paper', reference: 'Reference' };

function renderDocEditor(doc: { id: number; content: string }): string {
  return `<textarea class="cov-doc-text" name="text" rows="8" placeholder="extracted text (edit / paste here if extraction was empty)…"
      hx-post="/coverage/doc/${doc.id}" hx-trigger="input changed delay:1000ms, blur" hx-swap="none">${esc(doc.content)}</textarea>
    <p><button type="button" class="link danger" hx-post="/coverage/doc/${doc.id}/delete" hx-target="#cov-docs" hx-swap="outerHTML" hx-confirm="Delete this document?">delete</button>
      <span class="note-status" id="cov-doc-${doc.id}-status"></span></p>`;
}

function renderDocList(docs: CourseDocRow[]): string {
  if (!docs.length) return '<p class="muted">No documents yet — upload the spec, an examiners\' report or a past paper.</p>';
  return docs
    .map(
      (d) => `<details class="cov-doc" id="cov-doc-${d.id}">
      <summary><span class="note-dest-kind">${esc(DOC_ROLE_LABEL[d.role] ?? d.role)}</span> ${esc(d.title)} <span class="muted">${d.charCount.toLocaleString()} chars${d.charCount === 0 ? ' — extraction empty, open to paste' : ''}</span></summary>
      <div hx-get="/coverage/doc/${d.id}" hx-trigger="toggle once" hx-target="this" hx-swap="innerHTML"><span class="muted">…</span></div>
    </details>`,
    )
    .join('');
}

async function docsSection(courseId: number): Promise<string> {
  const roleOpts = Object.entries(DOC_ROLE_LABEL).map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('');
  return `<div id="cov-docs">
    <h2>Official documents</h2>
    <p class="muted">Upload the spec, examiners' reports or past papers. The text is extracted and given to the AI when it authors schemes/lessons for this course. Open one to preview/edit — extraction can be rough.</p>
    <form class="setup-add" hx-post="/coverage/doc/upload" hx-encoding="multipart/form-data" hx-target="#cov-docs" hx-swap="outerHTML" hx-on::after-request="if(window.htmxSaved(event))this.reset()">
      <input type="hidden" name="course" value="${courseId}">
      <select name="role">${roleOpts}</select>
      <input type="text" name="title" placeholder="title… e.g. OCR J277 specification" required maxlength="200">
      <input type="file" name="file" accept=".pdf,.docx,.doc,.txt,.md,.odt,.rtf,.pptx" required>
      <button type="submit" class="btn-secondary">Upload &amp; extract</button>
    </form>
    ${renderDocList(await listCourseDocs(courseId))}
  </div>`;
}

function renderCovBody(courseId: number, points: SpecPointRow[], scheme: SchemeLike | null, coverage: CoverageRow[], lessons: SchemeLessonRow[], filter: CoverageFilter = 'all'): string {
  const list = points.length
    ? `<table class="kit-table cov-points"><thead><tr><th>Code</th><th>Spec point</th><th></th></tr></thead><tbody>${points
        .map(
          (p) => `<tr id="cov-pt-${p.id}"><td><code>${esc(p.code === p.title ? '—' : p.code)}</code></td><td>${esc(p.title)}</td>
          <td><button type="button" class="link danger" hx-post="/coverage/point/${p.id}/archive" hx-vals='{"course":"${courseId}"}' hx-target="#cov-body" hx-swap="outerHTML" hx-confirm="Archive this spec point?">archive</button></td></tr>`,
        )
        .join('')}</tbody></table>`
    : '<p class="muted">No spec points yet — paste some above.</p>';

  // §9 coverage report: spec-area cards with % bars + status-dot point rows (filterable). The AI gap-filler
  // and the per-lesson mapping checklists stay below it.
  let coveragePanel = renderCoverageReport({ courseId, scheme, coverage, filter });
  if (scheme) {
    const uncoveredN = coverage.filter((c) => !c.covered).length;
    coveragePanel += `
      ${uncoveredN ? `<p><button type="button" class="btn-secondary" hx-post="/coverage/suggest" hx-vals='{"scheme":"${scheme.id}","course":"${courseId}"}' hx-target="#cov-suggest" hx-swap="innerHTML">✨ Suggest coverage for the gaps</button></p>
      <div id="cov-suggest"></div>` : ''}
      <h2>Map lessons → spec points</h2>
      <p class="muted">Open a lesson and tick the spec points it covers.</p>
      ${lessons.length
        ? lessons
            .map(
              (l) => `<details class="cov-lesson"><summary>${esc(l.unitTitle)} — ${esc(l.title)}</summary>
        <div hx-get="/coverage/plan/${l.id}/points" hx-trigger="toggle once" hx-target="this" hx-swap="innerHTML"><span class="muted">…</span></div></details>`,
            )
            .join('')
        : '<p class="muted">This scheme has no lessons yet.</p>'}`;
  }
  return `<div id="cov-body">
    ${coveragePanel}
    <details class="cov-manage"><summary>Manage spec points (${points.length})</summary>
      ${list}
    </details>
  </div>`;
}

function renderChecklist(planId: number, points: SpecPointRow[], mapped: Set<number>): string {
  if (!points.length) return '<p class="muted">No spec points for this course yet — paste them in above.</p>';
  return `<div class="cov-checklist">${points
    .map(
      (p) => `<label class="cov-check"><input type="checkbox"${mapped.has(p.id) ? ' checked' : ''}
      hx-post="/coverage/plan/${planId}/point/${p.id}" hx-vals='js:{"on":event.target.checked?"1":"0"}' hx-trigger="change" hx-swap="none"> ${p.code === p.title ? '' : `<code>${esc(p.code)}</code> `}${esc(p.title)}</label>`,
    )
    .join('')}<span class="note-status" id="cov-plan-${planId}-status"></span></div>`;
}

function renderSuggestions(courseId: number, suggestions: CoverageSuggestion[]): string {
  const applicable = suggestions.filter((s) => s.lessonId != null);
  const newOnes = suggestions.filter((s) => s.lessonId == null);
  if (!applicable.length && !newOnes.length) return '<p class="muted">No confident suggestions — map these by hand below.</p>';
  const rows = applicable
    .map(
      (s, i) => `<label class="note-dest"><input type="checkbox" name="include_${i}" value="1" checked>
      <span class="note-dest-head"><strong>${esc(s.pointLabel)}</strong> → ${esc(s.lessonLabel)}</span>
      ${s.why ? `<span class="note-dest-sum">${esc(s.why)}</span>` : ''}</label>`,
    )
    .join('');
  const news = newOnes.length ? `<p class="muted">Needs a new lesson: ${newOnes.map((s) => esc(s.pointLabel)).join('; ')}</p>` : '';
  return `<form hx-post="/coverage/suggest/apply" hx-target="#cov-body" hx-swap="outerHTML">
    <input type="hidden" name="course" value="${courseId}">
    <input type="hidden" name="payload" value='${esc(JSON.stringify({ map: applicable.map((s) => ({ pointId: s.pointId, lessonId: s.lessonId })) }))}'>
    <p class="muted">Suggested mappings — untick any that are wrong, then apply:</p>
    ${rows}
    ${news}
    ${applicable.length ? '<div class="note-modal-actions"><button type="submit" class="btn-secondary">Apply ticked ✓</button></div>' : ''}
  </form>`;
}

async function bodyFor(courseId: number, filter: CoverageFilter = 'all'): Promise<string> {
  const [points, scheme] = await Promise.all([listSpecPoints(courseId), getActiveScheme(courseId)]);
  const [coverage, lessons] = scheme ? await Promise.all([schemeCoverage(scheme.id), schemeLessons(scheme.id)]) : [[], []];
  return renderCovBody(courseId, points, scheme, coverage, lessons, filter);
}

export function registerCoverageRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/coverage', { preHandler: requireAuth }, async (req, reply) => {
    const csrf = reply.generateCsrf();
    const q = z.object({ course: z.coerce.number().int().positive().optional(), cov: z.enum(['all', 'covered', 'gaps']).optional() }).safeParse(req.query);
    const filter: CoverageFilter = (q.success && q.data.cov) || 'all';
    let body: string;
    try {
      const courses = await listCourses();
      const courseId = q.success && q.data.course ? q.data.course : courses[0]?.id;
      const examDate = courseId ? await getCourseExamDate(courseId) : null;
      const opts = courses.map((c) => `<option value="${c.id}"${c.id === courseId ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
      const inner = courseId
        ? `<div class="setup-add"><label>Exam date <input type="date" value="${esc(examDate ?? '')}"
              hx-post="/coverage/exam-date" hx-vals='js:{"course":"${courseId}","date":event.target.value}' hx-trigger="change" hx-swap="none"></label>
            <span class="muted">exam courses only — lets AI authoring leave revision time before it</span>
            <span class="note-status" id="cov-exam-status"></span></div>
          <details class="cov-import"><summary>＋ paste / import spec points</summary>
            <form hx-post="/coverage/import" hx-target="#cov-body" hx-swap="outerHTML">
              <input type="hidden" name="course" value="${courseId}">
              <textarea name="text" rows="6" placeholder="One per line, e.g.&#10;1.1.1 The purpose of the CPU&#10;1.1.2 Von Neumann architecture&#10;1.2 Memory and storage"></textarea>
              <button type="submit" class="btn-secondary">Import</button>
            </form>
            <p class="muted">Re-importing updates titles and order without duplicating (matched by code). A line keeps its code (e.g. <code>1.1.1</code>) if it has one.</p>
          </details>
          ${await bodyFor(courseId, filter)}
          ${await docsSection(courseId)}`
        : '<p class="muted">No courses yet — add one in Setup first.</p>';
      body = `
        <section class="card setup" hx-headers='{"x-csrf-token":"${csrf}"}'>
          <h1>Curriculum coverage</h1>
          <p class="muted">The spec points a course must cover, and which lessons cover them — the deterministic source of truth.
            ${courses.length ? '' : ''}</p>
          <form method="get" action="/coverage" class="setup-add">
            <label>Course <select name="course" onchange="this.form.submit()">${opts}</select></label>
            <noscript><button type="submit">Go</button></noscript>
          </form>
          ${inner}
        </section>`;
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      body = '<section class="card"><h1>Curriculum coverage</h1><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Coverage', body, authed: true, csrfToken: csrf }));
  });

  app.post('/coverage/import', guard, async (req, reply) => {
    const b = z.object({ course: z.coerce.number().int().positive(), text: z.string().max(20000) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    await importSpecPoints(b.data.course, parseSpecPoints(b.data.text));
    return reply.type('text/html').send(await bodyFor(b.data.course));
  });

  // idea 9 — official course documents: upload + extract, edit the text, delete.
  app.post('/coverage/doc/upload', guard, async (req, reply) => {
    // BUG-046: a conservative 30 MB route cap for a specification document — busboy stops at the limit
    // instead of buffering up to the global 500 MB, then handing a huge blob to PDF/Office extraction.
    const tooBig = () => reply.code(413).type('text/html').send('<p class="error">That document is too large (max 30 MB).</p>');
    const data = await req.file({ limits: { fileSize: 30 * 1024 * 1024 } });
    if (!data) return reply.code(400).type('text/html').send('<p class="error">No file received.</p>');
    let buf: Buffer;
    try {
      buf = await data.toBuffer();
    } catch {
      return tooBig();
    }
    if (data.file.truncated) return tooBig();
    const fields = data.fields as Record<string, { value?: string } | undefined>;
    const course = Number(fields.course?.value);
    const role = (fields.role?.value ?? '').trim();
    const title = (fields.title?.value ?? data.filename ?? 'Document').trim();
    if (!Number.isInteger(course) || course <= 0 || !isDocRole(role)) return reply.code(400).type('text/html').send('<p class="error">Pick a course and a document type.</p>');
    const content = await extractDocText(buf, data.filename || 'file').catch(() => '');
    await addCourseDoc(course, role, title || 'Document', content);
    return reply.type('text/html').send(await docsSection(course));
  });

  app.get('/coverage/doc/:id', { preHandler: requireAuth }, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const doc = await getCourseDoc(p.data.id);
    return reply.type('text/html').send(doc ? renderDocEditor(doc) : '<p class="muted">Document not found.</p>');
  });

  app.post('/coverage/doc/:id', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ text: z.string().max(500000) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    await updateCourseDocContent(p.data.id, b.data.text);
    return reply.type('text/html').send(renderSavedStatus(`cov-doc-${p.data.id}-status`));
  });

  app.post('/coverage/doc/:id/delete', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const course = await getCourseDocCourse(p.data.id);
    await deleteCourseDoc(p.data.id);
    return reply.type('text/html').send(course == null ? '<div id="cov-docs"></div>' : await docsSection(course));
  });

  app.post('/coverage/exam-date', guard, async (req, reply) => {
    const b = z.object({ course: z.coerce.number().int().positive(), date: z.string().max(10) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(b.data.date.trim()) ? b.data.date.trim() : null; // blank clears it
    await setCourseExamDate(b.data.course, iso);
    return reply.type('text/html').send(renderSavedStatus('cov-exam-status'));
  });

  // idea 10 slice 2 — the AI gap-filler: propose where each uncovered point should be covered.
  app.post('/coverage/suggest', guard, async (req, reply) => {
    const b = z.object({ scheme: z.coerce.number().int().positive(), course: z.coerce.number().int().positive() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    const r = await suggestCoverage(b.data.scheme);
    if (r.status === 'none') return reply.type('text/html').send(`<p class="muted">${esc(r.message ?? 'Nothing to suggest.')}</p>`);
    if (r.status === 'unavailable') return reply.type('text/html').send('<p class="muted">AI is off — turn it on in Settings → AI to get suggestions.</p>');
    if (r.status !== 'ok' || !r.suggestions) return reply.type('text/html').send(`<p class="muted">${esc(r.message ?? 'Could not get suggestions — try again.')}</p>`);
    return reply.type('text/html').send(renderSuggestions(b.data.course, r.suggestions));
  });

  app.post('/coverage/suggest/apply', guard, async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const course = z.coerce.number().int().positive().safeParse(body.course);
    if (!course.success) return reply.code(400).send('');
    let map: Array<{ pointId: number; lessonId: number }>;
    try {
      const parsed = JSON.parse(typeof body.payload === 'string' ? body.payload : '');
      map = z.object({ map: z.array(z.object({ pointId: z.number().int().positive(), lessonId: z.number().int().positive() })) }).parse(parsed).map;
    } catch {
      return reply.code(400).type('text/html').send('<p class="error">Could not read the suggestions — please try again.</p>');
    }
    for (let i = 0; i < map.length; i += 1) {
      if (body[`include_${i}`] == null) continue;
      await setPlanSpecPoint(map[i]!.lessonId, map[i]!.pointId, true);
    }
    return reply.type('text/html').send(await bodyFor(course.data));
  });

  app.post('/coverage/point/:id/archive', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ course: z.coerce.number().int().positive() }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    await setSpecPointActive(p.data.id, false);
    return reply.type('text/html').send(await bodyFor(b.data.course));
  });

  app.get('/coverage/plan/:id/points', { preHandler: requireAuth }, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const courseId = await getPlanCourse(p.data.id);
    if (courseId == null) return reply.type('text/html').send('<p class="muted">Lesson not found.</p>');
    const [points, mapped] = await Promise.all([listSpecPoints(courseId), getPlanSpecPointIds(p.data.id)]);
    return reply.type('text/html').send(renderChecklist(p.data.id, points, new Set(mapped)));
  });

  app.post('/coverage/plan/:id/point/:pid', guard, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive(), pid: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ on: z.enum(['0', '1']) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    await setPlanSpecPoint(p.data.id, p.data.pid, b.data.on === '1');
    return reply.type('text/html').send(renderSavedStatus(`cov-plan-${p.data.id}-status`));
  });
}
