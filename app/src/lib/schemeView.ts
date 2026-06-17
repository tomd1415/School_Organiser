import { esc } from './html';
import { formatObjectives, formatOutline } from './formatLesson';
import type { PlanRow, SchemeHeader, UnitWithPlans } from '../services/scheme';
import type { SchemeListRow } from '../repos/schemes';
import type { CourseSlot, LaidLesson } from '../repos/delivery';
import { weekdayName } from '../services/delivery';
import type { UnitCandidate } from '../services/convertUnit';
import type { ReviewRow } from '../repos/reviews';
import type { PlanAdaptation } from '../repos/adaptations';

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
          ? `<button type="button" class="btn-secondary" hx-post="/schemes/review/${r.id}/apply" hx-target="#plan-${r.lessonPlanId}" hx-swap="outerHTML"
              hx-confirm="Apply this review to the master lesson? Every class then starts from the updated version (a class's own adaptation still applies).">⬆ Apply to master</button>`
          : ''
      }
      <button type="button" class="link" hx-post="/schemes/review/${r.id}/dismiss" hx-target="#review-${r.id}" hx-swap="outerHTML">✕ dismiss</button>
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
        <form hx-post="/lesson/plan/${plan.id}/apply-improvement" hx-target="#${id}-status" hx-swap="innerHTML"
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
      <form hx-post="/schemes/course/${courseId}/convert" hx-target="#convert-panel" hx-swap="outerHTML" hx-disabled-elt="find button">
        <input type="hidden" name="folder" value="${esc(folder)}">
        <input type="hidden" name="assign_slot" value="${esc(assignSlot)}">
        <input type="hidden" name="assign_start" value="${esc(assignStart)}">
        <input type="hidden" name="confirm" value="1">
        <button type="submit" class="btn-secondary">✨ Convert again as a new unit</button>
        <button type="button" class="link" hx-get="/schemes/course/${courseId}/convert-panel" hx-target="#convert-panel" hx-swap="outerHTML">Cancel</button>
      </form>
    </div>
  </details>`;
}

function rowActions(kind: 'unit' | 'plan', id: number, confirm: string): string {
  return `<span class="row-actions">
    <button type="button" class="link" title="Move ${kind} up" aria-label="Move ${kind} up" hx-post="/schemes/${kind}/${id}/move/up" hx-target="#scheme-tree" hx-swap="outerHTML">▲</button>
    <button type="button" class="link" title="Move ${kind} down" aria-label="Move ${kind} down" hx-post="/schemes/${kind}/${id}/move/down" hx-target="#scheme-tree" hx-swap="outerHTML">▼</button>
    <button type="button" class="link danger" title="Delete ${kind}" aria-label="Delete ${kind}" hx-post="/schemes/${kind}/${id}/delete" hx-target="#scheme-tree" hx-swap="outerHTML" hx-confirm="${esc(confirm)}">✕</button>
  </span>`;
}

export function renderPlan(p: PlanRow, opts: { open?: boolean; draftStatus?: string; reviewOpen?: boolean } = {}): string {
  const save = (t: string) => `hx-post="/schemes/plan/${p.id}" hx-swap="none" hx-trigger="${t}"`;
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
        <button type="button" class="btn-secondary" hx-post="/schemes/plan/${p.id}/draft" hx-target="#plan-${p.id}" hx-swap="outerHTML" hx-disabled-elt="this">✨ Draft with AI</button>
        <button type="button" class="btn-secondary" title="slides outline + worksheet + support version + answers — stored and linked to this lesson; re-running updates the versions"
          hx-post="/schemes/plan/${p.id}/resources-ai" hx-target="#plan-${p.id}" hx-swap="outerHTML" hx-disabled-elt="this">📄 Generate resources</button>
        <button type="button" class="btn-secondary" title="an AI second opinion on this upcoming lesson, judged against the spec — it suggests; you apply or dismiss (only when the reviewer is enabled in Settings → AI)"
          hx-post="/schemes/plan/${p.id}/review-ai" hx-target="#plan-${p.id}-review" hx-swap="innerHTML" hx-disabled-elt="this">🔎 Review (AI)</button>
        <span class="plan-draft-status" id="plan-${p.id}-draft">${esc(opts.draftStatus ?? '')}</span>
      </div>
      <div class="plan-review" id="plan-${p.id}-review"${opts.reviewOpen ? ` hx-get="/schemes/plan/${p.id}/review" hx-trigger="load" hx-swap="innerHTML"` : ''}></div>
      <details class="adapt-edit"${p.objectives || p.outline ? '' : ' open'}>
        <summary>✏ edit objectives / outline / duration</summary>
        <label>Objectives<textarea name="objectives" rows="2" ${save('input changed delay:800ms, blur')}>${esc(p.objectives ?? '')}</textarea></label>
        <label>Outline<textarea name="outline" rows="3" ${save('input changed delay:800ms, blur')}>${esc(p.outline ?? '')}</textarea></label>
        <label>Duration (min) <input type="number" name="duration_min" min="0" value="${p.durationMin ?? ''}" ${save('input changed delay:600ms, blur')}></label>
        <label>🔧 Kit needed <input type="text" name="kit_needed" value="${esc(p.kitNeeded ?? '')}" placeholder="e.g. 16× micro:bit, batteries, USB leads" ${save('input changed delay:600ms, blur')}></label>
      </details>
      <div class="plan-res-head">Resources</div>
      <div class="plan-res-slot" hx-get="/schemes/plan/${p.id}/resources" hx-trigger="toggle from:#plan-${p.id}-detail once" hx-target="this" hx-swap="innerHTML">
        <span class="muted">resources load when opened…</span>
      </div>
      <details class="plan-compare" id="plan-${p.id}-compare">
        <summary>⚖ Compare classes' versions</summary>
        <div hx-get="/schemes/plan/${p.id}/compare" hx-trigger="toggle from:#plan-${p.id}-compare once" hx-target="this" hx-swap="innerHTML"><span class="muted">loading…</span></div>
      </details>
    </details>
  </li>`;
}

