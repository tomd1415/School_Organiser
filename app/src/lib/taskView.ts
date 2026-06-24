// Pure HTML for task items (inline-editable, HTMX-autosaved) — the same pattern as
// notesView. CSRF comes from an hx-headers ancestor. Returned by the /tasks endpoints.
import { esc } from './html';
import { LOAD_LABELS, LOADS, URGENCIES, URGENCY_LABELS } from '../services/task';
import type { GroupOpt, TaskRow } from '../repos/tasks';
import { paths } from './paths';

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


// Email-triage detail, rendered for scanning: "• label: value" lines become colour-coded fact
// chips, dates/deadlines/amounts in the prose get highlighted, the provenance line goes muted.
// Plain prose (manual tasks, pre-triage emails) renders unchanged.
const FACT_LINE = /^•\s*([a-z]+):\s*(.+)$/i;
const HL = /(£\s?\d+(?:\.\d{2})?|\b(?:Mon|Tues?|Wedn?e?s?|Thurs?|Fri|Satur|Sun)[a-z]*day\b(?:\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)?)?|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b|\b\d{1,2}[:.]\d{2}\s?(?:am|pm)?\b|\bby\s+(?:Mon|Tues?|Wedn?e?s?|Thurs?|Fri)[a-z]*day\b)/gi;

export function renderEmailDetail(detail: string): string {
  const lines = detail.split('\n').map((l) => l.trim()).filter(Boolean);
  const chips: string[] = [];
  const prose: string[] = [];
  let provenance = '';
  for (const line of lines) {
    const f = line.match(FACT_LINE);
    if (f) {
      const label = f[1]!.toLowerCase();
      chips.push(`<span class="fact fact-${esc(label)}"><span class="fact-label">${esc(label)}</span>${esc(f[2]!)}</span>`);
    } else if (/^\(.*\)$/.test(line) && line.length < 240) {
      provenance = line.slice(1, -1);
    } else {
      prose.push(esc(line).replace(HL, '<mark class="hl">$1</mark>'));
    }
  }
  return `${chips.length ? `<div class="fact-row">${chips.join('')}</div>` : ''}
    ${prose.length ? `<p class="task-detail-prose">${prose.join('<br>')}</p>` : ''}
    ${provenance ? `<p class="task-detail-prov">${esc(provenance)}</p>` : ''}`;
}

export function renderTaskItem(t: TaskRow, groups: GroupOpt[]): string {
  const save = (trigger: string) => `hx-post="${paths.task(t.id)}" hx-swap="none" hx-trigger="${trigger}"`;
  const triage =
    t.status === 'inbox'
      ? `<button type="button" class="link" hx-post="${paths.taskTriage(t.id)}" hx-target="#task-${t.id}" hx-swap="outerHTML">▶ open</button>`
      : '';
  const detail = (t.detail ?? '').trim();
  return `<li class="task" id="task-${t.id}">
    <input class="task-title" type="text" name="title" value="${esc(t.title)}" placeholder="Task…" ${save('input changed delay:600ms, blur')}>
    ${detail ? `<details class="task-detail"><summary>✉ what it says</summary><div class="task-detail-body">${renderEmailDetail(detail)}</div></details>` : ''}
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
      <button type="button" class="link${t.interest ? ' on' : ''}" title="Current interest" hx-post="${paths.taskInterest(t.id)}" hx-target="#task-${t.id}" hx-swap="outerHTML">${t.interest ? '⭐' : '☆'}</button>
      ${t.status === 'done' || t.status === 'dropped' ? '' : `<button type="button" class="link" hx-post="${paths.timerStart()}" hx-vals='{"task":${t.id}}' hx-target="#timer-banner" hx-swap="outerHTML">▶ time</button>`}
      <button type="button" class="link" hx-post="${paths.taskDone(t.id)}" hx-target="#task-${t.id}" hx-swap="outerHTML">✓ done</button>
      <button type="button" class="link danger" hx-post="${paths.taskDrop(t.id)}" hx-target="#task-${t.id}" hx-swap="outerHTML">drop</button>
    </div>
  </li>`;
}

export function renderTaskList(listId: string, tasks: TaskRow[], groups: GroupOpt[]): string {
  return `<ul class="tasks-list notes-list" id="${esc(listId)}">${tasks.map((t) => renderTaskItem(t, groups)).join('')}</ul>`;
}

export function renderNewTaskButton(listId: string): string {
  return `<button type="button" class="btn-secondary" data-new-note hx-post="${paths.tasks()}" hx-target="#${esc(listId)}" hx-swap="beforeend">＋ New task</button>`;
}
