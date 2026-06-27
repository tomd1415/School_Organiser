import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/guard';
import { appConfig } from '../config/app';
import { layout } from '../lib/html';
import { renderSlideDeck } from '../lib/meView';
import { renderWorksheet } from '../lib/worksheetForm';
import { renderTimelineCard, renderNowHero } from '../lib/nowView';
import { renderToggle } from '../lib/components';
import { renderCaptureBar, renderCapturedChips, renderCapturedList } from '../lib/capturedView';
import { renderNotesSearch, renderNotesChips, renderNotesGrid } from '../lib/notesView';
import { renderClassHeatMap, renderProgressionAdmin, renderPupilLadder, renderSchemeGrid } from '../lib/progressionView';
import { renderEventsGrouped } from '../lib/eventView';
import { renderTaskList } from '../lib/taskView';
import { renderOverseePage } from '../lib/overseeView';
import { renderFocusInner } from '../lib/focusView';
import { renderSchemesNext, renderSchemeTree, renderClassesMatrix } from '../lib/schemeView';
import { buildSchemeTree } from '../services/scheme';
import { renderMapPage } from '../lib/mapView';
import { renderCoverageReport } from '../lib/coverageView';
import { renderSearchBar, renderResourceListPaged } from '../lib/resourceView';
import { assessmentReviewView, renderAssignmentsPanel } from '../lib/assessmentReviewView';
import { renderAvailableList, renderTakePage } from '../lib/assessmentTakeView';
import { renderMarkingGrid } from '../lib/assessmentMarkModalView';
import { renderTeacherResults, renderPupilResults } from '../lib/assessmentResultsView';
import { renderAssessmentUnitPanel } from '../lib/assessmentUnitPanelView';
import { assessmentReadiness } from '../services/assessment';
import {
  GALLERY_LESSONS,
  GALLERY_NOW_STATE,
  GALLERY_PERIODS,
  SAMPLE_SLIDES_MD,
  SAMPLE_WORKSHEET_MD,
  GALLERY_CAPTURED,
  GALLERY_CAPTURED_COUNTS,
  GALLERY_GROUPS,
  GALLERY_NOTES,
  GALLERY_NOTES_COUNTS,
  GALLERY_EVENTS,
  GALLERY_EVENTS_TODAY,
  GALLERY_TASKS,
  GALLERY_OVERSEE,
  GALLERY_FOCUS,
  GALLERY_SCHEME_HEADER,
  GALLERY_SCHEME_UNITS,
  GALLERY_SCHEME_PLANS,
  GALLERY_SCHEME_MATRIX,
  GALLERY_NOW_HERO_STATE,
  GALLERY_NOW_HERO_LESSON,
  GALLERY_NOW_HERO_NEXT,
  GALLERY_MAP,
  GALLERY_COVERAGE,
  GALLERY_RESOURCES,
  GALLERY_ASSESSMENT,
  GALLERY_ASSESSMENT_SPEC_POINTS,
  GALLERY_ELIGIBLE_CLASSES,
  GALLERY_AVAILABLE_ASSESSMENTS,
  GALLERY_TAKE_PAPER,
  GALLERY_MARKING_ROWS,
  GALLERY_TEACHER_RESULTS,
  GALLERY_PUPIL_RESULTS,
  GALLERY_UNIT_ASSESSMENTS,
} from '../lib/uiFixtures';

