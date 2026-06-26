import { esc } from './html';
import { paths } from './paths'; // route URLs (see docs/UI_SEPARATION_PLAN.md Phase 2)
import { formatObjectives, formatOutline } from './formatLesson';
import type { PlanRow, SchemeHeader, UnitWithPlans } from '../services/scheme';
import type { SchemeListRow } from '../repos/schemes';
import type { CourseSlot, LaidLesson } from '../repos/delivery';
import { weekdayName } from '../services/delivery';
import type { UnitCandidate } from '../services/convertUnit';
import type { ReviewRow } from '../repos/reviews';
import type { PlanAdaptation } from '../repos/adaptations';
import type { ResourceJob } from '../repos/resourceJobs';

// Wave 5 — the advisory AI review card shown under a lesson on the Schemes page. It only ever
// suggests: the teacher Applies the rewrite to the master (reusing updatePlanField) or Dismisses it.
const VERDICT_LABEL: Record<string, string> = { keep: '✓ keep', tweak: '✎ tweak', rework: '⚠ rework' };

export function renderReview(r: ReviewRow): string {
  const findings = r.findings
    .map((f) => `<li><strong>${esc(f.issue)}</strong> — ${esc(f.fix)}</li>`)
    .join('');
  const canApply = r.verdict !== 'keep' && !!((r.suggestedObjectives ?? '').trim() || (r.suggestedOutline ?? '').trim());
  return `<div class="review-card" id="review-${r.id}">
    <p class="review-head"><span class="review-verdict review-${esc(r.verdict)}">🔎 ${VERDICT_LABEL[r.verdict] ?? esc(r.verdict)}</span> ${esc(r.rationale ?? '')}</p>
    ${findings ? `<ol class="review-findings">${findings}</ol>` : ''}
    ${
      canApply
        ? `<details class="review-suggestion">
            <summary>see the suggested rewrite</summary>
            <label class="adapt-l">Suggested objectives<textarea rows="3" readonly>${esc(r.suggestedObjectives ?? '')}</textarea></label>
            <label class="adapt-l">Suggested outline<textarea rows="5" readonly>${esc(r.suggestedOutline ?? '')}</textarea></label>
          </details>`
        : ''
    }
    <div class="review-actions">
      ${
        canApply
          ? `<button type="button" class="btn-secondary" hx-post="${paths.schemesReviewApply(r.id)}" hx-target="#plan-${r.lessonPlanId}" hx-swap="outerHTML"
              hx-confirm="Apply this review to the master lesson? Every class then starts from the updated version (a class's own adaptation still applies).">⬆ Apply to master</button>`
          : ''
      }
      <button type="button" class="link" hx-post="${paths.schemesReviewDismiss(r.id)}" hx-target="#review-${r.id}" hx-swap="outerHTML">✕ dismiss</button>
    </div>
  </div>`;
}

// C2 cross-group compare: the master lesson beside each class's adaptation, with a one-click
// "promote this class's version to master" that reuses the 5.5b apply-improvement route. Read-only
// otherwise; editing each version stays on that class's lesson screen.
export function renderClassCompare(plan: PlanRow, adaptations: PlanAdaptation[]): string {
  if (adaptations.length === 0) {
    return `<p class="muted">No class has its own version of this lesson yet — adapt it from a class's lesson screen, then compare the classes here.</p>`;
  }
  const masterCol = `<div class="cc-col cc-master">
      <h4>Master <span class="muted">every class starts here</span></h4>
      ${plan.objectives ? `<div class="oc-block"><span class="oc-label">Objectives</span>${formatObjectives(plan.objectives)}</div>` : '<p class="muted">no objectives yet</p>'}
      ${plan.outline ? `<div class="oc-block"><span class="oc-label">Outline</span>${formatOutline(plan.outline)}</div>` : '<p class="muted">no outline yet</p>'}
    </div>`;
  const groupCols = adaptations
    .map((a) => {
      const effObj = a.objectives ?? plan.objectives ?? '';
      const effOut = a.outline ?? plan.outline ?? '';
      const id = `cc-${plan.id}-${a.groupCourseId}`;
      const name = a.groupName ?? 'class';
      return `<div class="cc-col cc-group" id="${id}">
        <h4>${esc(name)} <span class="map-adapted">✏ adapted</span> <span class="muted">${esc(a.updatedAt)}</span></h4>
        ${a.adaptationNote ? `<p class="adapt-note">${esc(a.adaptationNote)}</p>` : ''}
        <div class="oc-block"><span class="oc-label">Objectives${a.objectives ? '' : ' (inherits master)'}</span>${effObj ? formatObjectives(effObj) : '<span class="muted">—</span>'}</div>
        <div class="oc-block"><span class="oc-label">Outline${a.outline ? '' : ' (inherits master)'}</span>${effOut ? formatOutline(effOut) : '<span class="muted">—</span>'}</div>
        <form hx-post="${paths.planApplyImprovement(plan.id)}" hx-target="#${id}-status" hx-swap="innerHTML"
              hx-confirm="Promote ${esc(name)}'s version to the master? Every class then starts from it (this class keeps its own adaptation here).">
          <textarea name="objectives" hidden>${esc(effObj)}</textarea>
          <textarea name="outline" hidden>${esc(effOut)}</textarea>
          <button type="submit" class="link">⬆ Promote this class's version to master</button>
        </form>
        <span id="${id}-status"></span>
      </div>`;
    })
    .join('');
  return `<div class="class-compare">${masterCol}${groupCols}</div>`;
}

