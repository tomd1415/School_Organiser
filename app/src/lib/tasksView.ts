import { esc } from './html';
import { renderNewTaskButton, renderTaskList } from './taskView';
import type { GroupOpt, TaskRow } from '../repos/tasks';

export interface TasksPageOptions {
  view: 'inbox' | 'open' | 'done' | 'interest';
  csrf: string;
  tasks: TaskRow[];
  groups: GroupOpt[];
  bannerHtml: string;
}

export function renderTasksPage(options: TasksPageOptions): string {
  const { view, csrf, tasks, groups, bannerHtml } = options;
  const listHtml = renderTaskList(`tasks-list-${view}`, tasks, groups);

  const chip = (v: string, label: string) =>
    `<a href="/tasks?view=${v}" class="chip${v === view ? ' active' : ''}">${label}</a>`;

  const chips = [
    chip('inbox', 'Inbox'),
    chip('open', 'Open'),
    chip('done', 'Done'),
    chip('interest', '⭐ Interest'),
  ].join(' ');

  const pasteBox = view === 'inbox'
    ? `<details class="paste-box">
        <summary>✉ Paste an email</summary>
        <form hx-post="/tasks/paste" hx-target="#tasks-list-inbox" hx-swap="beforeend" hx-on::after-request="if(window.htmxSaved(event))this.reset()">
          <textarea name="email" rows="5" placeholder="Paste the email — its Subject (or first line) becomes the task title…"></textarea>
          <div style="margin-top: 10px;">
            <button type="submit" class="btn-secondary">Make task</button>
          </div>
        </form>
      </details>`
    : '';

  return `
    <div class="tasks-page" hx-headers='{"x-csrf-token":"${csrf}"}'>
      ${bannerHtml}
      
      <div class="ld-notes-head" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <p class="eyebrow" style="margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted, #666);">Organise</p>
          <h1 style="margin: 0;">Tasks</h1>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          ${view === 'inbox' ? renderNewTaskButton('tasks-list-inbox') : ''}
          <a class="chip" href="/recurring">Recurring tasks →</a>
        </div>
      </div>

      <div class="task-chips" style="margin-bottom: 20px; display: flex; gap: 8px; flex-wrap: wrap;">
        ${chips}
      </div>

      <details class="task-calibrate card" id="task-calibrate" style="margin-bottom: 20px; padding: 12px;">
        <summary style="cursor: pointer; font-weight: 500;">📊 Calibrate my time estimates</summary>
        <div style="margin-top: 12px;" hx-get="/tasks/calibrate" hx-trigger="toggle from:#task-calibrate once" hx-target="this" hx-swap="innerHTML">
          <span class="muted">analysing your timed tasks…</span>
        </div>
      </details>

      ${pasteBox}

      <section class="card" style="margin-top: 20px;">
        ${listHtml}
      </section>
    </div>
  `;
}
