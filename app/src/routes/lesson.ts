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
import { getLessonPlan, getPlanRow, listCoursePlans, updatePlanField, getActiveScheme } from '../repos/schemes';
import type { PlanRow } from '../services/scheme';
import { schemeLessons } from '../repos/specPoints';
import { getOpenReviewForPlan } from '../repos/reviews';
import { ocClassAndDate, pastLessonsForClass } from '../repos/retrieval';
import { pickSpacedRecall } from '../services/retrieval';
import { coverPackSource } from '../repos/cover';
import { COVER_PACK_SYSTEM, COVER_PACK_INSTRUCTION, COVER_PACK_VERSION, coverPackItem } from '../llm/prompts/coverPack';
import { generateResourceSchema } from '../llm/schemas/generateResource';
import { getExperienceMode } from '../lib/nav';
import { adaptLessonForClass, adaptSchemeForClass, maybeAutoAdaptScheme } from '../services/adaptLesson';
import { runClassIntake, applyClassIntake } from '../services/classIntake';
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
import { lessonMaterialItems, examStyleItems } from '../llm/prompts/lessonResources';
import { lessonMaterialsForPlan, materialCandidatesForPlan, readUseMaterials } from '../services/lessonMaterials';
import { examProfileForCourse } from '../services/examProfile';
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
  getCoveredSummary,
  setCoveredSummary,
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
import { historyItems } from '../llm/prompts/adaptLesson';
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
import { renderWorksheet, findImagePlaceholders, type Level } from '../lib/worksheetForm';
import { getLessonWorksheet, getLessonSlidesMarkdown } from '../services/worksheet';
import { renderSlideDeck } from './me';
import { pupilLayout } from './pupilAuth';
import { saveLessonDocMarkdown } from '../services/lessonDocEdit';
import { renderNewNoteButton, renderNotesList, renderSavedStatus, type FollowupItem, type NoteItem } from '../lib/notesView';
import { listOccurrencePrep, addOccurrencePrep, type PrepItem } from '../repos/prep';
import { listTaFeedback, type TaFeedbackRow } from '../repos/taFeedback';
import { addException, deleteException, listExceptionsFor, listExceptionsBetween, type ExceptionRow } from '../repos/exceptions';
import { indexDayExceptions, exceptionForLesson, describeException } from '../services/exceptions';
import { classifyDay } from '../services/clock';
import { listRooms, listStaff } from '../repos/setup';
import { renderPrepList, renderPrepAdd } from '../lib/prepView';
import { getTimetabledLessons, getPeriodDefinitions, getTermDatesAll } from '../repos/timetable';
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

// Objectives + kit. The OUTLINE moved into the combined outline-tracker (renderOutlineTracker), so it
// isn't repeated here. When the class has its own adaptation this shows the EFFECTIVE plan, badged.
function renderPlanContent(ocId: number, title: string | null, objectives: string | null, oob = false, adapted = false, kitNeeded: string | null = null): string {
  const badge = adapted ? '<span class="adapt-badge on" title="This class has its own revised version — shown here and used when generating this class\'s resources">✏ this class’s revised plan</span> ' : '';
  const detail =
    `${objectives ? `<div class="oc-block"><span class="oc-label">Objectives</span>${formatObjectives(objectives)}</div>` : ''}` +
    `${kitNeeded ? `<div class="oc-block oc-kit"><span class="oc-label">🔧 Kit needed</span> ${esc(kitNeeded)}</div>` : ''}`;
  const inner = title ? badge + (detail || '<span class="muted">(plan has no detail yet)</span>') : '<span class="muted">No plan bound.</span>';
  return `<div id="oc-${ocId}-plan" class="oc-plan"${oob ? ' hx-swap-oob="true"' : ''}>${inner}</div>`;
}

// 13.2 — the Resources block (linked + adapted + generate), extracted so the plan-rebind route can
// re-render it in place (id `oc-<oc>-res`) without a full page refresh. `oob` swaps it by id.
function renderResourcesBlock(
  oc: number,
  s: { lessonPlanId: number | null; groupCourseId: number },
  adapted: boolean,
  resources: LinkedResource[],
  adaptedRes: LinkedResource[],
  materialTitles: string[],
  oob = false,
): string {
  const gen =
    s.lessonPlanId == null
      ? ''
      : adapted
        ? `${materialsConsent(materialTitles)}<button type="button" class="link" title="Generate slides/worksheet/support/answers from THIS CLASS'S revised plan, linked to this class (AI)" hx-post="/lesson/adapt/${s.groupCourseId}/${s.lessonPlanId}/resources-ai" hx-include="closest .ld-res" hx-swap="innerHTML" hx-target="#res-gen-${oc}" hx-disabled-elt="this">📄 generate for this class (AI)</button><span id="res-gen-${oc}"></span>`
        : `${materialsConsent(materialTitles)}<button type="button" class="link" title="slides + worksheet + support + answers from the master plan (AI); re-running updates them" hx-post="/schemes/plan/${s.lessonPlanId}/resources-ai?from=lesson" hx-include="closest .ld-res" hx-swap="innerHTML" hx-target="#res-gen-${oc}" hx-disabled-elt="this">📄 generate resources (AI)</button><span id="res-gen-${oc}"></span>`;
  return `<div class="ld-res" id="oc-${oc}-res"${oob ? ' hx-swap-oob="true"' : ''}><span class="ld-res-label">Resources</span> ${renderLinkedResources(resources)}
        ${adaptedRes.length ? `<span class="ld-res-label adapt-badge on">✏ this class</span> ${renderLinkedResources(adaptedRes)}` : ''}
        ${gen}
      </div>`;
}

// 13.3 — tri-state edit toggle on the lesson card: 👁 View (default, read-only) · ✏ This class
// (edits save as the class's ADAPTATION; master untouched) · ✏ Master (edits save to the master, for
// every class). Server-rendered (each toggle re-fetches fresh data via GET .../edit?mode=…), so an
// edit is reflected the moment you return to View. The tappable progress tracker shows ONLY in View
// (point 4: tapping is disabled while editing). When no plan is bound there's nothing to edit.
type EditMode = 'off' | 'local' | 'master';

