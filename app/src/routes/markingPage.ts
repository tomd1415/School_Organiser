// The /marking landing page — reachable from the main menu and the Now screen. Lists the taught
// lessons that have pupil work, most-recently-taught first, with what's left to do (to-confirm /
// needs-a-look), and a button that opens the per-pupil marking modal at the first pupil with work.
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/guard';
import { esc } from '../lib/html';
import { layout } from '../lib/html';
import { pool } from '../db/pool';
import { marksEnabled } from '../auth/marksGate';
import { markOpenAttrs } from './markModal';
import { getUiShell } from '../lib/nav';
import { renderMarkingPage } from '../lib/markingView';

interface Row {
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

async function markableLessons(): Promise<Row[]> {
  const { rows } = await pool.query<Row>(
    `SELECT oc.id AS oc, to_char(o.date,'YYYY-MM-DD') AS date,
            g.name AS "groupName", c.name AS "courseName", lp.title AS "lessonTitle",
            count(DISTINCT a.pupil_id)::int AS "pupilsWithWork",
            count(*) FILTER (WHERE m.status = 'suggested')::int AS "toConfirm",
            count(*) FILTER (WHERE m.needs_review)::int AS "needsReview",
            count(m.id)::int AS marked,
            count(a.id)::int AS answers
     FROM occurrence_courses oc
     JOIN lesson_occurrences o ON o.id = oc.occurrence_id
     JOIN group_courses gc ON gc.id = oc.group_course_id
     JOIN groups g ON g.id = gc.group_id
     JOIN courses c ON c.id = gc.course_id
     LEFT JOIN lesson_plans lp ON lp.id = oc.lesson_plan_id
     JOIN pupil_answers a ON a.occurrence_course_id = oc.id AND a.value <> '' AND a.field_key NOT LIKE 'task.%'
     LEFT JOIN pupil_marks m ON m.pupil_answer_id = a.id
     WHERE o.date <= CURRENT_DATE
     GROUP BY oc.id, o.date, g.name, c.name, lp.title
     ORDER BY o.date DESC, g.name
     LIMIT 80`,
  );
  return rows;
}

function pill(n: number, cls: string, label: string): string {
  return n > 0 ? `<span class="mk-pill ${cls}" title="${label}">${n} ${label}</span>` : '';
}

function rowHtml(r: Row): string {
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
    <td><button type="button" class="btn-secondary mk-mark" ${markOpenAttrs(`/lesson/oc/${r.oc}/mark`)}>✎ Mark</button> <a class="link mk-atl" href="/lesson/oc/${r.oc}/atl" title="whole-class attitude-to-learning grid">ATL</a></td>
  </tr>`;
}

export function registerMarkingPageRoutes(app: FastifyInstance): void {
  app.get('/marking', { preHandler: requireAuth }, async (req, reply) => {
    const csrf = reply.generateCsrf();
    const on = await marksEnabled();
    const rows = await markableLessons();
    const toDo = rows.filter((r) => !(r.marked >= r.answers && r.toConfirm === 0));

    const gateNote = on
      ? ''
      : `<p class="mk-gate">Auto-marking is currently <strong>off</strong>. You can still open a lesson to see pupil answers beside the model answers — turn marking on in <a href="/settings">Settings → Auto-marking</a> to record marks.</p>`;

    if (getUiShell() === 'next') {
      const body = renderMarkingPage({ rows, toDo, gateNote, csrf });
      return reply.type('text/html').send(layout({ title: 'Marking', body, authed: true, csrfToken: csrf }));
    }

    const body = `<section class="card">
      <h1>Marking</h1>
      <p class="muted">Lessons with pupil work, most recent first. Open one to mark the class — each pupil's answers sit next to the model answer, the AI's suggested marks are pre-filled, and a <em>Next</em> button walks the class.</p>
      ${gateNote}
      <p class="mk-summary">${rows.length} lesson${rows.length === 1 ? '' : 's'} with work · <strong>${toDo.length}</strong> still need attention</p>
      ${rows.length === 0
        ? '<p class="muted">No pupil work yet. When pupils answer worksheets, their lessons appear here.</p>'
        : `<table class="mk-table">
            <thead><tr><th>Taught</th><th>Class</th><th>Lesson</th><th>Pupils</th><th>Status</th><th></th></tr></thead>
            <tbody>${rows.map(rowHtml).join('')}</tbody>
          </table>`}
    </section>`;
    return reply.type('text/html').send(layout({ title: 'Marking', body, authed: true, csrfToken: csrf }));
  });
}
