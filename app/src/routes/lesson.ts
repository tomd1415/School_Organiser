import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import {
  findOrCreateOccurrence,
  getLastStoppingPoints,
  getOccurrenceCourses,
  getOccurrenceHeader,
  getOccurrenceNotes,
  setOccurrenceCoursePlan,
} from '../repos/occurrence';
import { getLessonPlan, listCoursePlans, updatePlanField } from '../repos/schemes';
import { listResourcesForPlan, type LinkedResource } from '../repos/resources';
import {
  getAdaptation,
  getEffectiveLesson,
  getGroupCourseInfo,
  getGroupTeachingContext,
  listAdaptationHistory,
  recentGroupHistory,
  resetAdaptation,
  setGroupTeachingContext,
  upsertAdaptation,
  type EffectiveLesson,
} from '../repos/adaptations';
import { getCourseTeachingContext } from '../repos/schemes';
import { groupContextItems } from '../llm/prompts/teachingContext';
import { callLLMStructured } from '../llm/client';
import { modelFor } from '../repos/settings';
import { adaptLessonSchema } from '../llm/schemas/adaptLesson';
import { ADAPT_LESSON_SYSTEM, ADAPT_LESSON_VERSION, adaptLessonInstruction, historyItems, lessonItem } from '../llm/prompts/adaptLesson';
import { improveMasterSchema } from '../llm/schemas/improveMaster';
import { IMPROVE_MASTER_INSTRUCTION, IMPROVE_MASTER_SYSTEM, IMPROVE_MASTER_VERSION, masterPairItems } from '../llm/prompts/improveMaster';
import { listActiveEquipment } from '../repos/equipment';
import { equipmentItem } from '../llm/prompts/equipment';
import { getFollowupsForOccurrence } from '../repos/notes';
import { buildLessonDetail, type CourseSection, type LessonDetail } from '../services/occurrence';
import { renderLinkedResources } from '../lib/resourceView';
import { renderNewNoteButton, renderNotesList, renderSavedStatus, type FollowupItem, type NoteItem } from '../lib/notesView';
import { listOccurrencePrep, type PrepItem } from '../repos/prep';
import { renderPrepList } from '../lib/prepView';

