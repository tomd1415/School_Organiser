import { esc } from './html';
import type { PlanRow, SchemeHeader, UnitWithPlans } from '../services/scheme';

function rowActions(kind: 'unit' | 'plan', id: number, confirm: string): string {
  return `<span class="row-actions">
    <button type="button" class="link" hx-post="/schemes/${kind}/${id}/move/up" hx-target="#scheme-tree" hx-swap="outerHTML">▲</button>
    <button type="button" class="link" hx-post="/schemes/${kind}/${id}/move/down" hx-target="#scheme-tree" hx-swap="outerHTML">▼</button>
    <button type="button" class="link danger" hx-post="/schemes/${kind}/${id}/delete" hx-target="#scheme-tree" hx-swap="outerHTML" hx-confirm="${esc(confirm)}">✕</button>
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
  </section>`;
}

export function renderSchemeTree(scheme: SchemeHeader, tree: UnitWithPlans[]): string {
  return `<div id="scheme-tree">
    ${tree.map(renderUnit).join('')}
    <button type="button" class="btn-secondary" hx-post="/schemes/${scheme.id}/unit" hx-target="#scheme-tree" hx-swap="outerHTML">＋ Unit</button>
  </div>`;
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