// C3: shown when the chosen folder was already converted — warn, then let the teacher convert again
// (confirm=1) as a new unit, or cancel back to the normal panel. Swaps into #convert-panel.
export function renderConvertDup(courseId: number, folder: string, assignSlot: string, assignStart: string, existing: string[]): string {
  return `<details class="convert-panel" id="convert-panel" open>
    <summary>📥 Convert a downloaded unit for my classes</summary>
    <div class="convert-dup">
      <p class="warn">⚠ You already converted <strong>${esc(folder)}</strong> — it created: ${existing.map((t) => esc(t)).join(', ')}.</p>
      <p class="muted">Converting again makes a <strong>new</strong> unit (the existing one is kept — delete it with ✕ on the scheme if you don't want it).</p>
      <form hx-post="${paths.schemesCourseConvert(courseId)}" hx-target="#convert-panel" hx-swap="outerHTML" hx-disabled-elt="find button">
        <input type="hidden" name="folder" value="${esc(folder)}">
        <input type="hidden" name="assign_slot" value="${esc(assignSlot)}">
        <input type="hidden" name="assign_start" value="${esc(assignStart)}">
        <input type="hidden" name="confirm" value="1">
        <button type="submit" class="btn-secondary">✨ Convert again as a new unit</button>
        <button type="button" class="link" hx-get="${paths.schemesCourseConvertPanel(courseId)}" hx-target="#convert-panel" hx-swap="outerHTML">Cancel</button>
      </form>
    </div>
  </details>`;
}

function rowActions(kind: 'unit' | 'plan', id: number, confirm: string): string {
  return `<span class="row-actions">
    <button type="button" class="link" title="Move ${kind} up" aria-label="Move ${kind} up" hx-post="${paths.schemesRowMove(kind, id, 'up')}" hx-target="#scheme-tree" hx-swap="outerHTML">▲</button>
    <button type="button" class="link" title="Move ${kind} down" aria-label="Move ${kind} down" hx-post="${paths.schemesRowMove(kind, id, 'down')}" hx-target="#scheme-tree" hx-swap="outerHTML">▼</button>
    <button type="button" class="link danger" title="Delete ${kind}" aria-label="Delete ${kind}" hx-post="${paths.schemesRowDelete(kind, id)}" hx-target="#scheme-tree" hx-swap="outerHTML" hx-confirm="${esc(confirm)}">✕</button>
  </span>`;
}

// The live progress widget for an in-flight "Generate resources" job. While the job is queued/running it
// polls its status endpoint every 2s; when the job finishes the status endpoint retargets the swap to the
// whole plan (HX-Retarget), so this element — and its polling timer — is replaced and polling stops. An
// already-finished (or absent) job renders nothing, so the slot is simply empty.
export function renderResourceJobStatus(planId: number, job: ResourceJob | null): string {
  if (!job || job.status === 'done' || job.status === 'error') return '';
  const label = job.stage.trim() || (job.status === 'queued' ? 'Queued…' : 'Working…');
  return `<div class="resjob" role="status" aria-live="polite"
    hx-get="${paths.schemesPlanResourcesAiStatus(planId)}" hx-trigger="every 2s" hx-target="this" hx-swap="outerHTML">
    <span class="resjob-spinner" aria-hidden="true"></span> <span class="muted">${esc(label)}</span>
    <span class="resjob-hint muted">— building all four documents can take a minute or two; you can keep working and it carries on</span>
  </div>`;
}

