import { esc } from './html';
import { CAPTURED_CATEGORIES, CATEGORY_LABELS, type CapturedItem } from '../services/captured';
import type { GroupOpt } from '../repos/tasks';

function categoryOptions(current: string | null): string {
  return (
    `<option value=""${current ? '' : ' selected'}>— category —</option>` +
    CAPTURED_CATEGORIES.map((c) => `<option value="${c}"${c === current ? ' selected' : ''}>${esc(CATEGORY_LABELS[c] ?? c)}</option>`).join('')
  );
}

function groupOptions(groups: GroupOpt[], current: number | null): string {
  return (
    `<option value=""${current == null ? ' selected' : ''}>— class —</option>` +
    groups.map((g) => `<option value="${g.id}"${g.id === current ? ' selected' : ''}>${esc(g.name)}</option>`).join('')
  );
}

export function renderCapturedItem(item: CapturedItem, groups: GroupOpt[]): string {
  const save = (trigger: string) => `hx-post="/captured/${item.id}" hx-swap="none" hx-trigger="${trigger}"`;
  const flag = (f: string, on: boolean, label: string) =>
    `<button type="button" class="link${on ? ' on' : ''}" hx-post="/captured/${item.id}/flag/${f}" hx-target="#cap-${item.id}" hx-swap="outerHTML">${label}</button>`;
  return `<li class="captured${item.safeguarding ? ' sg' : ''}" id="cap-${item.id}">
    <textarea name="body" rows="2" placeholder="Something you were told…" ${save('input changed delay:600ms, blur')}>${esc(item.body)}</textarea>
    <div class="task-controls">
      <select name="category" ${save('change')}>${categoryOptions(item.category)}</select>
      <label class="cap-when">resurface <input type="date" name="surface_on" value="${esc(item.surfaceOn ?? '')}" ${save('change')}></label>
      <select name="group_id" ${save('change')}>${groupOptions(groups, item.groupId)}</select>
      ${flag('safeguarding', item.safeguarding, '⚑ safeguarding')}
      ${flag('interest', item.interest, '⭐')}
      <span class="note-status" id="cap-${item.id}-status"></span>
    </div>
    <div class="task-actions">
      <button type="button" class="link" hx-post="/captured/${item.id}/to-task" hx-target="#cap-${item.id}" hx-swap="outerHTML">→ make a task</button>
      <button type="button" class="link danger" hx-post="/captured/${item.id}/flag/archived" hx-target="#cap-${item.id}" hx-swap="outerHTML">archive</button>
    </div>
  </li>`;
}

export function renderCapturedList(items: CapturedItem[], groups: GroupOpt[]): string {
  return `<ul class="tasks-list notes-list" id="captured-list">${items.map((i) => renderCapturedItem(i, groups)).join('')}</ul>`;
}

export function renderNewCapturedButton(): string {
  return `<button type="button" class="btn-secondary" data-new-note hx-post="/captured" hx-target="#captured-list" hx-swap="beforeend">＋ Capture</button>`;
}
