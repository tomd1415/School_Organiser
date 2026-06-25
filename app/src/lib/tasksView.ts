import { esc } from './html';
import { renderNewTaskButton, renderTaskList } from './taskView';
import type { GroupOpt, TaskRow } from '../repos/tasks';
import { paths } from './paths';

export interface TasksPageOptions {
  view: 'inbox' | 'open' | 'done' | 'interest';
  csrf: string;
  tasks: TaskRow[];
  groups: GroupOpt[];
  bannerHtml: string;
  counts: { inbox: number; open: number; done: number; interest: number };
}

// Rail & Stage rebuild (SPEC §4): a segmented tab control (Inbox / Open / Done / Interest, with counts) +
// Paste-email + New-task, over the tone-left-border task cards. (The repo's views are urgency-based, so
// the tabs follow the real model — Open/Interest — rather than the mock's Today/Scheduled.)
export function renderTasksPage(options: TasksPageOptions): string {
  const { view, csrf, tasks, groups, bannerHtml, counts } = options;
  const listHtml = renderTaskList(`tasks-list-${view}`, tasks, groups);

  const tab = (v: string, label: string, n: number) =>
    `<a href="${paths.tasksFiltered(v)}" class="seg-tab${v === view ? ' is-on' : ''}" role="tab" aria-selected="${v === view}">${esc(label)}${n ? ` <span class="seg-n">${n}</span>` : ''}</a>`;
  const tabs = [
    tab('inbox', 'Inbox', counts.inbox),
    tab('open', 'Open', counts.open),
    tab('done', 'Done', counts.done),
    tab('interest', '⭐ Interest', counts.interest),
  ].join('');

  const pasteBox = view === 'inbox'
    ? `<details class="paste-box">
        <summary>✉ Paste an email</summary>
        <form hx-post="${paths.tasksPaste()}" hx-target="#tasks-list-inbox" hx-swap="beforeend" hx-on::after-request="if(window.htmxSaved(event))this.reset()">
          <textarea name="email" rows="5" placeholder="Paste the email — its Subject (or first line) becomes the task title…"></textarea>
          <div style="margin-top: 10px;"><button type="submit" class="btn-secondary">Make task</button></div>
        </form>
      </details>`
    : '';

  return `
    <div class="tasks-page" hx-headers='{"x-csrf-token":"${csrf}"}'>
      ${bannerHtml}
      <div class="tasks-head">
        <h1>Tasks</h1>
        <div class="tasks-head-actions">
          ${view === 'inbox' ? renderNewTaskButton('tasks-list-inbox') : ''}
          <a class="chip" href="${paths.recurring()}">Recurring →</a>
        </div>
      </div>

      <div class="seg-tabs" role="tablist" aria-label="Task views">${tabs}</div>

      ${pasteBox}

      <details class="task-calibrate" id="task-calibrate">
        <summary>📊 Calibrate my time estimates</summary>
        <div hx-get="${paths.tasksCalibrate()}" hx-trigger="toggle from:#task-calibrate once" hx-target="this" hx-swap="innerHTML">
          <span class="muted">analysing your timed tasks…</span>
        </div>
      </details>

      ${listHtml}
    </div>
  `;
}