export function renderPlan(p: PlanRow, opts: { open?: boolean; draftStatus?: string; reviewOpen?: boolean; resourceJob?: ResourceJob | null } = {}): string {
  const save = (t: string) => `hx-post="${paths.schemesPlan(p.id)}" hx-swap="none" hx-trigger="${t}"`;
  return `<li class="plan" id="plan-${p.id}">
    <div class="row-head">
      <input class="plan-title" type="text" name="title" value="${esc(p.title)}" placeholder="Lesson plan…" ${save('input changed delay:600ms, blur')}>
      ${opts.reviewOpen ? '<span class="review-flag" title="This lesson has an open AI review">🔎</span>' : ''}
      <span class="note-status" id="plan-${p.id}-status"></span>
      ${rowActions('plan', p.id, 'Delete this lesson plan?')}
    </div>
    <details class="plan-detail" id="plan-${p.id}-detail"${opts.open ? ' open' : ''}>
      <summary>objectives · outline · ${p.durationMin ? esc(String(p.durationMin)) + ' min' : 'duration'}</summary>
      ${p.objectives || p.outline || p.kitNeeded
        ? `<div class="plan-view">
            ${p.objectives ? `<div class="oc-block oc-objectives"><span class="oc-label">Objectives</span>${formatObjectives(p.objectives)}</div>` : ''}
            ${p.outline ? `<div class="oc-block oc-outline"><span class="oc-label">Outline</span>${formatOutline(p.outline)}</div>` : ''}
            ${p.kitNeeded ? `<div class="oc-block oc-kit"><span class="oc-label">🔧 Kit needed</span> ${esc(p.kitNeeded)}</div>` : ''}
          </div>`
        : ''}
      <div class="plan-ai">
        <button type="button" class="btn-secondary" hx-post="${paths.schemesPlanDraft(p.id)}" hx-target="#plan-${p.id}" hx-swap="outerHTML" hx-disabled-elt="this">✨ Draft with AI</button>
        <button type="button" class="btn-secondary" title="slides outline + worksheet + support version + answers — stored and linked to this lesson; re-running updates the versions. Runs in the background — you can keep working while it generates."
          hx-post="${paths.schemesPlanResourcesAi(p.id)}" hx-target="#plan-${p.id}-resjob" hx-swap="innerHTML" hx-disabled-elt="this">📄 Generate resources</button>
        <button type="button" class="btn-secondary" title="an AI second opinion on this upcoming lesson, judged against the spec — it suggests; you apply or dismiss (only when the reviewer is enabled in Settings → AI)"
          hx-post="${paths.schemesPlanReviewAi(p.id)}" hx-target="#plan-${p.id}-review" hx-swap="innerHTML" hx-disabled-elt="this">🔎 Review (AI)</button>
        <span class="plan-draft-status" id="plan-${p.id}-draft">${esc(opts.draftStatus ?? '')}</span>
        <div class="resjob-slot" id="plan-${p.id}-resjob">${renderResourceJobStatus(p.id, opts.resourceJob ?? null)}</div>
      </div>
      <div class="plan-review" id="plan-${p.id}-review"${opts.reviewOpen ? ` hx-get="${paths.schemesPlanReview(p.id)}" hx-trigger="load" hx-swap="innerHTML"` : ''}></div>
      <details class="adapt-edit"${p.objectives || p.outline ? '' : ' open'}>
        <summary>✏ edit objectives / outline / duration</summary>
        <label>Objectives<textarea name="objectives" rows="2" ${save('input changed delay:800ms, blur')}>${esc(p.objectives ?? '')}</textarea></label>
        <label>Outline<textarea name="outline" rows="3" ${save('input changed delay:800ms, blur')}>${esc(p.outline ?? '')}</textarea></label>
        <label>Duration (min) <input type="number" name="duration_min" min="0" value="${p.durationMin ?? ''}" ${save('input changed delay:600ms, blur')}></label>
        <label>🔧 Kit needed <input type="text" name="kit_needed" value="${esc(p.kitNeeded ?? '')}" placeholder="e.g. 16× micro:bit, batteries, USB leads" ${save('input changed delay:600ms, blur')}></label>
      </details>
      <div class="plan-preview-actions">
        <a class="button small" href="${paths.lessonPreview(p.id)}" target="_blank" rel="noopener" title="Open a read-only preview of the live teacher cockpit without creating a lesson occurrence">▶ Preview live lesson ↗</a>
        <a class="button small" href="${paths.testLabPlan(p.id)}" target="_blank" rel="noopener" title="Run THIS lesson in the Test Lab — a live sandbox where you drive it as teacher + a test pupil who writes answers, with no effect on real classes">🧪 Test in Test Lab ↗</a>
        <a class="link" href="${paths.pupilPreview(null, p.id, 'core')}" target="_blank" rel="noopener" title="See exactly what a pupil works in — the slides AND the worksheet they fill in (read-only preview; nothing is saved). Switch ability level in the preview.">👁 Preview as pupil (worksheet) ↗</a>
        <a class="link" href="${paths.boardView(null, p.id, 'core')}" target="_blank" rel="noopener" title="The clean projector board for this master lesson — slides only">🖥 Board (slides) ↗</a>
      </div>
      <div class="plan-res-head">Resources</div>
      <div class="plan-res-slot" hx-get="${paths.schemesPlanResources(p.id)}" hx-trigger="${opts.open ? 'load' : `toggle from:#plan-${p.id}-detail once`}" hx-target="this" hx-swap="innerHTML">
        <span class="muted">resources load when opened…</span>
      </div>
      <details class="plan-compare" id="plan-${p.id}-compare">
        <summary>⚖ Compare classes' versions</summary>
        <div hx-get="${paths.schemesPlanCompare(p.id)}" hx-trigger="toggle from:#plan-${p.id}-compare once" hx-target="this" hx-swap="innerHTML"><span class="muted">loading…</span></div>
      </details>
    </details>
  </li>`;
}

function renderUnit(u: UnitWithPlans, openReviews: ReadonlySet<number>, activeJobs: ReadonlyMap<number, ResourceJob> = new Map()): string {
  const save = (t: string) => `hx-post="${paths.schemesUnit(u.id)}" hx-swap="none" hx-trigger="${t}"`;
  return `<section class="unit" id="unit-${u.id}">
    <div class="row-head">
      <input class="unit-title" type="text" name="title" value="${esc(u.title)}" placeholder="Unit…" ${save('input changed delay:600ms, blur')}>
      <span class="note-status" id="unit-${u.id}-status"></span>
      ${rowActions('unit', u.id, 'Delete this unit and its plans?')}
    </div>
    <ol class="plans">${u.plans.map((p) => renderPlan(p, { reviewOpen: openReviews.has(p.id), resourceJob: activeJobs.get(p.id) ?? null })).join('')}</ol>
    <button type="button" class="link" hx-post="${paths.schemesUnitPlan(u.id)}" hx-target="#scheme-tree" hx-swap="outerHTML">＋ lesson plan</button>
    <button type="button" class="link" title="one AI call per lesson; existing documents get new versions"
      hx-post="${paths.schemesUnitResourcesAi(u.id)}" hx-target="#scheme-tree" hx-swap="outerHTML" hx-disabled-elt="this"
      hx-confirm="Generate/update the resource set (slides, worksheet, support, answers) for EVERY lesson in this unit? One AI call per lesson — this can take a few minutes.">📄 resources for all lessons</button>
    <button type="button" class="link" title="an AI second opinion on every upcoming lesson in this unit — it suggests; you apply or dismiss each (only when the reviewer is on in Settings → AI)"
      hx-post="${paths.schemesUnitReviewAi(u.id)}" hx-target="#scheme-tree" hx-swap="outerHTML" hx-disabled-elt="this"
      hx-confirm="Review EVERY lesson in this unit with AI? One call per lesson (lessons that already have an open review are skipped). It only suggests — nothing changes until you apply a review.">🔎 review all lessons</button>
    <button type="button" class="link" title="one AI call — a sequence-level read of the whole unit (order, progression, coverage gaps). Advisory; only when the reviewer is on in Settings → AI"
      hx-post="${paths.schemesUnitReviewSequence(u.id)}" hx-target="#unit-${u.id}-seq" hx-swap="innerHTML" hx-disabled-elt="this">🔎 review the sequence</button>
    <div id="unit-${u.id}-seq"></div>
    <details class="unit-lay" id="unit-${u.id}-lay">
      <summary>📅 Lay into a group's calendar</summary>
      <div class="unit-lay-body" hx-get="${paths.schemesUnitLayForm(u.id)}" hx-trigger="toggle from:#unit-${u.id}-lay once" hx-target="this" hx-swap="innerHTML"><span class="muted">loading slots…</span></div>
    </details>
    <details class="unit-asmt" id="unit-${u.id}-asmt">
      <summary>📝 Assessments</summary>
      <div class="unit-asmt-body" hx-get="${paths.schemesUnitAssessments(u.id)}" hx-trigger="toggle from:#unit-${u.id}-asmt once" hx-target="this" hx-swap="innerHTML"><span class="muted">loading assessments…</span></div>
    </details>
  </section>`;
}

// 5.4: the form to lay a unit's lessons into a group's weekly slot (loaded when the section opens).
export function renderLayForm(unitId: number, slots: CourseSlot[], lessonCount: number, defaultStart: string): string {
  if (!slots.length) {
    return `<p class="muted">No group is timetabled for this course yet — nowhere to lay it down.</p>`;
  }
  if (lessonCount === 0) {
    return `<p class="muted">This unit has no lessons yet — add some first.</p>`;
  }
  const opts = slots
    .map((s) => `<option value="${s.lessonId}:${s.groupCourseId}">${esc(s.groupName ?? 'group')} · ${weekdayName(s.weekday)} ${esc(s.periodLabel)} (${esc(s.start)})</option>`)
    .join('');
  return `<form class="lay-form" hx-post="${paths.schemesUnitLayDown(unitId)}" hx-target="#unit-${unitId}-lay-result" hx-swap="innerHTML" hx-disabled-elt="find button">
      <label>Group &amp; weekly slot<select name="slot">${opts}</select></label>
      <label>Start from<input type="date" name="start" value="${esc(defaultStart)}"></label>
      <button type="submit" class="btn-secondary">Lay down ${lessonCount} lesson${lessonCount === 1 ? '' : 's'} →</button>
      <p class="muted lay-note">Binds each lesson to that slot's upcoming weeks, skipping holidays. Re-laying overwrites those weeks.</p>
    </form>
    <div id="unit-${unitId}-lay-result"></div>`;
}

export function renderLayResult(laid: LaidLesson[], totalLessons: number): string {
  if (!laid.length) return `<p class="muted">Nothing laid down — no upcoming dates found for that slot.</p>`;
  const rows = laid.map((l) => `<li><span class="lay-date">${esc(l.date)}</span> → <a href="#" class="muted">${esc(l.title)}</a></li>`).join('');
  const short = laid.length < totalLessons ? `<p class="muted">Only ${laid.length} of ${totalLessons} fit before the data runs out — re-lay later for the rest.</p>` : '';
  return `<div class="lay-result"><p><strong>Laid ${laid.length} lesson${laid.length === 1 ? '' : 's'} into the calendar:</strong></p><ol class="lay-list">${rows}</ol>${short}</div>`;
}

// % of a unit's lessons that are "planned" (have both objectives and an outline) — a genuine,
// already-available readiness signal, shown as the unit progress bar in the spine sidebar.
function unitPlannedPct(u: UnitWithPlans): number {
  if (u.plans.length === 0) return 0;
  const ready = u.plans.filter((p) => (p.objectives ?? '').trim() && (p.outline ?? '').trim()).length;
  return Math.round((ready / u.plans.length) * 100);
}

// The scheme "Spine" lens: a Units sidebar (selectable, each with a planned% bar) beside a lessons
// panel that shows the selected unit's lessons. Selection is client-side (inline onclick, matching the
// existing tree idiom) so it needs no round-trip; structural edits (add/move/delete) still swap the
// whole #scheme-tree and reset to the first unit. Each unit panel reuses renderUnit/renderPlan verbatim,
// so every editing/AI/resources/compare affordance — and every route that swaps #plan-/#unit-/#scheme-tree
// — keeps working unchanged.
export function renderSchemeTree(
  scheme: SchemeHeader,
  tree: UnitWithPlans[],
  openReviews: ReadonlySet<number> = new Set(),
  activeJobs: ReadonlyMap<number, ResourceJob> = new Map(),
): string {
  if (tree.length === 0) {
    return `<div id="scheme-tree" class="sch-tree-empty">
      <p class="muted">No units yet — add the first one to start building this scheme.</p>
      <button type="button" class="btn-secondary" hx-post="${paths.schemesAddUnit(scheme.id)}" hx-target="#scheme-tree" hx-swap="outerHTML">＋ Unit</button>
    </div>`;
  }
  const select = (id: number) =>
    `var s=this.closest('.sch-spine');s.querySelectorAll('.sch-unit-panel').forEach(p=>p.hidden=(p.dataset.unit!=='${id}'));s.querySelectorAll('.sch-unit-btn').forEach(b=>b.classList.remove('active'));this.classList.add('active')`;
  const sidebar = tree
    .map((u, i) => {
      const pct = unitPlannedPct(u);
      const n = u.plans.length;
      return `<button type="button" class="sch-unit-btn${i === 0 ? ' active' : ''}" data-unit="${u.id}" onclick="${select(u.id)}">
        <span class="sch-unit-row"><span class="sch-unit-name">${esc(u.title || 'Untitled unit')}</span><span class="sch-unit-pct">${pct}%</span></span>
        <span class="sch-unit-count">${n} lesson${n === 1 ? '' : 's'}</span>
        <span class="sch-unit-bar"><span style="width:${pct}%"></span></span>
      </button>`;
    })
    .join('');
  const panels = tree
    .map((u, i) => `<div class="sch-unit-panel" data-unit="${u.id}"${i === 0 ? '' : ' hidden'}>${renderUnit(u, openReviews, activeJobs)}</div>`)
    .join('');
  return `<div id="scheme-tree" class="sch-spine">
    <aside class="sch-units">
      <div class="sch-units-head"><span class="sch-units-cap">Units</span>
        <button type="button" class="link sch-units-add" title="Add a unit" aria-label="Add a unit" hx-post="${paths.schemesAddUnit(scheme.id)}" hx-target="#scheme-tree" hx-swap="outerHTML">＋</button>
      </div>
      ${sidebar}
    </aside>
    <div class="sch-lessons">${panels}</div>
  </div>`;
}

// 5.3: convert a downloaded (imported) unit into adapted master lessons for this course.
// 5.7: optionally assign in the same action — lay the converted lessons straight into a group's
// weekly slot, then land on the curriculum map to review.
export function renderConvertPanel(courseId: number, slots: CourseSlot[], defaultStart: string, error?: string): string {
  const slotOpts =
    `<option value="">— don't assign yet —</option>` +
    slots
      .map((s) => `<option value="${s.lessonId}:${s.groupCourseId}">${esc(s.groupName ?? 'group')} · ${weekdayName(s.weekday)} ${esc(s.periodLabel)} (${esc(s.start)})</option>`)
      .join('');
  return `<details class="convert-panel" id="convert-panel"${error ? ' open' : ''}>
    <summary>📥 Convert a downloaded unit for my classes</summary>
    <form hx-post="${paths.schemesCourseConvert(courseId)}" hx-target="#convert-panel" hx-swap="outerHTML" hx-disabled-elt="find button">
      ${error ? `<p class="error">${esc(error)}</p>` : ''}
      <input type="search" name="q" placeholder="find a unit folder… e.g. year_7 or Networks" autocomplete="off"
        hx-get="${paths.schemesCourseConvertSearch(courseId)}" hx-trigger="input changed delay:400ms, search" hx-target="#convert-results" hx-swap="innerHTML">
      <div id="convert-results"><span class="muted">type to search the imported folders…</span></div>
      <div class="convert-assign">
        <label>…and lay into<select name="assign_slot">${slotOpts}</select></label>
        <label>starting from<input type="date" name="assign_start" value="${esc(defaultStart)}"></label>
      </div>
      <button type="submit" class="btn-secondary">✨ Convert the selected unit (AI)</button>
      <p class="muted lay-note">Adds the adapted lessons as a new unit on this course's scheme — the downloaded files are untouched and get linked as sources. If a slot is chosen, the lessons are laid into its upcoming weeks (holidays skipped) and you land on the Map to review.</p>
    </form>
  </details>`;
}

