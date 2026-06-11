import { esc } from './html';
import type { PlanRow, SchemeHeader, UnitWithPlans } from '../services/scheme';
import type { SchemeListRow } from '../repos/schemes';
import type { CourseSlot, LaidLesson } from '../repos/delivery';
import { weekdayName } from '../services/delivery';
import type { UnitCandidate } from '../services/convertUnit';

function rowActions(kind: 'unit' | 'plan', id: number, confirm: string): string {
  return `<span class="row-actions">
    <button type="button" class="link" title="Move ${kind} up" aria-label="Move ${kind} up" hx-post="/schemes/${kind}/${id}/move/up" hx-target="#scheme-tree" hx-swap="outerHTML">▲</button>
    <button type="button" class="link" title="Move ${kind} down" aria-label="Move ${kind} down" hx-post="/schemes/${kind}/${id}/move/down" hx-target="#scheme-tree" hx-swap="outerHTML">▼</button>
    <button type="button" class="link danger" title="Delete ${kind}" aria-label="Delete ${kind}" hx-post="/schemes/${kind}/${id}/delete" hx-target="#scheme-tree" hx-swap="outerHTML" hx-confirm="${esc(confirm)}">✕</button>
  </span>`;
}

export function renderPlan(p: PlanRow, opts: { open?: boolean; draftStatus?: string } = {}): string {
  const save = (t: string) => `hx-post="/schemes/plan/${p.id}" hx-swap="none" hx-trigger="${t}"`;
  return `<li class="plan" id="plan-${p.id}">
    <div class="row-head">
      <input class="plan-title" type="text" name="title" value="${esc(p.title)}" placeholder="Lesson plan…" ${save('input changed delay:600ms, blur')}>
      <span class="note-status" id="plan-${p.id}-status"></span>
      ${rowActions('plan', p.id, 'Delete this lesson plan?')}
    </div>
    <details class="plan-detail" id="plan-${p.id}-detail"${opts.open ? ' open' : ''}>
      <summary>objectives · outline · ${p.durationMin ? esc(String(p.durationMin)) + ' min' : 'duration'}</summary>
      <div class="plan-ai">
        <button type="button" class="btn-secondary" hx-post="/schemes/plan/${p.id}/draft" hx-target="#plan-${p.id}" hx-swap="outerHTML" hx-disabled-elt="this">✨ Draft with AI</button>
        <span class="plan-draft-status" id="plan-${p.id}-draft">${esc(opts.draftStatus ?? '')}</span>
      </div>
      <label>Objectives<textarea name="objectives" rows="2" ${save('input changed delay:800ms, blur')}>${esc(p.objectives ?? '')}</textarea></label>
      <label>Outline<textarea name="outline" rows="3" ${save('input changed delay:800ms, blur')}>${esc(p.outline ?? '')}</textarea></label>
      <label>Duration (min) <input type="number" name="duration_min" min="0" value="${p.durationMin ?? ''}" ${save('input changed delay:600ms, blur')}></label>
      <div class="plan-res-head">Resources</div>
      <div class="plan-res-slot" hx-get="/schemes/plan/${p.id}/resources" hx-trigger="toggle from:#plan-${p.id}-detail once" hx-target="this" hx-swap="innerHTML">
        <span class="muted">resources load when opened…</span>
      </div>
    </details>
  </li>`;
}

function renderUnit(u: UnitWithPlans): string {
  const save = (t: string) => `hx-post="/schemes/unit/${u.id}" hx-swap="none" hx-trigger="${t}"`;
  return `<section class="unit" id="unit-${u.id}">
    <div class="row-head">
      <input class="unit-title" type="text" name="title" value="${esc(u.title)}" placeholder="Unit…" ${save('input changed delay:600ms, blur')}>
      <span class="note-status" id="unit-${u.id}-status"></span>
      ${rowActions('unit', u.id, 'Delete this unit and its plans?')}
    </div>
    <ol class="plans">${u.plans.map((p) => renderPlan(p)).join('')}</ol>
    <button type="button" class="link" hx-post="/schemes/unit/${u.id}/plan" hx-target="#scheme-tree" hx-swap="outerHTML">＋ lesson plan</button>
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
  return `<form class="lay-form" hx-post="/schemes/unit/${unitId}/lay-down" hx-target="#unit-${unitId}-lay-result" hx-swap="innerHTML">
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

export function renderSchemeTree(scheme: SchemeHeader, tree: UnitWithPlans[]): string {
  const toggles =
    tree.length > 0
      ? `<p class="tree-tools muted">
          <button type="button" class="link" onclick="this.closest('#scheme-tree').querySelectorAll('details').forEach(d=>d.open=true)">expand all</button> ·
          <button type="button" class="link" onclick="this.closest('#scheme-tree').querySelectorAll('details').forEach(d=>d.open=false)">collapse all</button>
        </p>`
      : '';
  return `<div id="scheme-tree">
    ${toggles}
    ${tree.map(renderUnit).join('')}
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
