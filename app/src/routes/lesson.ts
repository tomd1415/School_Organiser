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
  setOccurrenceProgress,
} from '../repos/occurrence';
import { getLessonPlan, listCoursePlans, updatePlanField } from '../repos/schemes';
import {
  addVersion,
  createResource,
  getCurrentVersion,
  linkResourceToAdaptation,
  listResourcesForAdaptation,
  listResourcesForPlan,
  listVersions,
  type LinkedResource,
} from '../repos/resources';
import { checksum, readStored, relPathFor, storeBuffer } from '../lib/resourceStore';
import { safeFilename } from '../services/resource';
import { lessonResourcesSchema, tidyResourceSet } from '../llm/schemas/lessonResources';
import { ADAPT_RESOURCES_SYSTEM, ADAPT_RESOURCES_VERSION, adaptResourceItems, adaptResourcesInstruction } from '../llm/prompts/adaptResources';
import {
  getAdaptation,
  getEffectiveLesson,
  getGroupAbility,
  getGroupCourseInfo,
  getGroupTeachingContext,
  getGuidedAccess,
  setGuidedAccess,
  setGroupAbility,
  listAdaptationHistory,
  recentGroupHistory,
  resetAdaptation,
  setGroupTeachingContext,
  upsertAdaptation,
  type EffectiveLesson,
} from '../repos/adaptations';
import { getCourseTeachingContext } from '../repos/schemes';
import { abilityItem, groupContextItems } from '../llm/prompts/teachingContext';
import { standingPrefItems } from '../services/standingPrefs';
import { conceptItemsFor } from '../services/teachingConcepts';
import { accessItemsFor } from '../services/accessConstraints';
import type { GuidedAccess } from '../llm/prompts/accessConstraints';
import { callLLMStructured } from '../llm/client';
import { modelForFeature } from '../repos/settings';
import { adaptLessonSchema } from '../llm/schemas/adaptLesson';
import { ADAPT_LESSON_SYSTEM, ADAPT_LESSON_VERSION, adaptLessonInstruction, historyItems, lessonItem } from '../llm/prompts/adaptLesson';
import { recentClassMisses } from '../services/marking';
import { marksEnabled } from '../auth/marksGate';
import { retrievalStarterSchema } from '../llm/schemas/retrievalStarter';
import { RETRIEVAL_STARTER_SYSTEM, RETRIEVAL_STARTER_VERSION, RETRIEVAL_STARTER_INSTRUCTION, missesItem } from '../llm/prompts/retrievalStarter';
import { improveMasterSchema } from '../llm/schemas/improveMaster';
import { IMPROVE_MASTER_INSTRUCTION, IMPROVE_MASTER_SYSTEM, IMPROVE_MASTER_VERSION, masterPairItems } from '../llm/prompts/improveMaster';
import { listActiveEquipment } from '../repos/equipment';
import { equipmentItem } from '../llm/prompts/equipment';
import { getFollowupsForOccurrence } from '../repos/notes';
import { buildLessonDetail, type CourseSection, type LessonDetail } from '../services/occurrence';
import { renderLinkedResources } from '../lib/resourceView';
import { renderNewNoteButton, renderNotesList, renderSavedStatus, type FollowupItem, type NoteItem } from '../lib/notesView';
import { listOccurrencePrep, type PrepItem } from '../repos/prep';
import { listTaFeedback, type TaFeedbackRow } from '../repos/taFeedback';
import { addException, deleteException, listExceptionsFor, type ExceptionRow } from '../repos/exceptions';
import { listRooms, listStaff } from '../repos/setup';
import { renderPrepList, renderPrepAdd } from '../lib/prepView';
import { getTimetabledLessons, getPeriodDefinitions } from '../repos/timetable';
import { localParts, weekdayOf } from '../lib/time';
import { formatObjectives, formatOutline, outlineSteps } from '../lib/formatLesson';

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
  const detail =
    `${objectives ? `<div class="oc-block"><span class="oc-label">Objectives</span>${formatObjectives(objectives)}</div>` : ''}` +
    `${outline ? `<div class="oc-block"><span class="oc-label">Outline</span>${formatOutline(outline)}</div>` : ''}`;
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

function adaptView(gc: number, lp: number, eff: EffectiveLesson, oob = false): string {
  const inner = eff.adapted
    ? `${eff.objectives ? `<div class="oc-block"><span class="oc-label">Objectives — this group</span>${formatObjectives(eff.objectives)}</div>` : ''}` +
      `${eff.outline ? `<div class="oc-block"><span class="oc-label">Outline — this group</span>${formatOutline(eff.outline)}</div>` : ''}`
    : '';
  return `<div class="adapt-view" id="adapt-${gc}-${lp}-view"${oob ? ' hx-swap-oob="true"' : ''}>${inner}</div>`;
}