export function renderConvertResults(candidates: UnitCandidate[]): string {
  if (!candidates.length) return '<span class="muted">no unit folders match — try fewer letters</span>';
  return candidates
    .slice(0, 12)
    .map(
      (c, i) =>
        `<label class="convert-opt"><input type="radio" name="folder" value="${esc(c.folder)}"${i === 0 ? ' checked' : ''}>` +
        `<span class="convert-title">${esc(c.title)}</span> <span class="muted">${c.lessonCount} lesson${c.lessonCount === 1 ? '' : 's'}</span>` +
        `<span class="muted convert-folder">${esc(c.folder)}</span></label>`,
    )
    .join('');
}

// The empty state for a course with no scheme yet: author one with AI from a brief (4.4), or
// create an empty one to build by hand. Re-used for the author error path (with a message).
export function renderSchemeEmpty(courseId: number, error?: string, courseName?: string): string {
  const forCourse = courseName ? ` for <strong>${esc(courseName)}</strong>` : '';
  return `<div id="scheme-tree">
    ${error ? `<p class="error">${esc(error)}</p>` : ''}
    <p class="muted">No scheme of work yet${forCourse}.</p>
    <form class="scheme-author" hx-post="${paths.schemesAuthor(courseId)}" hx-target="#scheme-tree" hx-swap="outerHTML" hx-disabled-elt="find button">
      <label>Author a scheme of work${forCourse} with AI — describe the aims, topics and level
        <textarea name="brief" rows="4" required placeholder="e.g. A KS3 scheme on using computers effectively in school: logging in and file management, online safety, word processing, spreadsheets, presentations, and finding and evaluating information…"></textarea>
      </label>
      <button type="submit" class="btn-secondary">✨ Author scheme with AI</button>
      <span class="muted scheme-author-hint">a full scheme can take ~20s</span>
    </form>
    <p class="muted">…or <button type="button" class="link" hx-post="${paths.schemesCreate(courseId)}">create an empty one</button> to build by hand.</p>
  </div>`;
}

