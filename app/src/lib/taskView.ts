// Pure HTML for task items (inline-editable, HTMX-autosaved) — the same pattern as
// notesView. CSRF comes from an hx-headers ancestor. Returned by the /tasks endpoints.
import { esc } from './html';
import { LOAD_LABELS, LOADS, URGENCIES, URGENCY_LABELS } from '../services/task';
import type { GroupOpt, TaskRow } from '../repos/tasks';

function enumOptions(values: readonly string[], labels: Record<string, string>, current: string | null, none?: string): string {
  const head = none ? `<option value=""${current ? '' : ' selected'}>${esc(none)}</option>` : '';
  return (
    head +
    values.map((v) => `<option value="${esc(v)}"${v === current ? ' selected' : ''}>${esc(labels[v] ?? v)}</option>`).join('')
  );
}

function groupOptions(groups: GroupOpt[], current: number | null): string {
  return (
    `<option value=""${current == null ? ' selected' : ''}>— group —</option>` +
    groups.map((g) => `<option value="${g.id}"${g.id === current ? ' selected' : ''}>${esc(g.name)}</option>`).join('')
  );
}

export function renderTaskItem(t: TaskRow, groups: GroupOpt[]): string {
  const save = (trigger: string) => `hx-post="/tasks/${t.id}" hx-swap="none" hx-trigger="${trigger}"`;
  const triage =
    t.status === 'inbox'
      ? `<button type="button" class="link" hx-post="/tasks/${t.id}/triage" hx-target="#task-${t.id}" hx-swap="outerHTML">▶ open</button>`
      : '';
  const detail = (t.detail ?? '').trim();
  return `<li class="task" id="task-${t.id}">
    <input class="task-title" type="text" name="title" value="${esc(t.title)}" placeholder="Task…" ${save('input changed delay:600ms, blur')}>
    ${detail ? `<details class="task-detail"><summary>✉ what it says</summary><p class="task-detail-body">${esc(detail).replace(/\n/g, '<br>')}</p></details>` : ''}
    <div class="task-controls">
      <select name="urgency" ${save('change')}>${enumOptions(URGENCIES, URGENCY_LABELS, t.urgency)}</select>
      <input class="task-est" type="number" name="estimate_min" min="0" step="5" value="${t.estimateMin ?? ''}" placeholder="min" ${save('input changed delay:600ms, blur')}>
      <select name="cognitive_load" ${save('change')}>${enumOptions(LOADS, LOAD_LABELS, t.cognitiveLoad, '— load —')}</select>
      <select name="group_id" ${save('change')}>${groupOptions(groups, t.groupId)}</select>
      <input class="task-ctx" type="text" name="context" value="${esc(t.context ?? '')}" placeholder="context" ${save('input changed delay:600ms, blur')}>
      <span class="note-status" id="task-${t.id}-status"></span>
    </div>
    <div class="task-actions">
      ${triage}
      <button type="button" class="link${t.interest ? ' on' : ''}" title="Current interest" hx-post="/tasks/${t.id}/interest" hx-target="#task-${t.id}" hx-swap="outerHTML">${t.interest ? '⭐' : '☆'}</button>
      ${t.status === 'done' || t.status === 'dropped' ? '' : `<button type="button" class="link" hx-post="/timer/start" hx-vals='{"task":${t.id}}' hx-target="#timer-banner" hx-swap="outerHTML">▶ time</button>`}
      <button type="button" class="link" hx-post="/tasks/${t.id}/done" hx-target="#task-${t.id}" hx-swap="outerHTML">✓ done</button>
      <button type="button" class="link danger" hx-post="/tasks/${t.id}/drop" hx-target="#task-${t.id}" hx-swap="outerHTML">drop</button>
    </div>
  </li>`;
}

export function renderTaskList(listId: string, tasks: TaskRow[], groups: GroupOpt[]): string {
  return `<ul class="tasks-list notes-list" id="${esc(listId)}">${tasks.map((t) => renderTaskItem(t, groups)).join('')}</ul>`;
}

export function renderNewTaskButton(listId: string): string {
  return `<button type="button" class="btn-secondary" data-new-note hx-post="/tasks" hx-target="#${esc(listId)}" hx-swap="beforeend">＋ New task</button>`;
}