function renderAdaptation(gc: number, lp: number, eff: EffectiveLesson, msg?: string): string {
  return `<div class="adapt" id="adapt-${gc}-${lp}">
      ${adaptMeta(gc, lp, eff.adapted)}
      ${eff.adaptationNote ? `<p class="adapt-note">${esc(eff.adaptationNote)}</p>` : ''}
      ${msg ? `<p class="muted">${esc(msg)}</p>` : ''}
      ${adaptView(gc, lp, eff)}
      <details class="adapt-edit"${eff.adapted ? '' : ' open'}>
        <summary>✏ ${eff.adapted ? "edit this group's version" : 'adapt it for this group'}</summary>
        <form hx-post="/lesson/adapt/${gc}/${lp}" hx-trigger="input changed delay:1200ms from:textarea, blur from:textarea" hx-swap="none">
          <label class="adapt-l">Objectives — for this group<textarea name="objectives" rows="2" placeholder="(inherits the master)">${esc(eff.objectives ?? '')}</textarea></label>
          <label class="adapt-l">Outline — for this group<textarea name="outline" rows="3" placeholder="(inherits the master)">${esc(eff.outline ?? '')}</textarea></label>
        </form>
      </details>
      <button type="button" class="link fu-ai" hx-post="/lesson/adapt/${gc}/${lp}/ai" hx-target="#adapt-${gc}-${lp}" hx-swap="outerHTML" hx-disabled-elt="this">✨ Adapt from recent lessons (AI)</button>
      <button type="button" class="link fu-ai" title="3 quick recall questions re-testing what this class got wrong recently (AI)" hx-post="/lesson/gc/${gc}/retrieval-starter" hx-target="#starter-${gc}-${lp}" hx-swap="innerHTML" hx-disabled-elt="this">🔁 Retrieval starter (AI)</button>
      <div id="starter-${gc}-${lp}"></div>
      ${eff.adapted ? `<button type="button" class="link fu-ai" hx-post="/lesson/adapt/${gc}/${lp}/improve-master" hx-target="#adapt-${gc}-${lp}-proposal" hx-swap="innerHTML" hx-disabled-elt="this">⬆ Suggest master improvement (AI)</button>
      <button type="button" class="link fu-ai" title="re-make the lesson's documents for this class from the master sheets + this adapted version; re-running updates them"
        hx-post="/lesson/adapt/${gc}/${lp}/resources-ai" hx-target="#adapt-res-${gc}-${lp}" hx-swap="innerHTML" hx-disabled-elt="this">📄 Adapt resources for this class (AI)</button>
      <span id="adapt-res-${gc}-${lp}"></span>` : ''}
      <div id="adapt-${gc}-${lp}-proposal"></div>
      <details class="adapt-log" id="adapt-${gc}-${lp}-log">
        <summary>change log</summary>
        <div hx-get="/lesson/adapt/${gc}/${lp}/history" hx-trigger="toggle from:#adapt-${gc}-${lp}-log once" hx-target="this" hx-swap="innerHTML"><span class="muted">…</span></div>
      </details>
    </div>`;
}


// The in-lesson marker: the effective outline's steps as a clickable list — tap a step to mark
// "we are here". The click also writes the textual stopping point, so "last time → resume" and
// the AI feedback loop keep working off the same record.
function renderTracker(oc: number, steps: string[], progress: number | null): string {
  if (!steps.length) return '';
  const rows = steps
    .map((label, i) => {
      const state = progress == null ? '' : i < progress ? ' trk-done' : i === progress ? ' trk-now' : '';
      return `<li class="trk-step${state}">
        <button type="button" hx-post="/occurrence-course/${oc}/progress" hx-vals='${JSON.stringify({ step: i, label: `step ${i + 1} — ${label.slice(0, 150)}` }).replace(/'/g, '&#39;')}'
          hx-target="#trk-${oc}" hx-swap="outerHTML" title="mark: we are here">
          <span class="trk-marker">${progress != null && i === progress ? '▶' : progress != null && i < progress ? '✓' : i + 1}</span>
          <span class="trk-label">${esc(label)}</span>
        </button>
      </li>`;
    })
    .join('');
  return `<div class="trk" id="trk-${oc}">
    <span class="oc-label">Lesson tracker — tap where you are</span>
    <ol class="trk-list">${rows}</ol>
  </div>`;
}