function chips(labels: string | null): string {
  const ls = (labels ?? '').split(',').map((l) => l.trim()).filter(Boolean);
  return ls.length ? ls.map((l) => `<span class="label-chip">${esc(l)}</span>`).join(' ') : '<span class="muted">none</span>';
}

// The labels sub-block (re-rendered on save).
export function renderSchemeLabels(schemeId: number, labels: string | null): string {
  return `<span class="scheme-labels" id="scheme-${schemeId}-labels">
    <span class="muted">Labels:</span> ${chips(labels)}
    <input class="label-input" name="labels" value="${esc(labels ?? '')}" placeholder="e.g. Year 7, Computer skills"
      hx-post="${paths.schemesLabels(schemeId)}" hx-trigger="change, blur" hx-target="#scheme-${schemeId}-labels" hx-swap="outerHTML">
  </span>`;
}

// Move / delete / label controls for the currently-viewed scheme.
export function renderSchemeControls(scheme: SchemeHeader, courses: Array<{ id: number; name: string }>): string {
  const opts = courses
    .filter((c) => Number(c.id) !== Number(scheme.courseId))
    .map((c) => `<option value="${c.id}">${esc(c.name)}</option>`)
    .join('');
  return `<div class="scheme-controls">
    ${renderSchemeLabels(scheme.id, scheme.labels)}
    <span class="scheme-admin">
      <label class="inline muted">Move to
        <select name="course" hx-post="${paths.schemesMoveCourse(scheme.id)}" hx-trigger="change"><option value="">— course —</option>${opts}</select>
      </label>
      <button type="button" class="link danger" hx-post="${paths.schemesDelete(scheme.id)}" hx-confirm="Delete this whole scheme of work (its units and lessons)? This cannot be undone.">🗑 delete scheme</button>
    </span>
  </div>`;
}

