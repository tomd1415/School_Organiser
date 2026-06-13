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
  deleteScheme,
  deleteUnit,
  getActiveScheme,
  getCourseTeachingContext,
  getPlanContext,
  getPlanRow,
  getScheme,
  listAllSchemes,
  listCourses,
  listPlansForScheme,
  listPlansForUnit,
  listSchemeVersions,
  listUnits,
  materialiseScheme,
  materialiseUnit,
  movePlan,
  moveSchemeToCourse,
  moveUnit,
  schemeIdForPlan,
  schemeIdForUnit,
  setCourseTeachingContext,
  setSchemeLabels,
  updatePlanField,
  updateUnitField,
} from '../repos/schemes';
import {
  addVersion,
  createResource,
  getImportedPaths,
  linkResourceToPlan,
  linkResourceToUnit,
  listResourceIdsForFolder,
  listResourcesForPlan,
  listVersions,
  searchResources,
  unlinkResourceFromPlan,
} from '../repos/resources';
import { checksum, relPathFor, storeBuffer } from '../lib/resourceStore';
import { safeFilename } from '../services/resource';
import { lessonResourcesSchema, normaliseResourceKind, tidyResourceSet } from '../llm/schemas/lessonResources';
import { LESSON_RESOURCES_INSTRUCTION, LESSON_RESOURCES_SYSTEM, LESSON_RESOURCES_VERSION, lessonResourceItems } from '../llm/prompts/lessonResources';
import { lessonStructure, unitCandidates } from '../services/convertUnit';
import { getCourseCurriculumHistory } from '../repos/curriculumHistory';
import { curriculumHistoryItems } from '../llm/prompts/curriculumHistory';
import { listActiveEquipment } from '../repos/equipment';
import { equipmentItem } from '../llm/prompts/equipment';
import { convertUnitSchema } from '../llm/schemas/convertUnit';
import { CONVERT_UNIT_SYSTEM, CONVERT_UNIT_VERSION, convertUnitInstruction } from '../llm/prompts/convertUnit';
import { buildSchemeTree } from '../services/scheme';
import { getCurrentYearEnd, getSlotWeekday, layLessonsIntoSlot, listSlotsForCourse } from '../repos/delivery';
import { upcomingSlotDates } from '../services/delivery';
import { getClockContext } from '../repos/clock';
import { localParts } from '../lib/time';
import { renderAllSchemes, renderConvertPanel, renderConvertResults, renderLayForm, renderLayResult, renderPlan, renderSchemeControls, renderSchemeEmpty, renderSchemeLabels, renderSchemeTree, renderTeachingContext } from '../lib/schemeView';
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


// Generate/update ONE lesson's resource set (slides outline, worksheet, support, answers) and put
// each file where it belongs: the resource store, linked to the plan, so it surfaces on the lesson
// screen and the plan editor. Re-running creates new VERSIONS of the same documents, not copies.
const RES_KIND_LABEL: Record<string, string> = { slides: 'slides', worksheet: 'worksheet', support: 'support worksheet', answers: 'answers' };
const RES_KIND_STORE: Record<string, string> = { slides: 'slides', worksheet: 'worksheet', support: 'worksheet', answers: 'document' };

