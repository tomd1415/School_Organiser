// Pure HTML for the work log: planned vs actual, with the one-tap "diverted" path.
import { esc } from './html';
import type { WorkBlockRow } from '../repos/workBlocks';

export function renderWorkBlockItem(b: WorkBlockRow): string {
  const save = (trigger: string) => `hx-post="/work-blocks/${b.id}" hx-swap="none" hx-trigger="${trigger}"`;
  const cls = b.status === 'diverted' ? ' diverted' : b.status === 'done' ? ' done' : '';
  return `<li class="wblock${cls}" id="wblock-${b.id}">
    <input class="wb-plan" type="text" name="planned_note" value="${esc(b.plannedNote ?? '')}" placeholder="Planned: what I'll do…" ${save('input changed delay:600ms, blur')}>
    <input class="wb-actual" type="text" name="actual_note" value="${esc(b.actualNote ?? '')}" placeholder="Actually did… (if different)" ${save('input changed delay:600ms, blur')}>
    <div class="task-actions">
      <span class="wb-status">${esc(b.status)}</span>
      <span class="note-status" id="wblock-${b.id}-status"></span>
      <button type="button" class="link" hx-post="/work-blocks/${b.id}/done" hx-target="#wblock-${b.id}" hx-swap="outerHTML">✓ done</button>
      <button type="button" class="link" hx-post="/work-blocks/${b.id}/diverted" hx-target="#wblock-${b.id}" hx-swap="outerHTML">⚠ diverted</button>
      <button type="button" class="link danger" hx-post="/work-blocks/${b.id}/delete" hx-target="#wblock-${b.id}" hx-swap="outerHTML">delete</button>
    </div>
  </li>`;
}

export function renderWorkLog(blocks: WorkBlockRow[]): string {
  return `<ul class="tasks-list notes-list" id="worklog">${blocks.map(renderWorkBlockItem).join('')}</ul>`;
}

export function renderNewBlockButton(date: string): string {
  return `<button type="button" class="btn-secondary" data-new-note hx-post="/work-blocks" hx-vals='${JSON.stringify({ date })}' hx-target="#worklog" hx-swap="beforeend">＋ Log a block</button>`;
}