// A collapsible overview of every scheme across all courses — for finding and organising them.
export function renderAllSchemes(schemes: SchemeListRow[], currentId?: number): string {
  if (schemes.length === 0) return '';
  const items = schemes
    .map(
      (s) => `<li${Number(s.id) === currentId ? ' class="current"' : ''}>
        <a href="${paths.schemesCourseScheme(s.courseId, s.id)}">${esc(s.title)}</a>
        <span class="muted">· ${esc(s.courseName)} · ${s.units}u / ${s.plans}L</span> ${chips(s.labels)}
        <a class="link" href="${paths.schemesExport(s.id)}" title="export this scheme to a file to share with a colleague">⬇ share</a>
      </li>`,
    )
    .join('');
  return `<details class="all-schemes">
    <summary>All schemes (${schemes.length})</summary>
    <ul class="all-schemes-list">${items}</ul>
  </details>`;
}

// Per-course teaching-context editor (4.4.1): autosaving textarea. The cohort/pedagogy guidance
// here is auto-prepended to every AI request for this course. Cohort-level prose only — no pupil names.
export function renderTeachingContext(courseId: number, text: string | null): string {
  return `<details class="teaching-ctx">
    <summary>Teaching context — auto-added to every AI request for this course ✨</summary>
    <p class="muted">Cohort and pedagogy guidance the AI always follows for this course. Edit it per course (e.g. tweak for VI pupils or a GCSE class). <strong>Cohort-level only — never name an individual pupil.</strong></p>
    <textarea name="teaching_context" rows="6" hx-post="${paths.schemesCourseContext(courseId)}" hx-trigger="input changed delay:1000ms, blur" hx-swap="none">${esc(text ?? '')}</textarea>
    <span class="note-status" id="course-${courseId}-ctx-status"></span>
  </details>`;
}

