// Phase 16B — homework views (pure data → HTML; URLs via paths.ts). Teacher chase + the pupil's list.
import { esc } from './esc';
import { paths } from './paths';
import type { HomeworkChaseRow, OccurrenceOption } from '../repos/homework';
import type { PupilHomeworkRow } from '../repos/homework';

function dueLabel(dueAtIso: string, todayIso: string): string {
  const due = dueAtIso.slice(0, 10);
  if (due < todayIso) return `<span class="hw-overdue">overdue (${esc(due)})</span>`;
  if (due === todayIso) return `<span class="hw-today">due today</span>`;
  return `due ${esc(due)}`;
}

/** The set-homework picker: choose a recent planned lesson + a due date. */
function renderSetForm(options: OccurrenceOption[], todayIso: string, csrf: string): string {
  const opts = options
    .filter((o) => !o.isHomework)
    .map((o) => `<option value="${o.occurrenceCourseId}">${esc(o.date)} · ${esc(o.label)}${o.planTitle ? ` — ${esc(o.planTitle)}` : ''}</option>`)
    .join('');
  return `<form method="post" action="${paths.homeworkSet()}" class="hw-set-form">
    <input type="hidden" name="_csrf" value="${esc(csrf)}">
    <label>Lesson <select name="oc" required><option value="">choose a lesson…</option>${opts}</select></label>
    <label>Due <input type="date" name="due" value="${esc(todayIso)}" required></label>
    <button type="submit" class="primary">Set as homework</button>
  </form>`;
}

/** The teacher's homework page: set a worksheet as homework + the chase of who still owes it. */
export function renderHomeworkChase(data: { rows: HomeworkChaseRow[]; options?: OccurrenceOption[]; todayIso: string; csrf: string }): string {
  const rows = data.rows.length
    ? data.rows
        .map(
          (r) => `<tr${r.notDone > 0 ? ' class="hw-outstanding"' : ''}>
            <td>${esc(r.className)}</td>
            <td>${dueLabel(r.dueAt, data.todayIso)}</td>
            <td class="num">${r.total - r.notDone}/${r.total} in</td>
            <td>
              <form method="post" action="${paths.homeworkClear()}" class="hw-clear-form">
                <input type="hidden" name="_csrf" value="${esc(data.csrf)}"><input type="hidden" name="oc" value="${r.occurrenceCourseId}">
                <button type="submit" class="link" title="stop chasing this homework">clear</button>
              </form>
            </td>
          </tr>`,
        )
        .join('')
    : '<tr><td colspan="4" class="muted">No homework set. Flag a lesson’s worksheet as homework from its cockpit.</td></tr>';
  return `<section class="card">
    <h1>Homework</h1>
    <p class="muted">Flag a lesson’s worksheet as homework with a due date. Pupils see it in their list; objective answers auto-mark and open answers join the usual marking queue. Each row shows how many have submitted.</p>
    ${data.options ? renderSetForm(data.options, data.todayIso, data.csrf) : ''}
    <h2>Chase</h2>
    <table class="hw-table">
      <thead><tr><th>Class</th><th>Due</th><th class="num">Submitted</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

/** The pupil's outstanding homework list (behind the gate) — links open the worksheet to complete it. */
export function renderPupilHomework(rows: PupilHomeworkRow[], todayIso: string): string {
  if (!rows.length) return '';
  const items = rows
    .map(
      (r) => `<li class="hw-pupil-item">
        <a class="pupil-go primary hw-open" href="${paths.me()}?hw=${r.occurrenceCourseId}">📝 ${esc(r.course)} homework</a>
        <span class="hw-pupil-due">${dueLabel(r.dueAt, todayIso)}</span>
      </li>`,
    )
    .join('');
  return `<section class="pupil-card hw-pupil-card">
    <h2>Your homework</h2>
    <ul class="hw-pupil-list">${items}</ul>
  </section>`;
}
