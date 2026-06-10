import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import {
  addPlan,
  addUnit,
  cloneSchemeNewVersion,
  createScheme,
  deletePlan,
  deleteUnit,
  getActiveScheme,
  getCourseTeachingContext,
  getPlanContext,
  getPlanRow,
  getScheme,
  listCourses,
  listPlansForScheme,
  listSchemeVersions,
  listUnits,
  materialiseScheme,
  movePlan,
  moveUnit,
  schemeIdForPlan,
  schemeIdForUnit,
  setCourseTeachingContext,
  updatePlanField,
  updateUnitField,
} from '../repos/schemes';
import {
  linkResourceToPlan,
  listResourcesForPlan,
  searchResources,
  unlinkResourceFromPlan,
} from '../repos/resources';
import { buildSchemeTree } from '../services/scheme';
import { renderPlan, renderSchemeEmpty, renderSchemeTree, renderTeachingContext } from '../lib/schemeView';
import { renderAttachResults, renderPlanResourcesBlock } from '../lib/resourceView';
import { renderSavedStatus } from '../lib/notesView';
import { teachingContextItems } from '../llm/prompts/teachingContext';
import { modelFor } from '../repos/settings';
import { listGeneralNotes } from '../repos/notes';
import { callLLM, callLLMStructured } from '../llm/client';
import { TERM_SUMMARY_INSTRUCTION, TERM_SUMMARY_SYSTEM, TERM_SUMMARY_VERSION } from '../llm/prompts/termSummary';
import { draftLessonSchema } from '../llm/schemas/draftLesson';
import { DRAFT_LESSON_SYSTEM, DRAFT_LESSON_VERSION, draftLessonInstruction } from '../llm/prompts/draftLesson';
import { authorSchemeSchema } from '../llm/schemas/authorScheme';
import { AUTHOR_SCHEME_SYSTEM, AUTHOR_SCHEME_VERSION, authorSchemeInstruction } from '../llm/prompts/authorScheme';

const idParam = z.object({ id: z.coerce.number().int().positive() });
const dir = z.enum(['up', 'down']);

async function treeHtml(schemeId: number): Promise<string> {
  const [scheme, units, plans] = await Promise.all([getScheme(schemeId), listUnits(schemeId), listPlansForScheme(schemeId)]);
  if (!scheme) return '<div id="scheme-tree"><p class="muted">Scheme not found.</p></div>';
  return renderSchemeTree(scheme, buildSchemeTree(units, plans));
}

