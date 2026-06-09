import { esc } from './html';
import { LOAD_LABELS, LOADS, URGENCIES, URGENCY_LABELS } from '../services/task';
import type { GroupOpt } from '../repos/tasks';
import type { RecurringDef } from '../repos/recurringTasks';

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function enumOptions(values: readonly string[], labels: Record<string, string>, current: string): string {
  return values.map((v) => `<option value="${v}"${v === current ? ' selected' : ''}>${esc(labels[v] ?? v)}</option>`).join('');
}

function patternOptions(groups: GroupOpt[], current: string): string {
  const opts: string[] = [];
  const add = (value: string, label: string) => opts.push(`<option value="${esc(value)}"${value === current ? ' selected' : ''}>${esc(label)}</option>`);
  for (let d = 1; d <= 5; d++) add(`weekly:${d}`, `Weekly · ${DOW[d - 1] ?? ''}`);
  for (let d = 1; d <= 5; d++) add(`every_weeks:2:${d}`, `Fortnightly · ${DOW[d - 1] ?? ''}`);
  for (const dom of [1, 15, 28]) add(`monthly:${dom}`, `Monthly · ${dom}`);
  for (const g of groups) add(`per_lesson:${g.id}`, `Per-lesson · ${g.name}`);
  if (!opts.some((o) => o.includes(`value="${esc(current)}"`))) {
    opts.unshift(`<option value="${esc(current)}" selected>${esc(current)}</option>`);
  }
  return opts.join('');
}

export function renderRecurringItem(def: RecurringDef, groups: GroupOpt[]): string {
  const save = (trigger: string) => `hx-post="/recurring/${def.id}" hx-swap="none" hx-trigger="${trigger}"`;
  const cog = `<option value=""${def.cognitiveLoad ? '' : ' selected'}>— load —</option>${enumOptions(LOADS, LOAD_LABELS, def.cognitiveLoad ?? '')}`;
  return `<li class="task${def.active ? '' : ' inactive'}" id="recur-${def.id}">
    <input class="task-title" type="text" name="title" value="${esc(def.title)}" placeholder="Recurring task…" ${save('input changed delay:600ms, blur')}>
    <div class="task-controls">
      <select name="pattern" ${save('change')}>${patternOptions(groups, def.pattern)}</select>
      <select name="urgency" ${save('change')}>${enumOptions(URGENCIES, URGENCY_LABELS, def.urgency)}</select>
      <input class="task-est" type="number" name="estimate_min" min="0" value="${def.estimateMin ?? ''}" placeholder="min" ${save('input changed delay:600ms, blur')}>
      <select name="cognitive_load" ${save('change')}>${cog}</select>
      <label class="cap-when">lead <input class="event-lead" type="number" name="lead_days" min="0" value="${def.leadDays}" ${save('input changed delay:600ms, blur')}> days</label>
      <span class="note-status" id="recur-${def.id}-status"></span>
    </div>
    <div class="task-actions">
      <button type="button" class="link" hx-post="/recurring/${def.id}/${def.active ? 'deactivate' : 'activate'}" hx-target="#recur-${def.id}" hx-swap="outerHTML">${def.active ? 'pause' : 'resume'}</button>
      <button type="button" class="link danger" hx-post="/recurring/${def.id}/delete" hx-target="#recur-${def.id}" hx-swap="outerHTML" hx-confirm="Delete this recurring task? (existing instances stay)">delete</button>
    </div>
  </li>`;
}

export function renderRecurringList(defs: RecurringDef[], groups: GroupOpt[]): string {
  return `<ul class="tasks-list notes-list" id="recurring-list">${defs.map((d) => renderRecurringItem(d, groups)).join('')}</ul>`;
}

export function renderNewRecurringButton(): string {
  return `<button type="button" class="btn-secondary" data-new-note hx-post="/recurring" hx-target="#recurring-list" hx-swap="beforeend">＋ New recurring task</button>`;
}