function renderUnit(u: UnitWithPlans, openReviews: ReadonlySet<number>): string {
  const save = (t: string) => `hx-post="/schemes/unit/${u.id}" hx-swap="none" hx-trigger="${t}"`;
  return `<section class="unit" id="unit-${u.id}">
    <div class="row-head">
      <input class="unit-title" type="text" name="title" value="${esc(u.title)}" placeholder="Unit…" ${save('input changed delay:600ms, blur')}>
      <span class="note-status" id="unit-${u.id}-status"></span>
      ${rowActions('unit', u.id, 'Delete this unit and its plans?')}
    </div>
    <ol class="plans">${u.plans.map((p) => renderPlan(p, { reviewOpen: openReviews.has(p.id) })).join('')}</ol>
    <button type="button" class="link" hx-post="/schemes/unit/${u.id}/plan" hx-target="#scheme-tree" hx-swap="outerHTML">＋ lesson plan</button>
    <button type="button" class="link" title="one AI call per lesson; existing documents get new versions"
      hx-post="/schemes/unit/${u.id}/resources-ai" hx-target="#scheme-tree" hx-swap="outerHTML" hx-disabled-elt="this"
      hx-confirm="Generate/update the resource set (slides, worksheet, support, answers) for EVERY lesson in this unit? One AI call per lesson — this can take a few minutes.">📄 resources for all lessons</button>
    <button type="button" class="link" title="an AI second opinion on every upcoming lesson in this unit — it suggests; you apply or dismiss each (only when the reviewer is on in Settings → AI)"
      hx-post="/schemes/unit/${u.id}/review-ai" hx-target="#scheme-tree" hx-swap="outerHTML" hx-disabled-elt="this"
      hx-confirm="Review EVERY lesson in this unit with AI? One call per lesson (lessons that already have an open review are skipped). It only suggests — nothing changes until you apply a review.">🔎 review all lessons</button>
    <button type="button" class="link" title="one AI call — a sequence-level read of the whole unit (order, progression, coverage gaps). Advisory; only when the reviewer is on in Settings → AI"
      hx-post="/schemes/unit/${u.id}/review-sequence" hx-target="#unit-${u.id}-seq" hx-swap="innerHTML" hx-disabled-elt="this">🔎 review the sequence</button>
    <div id="unit-${u.id}-seq"></div>
    <details class="unit-lay" id="unit-${u.id}-lay">
      <summary>📅 Lay into a group's calendar</summary>
      <div class="unit-lay-body" hx-get="/schemes/unit/${u.id}/lay-form" hx-trigger="toggle from:#unit-${u.id}-lay once" hx-target="this" hx-swap="innerHTML"><span class="muted">loading slots…</span></div>
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
  return `<form class="lay-form" hx-post="/schemes/unit/${unitId}/lay-down" hx-target="#unit-${unitId}-lay-result" hx-swap="innerHTML" hx-disabled-elt="find button">
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

export function renderSchemeTree(scheme: SchemeHeader, tree: UnitWithPlans[], openReviews: ReadonlySet<number> = new Set()): string {
  const toggles =
    tree.length > 0
      ? `<p class="tree-tools muted">
          <button type="button" class="link" onclick="this.closest('#scheme-tree').querySelectorAll('details').forEach(d=>d.open=true)">expand all</button> ·
          <button type="button" class="link" onclick="this.closest('#scheme-tree').querySelectorAll('details').forEach(d=>d.open=false)">collapse all</button>
        </p>`
      : '';
  return `<div id="scheme-tree">
    ${toggles}
    ${tree.map((u) => renderUnit(u, openReviews)).join('')}
    <button type="button" class="btn-secondary" hx-post="/schemes/${scheme.id}/unit" hx-target="#scheme-tree" hx-swap="outerHTML">＋ Unit</button>
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
    <form hx-post="/schemes/course/${courseId}/convert" hx-target="#convert-panel" hx-swap="outerHTML" hx-disabled-elt="find button">
      ${error ? `<p class="error">${esc(error)}</p>` : ''}
      <input type="search" name="q" placeholder="find a unit folder… e.g. year_7 or Networks" autocomplete="off"
        hx-get="/schemes/course/${courseId}/convert-search" hx-trigger="input changed delay:400ms, search" hx-target="#convert-results" hx-swap="innerHTML">
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
        `<label class="convert-opt"><input type="radio" name="folder" value="${esc(c.folder)}"${i === 0 ? ' checked' : ''}> ${esc(c.folder)} <span class="muted">(${c.lessonCount} lessons)</span></label>`,
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
    <form class="scheme-author" hx-post="/schemes/author?course=${courseId}" hx-target="#scheme-tree" hx-swap="outerHTML" hx-disabled-elt="find button">
      <label>Author a scheme of work${forCourse} with AI — describe the aims, topics and level
        <textarea name="brief" rows="4" required placeholder="e.g. A KS3 scheme on using computers effectively in school: logging in and file management, online safety, word processing, spreadsheets, presentations, and finding and evaluating information…"></textarea>
      </label>
      <button type="submit" class="btn-secondary">✨ Author scheme with AI</button>
      <span class="muted scheme-author-hint">a full scheme can take ~20s</span>
    </form>
    <p class="muted">…or <button type="button" class="link" hx-post="/schemes/create?course=${courseId}">create an empty one</button> to build by hand.</p>
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
      hx-post="/schemes/${schemeId}/labels" hx-trigger="change, blur" hx-target="#scheme-${schemeId}-labels" hx-swap="outerHTML">
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
        <select name="course" hx-post="/schemes/${scheme.id}/move-course" hx-trigger="change"><option value="">— course —</option>${opts}</select>
      </label>
      <button type="button" class="link danger" hx-post="/schemes/${scheme.id}/delete" hx-confirm="Delete this whole scheme of work (its units and lessons)? This cannot be undone.">🗑 delete scheme</button>
    </span>
  </div>`;
}

// A collapsible overview of every scheme across all courses — for finding and organising them.
export function renderAllSchemes(schemes: SchemeListRow[], currentId?: number): string {
  if (schemes.length === 0) return '';
  const items = schemes
    .map(
      (s) => `<li${Number(s.id) === currentId ? ' class="current"' : ''}>
        <a href="/schemes?course=${s.courseId}&scheme=${s.id}">${esc(s.title)}</a>
        <span class="muted">· ${esc(s.courseName)} · ${s.units}u / ${s.plans}L</span> ${chips(s.labels)}
        <a class="link" href="/schemes/${s.id}/export" title="export this scheme to a file to share with a colleague">⬇ share</a>
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
    <textarea name="teaching_context" rows="6" hx-post="/schemes/course/${courseId}/context" hx-trigger="input changed delay:1000ms, blur" hx-swap="none">${esc(text ?? '')}</textarea>
    <span class="note-status" id="course-${courseId}-ctx-status"></span>
  </details>`;
}