async function generateResourcesForPlan(planId: number): Promise<{ ok: boolean; message: string }> {
  const [ctx, row] = await Promise.all([getPlanContext(planId), getPlanRow(planId)]);
  if (!ctx || !row) return { ok: false, message: 'Lesson not found.' };
  if (!(row.objectives ?? '').trim() && !(row.outline ?? '').trim()) {
    return { ok: false, message: 'Write or ✨draft the objectives/outline first — resources are generated from them.' };
  }
  const callOnce = () =>
    callLLMStructured(
      {
        feature: 'lesson_resources',
        model: modelChoice,
        promptVersion: LESSON_RESOURCES_VERSION,
        system: LESSON_RESOURCES_SYSTEM,
        context: [
          ...teachingContextItems(ctx.teachingContext),
          ...equipmentItem(equipment),
          ...lessonResourceItems({ courseName: ctx.courseName, unitTitle: ctx.unitTitle, planTitle: ctx.planTitle, objectives: row.objectives, outline: row.outline }),
        ],
        instruction: LESSON_RESOURCES_INSTRUCTION,
        maxTokens: 16000, // four full documents need room — a tight cap makes the model drop one
      },
      lessonResourcesSchema,
    );
  const modelChoice = await modelFor('plan');
  const equipment = await listActiveEquipment();
  let result = await callOnce();
  if (result.status !== 'ok' || !result.data) return { ok: false, message: result.message ?? 'AI unavailable — nothing generated.' };
  let tidy = tidyResourceSet(result.data.resources);
  if (tidy.missing.length) {
    // the model occasionally burns its budget on one document — one retry usually completes the set
    const second = await callOnce();
    if (second.status === 'ok' && second.data) {
      const retry = tidyResourceSet(second.data.resources);
      if (retry.missing.length < tidy.missing.length) tidy = retry;
    }
  }
  if (tidy.missing.length) {
    return { ok: false, message: `The AI returned an incomplete set (missing: ${tidy.missing.join(', ')}) — try again.` };
  }

  const existing = await listResourcesForPlan(planId);
  let created = 0;
  let updated = 0;
  for (const r of tidy.docs) {
    const kind = r.kind;
    const filename = `${safeFilename(ctx.planTitle).replace(/\.md$/i, '') || 'lesson'} — ${RES_KIND_LABEL[kind] ?? kind}.md`;
    const buf = Buffer.from(r.content, 'utf8');
    const match = existing.find((e) => e.title === filename);
    if (match) {
      const vNo = (await listVersions(match.resourceId)).length + 1;
      const rel = relPathFor(match.resourceId, vNo, filename);
      await storeBuffer(rel, buf);
      await addVersion(match.resourceId, rel, buf.length, checksum(buf), 'ai', 'AI-regenerated');
      updated++;
    } else {
      const id = await createResource(filename, RES_KIND_STORE[kind] ?? 'document', 'text/markdown', 'ai_generated');
      const rel = relPathFor(id, 1, filename);
      await storeBuffer(rel, buf);
      await addVersion(id, rel, buf.length, checksum(buf), 'ai', 'AI-generated');
      await linkResourceToPlan(id, planId);
      created++;
    }
  }
  return { ok: true, message: `resources ready ✓ — ${created} new, ${updated} updated (linked below)` };
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
        const [tree, teachingCtx, allSchemes, courseSlots, clockCtx] = await Promise.all([
          scheme ? treeHtml(scheme.id) : Promise.resolve(renderSchemeEmpty(courseId, undefined, current?.name)),
          getCourseTeachingContext(courseId),
          listAllSchemes(),
          listSlotsForCourse(courseId),
          getClockContext(),
        ]);
        const today = localParts(new Date(), clockCtx.tz).isoDate;
        body = `
          <section class="card" hx-headers='{"x-csrf-token":"${csrf}"}'>
            <h1>Schemes of work</h1>
            <nav class="task-tabs">${courses.map(tab).join(' ')}</nav>
            <p class="scheme-course">Course: <strong>${esc(current?.name ?? '')}</strong>
              <button type="button" class="link" hx-post="/schemes/course/${courseId}/summary" hx-target="#course-${courseId}-summary" hx-swap="innerHTML" hx-disabled-elt="this">✨ summarise this course's notes</button>
            </p>
            <div id="course-${courseId}-summary"></div>
            ${renderTeachingContext(courseId, teachingCtx)}
            ${scheme ? `<p class="scheme-meta"><strong>${esc(scheme.title)}</strong> · ${verLinks} · <button type="button" class="link" hx-post="/schemes/${scheme.id}/version">＋ new version (draft)</button></p>${renderSchemeControls(scheme, courses)}` : ''}
            ${tree}
            <h2 class="sch-divider">Add or import content</h2>
            ${renderConvertPanel(courseId, courseSlots, today)}
            <h2 class="sch-divider">Reference &amp; admin</h2>
            <details class="kit-avail" id="kit-avail">
              <summary>🔧 Kit available</summary>
              <div hx-get="/kit/panel" hx-trigger="toggle from:#kit-avail once" hx-target="this" hx-swap="innerHTML"><span class="muted">…</span></div>
            </details>
            ${renderAllSchemes(allSchemes, scheme?.id)}
          </section>`;
      }
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
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
          ...curriculumHistoryItems(await getCourseCurriculumHistory(q.data.course)),
          ...equipmentItem(await listActiveEquipment()),
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

  // 5.3: find convertible downloaded units (folders with lesson-named subfolders) by substring.
  app.get('/schemes/course/:id/convert-search', { preHandler: requireAuth }, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const qq = z.object({ q: z.string().max(200).optional() }).safeParse(req.query);
    if (!id.success) return reply.code(400).send('');
    const needle = (qq.success ? (qq.data.q ?? '') : '').trim().toLowerCase();
    if (!needle) return reply.type('text/html').send('<span class="muted">type to search the imported folders…</span>');
    const candidates = unitCandidates(await getImportedPaths()).filter((c) => c.folder.toLowerCase().includes(needle));
    return reply.type('text/html').send(renderConvertResults(candidates));
  });

  // 5.3 + 5.7: convert the chosen downloaded unit into adapted master lessons on this course's
  // scheme — and, if a slot was chosen, lay the lessons straight into its upcoming weeks.
  app.post('/schemes/course/:id/convert', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const b = z
      .object({
        folder: z.string().min(1).max(500),
        q: z.string().optional(),
        assign_slot: z.string().regex(/^\d+:\d+$/).optional().or(z.literal('')),
        assign_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
      })
      .safeParse(req.body);
    if (!id.success) return reply.code(400).send('');
    const courseId = id.data.id;
    const course = (await listCourses()).find((c) => Number(c.id) === courseId);
    if (!course) return reply.code(404).send('');
    const [slots, ctx] = await Promise.all([listSlotsForCourse(courseId), getClockContext()]);
    const today = localParts(new Date(), ctx.tz).isoDate;
    const panel = (error: string) => renderConvertPanel(courseId, slots, today, error);
    if (!b.success) {
      return reply.type('text/html').send(panel('Pick a unit folder first — search, then select one.'));
    }
    // Validate the optional assign target BEFORE the AI call — don't spend, then fail.
    const assignSlot = b.data.assign_slot || null;
    let assignTarget: { lessonId: number; groupCourseId: number } | null = null;
    if (assignSlot) {
      const [lessonId, groupCourseId] = assignSlot.split(':').map(Number) as [number, number];
      if (!slots.some((s) => Number(s.lessonId) === lessonId && Number(s.groupCourseId) === groupCourseId)) {
        return reply.type('text/html').send(panel("That slot doesn't teach this course — pick one from the list."));
      }
      assignTarget = { lessonId, groupCourseId };
    }
    const startDate = b.data.assign_start || today;
    const paths = await getImportedPaths();
    // Only a genuine candidate folder is convertible (also guards the LIKE in the source-link query).
    if (!unitCandidates(paths).some((c) => c.folder === b.data.folder)) {
      return reply.type('text/html').send(panel('That folder is not a convertible unit — pick one from the search results.'));
    }
    const lessons = lessonStructure(paths, b.data.folder);

    const result = await callLLMStructured(
      {
        feature: 'convert_unit',
        model: await modelFor('plan'), // Sonnet — structured adaptation of a known sequence
        promptVersion: CONVERT_UNIT_VERSION,
        system: CONVERT_UNIT_SYSTEM,
        context: [
          ...teachingContextItems(await getCourseTeachingContext(courseId)),
          ...curriculumHistoryItems(await getCourseCurriculumHistory(courseId)),
          ...equipmentItem(await listActiveEquipment()),
          { text: convertUnitInstruction(course.name, b.data.folder, lessons) },
        ],
        instruction: 'Convert the unit now.',
        maxTokens: 8000,
      },
      convertUnitSchema,
    );
    const converted = result.data;
    if (result.status !== 'ok' || !converted || converted.lessons.length === 0) {
      return reply.type('text/html').send(panel(result.message ?? 'The AI could not convert this unit — try again.'));
    }

    // Land on the course's scheme (create one if the course has none yet).
    const scheme = await getActiveScheme(courseId);
    const schemeId = scheme ? Number(scheme.id) : await createScheme(courseId);
    if (!schemeId) return reply.type('text/html').send(panel('Could not find or create a scheme for this course.'));
    const unitId = await materialiseUnit(schemeId, converted.unitTitle, converted.lessons);
    if (!unitId) return reply.type('text/html').send(panel('Could not save the converted unit.'));

    // Source provenance: link the downloaded files to the new unit (capped — a unit can hold many).
    const sourceIds = (await listResourceIdsForFolder(b.data.folder)).slice(0, 80);
    for (const rid of sourceIds) await linkResourceToUnit(rid, unitId);

    // 5.7: assign in the same action — lay into the chosen slot's weeks, then review on the map.
    // A short or empty lay-down never rolls back the conversion; the map shows what happened.
    if (assignTarget) {
      const weekday = await getSlotWeekday(assignTarget.lessonId);
      if (weekday != null) {
        const unitPlans = await listPlansForUnit(unitId);
        const yearEnd = await getCurrentYearEnd();
        const dates = upcomingSlotDates(weekday, startDate, unitPlans.length, ctx.terms).filter((d) => !yearEnd || d <= yearEnd);
        await layLessonsIntoSlot(assignTarget.lessonId, assignTarget.groupCourseId, unitPlans, dates);
      }
      reply.header('HX-Redirect', `/map?slot=${assignTarget.lessonId}:${assignTarget.groupCourseId}`);
      return reply.send('');
    }

    reply.header('HX-Redirect', `/schemes?course=${courseId}&scheme=${schemeId}`);
    return reply.send('');
  });


  // Generate/update a lesson's resource set (AI) — slides outline + worksheet + support + answers.
  app.post('/schemes/plan/:id/resources-ai', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const q = z.object({ from: z.enum(['lesson']).optional() }).safeParse(req.query);
    const res = await generateResourcesForPlan(id.data.id);
    if (q.success && q.data.from === 'lesson') {
      if (res.ok) {
        reply.header('HX-Refresh', 'true');
        return reply.send('');
      }
      return reply.type('text/html').send(`<span class="muted">${esc(res.message)}</span>`);
    }
    const updated = await getPlanRow(id.data.id);
    if (!updated) return reply.code(404).send('');
    return reply.type('text/html').send(renderPlan(updated, { open: true, draftStatus: res.message }));
  });

  // …and for every lesson in a unit (one AI call per lesson; stops early if AI is unavailable).
  app.post('/schemes/unit/:id/resources-ai', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const plans = await listPlansForUnit(id.data.id);
    let done = 0;
    let skipped = 0;
    for (const pl of plans) {
      const r = await generateResourcesForPlan(pl.id);
      if (r.ok) done++;
      else {
        skipped++;
        if (/unavailable|cap|disabled|key|not configured/i.test(r.message)) break; // no point hammering
      }
    }
    const sid = await schemeIdForUnit(id.data.id);
    const tree = sid ? await treeHtml(sid) : '<div id="scheme-tree"></div>';
    const note = `<p class="adapt-note">unit resources: ${done} lesson${done === 1 ? '' : 's'} done${skipped ? `, ${skipped} skipped` : ''}</p>`;
    return reply.type('text/html').send(tree.replace('<div id="scheme-tree">', `<div id="scheme-tree">${note}`));
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
      context: notes.map((n) => ({ text: n.body, safeguarding: n.safeguarding })),
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

  // ── scheme management: label, move, delete ──
  app.post('/schemes/:id/labels', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const b = z.object({ labels: z.string().max(500) }).safeParse(req.body);
    if (!id.success || !b.success) return reply.code(400).send('');
    await setSchemeLabels(id.data.id, b.data.labels);
    const s = await getScheme(id.data.id);
    return reply.type('text/html').send(renderSchemeLabels(id.data.id, s?.labels ?? null));
  });

  app.post('/schemes/:id/move-course', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const b = z.object({ course: z.coerce.number().int().positive() }).safeParse(req.body);
    if (!id.success || !b.success) return reply.code(400).send('');
    if (await moveSchemeToCourse(id.data.id, b.data.course)) {
      reply.header('HX-Redirect', `/schemes?course=${b.data.course}&scheme=${id.data.id}`);
      return reply.send('');
    }
    return reply.type('text/html').send('');
  });

  app.post('/schemes/:id/delete', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const s = await getScheme(id.data.id); // capture the course before deleting
    await deleteScheme(id.data.id);
    reply.header('HX-Redirect', s ? `/schemes?course=${s.courseId}` : '/schemes');
    return reply.send('');
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

  // 5.4: lay a unit into a group's weekly slot. The form lists the slots that teach this course.
  app.get('/schemes/unit/:id/lay-form', { preHandler: requireAuth }, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const sid = await schemeIdForUnit(id.data.id);
    const scheme = sid ? await getScheme(sid) : null;
    if (!scheme) return reply.type('text/html').send('<p class="muted">Unit not found.</p>');
    const [slots, lessons, ctx] = await Promise.all([
      listSlotsForCourse(Number(scheme.courseId)),
      listPlansForUnit(id.data.id),
      getClockContext(),
    ]);
    const today = localParts(new Date(), ctx.tz).isoDate;
    return reply.type('text/html').send(renderLayForm(id.data.id, slots, lessons.length, today));
  });

  app.post('/schemes/unit/:id/lay-down', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const body = z
      .object({ slot: z.string().regex(/^\d+:\d+$/), start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
      .safeParse(req.body);
    if (!id.success || !body.success) return reply.code(400).send('<p class="muted">Bad request.</p>');
    const [lessonId, groupCourseId] = body.data.slot.split(':').map(Number) as [number, number];
    const sid = await schemeIdForUnit(id.data.id);
    const scheme = sid ? await getScheme(sid) : null;
    if (!scheme) return reply.type('text/html').send('<p class="muted">Unit not found.</p>');
    // Only allow a slot that actually teaches this unit's course.
    const slots = await listSlotsForCourse(Number(scheme.courseId));
    if (!slots.some((s) => Number(s.lessonId) === lessonId && Number(s.groupCourseId) === groupCourseId)) {
      return reply.type('text/html').send('<p class="muted">That slot doesn\'t teach this course.</p>');
    }
    const [lessons, weekday, ctx] = await Promise.all([listPlansForUnit(id.data.id), getSlotWeekday(lessonId), getClockContext()]);
    if (weekday == null) return reply.type('text/html').send('<p class="muted">Slot not found.</p>');
    const yearEnd = await getCurrentYearEnd();
    const dates = upcomingSlotDates(weekday, body.data.start, lessons.length, ctx.terms).filter((d) => !yearEnd || d <= yearEnd);
    const laid = await layLessonsIntoSlot(lessonId, groupCourseId, lessons, dates);
    return reply.type('text/html').send(renderLayResult(laid, lessons.length));
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
        context: [...teachingContextItems(ctx.teachingContext), ...equipmentItem(await listActiveEquipment()), { text: draftLessonInstruction(ctx) }],
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