// ── Classes-matrix lens (SPEC §8/§ schemes): units × classes, each cell the delivery status of that
// lesson for that class — taught (date, green) · today (teal) · planned (date, plain) · not placed (dashed),
// with △ when the class has its own adaptation. Read-only; placement/editing live on the Map + lesson.
export interface ClassesMatrixData {
  classes: Array<{ groupCourseId: number; name: string }>;
  units: Array<{ title: string; lessons: Array<{ id: number; title: string }> }>;
  // keyed `${groupCourseId}:${lessonPlanId}` → the class's placement of that lesson
  placements: Record<string, { date: string; adapted: boolean }>;
  today: string;
}

function fmtMatrixDate(iso: string): string {
  // "2026-06-23" → "23 Jun" (display-only; no Date parsing surprises — split the ISO string).
  const [, m, d] = iso.split('-');
  const MON = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(d)} ${MON[Number(m)] ?? ''}`;
}

export function renderClassesMatrix(data: ClassesMatrixData): string {
  const { classes, units, placements, today } = data;
  if (!classes.length) {
    return `<div id="scheme-tree" class="sch-matrix-empty"><p class="muted">No classes are timetabled for this course yet — the matrix shows which lessons each class has reached once they are.</p></div>`;
  }
  const cols = `minmax(150px, 1.4fr) repeat(${classes.length}, minmax(84px, 1fr))`;
  const headRow = `<div class="sch-mx-row sch-mx-head" style="grid-template-columns:${cols}">
    <div class="sch-mx-cell sch-mx-corner">Lesson</div>
    ${classes.map((c) => `<div class="sch-mx-cell sch-mx-classname">${esc(c.name)}</div>`).join('')}
  </div>`;

  const cell = (gc: number, planId: number): string => {
    const p = placements[`${gc}:${planId}`];
    if (!p) return `<div class="sch-mx-cell sch-mx-na" title="not placed for this class">·</div>`;
    const kind = p.date < today ? 'taught' : p.date === today ? 'today' : 'planned';
    const label = kind === 'today' ? 'today' : fmtMatrixDate(p.date);
    const adapt = p.adapted ? '<span class="sch-mx-adapt" title="adapted for this class">△</span>' : '';
    return `<div class="sch-mx-cell sch-mx-${kind}" title="${kind}${kind === 'today' ? '' : ` · ${esc(p.date)}`}${p.adapted ? ' · adapted for this class' : ''}"><span>${esc(label)}</span>${adapt}</div>`;
  };

  const body = units
    .map((u) => {
      const lessonRows = u.lessons
        .map(
          (l) => `<div class="sch-mx-row" style="grid-template-columns:${cols}">
            <div class="sch-mx-cell sch-mx-lesson" title="${esc(l.title)}">${esc(l.title)}</div>
            ${classes.map((c) => cell(c.groupCourseId, l.id)).join('')}
          </div>`,
        )
        .join('');
      return `<div class="sch-mx-unit">${esc(u.title || 'Untitled unit')}</div>${lessonRows || '<p class="muted sch-mx-emptyunit">no lessons</p>'}`;
    })
    .join('');

  const legend = `<p class="sch-mx-legend">
    <span class="sch-mx-key sch-mx-taught">▦</span> taught (date) ·
    <span class="sch-mx-key sch-mx-today">▦</span> today ·
    <span class="sch-mx-key sch-mx-planned">▦</span> planned ·
    <span class="sch-mx-key sch-mx-na">·</span> not placed ·
    <span class="sch-mx-adapt">△</span> adapted for class</p>`;

  return `<div id="scheme-tree" class="sch-matrix-wrap"><div class="sch-matrix">${headRow}${body}</div>${legend}</div>`;
}

export interface SchemesNextData {
  courseId: number;
  currentCourseName: string;
  scheme: any;
  courses: Array<{ id: number; name: string }>;
  versions: Array<{ id: number; version: number; active: boolean }>;
  unitCount: number;
  lessonCount: number;
  lens: 'spine' | 'classes';
  treeHtml: string;
  matrixHtml: string;
  teachingCtxHtml: string;
  allSchemesHtml: string;
  convertPanelHtml: string;
  csrf: string;
}

export function renderSchemesNext(data: SchemesNextData): string {
  const {
    courseId,
    currentCourseName,
    scheme,
    courses,
    versions,
    unitCount,
    lessonCount,
    lens,
    treeHtml,
    matrixHtml,
    teachingCtxHtml,
    allSchemesHtml,
    convertPanelHtml,
    csrf,
  } = data;

  const tab = (c: { id: number; name: string }) =>
    `<a href="${paths.schemesCourse(c.id)}" class="chip${Number(c.id) === courseId ? ' active' : ''}">${esc(c.name)}</a>`;

  const verLinks = versions
    .map((v) => `<a href="${paths.schemesCourseScheme(courseId, v.id)}" class="chip sch-ver-chip${scheme && v.id === scheme.id ? ' active' : ''}">v${v.version}${v.active ? '' : ' (draft)'}</a>`)
    .join(' ');

  // The scheme meta header: identity (title · course tag · version·status) + real stats (units /
  // lessons / versions) + the Spine|Classes lens toggle (Classes deferred to a follow-up) + the scheme
  // actions (Make live / new version / ⚙ settings). Stats are computed from live data — no invented
  // coverage figure; spec-coverage/exam stats arrive with the Classes-matrix follow-up.
  const headerCard = scheme
    ? `<section class="card sch-header">
        <div class="sch-header-id">
          <h2 class="sch-header-title">${esc(scheme.title)}</h2>
          <div class="sch-header-tags">
            <span class="badge good">${esc(currentCourseName)}</span>
            <span class="sch-ver">v${scheme.version} · ${scheme.active ? 'live' : 'draft'}</span>
            ${versions.length > 1 ? `<span class="sch-vers" title="switch version">${verLinks}</span>` : ''}
          </div>
        </div>
        <div class="sch-stats">
          <div class="sch-stat"><span class="sch-stat-k">Units</span><span class="sch-stat-v">${unitCount}</span></div>
          <div class="sch-stat"><span class="sch-stat-k">Lessons</span><span class="sch-stat-v">${lessonCount}</span></div>
          <div class="sch-stat"><span class="sch-stat-k">Versions</span><span class="sch-stat-v">${versions.length}</span></div>
        </div>
        <div class="sch-lens" role="group" aria-label="Scheme view">
          <a class="seg${lens === 'spine' ? ' is-on' : ''}"${lens === 'spine' ? ' aria-current="true"' : ''} href="${paths.schemesLens(courseId, 'spine', scheme.id)}">Spine</a>
          <a class="seg${lens === 'classes' ? ' is-on' : ''}"${lens === 'classes' ? ' aria-current="true"' : ''} href="${paths.schemesLens(courseId, 'classes', scheme.id)}">Classes</a>
        </div>
        <div class="sch-header-actions">
          ${scheme.active ? '' : `<button type="button" class="button small" hx-post="${paths.schemesActivate(scheme.id)}" hx-confirm="Make v${scheme.version} the live version for this course? Lessons, coverage and AI adapt will use it from now on; the current live version becomes a draft.">⬆ Make live</button>`}
          <button type="button" class="button small" hx-post="${paths.schemesVersion(scheme.id)}" title="Start a new draft version of this scheme">＋ New version</button>
          <details class="sch-cog">
            <summary class="chip chip-btn" title="Scheme settings — labels, move course, delete">⚙ Scheme</summary>
            ${renderSchemeControls(scheme, courses)}
          </details>
        </div>
      </section>`
    : '';

  return `
    <section class="schemes-overhaul" hx-headers='{"x-csrf-token":"${csrf}"}'>
      <div class="sch-topbar">
        <h1>Schemes of work</h1>
        <a class="ped-link chip" href="${paths.pedagogy()}" title="The AI applies the NCCE 12 principles of computing pedagogy when it plans">📘 pedagogy</a>
      </div>
      <div class="sch-courses task-chips">
        ${courses.map(tab).join(' ')}
      </div>
      <p class="scheme-course">Course: <strong>${esc(currentCourseName)}</strong>
        <button type="button" class="chip chip-btn" hx-post="${paths.schemesCourseSummary(courseId)}" hx-target="#course-${courseId}-summary" hx-swap="innerHTML" hx-disabled-elt="this">✨ summarise this course's notes</button>
      </p>
      <div id="course-${courseId}-summary"></div>
      ${headerCard}
      ${teachingCtxHtml}
      <p class="sch-spot"><button type="button" class="chip chip-btn" title="Spot-check one random lesson from across your whole curriculum — a single AI review, to catch issues without reviewing everything (only when the reviewer is on in Settings → AI)"
        hx-post="${paths.schemesSpotCheck()}" hx-target="#spot-check-slot" hx-swap="innerHTML" hx-disabled-elt="this">🎲 Spot-check a random lesson (AI)</button></p>
      <div id="spot-check-slot"></div>
      ${lens === 'classes' ? matrixHtml : treeHtml}
      <h2 class="sch-divider">Add or import content</h2>
      ${convertPanelHtml}
      <details class="scheme-import">
        <summary>Import a shared scheme (from a colleague's file)</summary>
        <p class="muted">Paste a scheme JSON exported from another instance. It's added as a new scheme on <strong>${esc(currentCourseName)}</strong>.</p>
        <form hx-post="${paths.schemesImport()}" hx-target="#scheme-import-result" hx-swap="innerHTML">
          <input type="hidden" name="course" value="${courseId}">
          <textarea name="json" rows="5" placeholder='{"version":1,"schemeTitle":"…","units":[…]}' style="width:100%"></textarea>
          <button type="submit" class="btn-secondary">Import scheme</button>
        </form>
        <div id="scheme-import-result"></div>
      </details>
      <h2 class="sch-divider">Reference &amp; admin</h2>
      <details class="kit-avail" id="kit-avail">
        <summary>🔧 Kit available</summary>
        <div hx-get="${paths.kitPanel()}" hx-trigger="toggle from:#kit-avail once" hx-target="this" hx-swap="innerHTML"><span class="muted">…</span></div>
      </details>
      ${allSchemesHtml}
    </section>
  `;
}
