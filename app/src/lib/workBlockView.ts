// Pure HTML for the work log: planned vs actual, with the one-tap "diverted" path.
import { esc } from './html';
import { paths } from './paths';
import type { WorkBlockRow } from '../repos/workBlocks';

// §6 status marks: ▢ planned · ▣ done · ⚠ diverted (kept the plan, in amber).
const WB_MARK: Record<string, string> = { planned: '▢', done: '▣', diverted: '⚠' };

export function renderWorkBlockItem(b: WorkBlockRow): string {
  const save = (trigger: string) => `hx-post="${paths.workBlock(b.id)}" hx-swap="none" hx-trigger="${trigger}"`;
  const cls = b.status === 'diverted' ? ' diverted' : b.status === 'done' ? ' done' : '';
  return `<li class="wblock${cls}" id="wblock-${b.id}">
    <input class="wb-plan" type="text" name="planned_note" value="${esc(b.plannedNote ?? '')}" placeholder="Planned: what I'll do…" ${save('input changed delay:600ms, blur')}>
    <input class="wb-actual" type="text" name="actual_note" value="${esc(b.actualNote ?? '')}" placeholder="Actually did… (if different)" ${save('input changed delay:600ms, blur')}>
    <div class="task-actions">
      <span class="wb-status wb-${esc(b.status)}">${WB_MARK[b.status] ?? '▢'} ${esc(b.status)}</span>
      <span class="note-status" id="wblock-${b.id}-status"></span>
      <button type="button" class="link" hx-post="${paths.workBlockDone(b.id)}" hx-target="#wblock-${b.id}" hx-swap="outerHTML">✓ done</button>
      <button type="button" class="link" hx-post="${paths.workBlockDiverted(b.id)}" hx-target="#wblock-${b.id}" hx-swap="outerHTML">⚠ diverted</button>
      <button type="button" class="link danger" hx-post="${paths.workBlockDelete(b.id)}" hx-target="#wblock-${b.id}" hx-swap="outerHTML">delete</button>
    </div>
  </li>`;
}

export function renderWorkLog(blocks: WorkBlockRow[]): string {
  return `<ul class="tasks-list notes-list" id="worklog">${blocks.map(renderWorkBlockItem).join('')}</ul>`;
}

export function renderNewBlockButton(date: string): string {
  return `<button type="button" class="btn-secondary" data-new-note hx-post="${paths.workBlocks()}" hx-vals='${JSON.stringify({ date })}' hx-target="#worklog" hx-swap="beforeend">＋ Log a block</button>`;
}