const TZ = 'Europe/London';
const Query = z.object({
  lesson: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function purposeLabel(purpose: string): string {
  const map: Record<string, string> = {
    free: 'Free period',
    form: 'Form',
    club: 'Computing Club',
    open_room: 'Open room',
    duty: 'Duty',
    meeting: 'Meeting',
  };
  return map[purpose] ?? 'Lesson';
}

function fmtLong(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${iso}T12:00:00Z`));
}

function errorPage(reply: { generateCsrf: () => string }, code: number, message: string) {
  const body = `<section class="card"><h1>Lesson</h1><p>${esc(message)}</p><p><a href="/timetable">← Timetable</a></p></section>`;
  return { code, html: layout({ title: 'Lesson', body, authed: true, csrfToken: reply.generateCsrf() }) };
}

function renderPlanContent(ocId: number, title: string | null, objectives: string | null, outline: string | null, oob = false): string {
  const detail = `${objectives ? `<p><strong>Objectives:</strong> ${esc(objectives)}</p>` : ''}${outline ? `<p><strong>Outline:</strong> ${esc(outline)}</p>` : ''}`;
  const inner = title ? detail || '<span class="muted">(plan has no detail yet)</span>' : '<span class="muted">No plan bound.</span>';
  return `<div id="oc-${ocId}-plan" class="oc-plan"${oob ? ' hx-swap-oob="true"' : ''}>${inner}</div>`;
}

// 5.2: the per-group adaptation block. The master stays in renderPlanContent above; here the teacher
// edits THIS group's version (effective = override-else-master). The first edit creates the override.
function adaptMeta(gc: number, lp: number, adapted: boolean, oob = false): string {
  const badge = adapted
    ? `<span class="adapt-badge on">✏ adapted for this group</span>` +
      ` <button type="button" class="link danger" hx-post="/lesson/adapt/${gc}/${lp}/reset" hx-target="#adapt-${gc}-${lp}" hx-swap="outerHTML"` +
      ` hx-confirm="Reset this lesson to the master for this group? This group's changes and their log will be removed.">↩ reset to master</button>`
    : `<span class="adapt-badge muted">following the master — edit below to adapt it for this group</span>`;
  return `<div class="adapt-meta" id="adapt-${gc}-${lp}-meta"${oob ? ' hx-swap-oob="true"' : ''}>${badge} <span class="note-status" id="adapt-${gc}-${lp}-status"></span></div>`;
}

function renderAdaptation(gc: number, lp: number, eff: EffectiveLesson, msg?: string): string {
  return `<div class="adapt" id="adapt-${gc}-${lp}">
      ${adaptMeta(gc, lp, eff.adapted)}
      ${eff.adaptationNote ? `<p class="adapt-note">${esc(eff.adaptationNote)}</p>` : ''}
      ${msg ? `<p class="muted">${esc(msg)}</p>` : ''}
      <form hx-post="/lesson/adapt/${gc}/${lp}" hx-trigger="input changed delay:1200ms from:textarea, blur from:textarea" hx-swap="none">
        <label class="adapt-l">Objectives — for this group<textarea name="objectives" rows="2" placeholder="(inherits the master)">${esc(eff.objectives ?? '')}</textarea></label>
        <label class="adapt-l">Outline — for this group<textarea name="outline" rows="3" placeholder="(inherits the master)">${esc(eff.outline ?? '')}</textarea></label>
      </form>
      <button type="button" class="link fu-ai" hx-post="/lesson/adapt/${gc}/${lp}/ai" hx-target="#adapt-${gc}-${lp}" hx-swap="outerHTML" hx-disabled-elt="this">✨ Adapt from recent lessons (AI)</button>
      ${eff.adapted ? `<button type="button" class="link fu-ai" hx-post="/lesson/adapt/${gc}/${lp}/improve-master" hx-target="#adapt-${gc}-${lp}-proposal" hx-swap="innerHTML" hx-disabled-elt="this">⬆ Suggest master improvement (AI)</button>` : ''}
      <div id="adapt-${gc}-${lp}-proposal"></div>
      <details class="adapt-log" id="adapt-${gc}-${lp}-log">
        <summary>change log</summary>
        <div hx-get="/lesson/adapt/${gc}/${lp}/history" hx-trigger="toggle from:#adapt-${gc}-${lp}-log once" hx-target="this" hx-swap="innerHTML"><span class="muted">…</span></div>
      </details>
    </div>`;
}

function renderSection(
  s: CourseSection,
  plans: Array<{ id: number; title: string }>,
  resources: LinkedResource[],
  eff: EffectiveLesson | undefined,
  slot: { lessonId: number; date: string },
): string {
  const colour = s.colour ?? '#94a3b8';
  const oc = s.occurrenceCourseId;
  const slotKey = `${slot.lessonId}:${s.groupCourseId}`;
  const planOpts =
    `<option value=""${s.lessonPlanId == null ? ' selected' : ''}>— no plan —</option>` +
    plans.map((p) => `<option value="${p.id}"${p.id === s.lessonPlanId ? ' selected' : ''}>${esc(p.title)}</option>`).join('');
  const last = s.lastStop
    ? `<p class="ld-last">Last time → stopped at <strong>${esc(s.lastStop.stoppingPoint)}</strong> <span class="muted">(${esc(s.lastStop.date)})</span></p>`
    : '';
  return `
    <section class="ld-course" style="border-left-color:${esc(colour)}">
      <h2>${esc(s.courseName)}</h2>
      <label class="stop-label">Plan
        <select name="lesson_plan_id" hx-post="/occurrence-course/${oc}/plan" hx-trigger="change" hx-swap="none">${planOpts}</select>
        <a class="link" href="/schemes?course=${s.courseId}">edit →</a>
        <span class="note-status" id="oc-${oc}-plan-status"></span>
      </label>
      ${renderPlanContent(oc, s.planTitle, s.planObjectives, s.planOutline)}
      ${s.lessonPlanId != null && eff ? renderAdaptation(s.groupCourseId, s.lessonPlanId, eff) : ''}
      <div class="ld-res"><span class="ld-res-label">Resources</span> ${renderLinkedResources(resources)}</div>
      ${last}
      <label class="stop-label">Stopping point
        <input class="stop-input" name="stopping_point" value="${esc(s.stoppingPoint ?? '')}" placeholder="where we got to…"
          hx-post="/occurrence-course/${oc}/stopping" hx-trigger="input changed delay:800ms, blur" hx-swap="none">
        <span class="note-status" id="oc-${oc}-status"></span>
      </label>
      <p class="ld-slot-links">
        <a class="link" href="/map?slot=${slotKey}">📅 term map for this class →</a>
        ${s.lessonPlanId != null ? `<button type="button" class="link" hx-post="/map/shift" hx-vals='{"slot":"${slotKey}","date":"${esc(slot.date)}"}'
          hx-confirm="Didn't finish? This lesson repeats at the next ${esc(s.courseName)} slot and everything after shifts back one school week (holidays skipped)."
          title="repeat this lesson next week and shift the rest">↻ continue next week</button>` : ''}
      </p>
      <details class="group-ctx" id="group-ctx-${s.groupCourseId}">
        <summary>this class's teaching context</summary>
        <div hx-get="/lesson/group-context/${s.groupCourseId}" hx-trigger="toggle from:#group-ctx-${s.groupCourseId} once" hx-target="this" hx-swap="innerHTML"><span class="muted">…</span></div>
      </details>
    </section>`;
}

function renderDetail(
  detail: LessonDetail,
  notes: NoteItem[],
  prep: PrepItem[],
  plansByCourse: Map<number, Array<{ id: number; title: string }>>,
  resByPlan: Map<number, LinkedResource[]>,
  effByKey: Map<string, EffectiveLesson>,
  csrf: string,
): string {
  const h = detail.header;
  const heading = h.groupName ? esc(h.groupName) : esc(purposeLabel(h.purpose));
  const flag = h.isSelf ? '' : '⚑ ';
  const meta = [fmtLong(h.date), h.periodLabel, h.start && h.end ? `${h.start}–${h.end}` : '', h.roomName ?? '']
    .filter(Boolean)
    .map((x) => esc(x))
    .join(' · ');

  const sections =
    detail.sections.length > 0
      ? detail.sections
          .map((s) =>
            renderSection(
              s,
              plansByCourse.get(s.courseId) ?? [],
              (s.lessonPlanId != null && resByPlan.get(s.lessonPlanId)) || [],
              s.lessonPlanId != null ? effByKey.get(`${s.groupCourseId}:${s.lessonPlanId}`) : undefined,
              { lessonId: h.lessonId, date: h.date },
            ),
          )
          .join('')
      : `<p class="muted">${h.purpose === 'free' ? 'Free period — protected work time.' : 'No courses attached to this slot.'}</p>`;

  const listId = `notes-list-${h.occurrenceId}`;
  return `
    <section class="ld" hx-headers='{"x-csrf-token":"${csrf}"}'>
      <p class="kicker">${flag}${h.isSelf ? 'Lesson' : 'Lesson I oversee'}</p>
      <h1>${heading}</h1>
      <p class="ld-meta">${meta}</p>
      ${sections}
      ${prep.length ? `<section class="ld-notesblock"><h2>Before the bell</h2>${renderPrepList(prep, '/prep', 'prep', `prep-${detail.header.occurrenceId}`)}</section>` : ''}
      <section class="ld-notesblock">
        <div class="ld-notes-head"><h2>Notes</h2>${renderNewNoteButton(listId, { kind: 'lesson', occurrence: h.occurrenceId })}</div>
        ${renderNotesList(listId, notes)}
      </section>
      <p><a href="/timetable">← Timetable</a></p>
    </section>`;
}

export function registerLessonRoutes(app: FastifyInstance): void {
  app.get('/lesson', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = Query.safeParse(req.query);
    if (!parsed.success) {
      const e = errorPage(reply, 400, 'That lesson reference looks wrong.');
      return reply.code(e.code).type('text/html').send(e.html);
    }
    const { lesson, date } = parsed.data;

    try {
      const occurrenceId = await findOrCreateOccurrence(lesson, date);
      const header = await getOccurrenceHeader(occurrenceId);
      if (!header) {
        const e = errorPage(reply, 404, 'That lesson no longer exists.');
        return reply.code(e.code).type('text/html').send(e.html);
      }
      const [courses, lastStops, noteRows, followups, prep] = await Promise.all([
        getOccurrenceCourses(occurrenceId),
        getLastStoppingPoints(header.lessonId, date),
        getOccurrenceNotes(occurrenceId),
        getFollowupsForOccurrence(occurrenceId),
        listOccurrencePrep(occurrenceId),
      ]);

      const fuByNote = new Map<number, FollowupItem[]>();
      for (const f of followups) {
        const arr = fuByNote.get(f.noteId) ?? [];
        arr.push({ id: f.id, text: f.text, done: f.done });
        fuByNote.set(f.noteId, arr);
      }
      const noteItems: NoteItem[] = noteRows.map((n) => ({
        id: n.id,
        body: n.body,
        time: n.time,
        followups: fuByNote.get(n.id) ?? [],
      }));

      const detail = buildLessonDetail(header, courses, lastStops);
      const courseIds = [...new Set(courses.map((c) => c.courseId))];
      const planLists = await Promise.all(courseIds.map((cid) => listCoursePlans(cid)));
      const plansByCourse = new Map<number, Array<{ id: number; title: string }>>();
      courseIds.forEach((cid, i) => plansByCourse.set(cid, planLists[i] ?? []));

      // Resources linked to each bound plan, shown read-only on the lesson.
      const planIds = [...new Set(detail.sections.map((s) => s.lessonPlanId).filter((x): x is number => x != null))];
      const resLists = await Promise.all(planIds.map((pid) => listResourcesForPlan(pid)));
      const resByPlan = new Map<number, LinkedResource[]>();
      planIds.forEach((pid, i) => resByPlan.set(pid, resLists[i] ?? []));

      // 5.2: each group's effective lesson (its adaptation where present, else the master).
      const effByKey = new Map<string, EffectiveLesson>();
      await Promise.all(
        detail.sections
          .filter((s) => s.lessonPlanId != null)
          .map(async (s) => {
            const eff = await getEffectiveLesson(s.groupCourseId, s.lessonPlanId as number, {
              objectives: s.planObjectives,
              outline: s.planOutline,
            });
            effByKey.set(`${s.groupCourseId}:${s.lessonPlanId}`, eff);
          }),
      );

      const csrf = reply.generateCsrf();
      const title = header.groupName ?? purposeLabel(header.purpose);
      return reply
        .type('text/html')
        .send(layout({ title, body: renderDetail(detail, noteItems, prep, plansByCourse, resByPlan, effByKey, csrf), authed: true, csrfToken: csrf }));
    } catch {
      const body = `<section class="card"><h1>Lesson</h1><p class="muted">Lesson detail is unavailable — the database is not reachable.</p><p><a href="/timetable">← Timetable</a></p></section>`;
      return reply.type('text/html').send(layout({ title: 'Lesson', body, authed: true, csrfToken: reply.generateCsrf() }));
    }
  });

  // Bind a lesson plan to a course in this occurrence (per course for splits).
  app.post('/occurrence-course/:id/plan', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const params = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
    const body = z.object({ lesson_plan_id: z.string().optional() }).safeParse(req.body);
    if (!params.success || !body.success) return reply.code(400).send('');
    const raw = body.data.lesson_plan_id;
    const planId = raw && raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : null;
    await setOccurrenceCoursePlan(params.data.id, planId);
    const plan = planId ? await getLessonPlan(planId) : null;
    return reply
      .type('text/html')
      .send(renderPlanContent(params.data.id, plan?.title ?? null, plan?.objectives ?? null, plan?.outline ?? null, true) + renderSavedStatus(`oc-${params.data.id}-plan-status`));
  });

  // 5.2: per-group lesson adaptations (keyed on group_course + master lesson). The master is untouched.
  const AdaptParams = z.object({ gc: z.coerce.number().int().positive(), lp: z.coerce.number().int().positive() });

  // Autosave this group's adaptation of a master lesson; first save creates the override + logs it.
  app.post('/lesson/adapt/:gc/:lp', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const p = AdaptParams.safeParse(req.params);
    const b = z.object({ objectives: z.string().max(8000).optional(), outline: z.string().max(8000).optional() }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    await upsertAdaptation({
      groupCourseId: p.data.gc,
      lessonPlanId: p.data.lp,
      objectives: (b.data.objectives ?? '').trim() || null,
      outline: (b.data.outline ?? '').trim() || null,
      adaptationNote: null,
      changeSummary: 'teacher edit',
    });
    // Flip the badge to "adapted" (OOB) and confirm the save — without re-rendering the textareas.
    return reply.type('text/html').send(adaptMeta(p.data.gc, p.data.lp, true, true) + renderSavedStatus(`adapt-${p.data.gc}-${p.data.lp}-status`));
  });

  // Reset this group's lesson back to the master (delete the override + its log).
  app.post('/lesson/adapt/:gc/:lp/reset', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const p = AdaptParams.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    await resetAdaptation(p.data.gc, p.data.lp);
    const master = await getLessonPlan(p.data.lp);
    const eff: EffectiveLesson = {
      adapted: false,
      objectives: master?.objectives ?? null,
      outline: master?.outline ?? null,
      adaptationNote: null,
      adaptationId: null,
    };
    return reply.type('text/html').send(renderAdaptation(p.data.gc, p.data.lp, eff));
  });

  // This group's change log for a lesson (lazy-loaded when the log is opened).
  app.get('/lesson/adapt/:gc/:lp/history', { preHandler: requireAuth }, async (req, reply) => {
    const p = AdaptParams.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const a = await getAdaptation(p.data.gc, p.data.lp);
    if (!a) return reply.type('text/html').send('<span class="muted">no changes yet — following the master</span>');
    const hist = await listAdaptationHistory(a.id);
    return reply
      .type('text/html')
      .send(
        hist.length
          ? `<ul class="adapt-hist">${hist
              .map((h) => `<li><span class="muted">${esc(h.createdAt)}</span> · ${esc(h.author)} · ${esc(h.changeSummary ?? '')}</li>`)
              .join('')}</ul>`
          : '<span class="muted">no changes yet</span>',
      );
  });

  // 5.9: per-class teaching-context — cohort-level prose only (never an individual pupil); adds to
  // the course context when the AI adapts for this group.
  app.get('/lesson/group-context/:gc', { preHandler: requireAuth }, async (req, reply) => {
    const p = z.object({ gc: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const text = await getGroupTeachingContext(p.data.gc);
    return reply.type('text/html').send(`
      <p class="muted group-ctx-hint">Adds to the course context when adapting for this class. Describe the class as a whole — never an individual pupil.</p>
      <textarea name="text" rows="3" placeholder="e.g. this class needs shorter tasks and a movement break mid-lesson…"
        hx-post="/lesson/group-context/${p.data.gc}" hx-trigger="input changed delay:1000ms, blur" hx-swap="none">${esc(text ?? '')}</textarea>
      <span class="note-status" id="group-ctx-${p.data.gc}-status"></span>`);
  });

  app.post('/lesson/group-context/:gc', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const p = z.object({ gc: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ text: z.string().max(4000) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    await setGroupTeachingContext(p.data.gc, b.data.text);
    return reply.type('text/html').send(renderSavedStatus(`group-ctx-${p.data.gc}-status`));
  });

  // 5.5: the feedback loop — AI adapts this lesson for THIS group from its recent lessons
  // (stopping points + notes). Inputs go through the one wrapper: names redacted, safeguarding-
  // flagged notes withheld entirely, call audited. The master is never touched.
  app.post('/lesson/adapt/:gc/:lp/ai', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const p = AdaptParams.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const { gc, lp } = p.data;
    const [master, current, info, history] = await Promise.all([
      getLessonPlan(lp),
      getAdaptation(gc, lp),
      getGroupCourseInfo(gc),
      recentGroupHistory(gc),
    ]);
    if (!master || !info) return reply.code(404).send('');
    const eff = await getEffectiveLesson(gc, lp, { objectives: master.objectives, outline: master.outline });

    if (history.length === 0) {
      return reply.type('text/html').send(renderAdaptation(gc, lp, eff, 'No recent lessons recorded for this group yet — teach one (stopping point / notes) first.'));
    }

    const result = await callLLMStructured(
      {
        feature: 'adapt_lesson',
        model: await modelFor('plan'),
        promptVersion: ADAPT_LESSON_VERSION,
        system: ADAPT_LESSON_SYSTEM,
        context: [
          ...groupContextItems(await getCourseTeachingContext(info.courseId), await getGroupTeachingContext(gc)),
          ...equipmentItem(await listActiveEquipment()),
          lessonItem(master.title, eff.objectives, eff.outline, eff.adapted),
          ...historyItems(history),
        ],
        instruction: adaptLessonInstruction(info.courseName, info.groupName),
        maxTokens: 4000,
      },
      adaptLessonSchema,
    );
    if (result.status !== 'ok' || !result.data) {
      return reply.type('text/html').send(renderAdaptation(gc, lp, eff, result.message ?? 'AI unavailable — nothing changed.'));
    }
    await upsertAdaptation({
      groupCourseId: gc,
      lessonPlanId: lp,
      objectives: result.data.objectives.trim() || null,
      outline: result.data.outline.trim() || null,
      adaptationNote: result.data.adaptationNote.trim() || null,
      changeSummary: `AI: ${result.data.changeSummary.trim() || 'adapted from recent lessons'}`,
      author: 'ai',
    });
    const updated = await getEffectiveLesson(gc, lp, { objectives: master.objectives, outline: master.outline });
    return reply.type('text/html').send(renderAdaptation(gc, lp, updated, 'adapted ✓ — review and edit below; the change log records it'));
  });

  // 5.5b: AI proposes folding a group's adaptation back into the MASTER. Nothing is written until
  // the teacher applies the proposal.
  app.post('/lesson/adapt/:gc/:lp/improve-master', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const p = AdaptParams.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const { gc, lp } = p.data;
    const [master, adaptation, info, history] = await Promise.all([
      getLessonPlan(lp),
      getAdaptation(gc, lp),
      getGroupCourseInfo(gc),
      recentGroupHistory(gc),
    ]);
    if (!master || !info) return reply.code(404).send('');
    if (!adaptation) return reply.type('text/html').send('<p class="muted">Adapt the lesson for this group first — then there\'s something to fold back.</p>');

    const result = await callLLMStructured(
      {
        feature: 'improve_master',
        model: await modelFor('plan'),
        promptVersion: IMPROVE_MASTER_VERSION,
        system: IMPROVE_MASTER_SYSTEM,
        context: [
          // The MASTER serves every class, so only the course-level context applies here — the
          // class-specific text would pull the canonical lesson towards one group.
          ...groupContextItems(await getCourseTeachingContext(info.courseId), null),
          ...equipmentItem(await listActiveEquipment()),
          ...masterPairItems(master.title, master, adaptation),
          ...historyItems(history),
        ],
        instruction: IMPROVE_MASTER_INSTRUCTION,
        maxTokens: 4000,
      },
      improveMasterSchema,
    );
    if (result.status !== 'ok' || !result.data) {
      return reply.type('text/html').send(`<p class="muted">${esc(result.message ?? 'AI unavailable — nothing proposed.')}</p>`);
    }
    const d = result.data;
    return reply.type('text/html').send(`
      <div class="improve-prop">
        <p class="adapt-note">${esc(d.rationale)}</p>
        <label class="adapt-l">Proposed master objectives<textarea rows="3" readonly>${esc(d.objectives)}</textarea></label>
        <label class="adapt-l">Proposed master outline<textarea rows="5" readonly>${esc(d.outline)}</textarea></label>
        <form hx-post="/lesson/plan/${lp}/apply-improvement" hx-target="closest .improve-prop" hx-swap="outerHTML">
          <textarea name="objectives" hidden>${esc(d.objectives)}</textarea>
          <textarea name="outline" hidden>${esc(d.outline)}</textarea>
          <button type="submit" class="btn-secondary">⬆ Apply to master</button>
          <button type="button" class="link" onclick="this.closest('.improve-prop').remove()">✕ discard</button>
        </form>
      </div>`);
  });

  // Apply an accepted master improvement (teacher decision; the master changes for every group).
  app.post('/lesson/plan/:id/apply-improvement', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ objectives: z.string().max(8000), outline: z.string().max(8000) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    await updatePlanField(p.data.id, 'objectives', b.data.objectives.trim() || null);
    await updatePlanField(p.data.id, 'outline', b.data.outline.trim() || null);
    return reply
      .type('text/html')
      .send('<p class="adapt-note">Master updated ✓ — every group now starts from this version (this group\'s adaptation still applies here). <a href="/schemes">View on Schemes →</a></p>');
  });
}