// UI component gallery (Phase 1 of docs/UI_SEPARATION_PLAN.md): renders view functions with FIXTURE data so
// the UI can be redesigned + screenshot-tested in isolation from the back-end. Dev-only (off in production).
// Extend by importing more view fns + fixtures and adding an `item(...)` below.
export function registerUiGalleryRoutes(app: FastifyInstance): void {
  app.get('/ui-gallery', { preHandler: requireAuth }, async (_req, reply) => {
    if (appConfig.NODE_ENV === 'production') {
      return reply.code(404).type('text/html').send('<p>Not found.</p>');
    }

    const item = (title: string, note: string, html: string): string =>
      `<section class="gallery-item card">
        <div class="card-head"><div><p class="eyebrow">component</p><h2>${title}</h2></div></div>
        <p class="muted">${note}</p>
        <div class="gallery-stage">${html}</div>
      </section>`;

    const primitives = `
      <div class="card-head"><div><p class="eyebrow">eyebrow label</p><h2>Card header</h2></div><span class="badge good">badge · good</span></div>
      <p>Body text with an <a class="link">anchor link</a> and a <button type="button" class="link">button link</button>.</p>
      <p>
        <button type="button" class="button">button</button>
        <button type="button" class="button ghost">button ghost</button>
        <button type="button" class="button small">button small</button>
        <button type="button" class="btn-soft">btn-soft</button>
      </p>
      <p>
        <span class="badge">badge</span>
        <span class="badge ai">badge · ai</span>
        <span class="badge good">badge · good</span>
        <span class="badge warn">badge · warn</span>
      </p>`;

    // 15.1 — the dark-shell button contract, eyeballable in isolation: teal fill is scoped to explicit
    // .primary intent; a bare submit and a .btn-secondary/.ghost/.link submit all read as readable,
    // non-CTA chrome (no invisible dark-on-dark, no accidental teal CTA).
    const buttonContract = `<form onsubmit="return false" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <button type="submit" class="primary">Primary submit (CTA · teal)</button>
        <button type="submit">Bare submit (neutral default)</button>
        <button type="submit" class="btn-secondary">Secondary submit</button>
        <button type="submit" class="button ghost">Ghost submit</button>
        <button type="submit" class="link">Link submit</button>
      </form>`;

    // The shared component vocabulary for the Rail & Stage rebuild (docs/new-ui). Build screens from these.
    const kitRow = (cap: string, html: string): string =>
      `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
        <span style="min-width:150px;color:var(--quiet);font-size:12px;text-transform:uppercase;letter-spacing:.5px">${cap}</span>${html}</div>`;
    const componentKit = `
      ${kitRow('Badges (category tones)', `
        <span class="badge live">Logistics</span>
        <span class="badge warn">Pupil</span>
        <span class="badge">Admin</span>
        <span class="badge good">Curriculum</span>
        <span class="badge red">⚑ Safeguarding</span>
        <span class="badge ai">AI</span>`)}
      ${kitRow('Filter chips + count', `
        <span class="chip active">All <span class="chip-count">12</span></span>
        <span class="chip">Logistics <span class="chip-count">4</span></span>
        <span class="chip">Pupil <span class="chip-count">3</span></span>`)}
      ${kitRow('Segmented tabs', `
        <span class="ws-tab is-on">Inbox</span><span class="ws-tab">Today</span><span class="ws-tab">Scheduled</span><span class="ws-tab">Done</span>`)}
      ${kitRow('Toggle (off / on)', `${renderToggle({ label: 'Off', checked: false })} ${renderToggle({ label: 'On', checked: true })}`)}
      ${kitRow('Status dots', `
        <span class="tt-dot tt-dot-red"></span><span class="tt-dot tt-dot-purple"></span><span class="tt-dot tt-dot-blue"></span>`)}
      ${kitRow('Saved affordance', `<span class="note-status saved">saved ✓</span>`)}
      <div class="stats-grid" style="margin-top:6px">
        <div class="stat-card"><span class="stat-label">Lessons</span><strong class="stat-value">7</strong></div>
        <div class="stat-card"><span class="stat-label">To mark</span><strong class="stat-value">18</strong></div>
        <div class="stat-card"><span class="stat-label">AI calls</span><strong class="stat-value" style="color:var(--teal)">42</strong></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <div class="card" style="border-left:3px solid var(--teal);padding:14px 16px"><strong>Tone-left-border card</strong><p class="muted" style="margin:.25rem 0 0">teal · Logistics</p></div>
        <div class="card" style="border-left:3px solid var(--red);padding:14px 16px"><strong>Safeguarding card</strong><p class="muted" style="margin:.25rem 0 0">red · withheld from AI</p></div>
      </div>`;

    const worksheetHtml = `<div class="ws-doc ws-doc-preview">${renderWorksheet(SAMPLE_WORKSHEET_MD, { mode: 'preview', level: 'core', autofill: { name: '(pupil’s name — auto)', date: '(today — auto)' } }).html}</div>`;

    const progressionAdminHtml = renderProgressionAdmin({
      schemes: [
        { id: 1, name: 'Computing year ladder (Stages 6–14)', kind: 'year_ladder', examBoard: null, isActive: true, strands: 10, stages: 9, units: 120, criteria: 936 },
        { id: 2, name: 'GCSE Computer Science (OCR J277)', kind: 'gcse_grades', examBoard: 'OCR J277', isActive: true, strands: 2, stages: 9, units: 0, criteria: 0 },
      ],
      classes: [
        { groupCourseId: 31, label: '8PFA · Computing', schemeId: 1, schemeName: 'Computing year ladder (Stages 6–14)' },
        { groupCourseId: 32, label: '11GCSE · Computer Science', schemeId: null, schemeName: null },
      ],
      csrf: 'gallery',
    });
    const schemeGridHtml = renderSchemeGrid({
      schemeName: 'Computing year ladder (Stages 6–14)',
      grid: [
        { stageOrdinal: 12, stageLabel: 'Year 7 · KS3', strandId: 1, strandCode: 'CS', strandName: 'Computing systems', strandOrder: 0, units: 1, criteria: 12 },
        { stageOrdinal: 12, stageLabel: 'Year 7 · KS3', strandId: 3, strandCode: 'PG', strandName: 'Programming', strandOrder: 2, units: 0, criteria: 0 },
        { stageOrdinal: 13, stageLabel: 'Year 8 · KS3', strandId: 1, strandCode: 'CS', strandName: 'Computing systems', strandOrder: 0, units: 1, criteria: 9 },
        { stageOrdinal: 13, stageLabel: 'Year 8 · KS3', strandId: 3, strandCode: 'PG', strandName: 'Programming', strandOrder: 2, units: 2, criteria: 18 },
      ],
    });

    const body = `<section class="card workspace-width">
      <div class="card-head"><div><p class="eyebrow">dev</p><h1>UI gallery</h1></div></div>
      <p class="muted">Every showcased view, rendered with fixture data — no DB, no live state. Redesign the
        UI (views + CSS + client JS) against this page in isolation from the back-end. See
        <code>docs/UI_SEPARATION_PLAN.md</code>.</p>
      ${item('Component kit (Rail & Stage rebuild)', 'The shared vocabulary every redesigned screen is built from — badges in the SPEC category tones (Logistics→teal · Pupil→amber · Admin→grey · Curriculum→green · Safeguarding→red), filter chips, segmented tabs, the pill+knob toggle, status dots, the saved affordance, stat grid, and tone-left-border cards.', componentKit)}
      ${item('Primitives', 'Shared chrome: card header (eyebrow + title + badge), buttons, links, badges.', primitives)}
      ${item('Button contract (dark shell · 15.1)', 'Teal fill is scoped to explicit .primary intent — never a bare button[type="submit"]. A bare submit takes the neutral default; .btn-secondary/.ghost/.link submits stay readable and non-CTA. (Was: a blanket button[type="submit"] rule force-filled every submit teal, the root of the invisible-button cascade bug.)', buttonContract)}
      ${item('Slide deck', 'renderPslide via renderSlideDeck — one per-slide renderer shared by pupil / preview / presenter / board / cockpit (note the table + blockquote framing).', renderSlideDeck(SAMPLE_SLIDES_MD, 'gallery', 'core'))}
      ${item('Captured (SPEC §1)', 'renderCaptureBar + renderCapturedChips + renderCapturedList — the capture bar, category-filter chips with counts, and tone-left-border triage cards. The safeguarding-flagged card is withheld from AI and routes to the register (Open register), never "Make a task".', renderCaptureBar() + renderCapturedChips(GALLERY_CAPTURED_COUNTS, undefined) + renderCapturedList(GALLERY_CAPTURED, GALLERY_GROUPS))}
      ${item('Notes (SPEC §2)', 'renderNotesSearch + renderNotesChips + renderNotesGrid — a searchable knowledge-base grid; each card has a kind badge (by what it links to: Course green · Group teal · Pupil amber · General grey), the date, the editable body, and link chips. Pupil shown as a PUPIL_n token.', renderNotesSearch('', '') + renderNotesChips(GALLERY_NOTES_COUNTS, '', '') + renderNotesGrid(GALLERY_NOTES))}
      ${item('Events (SPEC §7)', 'renderEventsGrouped — upcoming events grouped by how-soon (This week / Next two weeks / Later / No date yet), each a card with a tone date chip (Deadline red · Trip amber · Parents/Open teal · Meeting grey), editable title, kind badge and an "in N days" line.', renderEventsGrouped(GALLERY_EVENTS, GALLERY_EVENTS_TODAY))}
      ${item('Tasks (SPEC §4)', 'renderTaskList — tone-left-border task cards (urgency: urgent→red · by-next-lesson→amber · this-week/email/scheduled→teal · someday→grey), an EMAIL source tag, a done-checkbox (struck when done), the urgency badge, and triage/edit controls in a disclosure. The live page wraps these in a segmented Inbox/Open/Done/Interest tab control with counts.', `<div class="tasks-page">${renderTaskList('gallery-tasks', GALLERY_TASKS, GALLERY_GROUPS)}</div>`)}
      ${item('Oversee (SPEC §13)', 'renderOverseePage — TA-led lessons grouped by day; each row shows the slot · ⚑ class · course · TA name + plan-set/resources status pills. A missing plan turns the row red; Open leads to the lesson page where the plan/resources/note are set.', renderOverseePage(GALLERY_OVERSEE))}
      ${item('Focus (SPEC §5)', 'renderFocusInner — the one-thing-now teal card: the single chosen task with a caption (urgency · window · estimate · load), a tappable step checklist, break-down + Done & next actions, and "N hidden — on purpose". Mode segmented control (Morning / Free period / End of day); an empty end-of-day shows the green wind-down banner.', `<div class="focus">${renderFocusInner(GALLERY_FOCUS)}</div>`)}
      ${item('Schemes (Spine lens)', 'renderSchemesNext — the scheme meta header (course tag · version·status · real stats: units/lessons/versions · Spine|Classes lens) above the Spine lens: a Units sidebar (each with a planned% bar) beside the selected unit’s lessons. Units/lessons reuse the existing editors, so every AI/resources/compare affordance is preserved.', renderSchemesNext({
        courseId: GALLERY_SCHEME_HEADER.courseId,
        currentCourseName: GALLERY_SCHEME_HEADER.courseName,
        scheme: GALLERY_SCHEME_HEADER,
        courses: [{ id: GALLERY_SCHEME_HEADER.courseId, name: GALLERY_SCHEME_HEADER.courseName }],
        versions: [{ id: 31, version: 3, active: true }, { id: 30, version: 2, active: false }],
        unitCount: GALLERY_SCHEME_UNITS.length,
        lessonCount: GALLERY_SCHEME_PLANS.length,
        lens: 'spine',
        treeHtml: renderSchemeTree(GALLERY_SCHEME_HEADER, buildSchemeTree(GALLERY_SCHEME_UNITS, GALLERY_SCHEME_PLANS)),
        matrixHtml: '',
        teachingCtxHtml: '',
        allSchemesHtml: '',
        convertPanelHtml: '',
        csrf: 'gallery',
      }))}
      ${item('Schemes — Classes matrix (SPEC §8)', 'renderClassesMatrix — the Classes lens: units × classes, each cell a lesson’s delivery status for that class — taught (date, green) · today (teal) · planned (date, plain) · not placed (dashed) · △ adapted for the class. Read-only; placement happens on the Map.', renderClassesMatrix(GALLERY_SCHEME_MATRIX))}
      ${item('Assessment review (Phase 1)', 'assessmentReviewView — the AI-generated draft paper for teacher review/edit: spec-point chips, covered/stretch badges, per-part widget + marks, mark-points (kind badge: objective=auto · open=AI-marked), misconceptions + model answers (collapsible), and the Mark-ready bar (here showing the draft is ready to flip). Editing affordances render because the paper is a draft.', assessmentReviewView(GALLERY_ASSESSMENT, { editable: true, csrf: 'gallery', specPoints: GALLERY_ASSESSMENT_SPEC_POINTS, readiness: assessmentReadiness(GALLERY_ASSESSMENT) }))}
      ${item('Assessment assignments (Phase 2)', 'renderAssignmentsPanel — assign a ready paper to its eligible classes (deduped by group_course): per-class availability window (datetime-local Open/Close) + results mode (on release / instant), an Assign/Update + Unassign action. Shown with one class already assigned with a window and one not.', renderAssignmentsPanel(1, GALLERY_ELIGIBLE_CLASSES, 'gallery'))}
      ${item('Pupil — assessments list (Phase 3)', 'renderAvailableList — the pupil-facing list of assessments set for their class: title, marks, style, and Start / Resume / Submitted actions. Light pupil theme.', renderAvailableList(GALLERY_AVAILABLE_ASSESSMENTS, 'Test Pupil'))}
      ${item('Pupil — take page (Phase 3, PII-safe)', 'renderTakePage over the PII-SAFE projection: question stems + part prompts + the answer widget per responseType (radios for multiple_choice, text/area for short/extended) + the marks tariff. By construction it carries NO mark-points / model answers / misconceptions — the answer key never reaches the pupil.', renderTakePage(GALLERY_TAKE_PAPER, new Map()))}
      ${item('Teacher — marking grid (Phase 4)', 'renderMarkingGrid — per-part marking for one attempt: the pupil’s answer (teacher sees full PII), the suggested mark + marker badge (auto / AI / teacher) + confidence + evidence + flags (needs-review · ⚑ safeguarding-withheld), an editable mark + feedback, “Mark now” and “Confirm all” (which skips needs-review).', renderMarkingGrid({ assessmentId: 1, attemptId: 1, title: 'Networks — end-of-unit assessment', pupilName: 'A. Pupil', scoreAwarded: 4, scoreTotal: 8, rows: GALLERY_MARKING_ROWS, csrf: 'gallery' }))}
      ${item('Teacher — results dashboard (Phase 5)', 'renderTeacherResults — per-pupil score table (RAG by %, flag counts linking to the marking grid), a per-spec-point mastery heatmap (objective-only, RAG by %), and per-class Release controls (on-release held vs instant).', renderTeacherResults(GALLERY_TEACHER_RESULTS))}
      ${item('Pupil — my results (Phase 5)', 'renderPupilResults — the gated, confirmed-only pupil panel: overall score, per-part feedback, and a by-topic (spec-point) breakdown. No mark-points / model answers — only confirmed marks + feedback.', renderPupilResults(GALLERY_PUPIL_RESULTS))}
      ${item('Unit assessments panel (Phase 6)', 'renderAssessmentUnitPanel — the lazy “Assessments” panel under each unit on the Schemes spine: each assessment’s title · style · status · marks/questions/classes, with Review-edit · Assign (ready) · Results actions, plus “Generate an assessment for a class”.', renderAssessmentUnitPanel(9, GALLERY_UNIT_ASSESSMENTS))}
      ${item('Stages & strands — admin (16A.2)', 'renderProgressionAdmin — the progression scheme catalogue (kind + strand/stage/unit/criteria counts) and per-class scheme assignment (one scheme per class).', progressionAdminHtml)}
      ${item('Stages & strands — scheme grid (16A.2)', 'renderSchemeGrid — a scheme’s Stage × Strand course-planning view; each cell shows the “I can…” criteria count (empty cells aren’t taught at that stage).', schemeGridHtml)}
      ${item('Stages & strands — class heat-map (16A.3)', 'renderClassHeatMap — each pupil’s current stage per strand + overall roll-up (computed from evidence). PII, teacher-only, never sent to AI.', renderClassHeatMap({
        schemeName: 'Computing year ladder (Stages 6–14)', className: '8PFA · Computing',
        strands: [{ id: 1, code: 'CS', name: 'Computing systems' }, { id: 3, code: 'PG', name: 'Programming' }, { id: 5, code: 'DI', name: 'Data & information' }],
        labelByOrdinal: { 12: 'Year 7', 13: 'Year 8', 14: 'Year 9' },
        pupils: [
          { id: 101, name: 'A. Pupil', perStrand: { 1: 13, 3: 12, 5: 13 }, overall: 13 },
          { id: 102, name: 'B. Pupil', perStrand: { 1: 12, 3: null, 5: 12 }, overall: 12 },
        ],
      }))}
      ${item('Stages & strands — per-pupil ladder (16A.3)', 'renderPupilLadder — one pupil’s per-strand current stage + overall, per scheme-bound class. PII, teacher-only.', renderPupilLadder({
        pupilName: 'A. Pupil',
        classes: [{
          groupCourseId: 31, className: '8PFA · Computing', schemeName: 'Computing year ladder (Stages 6–14)',
          strands: [{ id: 1, code: 'CS', name: 'Computing systems', ordinal: 13 }, { id: 3, code: 'PG', name: 'Programming', ordinal: 12 }],
          overall: 13, labelByOrdinal: { 12: 'Year 7', 13: 'Year 8' },
        }],
      }))}
      ${item('Worksheet (read-only preview)', 'renderWorksheet, preview mode.', worksheetHtml)}
      ${item('Resources (SPEC §10)', 'renderSearchBar + renderResourceListPaged — search + filter pills (All · per-kind, as radios so the kind survives live search) over a card grid (auto-fill minmax 290px): each card a kind badge (Slides teal · Worksheet green · Quiz amber · others grey) · version (mono) · title · meta (🔗 linked-lesson count · size · source) · Open / Present↗ (slides) / download.', renderSearchBar([...new Set(GALLERY_RESOURCES.rows.map((r) => r.kind))], '', '') + renderResourceListPaged(GALLERY_RESOURCES))}
      ${item('Coverage (SPEC §9)', 'renderCoverageReport — the spec-point backbone as cards per spec area with a % bar; each point row is a status dot (✓ covered green · ○ gap red) · code (mono) · label · meta (the covering lesson ↗ or “not yet” in red). The All · Covered · Gaps filter hides points and drops emptied areas.', renderCoverageReport(GALLERY_COVERAGE))}
      ${item('Curriculum map (SPEC §8)', 'renderMapPage — one class’s weekly slot as a term-calendar timeline rail: past taught lessons (green border, “stopped at …”, ↻ continue next week), today (teal), and the holiday-aware future weeks (plain; an empty week dashed). Read-only; future weeks drag to reorder.', renderMapPage(GALLERY_MAP))}
      ${item('Now — hero', 'renderNowHero — the prominent “what’s happening now” strip atop the Now screen: period eyebrow, lesson title, room + start time, the time-remaining countdown, and what’s next. Rendered once at load (no self-poll).', renderNowHero(GALLERY_NOW_HERO_STATE, GALLERY_NOW_HERO_LESSON, GALLERY_NOW_HERO_NEXT))}
      ${item('Now — day timeline', 'renderTimelineCard with a fixed clock (P1 done · P2 active · P3 next).', renderTimelineCard(GALLERY_LESSONS, GALLERY_PERIODS, GALLERY_NOW_STATE, new Date('2026-06-23T10:05:00Z'), 'Europe/London'))}
    </section>`;

    return reply.type('text/html').send(layout({ title: 'UI gallery', body, authed: true, csrfToken: reply.generateCsrf() }));
  });
}