export function registerSchemeRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/schemes', { preHandler: requireAuth }, async (req, reply) => {
    const q = z
      .object({ course: z.coerce.number().int().positive().optional(), scheme: z.coerce.number().int().positive().optional() })
      .safeParse(req.query);
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const courses = await listCourses();
      // courses.id is BIGINT → pg returns a string; normalise to number so comparisons work.
      const courseId = (q.success && q.data.course) || (courses[0] ? Number(courses[0].id) : undefined);
      if (!courseId) {
        body = `<section class="card"><h1>Schemes of work</h1><p class="muted">No courses yet.</p></section>`;
      } else {
        const current = courses.find((c) => Number(c.id) === courseId);
        const scheme = q.success && q.data.scheme ? await getScheme(q.data.scheme) : await getActiveScheme(courseId);
        const versions = await listSchemeVersions(courseId);
        const tab = (c: { id: number; name: string }) =>
          `<a href="/schemes?course=${c.id}"${Number(c.id) === courseId ? ' class="active"' : ''}>${esc(c.name)}</a>`;
        const verLinks = versions
          .map((v) => `<a href="/schemes?course=${courseId}&scheme=${v.id}"${scheme && v.id === scheme.id ? ' class="active"' : ''}>v${v.version}${v.active ? '' : ' (draft)'}</a>`)
          .join(' ');
        const [tree, teachingCtx] = await Promise.all([
          scheme ? treeHtml(scheme.id) : Promise.resolve(renderSchemeEmpty(courseId, undefined, current?.name)),
          getCourseTeachingContext(courseId),
        ]);
        body = `
          <section class="card" hx-headers='{"x-csrf-token":"${csrf}"}'>
            <h1>Schemes of work</h1>
            <nav class="task-tabs">${courses.map(tab).join(' ')}</nav>
            <p class="scheme-course">Course: <strong>${esc(current?.name ?? '')}</strong>
              <button type="button" class="link" hx-post="/schemes/course/${courseId}/summary" hx-target="#course-${courseId}-summary" hx-swap="innerHTML" hx-disabled-elt="this">✨ summarise this course's notes</button>
            </p>
            <div id="course-${courseId}-summary"></div>
            ${renderTeachingContext(courseId, teachingCtx)}
            ${scheme ? `<p class="scheme-meta"><strong>${esc(scheme.title)}</strong> · ${verLinks} · <button type="button" class="link" hx-post="/schemes/${scheme.id}/version">＋ new version (draft)</button></p>` : ''}
            ${tree}
          </section>`;
      }
    } catch {
      body = `<section class="card"><h1>Schemes of work</h1><p class="muted">Unavailable — the database is not reachable.</p></section>`;
    }
    return reply.type('text/html').send(layout({ title: 'Schemes', body, authed: true, csrfToken: csrf }));
  });

  app.post('/schemes/create', guard, async (req, reply) => {
    const q = z.object({ course: z.coerce.number().int().positive() }).safeParse(req.query);
    if (!q.success) return reply.code(400).send('');
    const id = await createScheme(q.data.course);
    if (id) {
      reply.header('HX-Redirect', `/schemes?course=${q.data.course}&scheme=${id}`);
      return reply.send('');
    }
    return reply.type('text/html').send('');
  });

  // ── author a whole scheme of work with AI (4.4) ──
  // A brief → units + lesson titles (Opus). Materialised as a real scheme the teacher prunes and
  // then fleshes out lesson-by-lesson with the 4.3 drafter. Degrades to an inline note if AI is off.
  app.post('/schemes/author', guard, async (req, reply) => {
    const q = z.object({ course: z.coerce.number().int().positive() }).safeParse(req.query);
    const b = z.object({ brief: z.string().trim().min(1).max(4000) }).safeParse(req.body);
    if (!q.success || !b.success) return reply.code(400).send('');
    // courses.id is BIGINT → pg returns it as a string, so coerce before comparing.
    const course = (await listCourses()).find((c) => Number(c.id) === q.data.course);
    if (!course) return reply.code(404).send('');

    const result = await callLLMStructured(
      {
        feature: 'author_scheme',
        model: await modelFor('design'), // Opus — heavy curriculum design
        promptVersion: AUTHOR_SCHEME_VERSION,
        system: AUTHOR_SCHEME_SYSTEM,
        context: [
          ...teachingContextItems(await getCourseTeachingContext(q.data.course)),
          { text: authorSchemeInstruction(course.name, b.data.brief) },
        ],
        instruction: 'Design the scheme now.',
        maxTokens: 8000,
      },
      authorSchemeSchema,
    );

    const units = result.data?.units.filter((u) => u.title?.trim()) ?? [];
    if (result.status !== 'ok' || units.length === 0) {
      return reply.type('text/html').send(renderSchemeEmpty(q.data.course, result.message ?? 'The AI could not author a scheme — try again or add detail to the brief.', course.name));
    }
    const schemeId = await materialiseScheme(q.data.course, `${course.name} — Scheme of Work`, units);
    if (!schemeId) return reply.type('text/html').send(renderSchemeEmpty(q.data.course, 'Could not save the authored scheme.', course.name));
    reply.header('HX-Redirect', `/schemes?course=${q.data.course}&scheme=${schemeId}`);
    return reply.send('');
  });

  // Summarise a course's notes with AI (4.5).
  app.post('/schemes/course/:id/summary', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const notes = await listGeneralNotes({ courseId: id.data.id });
    if (notes.length === 0) {
      return reply.type('text/html').send('<p class="muted">No notes for this course yet to summarise.</p>');
    }
    const result = await callLLM({
      feature: 'term_summary',
      model: await modelFor('plan'),
      promptVersion: TERM_SUMMARY_VERSION,
      system: TERM_SUMMARY_SYSTEM,
      context: notes.map((n) => ({ text: n.body })),
      instruction: TERM_SUMMARY_INSTRUCTION,
      maxTokens: 1500,
    });
    if (result.status !== 'ok' || !result.text) {
      return reply.type('text/html').send(`<p class="muted">${esc(result.message ?? 'AI unavailable.')}</p>`);
    }
    return reply.type('text/html').send(`<div class="term-summary">${esc(result.text)}</div>`);
  });

  // Autosave the per-course teaching context (4.4.1).
  app.post('/schemes/course/:id/context', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const b = z.object({ teaching_context: z.string().max(8000) }).safeParse(req.body);
    if (!id.success || !b.success) return reply.code(400).send('');
    await setCourseTeachingContext(id.data.id, b.data.teaching_context);
    return reply.type('text/html').send(renderSavedStatus(`course-${id.data.id}-ctx-status`));
  });

  // ── structural changes → re-render the whole tree ──
  app.post('/schemes/:id/unit', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    await addUnit(id.data.id, 'New unit');
    return reply.type('text/html').send(await treeHtml(id.data.id));
  });

  app.post('/schemes/unit/:id/plan', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    await addPlan(id.data.id, 'New lesson');
    const sid = await schemeIdForUnit(id.data.id);
    return reply.type('text/html').send(sid ? await treeHtml(sid) : '');
  });

  app.post('/schemes/unit/:id/move/:dir', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const d = dir.safeParse((req.params as { dir: string }).dir);
    if (!id.success || !d.success) return reply.code(400).send('');
    await moveUnit(id.data.id, d.data);
    const sid = await schemeIdForUnit(id.data.id);
    return reply.type('text/html').send(sid ? await treeHtml(sid) : '');
  });

  app.post('/schemes/unit/:id/delete', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const sid = await schemeIdForUnit(id.data.id);
    await deleteUnit(id.data.id);
    return reply.type('text/html').send(sid ? await treeHtml(sid) : '');
  });

  app.post('/schemes/unit/:id', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const body = (req.body ?? {}) as Record<string, unknown>;
    for (const [f, raw] of Object.entries(body)) {
      if (f === '_csrf') continue;
      await updateUnitField(id.data.id, f, typeof raw === 'string' ? raw : null);
    }
    return reply.type('text/html').send(renderSavedStatus(`unit-${id.data.id}-status`));
  });

  app.post('/schemes/plan/:id/move/:dir', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const d = dir.safeParse((req.params as { dir: string }).dir);
    if (!id.success || !d.success) return reply.code(400).send('');
    await movePlan(id.data.id, d.data);
    const sid = await schemeIdForPlan(id.data.id);
    return reply.type('text/html').send(sid ? await treeHtml(sid) : '');
  });

  app.post('/schemes/plan/:id/delete', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const sid = await schemeIdForPlan(id.data.id);
    await deletePlan(id.data.id);
    return reply.type('text/html').send(sid ? await treeHtml(sid) : '');
  });

  app.post('/schemes/plan/:id', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const body = (req.body ?? {}) as Record<string, unknown>;
    for (const [f, raw] of Object.entries(body)) {
      if (f === '_csrf') continue;
      await updatePlanField(id.data.id, f, typeof raw === 'string' ? raw : null);
    }
    return reply.type('text/html').send(renderSavedStatus(`plan-${id.data.id}-status`));
  });

  // ── draft a lesson plan with AI (4.3) ──
  // Drafts objectives/outline/duration from the plan's place in the scheme; the draft lands in
  // the plan (the teacher edits, autosave persists). Degrades to an inline note if AI is off.
  app.post('/schemes/plan/:id/draft', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const [plan, ctx] = await Promise.all([getPlanRow(id.data.id), getPlanContext(id.data.id)]);
    if (!plan || !ctx) return reply.code(404).send('');

    const result = await callLLMStructured(
      {
        feature: 'draft_lesson',
        model: await modelFor('plan'),
        promptVersion: DRAFT_LESSON_VERSION,
        system: DRAFT_LESSON_SYSTEM,
        context: [...teachingContextItems(ctx.teachingContext), { text: draftLessonInstruction(ctx) }],
        instruction: 'Draft the lesson now.',
        maxTokens: 4000,
      },
      draftLessonSchema,
    );

    if (result.status !== 'ok' || !result.data) {
      return reply.type('text/html').send(renderPlan(plan, { open: true, draftStatus: result.message ?? 'AI unavailable.' }));
    }
    const d = result.data;
    await updatePlanField(id.data.id, 'objectives', d.objectives.join('\n'));
    await updatePlanField(id.data.id, 'outline', d.outline);
    if (Number.isFinite(d.durationMin) && d.durationMin > 0) {
      await updatePlanField(id.data.id, 'duration_min', String(Math.round(d.durationMin)));
    }
    const updated = (await getPlanRow(id.data.id)) ?? plan;
    return reply.type('text/html').send(renderPlan(updated, { open: true, draftStatus: 'drafted ✓ — review & edit' }));
  });

  // ── resources attached to a lesson plan (3.8) ──
  // Lazy-loaded when a plan's <details> is first opened.
  app.get('/schemes/plan/:id/resources', { preHandler: requireAuth }, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    return reply.type('text/html').send(renderPlanResourcesBlock(id.data.id, await listResourcesForPlan(id.data.id)));
  });

  app.get('/schemes/plan/:id/resources/search', { preHandler: requireAuth }, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const q = ((req.query as { q?: string }).q ?? '').trim().slice(0, 100);
    const rows = q ? await searchResources({ q }, 8, 0) : [];
    return reply.type('text/html').send(renderAttachResults(id.data.id, rows));
  });

  app.post('/schemes/plan/:id/resources', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const b = z.object({ resource_id: z.coerce.number().int().positive() }).safeParse(req.body);
    if (!id.success || !b.success) return reply.code(400).send('');
    await linkResourceToPlan(b.data.resource_id, id.data.id);
    return reply.type('text/html').send(renderPlanResourcesBlock(id.data.id, await listResourcesForPlan(id.data.id)));
  });

  app.post('/schemes/plan/:id/resources/:rid/detach', guard, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive(), rid: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    await unlinkResourceFromPlan(p.data.rid, p.data.id);
    return reply.type('text/html').send(renderPlanResourcesBlock(p.data.id, await listResourcesForPlan(p.data.id)));
  });

  app.post('/schemes/:id/version', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const head = await getScheme(id.data.id);
    const newId = await cloneSchemeNewVersion(id.data.id);
    if (newId && head) {
      reply.header('HX-Redirect', `/schemes?course=${head.courseId}&scheme=${newId}`);
      return reply.send('');
    }
    return reply.type('text/html').send('');
  });
}
