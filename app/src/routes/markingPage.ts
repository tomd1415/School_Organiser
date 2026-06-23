// The /marking landing page — reachable from the main menu and the Now screen. Lists the taught
// lessons that have pupil work, most-recently-taught first, with what's left to do (to-confirm /
// needs-a-look), and a button that opens the per-pupil marking modal at the first pupil with work.
import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/guard';
import { layout } from '../lib/html';
import { pool } from '../db/pool';
import { marksEnabled } from '../auth/marksGate';
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
     WHERE o.date <= CURRENT_DATE AND NOT o.is_test /* TEST-LAB-GUARD */
     GROUP BY oc.id, o.date, g.name, c.name, lp.title
     ORDER BY o.date DESC, g.name
     LIMIT 80`,
  );
  return rows;
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

    const body = renderMarkingPage({ rows, toDo, gateNote, csrf });
    return reply.type('text/html').send(layout({ title: 'Marking', body, authed: true, csrfToken: csrf }));
  });
}