function editToggle(oc: number, gc: number, lp: number, mode: EditMode): string {
  const btn = (m: EditMode, label: string): string =>
    `<button type="button" class="edit-tab${m === mode ? ' is-on' : ''}" aria-pressed="${m === mode}" hx-get="/occurrence-course/${oc}/edit?mode=${m}&gc=${gc}&lp=${lp}" hx-target="#oc-${oc}-edit" hx-swap="outerHTML">${label}</button>`;
  return `<div class="edit-toggle" role="group" aria-label="Edit mode">${btn('off', '👁 View')}${btn('local', '✏ This class')}${btn('master', '✏ Master')}</div>`;
}

interface EditSection {
  groupCourseId: number;
  lessonPlanId: number | null;
  planTitle: string | null;
  planObjectives: string | null;
  planOutline: string | null;
  planKitNeeded: string | null;
  progressStep?: number | null;
}

function renderLessonEdit(oc: number, s: EditSection, eff: EffectiveLesson | null, master: PlanRow | null, mode: EditMode, oob = false): string {
  const lp = s.lessonPlanId;
  const gc = s.groupCourseId;
  const toggle = lp != null ? editToggle(oc, gc, lp, mode) : '';
  let body: string;
  if (mode === 'local' && lp != null) {
    // edits save as THIS class's adaptation (autosave → /lesson/adapt). Inherits master where blank.
    body =
      `<p class="edit-banner edit-local">✏ Editing <strong>this class’s</strong> version — the master and other classes are unchanged.</p>` +
      `<form hx-post="/lesson/adapt/${gc}/${lp}" hx-trigger="input changed delay:1000ms from:textarea, blur from:textarea" hx-swap="none">
        <label class="adapt-l">Objectives — this class<textarea name="objectives" rows="3" placeholder="(inherits the master)">${esc(eff?.objectives ?? '')}</textarea></label>
        <label class="adapt-l">Outline — this class<textarea name="outline" rows="6" placeholder="(inherits the master)">${esc(eff?.outline ?? '')}</textarea></label>
        <span class="note-status" id="adapt-${gc}-${lp}-status"></span>
      </form>`;
  } else if (mode === 'master' && lp != null) {
    // edits save to the MASTER (autosave → /schemes/plan/:lp), affecting every class using this lesson.
    const save = (t: string): string => `hx-post="/schemes/plan/${lp}" hx-swap="none" hx-trigger="${t}"`;
    body =
      `<p class="edit-banner edit-master">✏ Editing the <strong>master</strong> — changes apply to <strong>every</strong> class using this lesson.</p>` +
      `<label>Objectives<textarea name="objectives" rows="3" ${save('input changed delay:1000ms, blur')}>${esc(master?.objectives ?? s.planObjectives ?? '')}</textarea></label>
      <label>Outline<textarea name="outline" rows="6" ${save('input changed delay:1000ms, blur')}>${esc(master?.outline ?? s.planOutline ?? '')}</textarea></label>
      <label>Duration (min) <input type="number" name="duration_min" min="0" value="${master?.durationMin ?? ''}" ${save('input changed delay:600ms, blur')}></label>
      <label>🔧 Kit needed <input type="text" name="kit_needed" value="${esc(master?.kitNeeded ?? s.planKitNeeded ?? '')}" placeholder="e.g. 16× micro:bit" ${save('input changed delay:600ms, blur')}></label>
      <span class="note-status" id="plan-${lp}-status"></span>`;
  } else {
    body =
      renderPlanContent(oc, s.planTitle, eff?.adapted ? eff.objectives : s.planObjectives, false, eff?.adapted ?? false, s.planKitNeeded) +
      renderOutlineTracker(oc, (eff?.adapted ? eff.outline : null) ?? s.planOutline, s.progressStep ?? null, false);
  }
  return `<div class="lesson-edit" id="oc-${oc}-edit" data-edit="${mode}"${oob ? ' hx-swap-oob="true"' : ''}>${toggle}${body}</div>`;
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

function renderAdaptation(gc: number, lp: number, eff: EffectiveLesson, msg?: string, toolsOpen: boolean = getExperienceMode() === 'power'): string {
  // Rail & Stage declutter: the status (whether this class has a revised version) + the read-only view
  // stay visible, but the EDITOR, AI tools and change log fold into one "Adapt & AI tools" disclosure —
  // closed by default for the everyday teacher (so a fresh lesson never looks unfinished), pre-opened
  // only when advanced tools are on. After an AI action that re-renders this block, the caller passes
  // toolsOpen=true so the disclosure doesn't snap shut and hide its own result + follow-up controls.
  return `<div class="adapt" id="adapt-${gc}-${lp}">
      ${adaptMeta(gc, lp, eff.adapted)}
      ${eff.adaptationNote ? `<p class="adapt-note">${esc(eff.adaptationNote)}</p>` : ''}
      ${msg ? `<p class="muted">${esc(msg)}</p>` : ''}
      ${adaptView(gc, lp, eff)}
      <details class="advanced ld-adapt-tools"${toolsOpen ? ' open' : ''}>
        <summary>🛠 Adapt &amp; AI tools</summary>
        <details class="adapt-edit">
          <summary>✏ ${eff.adapted ? "edit this group's version" : 'adapt it for this group'}</summary>
          <form hx-post="/lesson/adapt/${gc}/${lp}" hx-trigger="input changed delay:1200ms from:textarea, blur from:textarea" hx-swap="none">
            <label class="adapt-l">Objectives — for this group<textarea name="objectives" rows="2" placeholder="(inherits the master)">${esc(eff.objectives ?? '')}</textarea></label>
            <label class="adapt-l">Outline — for this group<textarea name="outline" rows="3" placeholder="(inherits the master)">${esc(eff.outline ?? '')}</textarea></label>
          </form>
        </details>
        <button type="button" class="link fu-ai" title="Re-pitch this lesson for this class from its teaching context, ability and access needs — and its recent lessons where there are any (AI)" hx-post="/lesson/adapt/${gc}/${lp}/ai" hx-target="#adapt-${gc}-${lp}" hx-swap="outerHTML" hx-disabled-elt="this">✨ Adapt for this class (AI)</button>
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
      </details>
    </div>`;
}


// 13.2 (point 4) — the OUTLINE and the "tap where you are" tracker are ONE component: the outline's
// steps are the clickable progress list (tap a step to mark "we are here", which also writes the
// textual stopping point so "last time → resume" and the AI feedback loop keep working). When the
// edit toggle is on (13.3) the steps render static (not tappable). A free-text outline that doesn't
// parse into steps falls back to formatted text. `oob` lets a route swap it in place by id.
function renderOutlineTracker(oc: number, outline: string | null, progress: number | null, editing = false, oob = false): string {
  const wrap = (inner: string, cls: string): string => `<div class="${cls}" id="trk-${oc}"${oob ? ' hx-swap-oob="true"' : ''}>${inner}</div>`;
  if (!outline || !outline.trim()) return wrap('', 'trk');
  const steps = outlineSteps(outline);
  if (!steps.length) return wrap(`<span class="oc-label">Outline</span>${formatOutline(outline)}`, 'oc-block oc-outline');
  const rows = steps
    .map((label, i) => {
      const state = progress == null ? '' : i < progress ? ' trk-done' : i === progress ? ' trk-now' : '';
      const marker = `<span class="trk-marker">${progress != null && i === progress ? '▶' : progress != null && i < progress ? '✓' : i + 1}</span>`;
      const lbl = `<span class="trk-label">${esc(label)}</span>`;
      if (editing) return `<li class="trk-step trk-static${state}">${marker}${lbl}</li>`;
      return `<li class="trk-step${state}">
        <button type="button" hx-post="/occurrence-course/${oc}/progress" hx-vals='${JSON.stringify({ step: i, label: `step ${i + 1} — ${label.slice(0, 150)}` }).replace(/'/g, '&#39;')}'
          hx-target="#trk-${oc}" hx-swap="outerHTML" title="mark: we are here">${marker}${lbl}</button>
      </li>`;
    })
    .join('');
  return wrap(`<span class="oc-label">Outline${editing ? '' : ' — tap where you are'}</span><ol class="trk-list">${rows}</ol>`, 'trk oc-block');
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

const LEVEL_LABEL: Record<Level, string> = { support: '🟢 Support', core: '🟡 Core', challenge: '🔴 Challenge' };

/** The teacher's "preview as pupil" fragment: the worksheet sliced to one level, rendered inert
 * (preview mode). Surfaces the answer-space count so a level with zero boxes is obvious at a glance. */
async function renderWorksheetPreview(gc: number, lp: number, level: Level): Promise<string> {
  const ws = await getLessonWorksheet(gc, lp);
  if (!ws) {
    return '<p class="muted ws-preview-meta">No worksheet is attached to this lesson yet — generate or upload one, then preview.</p>';
  }
  const rendered = renderWorksheet(ws.markdown, { mode: 'preview', level, autofill: { name: '(pupil’s name — auto)', date: '(today — auto)' } });
  const boxes = rendered.fields.length;
  const boxNote = `${boxes} answer space${boxes === 1 ? '' : 's'}`;
  const levelNote = rendered.hasLevels
    ? `for <strong>${LEVEL_LABEL[level]}</strong>`
    : '· <span class="muted">this sheet isn’t split by level — every pupil sees the same</span>';
  const copyNote = ws.adapted ? '✏ this class’s copy' : 'master copy';
  return `<div class="ws-preview-meta"><span class="adapt-badge${ws.adapted ? ' on' : ''}">${copyNote}</span> · ${boxNote} ${levelNote}
      · <a class="link" href="/resources/${ws.resourceId}/edit" target="_blank" rel="noopener">✏ edit this worksheet</a></div>
    <div class="ws-doc ws-doc-preview" aria-label="Pupil preview">${rendered.html}</div>`;
}

// B4: a default-on "build on my uploaded materials" checkbox + a preview of which files. Empty list
// ⇒ nothing rendered (no materials to consent to). A paired hidden 'use_materials=0' means an
// UNCHECKED box still posts an explicit "off" (an unchecked checkbox alone sends nothing); the route
// treats the presence of '1' as on, so a generate button with no control at all defaults to on.
function materialsConsent(titles: string[]): string {
  if (!titles.length) return '';
  const shown = titles.slice(0, 4).map(esc).join(', ');
  const more = titles.length > 4 ? `, +${titles.length - 4} more` : '';
  return `<label class="materials-consent" title="${esc(titles.join(', '))}">
      <input type="checkbox" name="use_materials" value="1" checked> 📎 build on my uploaded materials
      <span class="muted">(${titles.length}: ${shown}${more})</span>
    </label><input type="hidden" name="use_materials" value="0">`;
}

function renderSection(
  s: CourseSection,
  plans: Array<{ id: number; title: string }>,
  resources: LinkedResource[],
  adaptedRes: LinkedResource[],
  taFb: TaFeedbackRow[],
  eff: EffectiveLesson | undefined,
  slot: { lessonId: number; date: string },
  materialTitles: string[],
): string {
  const colour = s.colour ?? '#94a3b8';
  const oc = s.occurrenceCourseId;
  const power = getExperienceMode() === 'power';
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
      ${renderLessonEdit(oc, s, eff ?? null, null, 'off')}
      ${s.lessonPlanId != null && eff ? renderAdaptation(s.groupCourseId, s.lessonPlanId, eff) : ''}
      ${renderResourcesBlock(oc, s, eff?.adapted ?? false, resources, adaptedRes, materialTitles)}
      ${
        s.lessonPlanId != null
          ? `<p class="pv-open"><a class="link" href="/lesson/pupil-view?gc=${s.groupCourseId}&amp;lp=${s.lessonPlanId}&amp;level=core" target="_blank" rel="noopener" title="Open this lesson exactly as the pupil sees it, in a new tab — with an edit toggle to tweak the slides/worksheet for this class or the master">👁 Open as pupil (new tab) ↗</a></p>
      <details class="ws-preview" id="ws-prev-d-${oc}">
        <summary>quick peek — each ability level inline</summary>
        <div class="ws-preview-tabs" role="tablist">
          <button type="button" class="ws-tab" hx-get="/lesson/worksheet-preview?gc=${s.groupCourseId}&amp;lp=${s.lessonPlanId}&amp;level=support" hx-target="#ws-prev-${oc}" hx-swap="innerHTML">🟢 Support</button>
          <button type="button" class="ws-tab" hx-get="/lesson/worksheet-preview?gc=${s.groupCourseId}&amp;lp=${s.lessonPlanId}&amp;level=core" hx-target="#ws-prev-${oc}" hx-swap="innerHTML">🟡 Core</button>
          <button type="button" class="ws-tab" hx-get="/lesson/worksheet-preview?gc=${s.groupCourseId}&amp;lp=${s.lessonPlanId}&amp;level=challenge" hx-target="#ws-prev-${oc}" hx-swap="innerHTML">🔴 Challenge</button>
        </div>
        <div id="ws-prev-${oc}" class="ws-preview-body" hx-get="/lesson/worksheet-preview?gc=${s.groupCourseId}&amp;lp=${s.lessonPlanId}&amp;level=core" hx-trigger="toggle from:#ws-prev-d-${oc} once" hx-swap="innerHTML"><span class="muted">Loading preview…</span></div>
      </details>
      <form class="test-pupil-launch" hx-post="/test-pupil/open" hx-swap="none" title="Open this lesson as a test pupil — the real worksheet, autosave and Done, at any level (no time limit)">
        <input type="hidden" name="lesson" value="${slot.lessonId}">
        <input type="hidden" name="date" value="${esc(slot.date)}">
        🧪 Test as pupil
        <select name="level" aria-label="level"><option value="support">🟢 Support</option><option value="core" selected>🟡 Core</option><option value="challenge">🔴 Challenge</option></select>
        <button type="submit" class="link">open →</button>
      </form>`
          : ''
      }
      ${s.lessonPlanId != null ? `<div class="img-todo-slot" hx-get="/lesson/oc/${oc}/image-todo?gc=${s.groupCourseId}&amp;lp=${s.lessonPlanId}" hx-trigger="load" hx-swap="innerHTML"></div>` : ''}
      ${s.lessonPlanId != null ? `<div class="ld-review" hx-get="/lesson/plan/${s.lessonPlanId}/review-flag" hx-trigger="load" hx-swap="innerHTML"></div>` : ''}
      <div class="ld-recall-slot" hx-get="/lesson/oc/${oc}/spaced-recall" hx-trigger="load" hx-swap="innerHTML"></div>
      ${s.lessonPlanId != null ? `<div class="ld-cover"><button type="button" class="link" title="Generate self-contained cover work + answers for a cover teacher (AI)" hx-post="/lesson/oc/${oc}/cover-pack" hx-target="#cover-${oc}" hx-swap="innerHTML" hx-disabled-elt="this">📋 Generate cover work (AI)</button><span id="cover-${oc}"></span></div>` : ''}
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
      ${
        power
          ? `<details class="group-ctx advanced" id="group-ctx-${s.groupCourseId}">
        <summary>this class's teaching context</summary>
        <div hx-get="/lesson/group-context/${s.groupCourseId}" hx-trigger="toggle from:#group-ctx-${s.groupCourseId} once" hx-target="this" hx-swap="innerHTML"><span class="muted">…</span></div>
      </details>`
          : ''
      }
    </section>`;
}

const EX_LABEL: Record<string, string> = { cancelled: 'Cancelled', free: 'Free (class away)', room_change: 'Room change', cover: 'Cover', off_timetable: 'Off-timetable day' };

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
          <option value="free">free (class away — trip/exam)</option>
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
  matByPlan: Map<number, string[]>,
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
              (s.lessonPlanId != null && matByPlan.get(s.lessonPlanId)) || [],
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
const ADAPT_RES_LABEL: Record<string, string> = { slides: 'slides', worksheet: 'worksheet', ta_notes: 'TA notes', answers: 'answers', support: 'support worksheet' };

async function generateAdaptedResources(gc: number, lp: number, useMaterials = true): Promise<{ ok: boolean; message: string }> {
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
  // Phase 12 B2: anchor the class adaptation to the lesson's own prepared materials too (the master
  // .md sheets above are already fed in; this adds the original uploaded source content). Best-effort.
  // B4: the teacher can opt out per generation; off ⇒ no extraction, no item (unchanged behaviour).
  const materials = useMaterials
    ? await lessonMaterialsForPlan(lp).catch(() => ({ text: '', files: [], truncated: false }))
    : { text: '', files: [], truncated: false };
  // B5: weight OCR GCSE exam-style questions by this class's proximity to exams (course + year group).
  const examProfile = await examProfileForCourse(info.courseId, new Date(), gc).catch(
    () => ({ stage: 'foundational', weighting: 'none', monthsToExam: null, label: '' }) as const,
  );
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
          ...lessonMaterialItems(materials.text),
          ...examStyleItems(examProfile),
          ...adaptResourceItems(
            { planTitle: master.title, courseName: info.courseName, groupName: info.groupName, objectives: eff.objectives, outline: eff.outline, adaptationNote: eff.adaptationNote },
            masterDocs,
          ),
        ],
        instruction: adaptResourcesInstruction(info.groupName),
        maxTokens: 32000, // generous: a full adapted set incl. a multi-slide deck must never truncate
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
      const storeKind = kind === 'slides' ? 'slides' : kind === 'ta_notes' ? 'ta_notes' : kind === 'answers' || kind === 'document' ? 'document' : 'worksheet';
      const id = await createResource(filename, storeKind, 'text/markdown', 'ai_generated');
      const rel = relPathFor(id, 1, filename);
      await storeBuffer(rel, buf);
      await addVersion(id, rel, buf.length, checksum(buf), 'ai', 'AI-adapted for class');
      await linkResourceToAdaptation(id, adaptation.id);
      created++;
    }
  }
  const builtOn = materials.files.length ? ` · built on ${materials.files.length} of your file(s)${materials.truncated ? ' (partial)' : ''}` : '';
  return { ok: true, message: `class copies ready ✓ — ${created} new, ${updated} updated${builtOn}` };
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

      // B4: the teacher's own source docs that resource generation would build on — names only (cheap,
      // no text extraction), for the pre-spend "build on my materials" preview + consent toggle.
      const matLists = await Promise.all(planIds.map((pid) => materialCandidatesForPlan(pid)));
      const matByPlan = new Map<number, string[]>();
      planIds.forEach((pid, i) => matByPlan.set(pid, matLists[i] ?? []));

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
        .send(layout({ title, body: renderDetail(detail, noteItems, prep, plansByCourse, resByPlan, matByPlan, effByKey, adaptedResByKey, taFbByOc, exceptionsHtml, csrf), authed: true, csrfToken: csrf }));
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
    const oc = params.data.id;
    await setOccurrenceCoursePlan(oc, planId);
    // 13.2: re-render the WHOLE plan area (objectives · outline-tracker · resources) in place via OOB,
    // so binding a plan shows its details + resources immediately — no page refresh needed.
    const occId = await poolOccurrenceOf(oc);
    const sec = (await getOccurrenceCourses(occId ?? 0)).find((o) => Number(o.occurrenceCourseId) === oc);
    if (!sec) return reply.type('text/html').send(renderSavedStatus(`oc-${oc}-plan-status`));
    const eff = sec.lessonPlanId != null
      ? await getEffectiveLesson(sec.groupCourseId, sec.lessonPlanId, { objectives: sec.planObjectives ?? null, outline: sec.planOutline ?? null })
      : null;
    const [resources, materialTitles] = await Promise.all([
      sec.lessonPlanId != null ? listResourcesForPlan(sec.lessonPlanId) : Promise.resolve([]),
      sec.lessonPlanId != null ? materialCandidatesForPlan(sec.lessonPlanId) : Promise.resolve([]),
    ]);
    const adaptedRes = eff?.adaptationId != null ? await listResourcesForAdaptation(eff.adaptationId) : [];
    return reply.type('text/html').send(
      renderLessonEdit(oc, sec, eff, null, 'off', true) +
        renderResourcesBlock(oc, sec, eff?.adapted ?? false, resources, adaptedRes, materialTitles, true) +
        renderSavedStatus(`oc-${oc}-plan-status`),
    );
  });

  // 13.3: re-render the lesson card's editable area in the chosen mode (View / This class / Master).
  app.get('/occurrence-course/:id/edit', { preHandler: requireAuth }, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
    const q = z.object({ mode: z.enum(['off', 'local', 'master']).default('off') }).safeParse(req.query);
    if (!p.success || !q.success) return reply.code(400).send('');
    const oc = p.data.id;
    const occId = await poolOccurrenceOf(oc);
    const sec = (await getOccurrenceCourses(occId ?? 0)).find((o) => Number(o.occurrenceCourseId) === oc);
    if (!sec) return reply.code(404).send('');
    const eff = sec.lessonPlanId != null
      ? await getEffectiveLesson(sec.groupCourseId, sec.lessonPlanId, { objectives: sec.planObjectives ?? null, outline: sec.planOutline ?? null })
      : null;
    const master = q.data.mode === 'master' && sec.lessonPlanId != null ? await getPlanRow(sec.lessonPlanId) : null;
    return reply.type('text/html').send(renderLessonEdit(oc, sec, eff, master, q.data.mode));
  });

  // 13.4 (point 5): preview a lesson EXACTLY as the pupil sees it (two-pane slides + worksheet), in a
  // standalone page meant to be opened in a NEW TAB. The off/local/master toggle turns it into a
  // markdown editor for the slides/worksheet, saving to the class's adapted copy (local) or the master.
  app.get('/lesson/pupil-view', { preHandler: requireAuth }, async (req, reply) => {
    const q = z
      .object({
        // class mode passes gc (off/local/master); master mode omits gc (off/master only — the
        // Schemes page previews the master lesson, where "this class" has no meaning).
        gc: z.coerce.number().int().positive().optional(),
        lp: z.coerce.number().int().positive(),
        level: z.enum(['support', 'core', 'challenge']).default('core'),
        edit: z.enum(['off', 'local', 'master']).default('off'),
      })
      .safeParse(req.query);
    if (!q.success) return reply.code(400).type('text/html').send('<p>Bad request.</p>');
    const { gc, lp, level } = q.data;
    const isMaster = gc == null;
    // local has no meaning without a class — clamp it to master so a stale link can't 500.
    const edit: EditMode = isMaster && q.data.edit === 'local' ? 'master' : q.data.edit;
    const gcKey = gc ?? 0; // gc=0 makes the resolvers fall through to the master resources
    const csrf = reply.generateCsrf();
    const [ws, slidesMd, info, master] = await Promise.all([
      getLessonWorksheet(gcKey, lp),
      getLessonSlidesMarkdown(gcKey, lp),
      isMaster ? Promise.resolve(null) : getGroupCourseInfo(gc),
      getPlanRow(lp),
    ]);
    const className = isMaster ? 'master lesson · every class' : (info?.groupName ?? 'class');
    const scopeQ = isMaster ? `master=1` : `gc=${gc}`;
    const href = (l: string, e: string): string => `/lesson/pupil-view?${scopeQ}&amp;lp=${lp}&amp;level=${l}&amp;edit=${e}`;
    const lvlTab = (l: Level, label: string): string => `<a class="ws-tab${l === level ? ' is-on' : ''}" href="${href(l, edit)}">${label}</a>`;
    const editTab = (e: 'off' | 'local' | 'master', label: string): string => `<a class="edit-tab${e === edit ? ' is-on' : ''}" href="${href(level, e)}">${label}</a>`;
    const editTabs = isMaster
      ? `${editTab('off', '👁 View')}${editTab('master', '✏ Master')}`
      : `${editTab('off', '👁 View')}${editTab('local', '✏ This class')}${editTab('master', '✏ Master')}`;
    const header = `<div class="pv-bar">
        <div><strong>${esc(master?.title ?? 'Lesson')}</strong> <span class="muted">${esc(className)} · preview as pupil</span></div>
        <div class="pv-levels">${lvlTab('support', '🟢')}${lvlTab('core', '🟡')}${lvlTab('challenge', '🔴')}</div>
        <div class="edit-toggle">${editTabs}</div>
      </div>`;
    let bodyContent: string;
    if (edit === 'off') {
      const deck = slidesMd ? renderSlideDeck(slidesMd, `pv-${gcKey}-${lp}`, level) : '';
      const wsHtml = ws ? renderWorksheet(ws.markdown, { mode: 'preview', level }).html : '<p class="pupil-note">No worksheet for this lesson yet — generate one, or switch to ✏ edit.</p>';
      bodyContent = deck
        ? `<div class="pupil-twopane" data-pane="work">
            <div class="pane-toggle" role="tablist" aria-label="Show slides or worksheet"><button type="button" class="pane-tab" role="tab" data-pane-btn="slides" aria-selected="false">📊 Slides</button><button type="button" class="pane-tab is-on" role="tab" data-pane-btn="work" aria-selected="true">📝 Worksheet</button></div>
            <div class="pupil-pane pupil-pane-slides">${deck}</div>
            <div class="pupil-pane pupil-pane-work">${wsHtml}</div>
          </div>`
        : `<div class="pupil-pane pupil-pane-work">${wsHtml}</div>`;
    } else {
      const banner =
        edit === 'local'
          ? `<p class="edit-banner edit-local">✏ Editing <strong>${esc(className)}’s</strong> copy — saved for this class only; the master and other classes are unchanged.</p>`
          : `<p class="edit-banner edit-master">✏ Editing the <strong>master</strong> — saved for <strong>every</strong> class using this lesson.</p>`;
      const editor = (kind: 'slides' | 'worksheet', label: string, md: string): string =>
        `<details class="pv-edit" open><summary>${label} — markdown</summary>
          <textarea class="pv-md" name="markdown" rows="18" spellcheck="false"
            hx-post="/lesson/pupil-view/save?${scopeQ}&amp;lp=${lp}&amp;kind=${kind}&amp;scope=${edit}" hx-trigger="input changed delay:1000ms, blur" hx-swap="none">${esc(md)}</textarea>
          <span class="ws-saved" id="pv-${kind}-status" aria-live="polite"></span></details>`;
      bodyContent = banner + editor('slides', '📊 Slides', slidesMd ?? '') + editor('worksheet', '📝 Worksheet', ws?.markdown ?? '');
    }
    const page = `<section class="pupil-card pv-card" hx-headers='{"x-csrf-token":"${csrf}"}'>${header}${bodyContent}</section>`;
    return reply.type('text/html').send(pupilLayout(page, csrf));
  });

  app.post('/lesson/pupil-view/save', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const q = z
      .object({ gc: z.coerce.number().int().positive().optional(), lp: z.coerce.number().int().positive(), kind: z.enum(['slides', 'worksheet']), scope: z.enum(['local', 'master']) })
      .safeParse(req.query);
    const b = z.object({ markdown: z.string().max(200000) }).safeParse(req.body);
    // local writes a class's adapted copy and needs a real gc; master ignores gc entirely.
    if (!q.success || !b.success || (q.data.scope === 'local' && q.data.gc == null)) return reply.code(400).send('');
    await saveLessonDocMarkdown(q.data.gc ?? 0, q.data.lp, q.data.kind, q.data.scope, b.data.markdown);
    return reply.type('text/html').send(`<span class="ws-saved show" id="pv-${q.data.kind}-status" aria-live="polite" hx-swap-oob="true">saved ✓</span>`);
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
    const outline = (effOutline?.adapted ? effOutline.outline : null) ?? sec?.planOutline ?? null;
    return reply
      .type('text/html')
      .send(renderOutlineTracker(params.data.id, outline, body.data.step) + renderSavedStatus(`oc-${params.data.id}-status`));
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
    return reply.type('text/html').send(renderAdaptation(p.data.gc, p.data.lp, eff, undefined, true));
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
  const renderGroupContextFragment = async (gc: number, intakeStatus = ''): Promise<string> => {
    const [text, ability, guided, covered] = await Promise.all([getGroupTeachingContext(gc), getGroupAbility(gc), getGuidedAccess(gc), getCoveredSummary(gc)]);
    const ga = guided ?? {};
    const ck = (v: unknown): string => (v ? ' checked' : '');
    return `<div id="group-ctx-frag-${gc}">
      <details class="class-intake">
        <summary>✨ Set up this class from a description (AI)</summary>
        <p class="muted">Paste what you know about this class — approach, what they've covered, ability, needs. Opus fills the teaching context, a "covered so far" summary, ability and access below (then edit). Cohort-level — never name a pupil.</p>
        <form hx-post="/lesson/group-context/${gc}/intake" hx-target="#group-ctx-frag-${gc}" hx-swap="outerHTML" hx-disabled-elt="find button"
          hx-confirm="Fill this class's context, ability and access from this description? It replaces the current values.">
          <textarea name="text" rows="5" placeholder="e.g. Year 9 set 3, 8 pupils. Covered binary and the CPU last term; found hexadecimal hard. Mostly Entry Level 3; a couple need larger font; short attention — keep tasks to ~10 min…"></textarea>
          <button type="submit" class="btn-secondary">Process with AI</button>
          <span class="note-status" id="intake-${gc}-status">${intakeStatus}</span>
        </form>
      </details>
      <p class="muted group-ctx-hint">Adds to the course context when adapting for this class. Describe the class as a whole — never an individual pupil.</p>
      <textarea name="text" rows="3" placeholder="e.g. this class needs shorter tasks and a movement break mid-lesson…"
        hx-post="/lesson/group-context/${gc}" hx-trigger="input changed delay:1000ms, blur" hx-swap="none">${esc(text ?? '')}</textarea>
      <label class="adapt-l">Covered so far — what this class has already done (the AI builds on it, won't re-teach)
        <textarea name="text" rows="2" placeholder="e.g. binary, the CPU, basic algorithms — found hexadecimal hard"
          hx-post="/lesson/group-covered/${gc}" hx-trigger="input changed delay:1000ms, blur" hx-swap="none">${esc(covered ?? '')}</textarea>
      </label>
      <label class="adapt-l">Ability midpoint — Core work pitches here (Support below, Challenge above)
        <input name="text" value="${esc(ability ?? '')}" placeholder="e.g. working at Entry Level 3 / emerging GCSE grade 2"
          hx-post="/lesson/group-ability/${gc}" hx-trigger="input changed delay:1000ms, blur" hx-swap="none">
      </label>
      <details class="guided-access">
        <summary>access needs (optional — shapes generated lessons &amp; resources for this class)</summary>
        <form class="guided-access-form" hx-post="/lesson/group-access/${gc}" hx-trigger="change" hx-swap="none">
          <label class="adapt-l">Minimum font size (pt)
            <input type="number" name="viFont" min="10" max="48" value="${ga.viFont ?? ''}" placeholder="e.g. 18"></label>
          <label><input type="checkbox" name="shortAttention"${ck(ga.shortAttention)}> very short attention spans — shorter, chunked tasks</label>
          <label><input type="checkbox" name="eal"${ck(ga.eal)}> EAL learners — define key terms, avoid idioms</label>
          <label><input type="checkbox" name="dyslexiaFriendly"${ck(ga.dyslexiaFriendly)}> dyslexia-friendly layout</label>
          <label><input type="checkbox" name="lowTyping"${ck(ga.lowTyping)}> limited typing fluency — prefer click / drag / multiple-choice</label>
          <label class="adapt-l">Target reading age
            <input name="readingAge" maxlength="40" value="${esc(ga.readingAge ?? '')}" placeholder="e.g. 8"></label>
          <span class="note-status" id="group-access-${gc}-status"></span>
        </form>
      </details>
      <p class="adapt-scheme-row"><button type="button" class="link fu-ai" title="Adapt every lesson of this class's scheme from its context — AI, one call per lesson" hx-post="/lesson/gc/${gc}/adapt-scheme" hx-target="#scheme-adapt-${gc}" hx-swap="innerHTML" hx-confirm="Adapt ALL of this class's scheme lessons from its context? That's one AI call per lesson." hx-disabled-elt="this">✨ Adapt whole scheme for this class (AI)</button> <span id="scheme-adapt-${gc}"></span></p>
      <span class="note-status" id="group-ctx-${gc}-status"></span>
    </div>`;
  };

  app.get('/lesson/group-context/:gc', { preHandler: requireAuth }, async (req, reply) => {
    const p = z.object({ gc: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    return reply.type('text/html').send(await renderGroupContextFragment(p.data.gc));
  });

  // Teacher preview: render the worksheet EXACTLY as a pupil at the chosen level would see it —
  // empty answer boxes and all — but inert (no autosave). Lets the teacher spot missing answer
  // spaces / images per level before the class meets it. Resolves the same class copy the pupil gets.
  app.get('/lesson/worksheet-preview', { preHandler: requireAuth }, async (req, reply) => {
    const q = z
      .object({ gc: z.coerce.number().int().positive(), lp: z.coerce.number().int().positive(), level: z.enum(['support', 'core', 'challenge']) })
      .safeParse(req.query);
    if (!q.success) return reply.code(400).type('text/html').send('<p class="muted">Bad preview request.</p>');
    return reply.type('text/html').send(await renderWorksheetPreview(q.data.gc, q.data.lp, q.data.level));
  });

  // Image gaps the generator left (`> 🖼️ [show: …]`) become a pre-lesson to-do: surfaced on the
  // lesson page AND added to the occurrence's "Before the bell" prep list (idempotent by text). The
  // teacher drops the images in via the worksheet editor, which removes the markers.
  app.get('/lesson/oc/:oc/image-todo', { preHandler: requireAuth }, async (req, reply) => {
    const p = z.object({ oc: z.coerce.number().int().positive() }).safeParse(req.params);
    const q = z.object({ gc: z.coerce.number().int().positive(), lp: z.coerce.number().int().positive() }).safeParse(req.query);
    if (!p.success || !q.success) return reply.code(400).send('');
    const ws = await getLessonWorksheet(q.data.gc, q.data.lp);
    const gaps = ws ? findImagePlaceholders(ws.markdown) : [];
    if (!ws || gaps.length === 0) return reply.type('text/html').send('');
    const existing = new Set((await listOccurrencePrep(p.data.oc)).map((i) => i.text));
    for (const g of gaps) {
      const text = `🖼️ Add image: ${g}`.slice(0, 200);
      if (!existing.has(text)) await addOccurrencePrep(p.data.oc, text).catch(() => {});
    }
    const items = gaps.map((g) => `<li>${esc(g)}</li>`).join('');
    return reply.type('text/html').send(
      `<div class="img-todo"><p class="img-todo-head">🖼️ <strong>${gaps.length} image${gaps.length === 1 ? '' : 's'} to add</strong> before the lesson — <a class="link" href="/resources/${ws.resourceId}/edit" target="_blank" rel="noopener">edit the worksheet</a> to drop them in (also on your “before the bell” list):</p><ul class="img-todo-list">${items}</ul></div>`,
    );
  });

  // Class-intake (idea: set up a class from a free-text description). Opus → the per-class fields;
  // then fire the one-shot scheme-adapt (context is now set). Re-renders the panel with what it filled.
  app.post('/lesson/group-context/:gc/intake', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const p = z.object({ gc: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ text: z.string().max(8000) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    const gc = p.data.gc;
    if (!b.data.text.trim()) return reply.type('text/html').send(await renderGroupContextFragment(gc, 'type a description first'));
    const r = await runClassIntake(b.data.text);
    if (r.status !== 'ok' || !r.data) {
      const why = r.status === 'unavailable' ? 'AI is off — turn it on in Settings → AI.' : (r.message ?? 'AI could not process that — try again.');
      return reply.type('text/html').send(await renderGroupContextFragment(gc, esc(why)));
    }
    await applyClassIntake(gc, r.data);
    void maybeAutoAdaptScheme(gc).catch((err) => app.log.error({ err }, 'auto scheme-adapt after intake failed'));
    return reply.type('text/html').send(await renderGroupContextFragment(gc, 'filled ✓ — review &amp; edit below'));
  });

  app.post('/lesson/group-covered/:gc', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const p = z.object({ gc: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ text: z.string().max(4000) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    await setCoveredSummary(p.data.gc, b.data.text);
    return reply.type('text/html').send(renderSavedStatus(`group-ctx-${p.data.gc}-status`));
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
    // Auto-adapt this class's scheme the FIRST time it has substantial context (one-shot; background;
    // self-stops at the £ cap). The flag in maybeAutoAdaptScheme prevents re-firing on later edits.
    if (b.data.text.trim().length >= 30) void maybeAutoAdaptScheme(p.data.gc).catch((err) => app.log.error({ err }, 'auto scheme-adapt failed'));
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
    const outcome = await adaptLessonForClass(gc, lp); // adapts from recent lessons, else class context
    if (outcome.status === 'notfound') return reply.code(404).send('');
    const master = await getLessonPlan(lp);
    if (!master) return reply.code(404).send('');
    const eff = await getEffectiveLesson(gc, lp, { objectives: master.objectives, outline: master.outline });
    const msg =
      outcome.status === 'ok'
        ? 'adapted ✓ — review and edit below; the change log records it'
        : outcome.status === 'skip'
          ? "Nothing to adapt from yet — add this class's teaching context, ability or access needs (the “this class's teaching context” panel), or teach a lesson, then try again."
          : (outcome.message ?? 'AI unavailable — nothing changed.');
    return reply.type('text/html').send(renderAdaptation(gc, lp, eff, msg, true));
  });

  // Adapt EVERY lesson of this class's scheme (idea: enable adapt for schemes). Confirmed by the
  // button; runs in the background and self-stops at the £ cap (each call checks it via the wrapper).
  app.post('/lesson/gc/:gc/adapt-scheme', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const p = z.object({ gc: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const info = await getGroupCourseInfo(p.data.gc);
    const scheme = info ? await getActiveScheme(info.courseId) : null;
    if (!scheme) return reply.type('text/html').send('<p class="muted">No active scheme of work for this class yet.</p>');
    const lessons = await schemeLessons(scheme.id);
    if (lessons.length === 0) return reply.type('text/html').send('<p class="muted">This scheme has no lessons yet.</p>');
    void adaptSchemeForClass(p.data.gc).catch((err) => app.log.error({ err }, 'scheme adapt (manual) failed'));
    return reply.type('text/html').send(`<p class="ok">Adapting ${lessons.length} lesson${lessons.length === 1 ? '' : 's'} for this class in the background — refresh in a minute to see them.</p>`);
  });


  // Per-class adapted resources: re-make the documents for THIS class from the masters + the
  // class's adapted lesson. Success refreshes the page (the ✏ list appears in Resources).
  app.post('/lesson/adapt/:gc/:lp/resources-ai', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const p = AdaptParams.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const res = await generateAdaptedResources(p.data.gc, p.data.lp, readUseMaterials(req.body));
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

  // Wave 5: a compact heads-up when an upcoming lesson has an open AI review. The full review (with
  // Apply / Dismiss) lives on the Schemes page; here it is read-only so the teacher sees it where they
  // look before teaching. Lazy-loaded so the lesson page costs nothing when there's no review.
  app.get('/lesson/plan/:id/review-flag', { preHandler: requireAuth }, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const review = await getOpenReviewForPlan(p.data.id);
    if (!review) return reply.type('text/html').send('');
    const label = review.verdict === 'keep' ? 'keep' : review.verdict === 'tweak' ? 'tweak' : 'rework';
    return reply
      .type('text/html')
      .send(`<p class="ld-review-flag">🔎 AI review (${esc(label)}) ready for this lesson — <a href="/schemes">open it on Schemes</a> to apply or dismiss.</p>`);
  });

  // Wave 7.3 — spaced retrieval: a recap of what this class did ~2 and ~6 weeks ago. Lazy-loaded like
  // the review flag; empty (and free) until the class has a term's worth of taught lessons.
  app.get('/lesson/oc/:oc/spaced-recall', { preHandler: requireAuth }, async (req, reply) => {
    const p = z.object({ oc: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const ref = await ocClassAndDate(p.data.oc);
    if (!ref) return reply.type('text/html').send('');
    const items = pickSpacedRecall(await pastLessonsForClass(ref.groupCourseId, ref.date), ref.date);
    if (items.length === 0) return reply.type('text/html').send('');
    const lis = items
      .map((i) => `<li><span class="recall-age">${esc(i.ageLabel)}</span> ${esc(i.objective)}${i.title ? ` <span class="muted">— ${esc(i.title)}</span>` : ''}</li>`)
      .join('');
    return reply
      .type('text/html')
      .send(`<details class="ld-recall"><summary>🔁 Spaced recall — quick recap to open with</summary><ul class="recall-list">${lis}</ul></details>`);
  });

  // Wave 6.1 — generate self-contained cover work for this class from its planned lesson (objectives +
  // a standalone task + answers), stored as a printable resource. One budget-enforced wrapper call.
  app.post('/lesson/oc/:oc/cover-pack', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const p = z.object({ oc: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const src = await coverPackSource(p.data.oc);
    if (!src) return reply.code(404).send('');
    const context = coverPackItem(src);
    if (context.length === 0)
      return reply.type('text/html').send('<p class="muted">Add a lesson plan (objectives or outline) first — there is nothing to base cover work on.</p>');
    const result = await callLLMStructured(
      {
        feature: 'cover_pack',
        model: await modelForFeature('cover_pack', 'plan'),
        promptVersion: COVER_PACK_VERSION,
        system: COVER_PACK_SYSTEM,
        context,
        instruction: COVER_PACK_INSTRUCTION,
        maxTokens: 6000,
      },
      generateResourceSchema,
    );
    if (result.status !== 'ok' || !result.data || !result.data.content.trim()) {
      return reply.type('text/html').send(`<p class="muted">${esc(result.message ?? 'The AI could not generate cover work.')}</p>`);
    }
    const d = result.data;
    const title = `Cover — ${src.className} ${src.date}`;
    const base = safeFilename((d.filename || `cover-${src.className}-${src.date}`).replace(/\.(md|markdown|txt)$/i, ''));
    const filename = `${base || 'cover'}.md`;
    const buf = Buffer.from(d.content, 'utf8');
    const id = await createResource(title, 'document', 'text/markdown', 'ai_generated');
    const rel = relPathFor(id, 1, filename);
    await storeBuffer(rel, buf);
    await addVersion(id, rel, buf.length, checksum(buf), 'ai', 'AI-generated cover work');
    return reply
      .type('text/html')
      .send(`<p class="cover-done">📋 Cover work ready: <a href="/resources/${id}/edit">${esc(title)}</a> — edit or print it on Resources.</p>`);
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
        kind: z.enum(['cancelled', 'free', 'room_change', 'cover', 'off_timetable']),
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
    // BUG-047: honour the calendar. A holiday / INSET / weekend / out-of-term day has no lessons to
    // print — and, crucially, we must NOT materialise occurrences for it.
    if (!classifyDay(date, weekday, await getTermDatesAll()).isSchoolDay) {
      return reply.type('text/html').send(printPage(`Cover / briefing — ${date}`, '<p>No teaching on this day (holiday, INSET, weekend or outside term).</p>'));
    }
    const [lessons, periods, exRows] = await Promise.all([getTimetabledLessons(), getPeriodDefinitions(), listExceptionsBetween(date, date)]);
    const dx = indexDayExceptions(exRows);
    const order = new Map(periods.map((p) => [`${p.weekday}:${p.slotOrder}`, p.slotOrder]));
    const todays = lessons
      .filter((l) => l.weekday === weekday && l.isSelf && (l.purpose === 'teaching' || l.purpose === 'form'))
      // BUG-047: drop cancelled / free / whole-day off-timetable lessons — they don't run and must not
      // be materialised. cover / room-change still print (the lesson runs, just adjusted).
      .filter((l) => describeException(exceptionForLesson(dx, l.lessonId)).mode !== 'free')
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