function renderTaFeedback(rows: TaFeedbackRow[]): string {
  if (!rows.length) return '';
  const items = rows
    .map(
      (f) => `<li${f.safeguarding ? ' class="sg"' : ''}>${f.safeguarding ? '🛡 <strong>safeguarding flag</strong> · ' : ''}<span class="muted">${esc(f.createdAt)}</span>
        ${f.pupilsText ? `<div><strong>Pupils:</strong> ${esc(f.pupilsText)}</div>` : ''}
        ${f.lessonText ? `<div><strong>Lesson:</strong> ${esc(f.lessonText)}</div>` : ''}</li>`,
    )
    .join('');
  return `<div class="oc-block ta-fb-teacher"><span class="oc-label">TA feedback</span><ul class="ta-fb-list">${items}</ul></div>`;
}

function renderSection(
  s: CourseSection,
  plans: Array<{ id: number; title: string }>,
  resources: LinkedResource[],
  adaptedRes: LinkedResource[],
  taFb: TaFeedbackRow[],
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
      ${renderTracker(oc, outlineSteps((eff?.adapted ? eff.outline : null) ?? s.planOutline), s.progressStep)}
      ${s.lessonPlanId != null && eff ? renderAdaptation(s.groupCourseId, s.lessonPlanId, eff) : ''}
      <div class="ld-res"><span class="ld-res-label">Resources</span> ${renderLinkedResources(resources)}
        ${adaptedRes.length ? `<span class="ld-res-label adapt-badge on">✏ this class</span> ${renderLinkedResources(adaptedRes)}` : ''}
        ${s.lessonPlanId != null ? `<button type="button" class="link" title="slides + worksheet + support + answers for this lesson (AI); re-running updates them" hx-post="/schemes/plan/${s.lessonPlanId}/resources-ai?from=lesson" hx-swap="innerHTML" hx-target="#res-gen-${oc}" hx-disabled-elt="this">📄 generate/update (AI)</button><span id="res-gen-${oc}"></span>` : ''}
      </div>
      ${last}
      <label class="stop-label">Stopping point
        <input class="stop-input" name="stopping_point" value="${esc(s.stoppingPoint ?? '')}" placeholder="where we got to…"
          hx-post="/occurrence-course/${oc}/stopping" hx-trigger="input changed delay:800ms, blur" hx-swap="none">
        <span class="note-status" id="oc-${oc}-status"></span>
      </label>
      ${renderTaFeedback(taFb)}
      <div class="pupil-work-panel" hx-get="/lesson/oc/${oc}/pupil-work" hx-trigger="load" hx-swap="innerHTML"></div>
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

const EX_LABEL: Record<string, string> = { cancelled: 'Cancelled', room_change: 'Room change', cover: 'Cover', off_timetable: 'Off-timetable day' };

function renderExceptions(ex: ExceptionRow[], lessonId: number, date: string, rooms: Array<{ id: number; name: string }>, staff: Array<{ id: number; name: string }>): string {
  const banners = ex
    .map(
      (e) => `<p class="ex-banner ex-${e.kind}">⚠ <strong>${EX_LABEL[e.kind] ?? e.kind}</strong>${e.roomName ? ` → ${esc(e.roomName)}` : ''}${e.staffName ? ` (cover: ${esc(e.staffName)})` : ''}${e.note ? ` — ${esc(e.note)}` : ''}${e.timetabledLessonId == null ? ' <span class="muted">(whole day)</span>' : ''}
        <button type="button" class="link danger" hx-post="/lesson/exception/${e.id}/delete" hx-confirm="Remove this exception?" hx-target="closest .ex-banner" hx-swap="outerHTML">✕</button></p>`,
    )
    .join('');
  const roomOpts = rooms.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('');
  const staffOpts = staff.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('');
  return `${banners}
    <details class="ex-add"><summary>⚠ report an exception for this date</summary>
      <form class="setup-add" hx-post="/lesson/exception" hx-vals='{"lesson":"${lessonId}","date":"${esc(date)}"}' hx-target="closest .ex-add" hx-swap="outerHTML">
        <select name="kind">
          <option value="cancelled">cancelled</option>
          <option value="room_change">room change</option>
          <option value="cover">cover</option>
          <option value="off_timetable">off-timetable day (whole day)</option>
        </select>
        <select name="room"><option value="">room…</option>${roomOpts}</select>
        <select name="staff"><option value="">cover by…</option>${staffOpts}</select>
        <input name="note" placeholder="note… (trip, exams, snow)" maxlength="200">
        <button type="submit" class="btn-secondary">add</button>
      </form>
    </details>`;
}

function renderDetail(
  detail: LessonDetail,
  notes: NoteItem[],
  prep: PrepItem[],
  plansByCourse: Map<number, Array<{ id: number; title: string }>>,
  resByPlan: Map<number, LinkedResource[]>,
  effByKey: Map<string, EffectiveLesson>,
  adaptedResByKey: Map<string, LinkedResource[]>,
  taFbByOc: Map<number, TaFeedbackRow[]>,
  exceptionsHtml: string,
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
              adaptedResByKey.get(`${s.groupCourseId}:${s.lessonPlanId}`) ?? [],
              taFbByOc.get(s.occurrenceCourseId) ?? [],
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
      <p class="ld-meta">${meta} · <a class="link" href="/lesson/print?lesson=${h.lessonId}&date=${esc(h.date)}" target="_blank" rel="noopener">🖨 print plan</a> · <a class="link" href="/today/print?date=${esc(h.date)}" target="_blank" rel="noopener">🖨 today / cover</a></p>
      <div class="act-timer" data-timer>
        <span class="act-timer-display" data-timer-display>—:—</span>
        <button type="button" class="link" data-timer-set="5">5m</button>
        <button type="button" class="link" data-timer-set="10">10m</button>
        <button type="button" class="link" data-timer-set="15">15m</button>
        <button type="button" class="link" data-timer-stop>stop</button>
        <button type="button" class="link" data-timer-full title="show big on the board">⛶</button>
      </div>
      ${exceptionsHtml}
      ${sections}
      <section class="ld-notesblock"><h2>Before the bell</h2>${renderPrepList(prep, '/prep', 'prep', `prep-${detail.header.occurrenceId}`)}${renderPrepAdd('/prep/add', { occurrence: detail.header.occurrenceId }, `prep-${detail.header.occurrenceId}`)}</section>
      <section class="ld-notesblock">
        <div class="ld-notes-head"><h2>Notes</h2>${renderNewNoteButton(listId, { kind: 'lesson', occurrence: h.occurrenceId })}</div>
        ${renderNotesList(listId, notes)}
      </section>
      <p><a href="/timetable">← Timetable</a></p>
    </section>`;
}


// Per-class adapted resources: re-make the lesson's documents for ONE class, from the master
// documents + the class's adapted lesson. Stored in the resource store, linked to the ADAPTATION
// (reset-to-master unlinks them; the files stay). Re-running version-bumps, never duplicates.
const ADAPT_RES_LABEL: Record<string, string> = { slides: 'slides', worksheet: 'worksheet', support: 'support worksheet', answers: 'answers' };

async function generateAdaptedResources(gc: number, lp: number): Promise<{ ok: boolean; message: string }> {
  const [adaptation, master, info] = await Promise.all([getAdaptation(gc, lp), getLessonPlan(lp), getGroupCourseInfo(gc)]);
  if (!master || !info) return { ok: false, message: 'Lesson not found.' };
  if (!adaptation) return { ok: false, message: "Adapt the lesson for this class first — class copies are made from the class's version." };
  const eff = await getEffectiveLesson(gc, lp, { objectives: master.objectives, outline: master.outline });

  // The master documents (Markdown only), so the AI adapts the real sheets rather than guessing.
  const masterDocs: Array<{ title: string; content: string }> = [];
  for (const r of (await listResourcesForPlan(lp)).filter((x) => x.title.endsWith('.md')).slice(0, 4)) {
    try {
      const v = await getCurrentVersion(r.resourceId);
      if (v) masterDocs.push({ title: r.title, content: (await readStored(v.storagePath)).toString('utf8') });
    } catch {
      // a missing file shouldn't block adaptation — the prompt creates the doc from the outline
    }
  }

  const standing = await standingPrefItems();
  const concepts = await conceptItemsFor(info.courseId);
  const access = await accessItemsFor(gc);
  const modelChoice = await modelForFeature('adapt_resources', 'plan');
  const courseCtx = await getCourseTeachingContext(info.courseId);
  const groupCtx = await getGroupTeachingContext(gc);
  const ability = await getGroupAbility(gc);
  const equipment = await listActiveEquipment();
  const callOnce = () =>
    callLLMStructured(
      {
        feature: 'adapt_resources',
        model: modelChoice,
        promptVersion: ADAPT_RESOURCES_VERSION,
        system: ADAPT_RESOURCES_SYSTEM,
        context: [
          ...standing,
          ...concepts,
          ...access,
          ...groupContextItems(courseCtx, groupCtx),
          ...abilityItem(ability),
          ...equipmentItem(equipment),
          ...adaptResourceItems(
            { planTitle: master.title, courseName: info.courseName, groupName: info.groupName, objectives: eff.objectives, outline: eff.outline, adaptationNote: eff.adaptationNote },
            masterDocs,
          ),
        ],
        instruction: adaptResourcesInstruction(info.groupName),
        maxTokens: 16000,
      },
      lessonResourcesSchema,
    );
  let result = await callOnce();
  if (result.status !== 'ok' || !result.data) return { ok: false, message: result.message ?? 'AI unavailable — nothing generated.' };
  let tidy = tidyResourceSet(result.data.resources);
  if (tidy.missing.length) {
    const second = await callOnce();
    if (second.status === 'ok' && second.data) {
      const retry = tidyResourceSet(second.data.resources);
      if (retry.missing.length < tidy.missing.length) tidy = retry;
    }
  }
  if (tidy.missing.length) {
    return { ok: false, message: `The AI returned an incomplete set (missing: ${tidy.missing.join(', ')}) — try again.` };
  }

  const existing = await listResourcesForAdaptation(adaptation.id);
  let created = 0;
  let updated = 0;
  for (const r of tidy.docs) {
    const kind = r.kind;
    const filename = `${safeFilename(master.title).replace(/\.md$/i, '') || 'lesson'} — ${ADAPT_RES_LABEL[kind] ?? kind} (${safeFilename(info.groupName ?? 'class')}).md`;
    const buf = Buffer.from(r.content, 'utf8');
    const match = existing.find((e) => e.title === filename);
    if (match) {
      const vNo = (await listVersions(match.resourceId)).length + 1;
      const rel = relPathFor(match.resourceId, vNo, filename);
      await storeBuffer(rel, buf);
      await addVersion(match.resourceId, rel, buf.length, checksum(buf), 'ai', 'AI-adapted for class (regenerated)');
      updated++;
    } else {
      const id = await createResource(filename, kind === 'slides' ? 'slides' : kind === 'answers' || kind === 'document' ? 'document' : 'worksheet', 'text/markdown', 'ai_generated');
      const rel = relPathFor(id, 1, filename);
      await storeBuffer(rel, buf);
      await addVersion(id, rel, buf.length, checksum(buf), 'ai', 'AI-adapted for class');
      await linkResourceToAdaptation(id, adaptation.id);
      created++;
    }
  }
  return { ok: true, message: `class copies ready ✓ — ${created} new, ${updated} updated` };
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
      const adaptedResByKey = new Map<string, LinkedResource[]>();
      await Promise.all(
        detail.sections
          .filter((s) => s.lessonPlanId != null)
          .map(async (s) => {
            const eff = await getEffectiveLesson(s.groupCourseId, s.lessonPlanId as number, {
              objectives: s.planObjectives,
              outline: s.planOutline,
            });
            effByKey.set(`${s.groupCourseId}:${s.lessonPlanId}`, eff);
            if (eff.adaptationId != null) {
              adaptedResByKey.set(`${s.groupCourseId}:${s.lessonPlanId}`, await listResourcesForAdaptation(eff.adaptationId));
            }
          }),
      );

      const taFbByOc = new Map<number, TaFeedbackRow[]>();
      await Promise.all(detail.sections.map(async (s) => taFbByOc.set(s.occurrenceCourseId, await listTaFeedback(s.occurrenceCourseId))));
      const [exRows, exRooms, exStaff] = await Promise.all([listExceptionsFor(date, lesson), listRooms(), listStaff()]);
      const exceptionsHtml = renderExceptions(exRows, lesson, date, exRooms.filter((r) => r.active), exStaff.filter((x) => x.active && !x.isSelf));

      const csrf = reply.generateCsrf();
      const title = header.groupName ?? purposeLabel(header.purpose);
      return reply
        .type('text/html')
        .send(layout({ title, body: renderDetail(detail, noteItems, prep, plansByCourse, resByPlan, effByKey, adaptedResByKey, taFbByOc, exceptionsHtml, csrf), authed: true, csrfToken: csrf }));
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
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


  // The movable in-lesson marker: store the step index + write the textual stopping point.
  app.post('/occurrence-course/:id/progress', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const params = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
    const body = z.object({ step: z.coerce.number().int().min(0).max(200), label: z.string().max(200) }).safeParse(req.body);
    if (!params.success || !body.success) return reply.code(400).send('');
    await setOccurrenceProgress(params.data.id, body.data.step, body.data.label);
    const ocs = await getOccurrenceCourses(
      (await poolOccurrenceOf(params.data.id)) ?? 0,
    );
    const sec = ocs.find((o) => Number(o.occurrenceCourseId) === params.data.id);
    const effOutline = sec?.lessonPlanId != null
      ? (await getEffectiveLesson(sec.groupCourseId, sec.lessonPlanId, { objectives: sec.planObjectives ?? null, outline: sec.planOutline ?? null }))
      : null;
    const steps = outlineSteps((effOutline?.adapted ? effOutline.outline : null) ?? sec?.planOutline ?? null);
    return reply
      .type('text/html')
      .send(renderTracker(params.data.id, steps, body.data.step) + renderSavedStatus(`oc-${params.data.id}-status`));
  });

  async function poolOccurrenceOf(occurrenceCourseId: number): Promise<number | null> {
    const { pool } = await import('../db/pool');
    const { rows } = await pool.query<{ o: number }>(`SELECT occurrence_id AS o FROM occurrence_courses WHERE id = $1`, [occurrenceCourseId]);
    return rows[0]?.o ?? null;
  }

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
    // Flip the badge + refresh the formatted view (both OOB) without re-rendering the textareas.
    const master = await getLessonPlan(p.data.lp);
    const eff = await getEffectiveLesson(p.data.gc, p.data.lp, { objectives: master?.objectives ?? null, outline: master?.outline ?? null });
    return reply
      .type('text/html')
      .send(adaptMeta(p.data.gc, p.data.lp, true, true) + adaptView(p.data.gc, p.data.lp, eff, true) + renderSavedStatus(`adapt-${p.data.gc}-${p.data.lp}-status`));
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
    const [text, ability, guided] = await Promise.all([getGroupTeachingContext(p.data.gc), getGroupAbility(p.data.gc), getGuidedAccess(p.data.gc)]);
    const ga = guided ?? {};
    const ck = (v: unknown): string => (v ? ' checked' : '');
    return reply.type('text/html').send(`
      <p class="muted group-ctx-hint">Adds to the course context when adapting for this class. Describe the class as a whole — never an individual pupil.</p>
      <textarea name="text" rows="3" placeholder="e.g. this class needs shorter tasks and a movement break mid-lesson…"
        hx-post="/lesson/group-context/${p.data.gc}" hx-trigger="input changed delay:1000ms, blur" hx-swap="none">${esc(text ?? '')}</textarea>
      <label class="adapt-l">Ability midpoint — Core work pitches here (Support below, Challenge above)
        <input name="text" value="${esc(ability ?? '')}" placeholder="e.g. working at Entry Level 3 / emerging GCSE grade 2"
          hx-post="/lesson/group-ability/${p.data.gc}" hx-trigger="input changed delay:1000ms, blur" hx-swap="none">
      </label>
      <details class="guided-access">
        <summary>access needs (optional — shapes generated lessons &amp; resources for this class)</summary>
        <form class="guided-access-form" hx-post="/lesson/group-access/${p.data.gc}" hx-trigger="change" hx-swap="none">
          <label class="adapt-l">Minimum font size (pt)
            <input type="number" name="viFont" min="10" max="48" value="${ga.viFont ?? ''}" placeholder="e.g. 18"></label>
          <label><input type="checkbox" name="shortAttention"${ck(ga.shortAttention)}> very short attention spans — shorter, chunked tasks</label>
          <label><input type="checkbox" name="eal"${ck(ga.eal)}> EAL learners — define key terms, avoid idioms</label>
          <label><input type="checkbox" name="dyslexiaFriendly"${ck(ga.dyslexiaFriendly)}> dyslexia-friendly layout</label>
          <label><input type="checkbox" name="lowTyping"${ck(ga.lowTyping)}> limited typing fluency — prefer click / drag / multiple-choice</label>
          <label class="adapt-l">Target reading age
            <input name="readingAge" maxlength="40" value="${esc(ga.readingAge ?? '')}" placeholder="e.g. 8"></label>
          <span class="note-status" id="group-access-${p.data.gc}-status"></span>
        </form>
      </details>
      <span class="note-status" id="group-ctx-${p.data.gc}-status"></span>`);
  });

  app.post('/lesson/group-ability/:gc', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const p = z.object({ gc: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ text: z.string().max(300) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    await setGroupAbility(p.data.gc, b.data.text);
    return reply.type('text/html').send(renderSavedStatus(`group-ctx-${p.data.gc}-status`));
  });

  app.post('/lesson/group-context/:gc', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const p = z.object({ gc: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ text: z.string().max(4000) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    await setGroupTeachingContext(p.data.gc, b.data.text);
    return reply.type('text/html').send(renderSavedStatus(`group-ctx-${p.data.gc}-status`));
  });

  // idea 7 — save the per-class guided-access questionnaire. Fields are parsed as strings (unchecked
  // boxes simply don't submit); only set values are stored, so clearing a field removes it.
  app.post('/lesson/group-access/:gc', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const p = z.object({ gc: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z
      .object({
        viFont: z.string().max(6).optional(),
        shortAttention: z.string().optional(),
        eal: z.string().optional(),
        dyslexiaFriendly: z.string().optional(),
        lowTyping: z.string().optional(),
        readingAge: z.string().max(40).optional(),
      })
      .safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    const a: GuidedAccess = {};
    const font = b.data.viFont && b.data.viFont.trim() !== '' ? Number(b.data.viFont) : NaN;
    if (Number.isFinite(font) && font >= 8 && font <= 72) a.viFont = Math.round(font);
    if (b.data.shortAttention) a.shortAttention = true;
    if (b.data.eal) a.eal = true;
    if (b.data.dyslexiaFriendly) a.dyslexiaFriendly = true;
    if (b.data.lowTyping) a.lowTyping = true;
    if (b.data.readingAge && b.data.readingAge.trim()) a.readingAge = b.data.readingAge.trim();
    await setGuidedAccess(p.data.gc, a);
    return reply.type('text/html').send(renderSavedStatus(`group-access-${p.data.gc}-status`));
  });

  // 5.5: the feedback loop — AI adapts this lesson for THIS group from its recent lessons
  // (stopping points + notes). Inputs go through the one wrapper: names redacted, safeguarding-
  // flagged notes withheld entirely, call audited. The master is never touched.
  // 10.15 — retrieval-practice starter: 3 quick recall questions re-testing what this class got
  // wrong recently. Cohort-level misses only (no pupil identity); gated by marking being on.
  app.post('/lesson/gc/:gc/retrieval-starter', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const p = z.object({ gc: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    if (!(await marksEnabled())) return reply.type('text/html').send('<p class="muted">Auto-marking is off — no marked work to build a starter from yet.</p>');
    const info = await getGroupCourseInfo(p.data.gc);
    if (!info) return reply.code(404).send('');
    const misses = await recentClassMisses(p.data.gc);
    if (misses.length === 0) return reply.type('text/html').send('<p class="muted">Not enough recently-marked work to build a starter yet — mark a lesson or two first.</p>');
    const result = await callLLMStructured(
      {
        feature: 'retrieval_starter',
        model: await modelForFeature('retrieval_starter', 'cheap'),
        promptVersion: RETRIEVAL_STARTER_VERSION,
        system: RETRIEVAL_STARTER_SYSTEM,
        context: [missesItem(misses)],
        instruction: RETRIEVAL_STARTER_INSTRUCTION,
        maxTokens: 800,
      },
      retrievalStarterSchema,
    );
    if (result.status !== 'ok' || !result.data) {
      return reply.type('text/html').send(`<p class="error">${esc(result.message ?? 'AI unavailable right now.')}</p>`);
    }
    const items = result.data.questions
      .map((q, i) => `<li><strong>${i + 1}. ${esc(q.question)}</strong><br><span class="muted">answer: ${esc(q.answer)}</span></li>`)
      .join('');
    return reply.type('text/html').send(`<div class="retrieval-starter"><p class="adapt-note">🔁 Starter — recall what this class found hard recently:</p><ol class="starter-list">${items}</ol></div>`);
  });

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

    // 10.15: make adapt misconception-aware — fold in what this class recently got wrong (anonymous).
    const misses = (await marksEnabled()) ? await recentClassMisses(gc) : [];

    const result = await callLLMStructured(
      {
        feature: 'adapt_lesson',
        model: await modelForFeature('adapt_lesson', 'plan'),
        promptVersion: ADAPT_LESSON_VERSION,
        system: ADAPT_LESSON_SYSTEM,
        context: [
          ...(await standingPrefItems()),
          ...(await conceptItemsFor(info.courseId)),
          ...(await accessItemsFor(gc)),
          ...groupContextItems(await getCourseTeachingContext(info.courseId), await getGroupTeachingContext(gc)),
          ...abilityItem(await getGroupAbility(gc)),
          ...equipmentItem(await listActiveEquipment()),
          lessonItem(master.title, eff.objectives, eff.outline, eff.adapted),
          ...historyItems(history),
          ...(misses.length ? [missesItem(misses)] : []),
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


  // Per-class adapted resources: re-make the documents for THIS class from the masters + the
  // class's adapted lesson. Success refreshes the page (the ✏ list appears in Resources).
  app.post('/lesson/adapt/:gc/:lp/resources-ai', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const p = AdaptParams.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const res = await generateAdaptedResources(p.data.gc, p.data.lp);
    if (res.ok) {
      reply.header('HX-Refresh', 'true');
      return reply.send('');
    }
    return reply.type('text/html').send(`<span class="muted">${esc(res.message)}</span>`);
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
        model: await modelForFeature('improve_master', 'plan'),
        promptVersion: IMPROVE_MASTER_VERSION,
        system: IMPROVE_MASTER_SYSTEM,
        context: [
          ...(await standingPrefItems()),
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

  // 6.7: dated exceptions (cancelled / room change / cover / off-timetable day)
  app.post('/lesson/exception', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const b = z
      .object({
        lesson: z.coerce.number().int().positive(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        kind: z.enum(['cancelled', 'room_change', 'cover', 'off_timetable']),
        room: z.string().optional(),
        staff: z.string().optional(),
        note: z.string().max(200).optional(),
      })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    await addException({
      date: b.data.date,
      timetabledLessonId: b.data.kind === 'off_timetable' ? null : b.data.lesson,
      kind: b.data.kind,
      roomId: b.data.room ? Number(b.data.room) : null,
      staffId: b.data.staff ? Number(b.data.staff) : null,
      note: b.data.note?.trim() || null,
    });
    reply.header('HX-Refresh', 'true');
    return reply.send('');
  });

  app.post('/lesson/exception/:id/delete', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    await deleteException(p.data.id);
    return reply.send('');
  });

  // ── 10.23 Print packs: a clean printable plan for one lesson, and a one-page "today" briefing a
  // cover teacher can carry. Reuse the cards-page chrome + window.print().
  app.get('/lesson/print', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = Query.safeParse(req.query);
    if (!parsed.success) return reply.code(400).type('text/html').send('<p>Bad lesson reference.</p>');
    const block = await lessonPrintBlock(parsed.data.lesson, parsed.data.date);
    return reply.type('text/html').send(printPage('Lesson plan', block || '<p>No lesson here.</p>'));
  });

  app.get('/today/print', { preHandler: requireAuth }, async (req, reply) => {
    const q = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }).safeParse(req.query);
    const date = (q.success && q.data.date) || localParts(new Date(), 'Europe/London').isoDate;
    const weekday = weekdayOf(date);
    const [lessons, periods] = await Promise.all([getTimetabledLessons(), getPeriodDefinitions()]);
    const order = new Map(periods.map((p) => [`${p.weekday}:${p.slotOrder}`, p.slotOrder]));
    const todays = lessons
      .filter((l) => l.weekday === weekday && l.isSelf && (l.purpose === 'teaching' || l.purpose === 'form'))
      .sort((a, b) => (order.get(`${a.weekday}:${a.slotOrder}`) ?? 0) - (order.get(`${b.weekday}:${b.slotOrder}`) ?? 0));
    const blocks = (await Promise.all(todays.map((l) => lessonPrintBlock(l.lessonId, date)))).filter(Boolean);
    const body = blocks.length ? blocks.join('') : '<p>No lessons timetabled for this day.</p>';
    return reply.type('text/html').send(printPage(`Cover / briefing — ${date}`, body));
  });
}

/** A standalone printable page (cards-page chrome, like the answer pack). */
function printPage(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)} · School Organiser</title>
    <link rel="stylesheet" href="/static/styles.css"></head>
    <body class="cards-page"><div class="cards-toolbar"><button onclick="window.print()">🖨 Print</button> ${esc(title)}</div>
    <div class="lesson-print">${body}</div></body></html>`;
}

/** One lesson rendered for print: each course section's effective plan, resources and last stop. */
async function lessonPrintBlock(lessonId: number, date: string): Promise<string> {
  const occId = await findOrCreateOccurrence(lessonId, date);
  const header = await getOccurrenceHeader(occId);
  if (!header) return '';
  const [courses, lastStops] = await Promise.all([getOccurrenceCourses(occId), getLastStoppingPoints(lessonId, date)]);
  const detail = buildLessonDetail(header, courses, lastStops);
  const sections = await Promise.all(
    detail.sections.map(async (s) => {
      let obj = s.planObjectives;
      let out = s.planOutline;
      let res: LinkedResource[] = [];
      if (s.lessonPlanId != null) {
        const eff = await getEffectiveLesson(s.groupCourseId, s.lessonPlanId, { objectives: s.planObjectives, outline: s.planOutline });
        obj = eff.objectives;
        out = eff.outline;
        res = await listResourcesForPlan(s.lessonPlanId);
      }
      return `<section class="lp-sec">
        <h2>${esc(s.courseName)}${s.planTitle ? ` — ${esc(s.planTitle)}` : ''}</h2>
        ${obj ? `<h3>Objectives</h3><div class="lp-text">${esc(obj)}</div>` : ''}
        ${out ? `<h3>Outline</h3><div class="lp-text">${esc(out)}</div>` : ''}
        ${res.length ? `<h3>Resources</h3><ul>${res.map((r) => `<li>${esc(r.title)}</li>`).join('')}</ul>` : ''}
        ${s.lastStop ? `<p class="muted">Last time: ${esc(s.lastStop.stoppingPoint)} (${esc(s.lastStop.date)})</p>` : ''}
        ${s.lessonPlanId == null ? '<p class="muted">No plan bound to this lesson yet.</p>' : ''}
      </section>`;
    }),
  );
  const when = `${header.periodLabel} ${header.start}–${header.end}${header.roomName ? ` · ${header.roomName}` : ''}`;
  return `<article class="lp-lesson"><h1>${esc(header.groupName ?? purposeLabel(header.purpose))} <span class="lp-when">${esc(when)}</span></h1>${sections.join('')}</article>`;
}
