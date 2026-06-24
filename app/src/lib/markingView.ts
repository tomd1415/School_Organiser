import { esc } from './html';
import { markOpenAttrs } from '../routes/markModal';
import { paths } from './paths';

export interface MarkingRow {
  oc: number;
  date: string;
  groupName: string;
  courseName: string;
  lessonTitle: string | null;
  pupilsWithWork: number;
  toConfirm: number;
  needsReview: number;
  marked: number;
  answers: number;
}

function pill(n: number, cls: string, label: string): string {
  return n > 0 ? `<span class="mk-pill ${cls}" title="${label}">${n} ${label}</span>` : '';
}

function rowHtml(r: MarkingRow): string {
  const done = r.marked >= r.answers && r.toConfirm === 0;
  const status = done
    ? `<span class="mk-pill mk-done">✓ all checked</span>`
    : `${pill(r.toConfirm, 'mk-confirm', 'to confirm')}${pill(r.needsReview, 'mk-warn', 'to look at')}${r.marked < r.answers ? `<span class="mk-pill mk-todo">${r.answers - r.marked} unmarked</span>` : ''}`;
  return `<tr class="${done ? 'mk-row-done' : ''}">
    <td class="mk-when">${esc(r.date)}</td>
    <td><strong>${esc(r.groupName)}</strong> <span class="muted">${esc(r.courseName)}</span></td>
    <td>${r.lessonTitle ? esc(r.lessonTitle) : '<span class="muted">—</span>'}</td>
    <td class="mk-num">${r.pupilsWithWork}</td>
    <td class="mk-status">${status}</td>
    <td>
      <button type="button" class="btn-secondary mk-mark" ${markOpenAttrs(paths.occMark(r.oc))}>✎ Mark</button>
      <a class="link mk-atl" href="${paths.occAtl(r.oc)}" title="whole-class attitude-to-learning grid">ATL</a>
    </td>
  </tr>`;
}

export function renderMarkingPage(options: {
  rows: MarkingRow[];
  toDo: MarkingRow[];
  gateNote: string;
  csrf: string;
}): string {
  const { rows, toDo, gateNote, csrf } = options;
  const completedCount = rows.length - toDo.length;

  return `
    <div class="marking-backlog" hx-headers='{"x-csrf-token":"${csrf}"}'>
      <div class="marking-header">
        <h1>Marking</h1>
        <p class="muted">Review and confirm student worksheet answers and AI-suggested marks.</p>
      </div>

      ${gateNote}

      <!-- Stats Summary cards -->
      <div class="stats-grid">
        <div class="stat-card total-queue">
          <span class="stat-label">Total Lessons</span>
          <strong class="stat-value">${rows.length}</strong>
        </div>
        <div class="stat-card pending-queue">
          <span class="stat-label">Need Attention</span>
          <strong class="stat-value">${toDo.length}</strong>
        </div>
        <div class="stat-card completed-queue">
          <span class="stat-label">Fully Checked</span>
          <strong class="stat-value">${completedCount}</strong>
        </div>
      </div>

      <section class="card marking-list-card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Backlog</p>
            <h2>Lessons with work</h2>
          </div>
          <span class="badge">${toDo.length} active tasks</span>
        </div>

        ${rows.length === 0
          ? '<p class="muted" style="padding: 24px;">No pupil work yet. When pupils answer worksheets, their lessons appear here.</p>'
          : `
          <div class="table-container">
            <table class="mk-table">
              <thead>
                <tr>
                  <th>Taught</th>
                  <th>Class</th>
                  <th>Lesson</th>
                  <th>Pupils</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(rowHtml).join('')}
              </tbody>
            </table>
          </div>
          `}
      </section>
    </div>
  `;
}
