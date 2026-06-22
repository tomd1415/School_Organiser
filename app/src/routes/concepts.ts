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

import {
  renderRow,
  renderConceptsNext,
} from '../lib/conceptsView';

export function registerConceptRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/concepts', { preHandler: requireAuth }, async (_req, reply) => {
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const [rows, courses] = await Promise.all([listConcepts(true), listCourses()]);
      body = renderConceptsNext({ rows, courses, csrf });
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
    const csrf = reply.generateCsrf();
    return reply.type('text/html').send(renderConceptsNext({ rows, courses, csrf, selectedCourseId: courseId }));
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
