import { esc } from './html';
import type { PlanRow, SchemeHeader, UnitWithPlans } from '../services/scheme';

function rowActions(kind: 'unit' | 'plan', id: number, confirm: string): string {
  return `<span class="row-actions">
    <button type="button" class="link" hx-post="/schemes/${kind}/${id}/move/up" hx-target="#scheme-tree" hx-swap="outerHTML">▲</button>
    <button type="button" class="link" hx-post="/schemes/${kind}/${id}/move/down" hx-target="#scheme-tree" hx-swap="outerHTML">▼</button>
    <button type="button" class="link danger" hx-post="/schemes/${kind}/${id}/delete" hx-target="#scheme-tree" hx-swap="outerHTML" hx-confirm="${esc(confirm)}">✕</button>
  </span>`;
}

function renderPlan(p: PlanRow): string {
  const save = (t: string) => `hx-post="/schemes/plan/${p.id}" hx-swap="none" hx-trigger="${t}"`;
  return `<li class="plan" id="plan-${p.id}">
    <div class="row-head">
      <input class="plan-title" type="text" name="title" value="${esc(p.title)}" placeholder="Lesson plan…" ${save('input changed delay:600ms, blur')}>
      <span class="note-status" id="plan-${p.id}-status"></span>
      ${rowActions('plan', p.id, 'Delete this lesson plan?')}
    </div>
    <details class="plan-detail" id="plan-${p.id}-detail">
      <summary>objectives · outline · ${p.durationMin ? esc(String(p.durationMin)) + ' min' : 'duration'}</summary>
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
    <ol class="plans">${u.plans.map(renderPlan).join('')}</ol>
    <button type="button" class="link" hx-post="/schemes/unit/${u.id}/plan" hx-target="#scheme-tree" hx-swap="outerHTML">＋ lesson plan</button>
  </section>`;
}

export function renderSchemeTree(scheme: SchemeHeader, tree: UnitWithPlans[]): string {
  return `<div id="scheme-tree">
    ${tree.map(renderUnit).join('')}
    <button type="button" class="btn-secondary" hx-post="/schemes/${scheme.id}/unit" hx-target="#scheme-tree" hx-swap="outerHTML">＋ Unit</button>
  </div>`;
}
