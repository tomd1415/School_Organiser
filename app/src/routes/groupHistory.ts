// Phase 6.9: this class across the years. Walks the predecessor chain both ways from any group
// row and shows, per year: the name it had, its courses + per-class teaching contexts, what was
// covered (bound lessons + stopping points) and the notes record. Read-only — the archive view
// that makes "knowledge follows the group" visible.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { pool } from '../db/pool';

interface ChainGroup {
  id: number;
  name: string;
  yearGroup: string | null;
  yearName: string;
  isCurrent: boolean;
}

async function chainFor(groupId: number): Promise<ChainGroup[]> {
  // recursive both directions: ancestors via predecessor links, descendants via reverse links
  const { rows } = await pool.query<ChainGroup>(
    `WITH RECURSIVE back AS (
       SELECT g.* FROM groups g WHERE g.id = $1
       UNION ALL
       SELECT p.* FROM groups p JOIN back b ON b.predecessor_group_id = p.id
     ), fwd AS (
       SELECT g.* FROM groups g WHERE g.id = $1
       UNION ALL
       SELECT s.* FROM groups s JOIN fwd f ON s.predecessor_group_id = f.id
     ), chain AS (
       SELECT * FROM back UNION SELECT * FROM fwd
     )
     SELECT c.id, c.name, c.year_group AS "yearGroup", y.name AS "yearName", y.is_current AS "isCurrent"
     FROM chain c JOIN academic_years y ON y.id = c.academic_year_id
     ORDER BY y.start_date`,
    [groupId],
  );
  return rows;
}

export function registerGroupHistoryRoutes(app: FastifyInstance): void {
  app.get('/group/:id/history', { preHandler: requireAuth }, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
    const csrf = reply.generateCsrf();
    if (!p.success) return reply.code(400).send('');
    try {
      const chain = await chainFor(p.data.id);
      if (!chain.length) return reply.code(404).type('text/html').send(layout({ title: 'Group', body: '<section class="card"><p class="muted">Group not found.</p></section>', authed: true, csrfToken: csrf }));

      const sections = await Promise.all(
        chain.map(async (g) => {
          const [contexts, coverage, notes] = await Promise.all([
            pool.query<{ course: string; tc: string | null }>(
              `SELECT c.name AS course, gc.teaching_context AS tc
               FROM group_courses gc JOIN courses c ON c.id = gc.course_id
               WHERE gc.group_id = $1 ORDER BY c.name`,
              [g.id],
            ),
            pool.query<{ date: string; title: string | null; stop: string | null; course: string }>(
              `SELECT to_char(o.date, 'YYYY-MM-DD') AS date, lp.title, oc.stopping_point AS stop, c.name AS course
               FROM occurrence_courses oc
               JOIN lesson_occurrences o ON o.id = oc.occurrence_id
               JOIN group_courses gc ON gc.id = oc.group_course_id
               JOIN courses c ON c.id = gc.course_id
               LEFT JOIN lesson_plans lp ON lp.id = oc.lesson_plan_id
               WHERE gc.group_id = $1 AND (oc.lesson_plan_id IS NOT NULL OR oc.stopping_point IS NOT NULL)
               ORDER BY o.date DESC LIMIT 15`,
              [g.id],
            ),
            pool.query<{ date: string; body: string }>(
              `SELECT to_char(coalesce(o.date, n.created_at::date), 'YYYY-MM-DD') AS date, n.body
               FROM notes n
               LEFT JOIN lesson_occurrences o ON o.id = n.occurrence_id
               LEFT JOIN timetabled_lessons tl ON tl.id = o.timetabled_lesson_id
               WHERE (n.group_id = $1 OR tl.group_id = $1) AND n.body <> '' AND NOT n.safeguarding
               ORDER BY 1 DESC LIMIT 15`,
              [g.id],
            ),
          ]);
          const ctxHtml = contexts.rows
            .map((c) => `<li><strong>${esc(c.course)}</strong>${c.tc ? ` — <em>${esc(c.tc)}</em>` : ' <span class="muted">(no class context recorded)</span>'}</li>`)
            .join('');
          const covHtml = coverage.rows
            .map((r) => `<li><span class="map-date">${esc(r.date)}</span> ${esc(r.course)}: ${esc(r.title ?? '—')}${r.stop ? ` <span class="muted">→ ${esc(r.stop)}</span>` : ''}</li>`)
            .join('');
          const notesHtml = notes.rows.map((n) => `<li><span class="map-date">${esc(n.date)}</span> ${esc(n.body.slice(0, 160))}</li>`).join('');
          return `<section class="ld-course" style="border-left-color:${g.isCurrent ? 'var(--accent)' : 'var(--line)'}">
            <h2>${esc(g.name)} <span class="muted">· ${esc(g.yearName)}${g.isCurrent ? ' (current)' : ''}${g.yearGroup ? ` · ${esc(g.yearGroup)}` : ''}</span></h2>
            <details${g.isCurrent ? ' open' : ''}>
              <summary>contexts · coverage · notes</summary>
              <h3 class="kit-cat">Class contexts</h3><ul class="rollover-checks">${ctxHtml || '<li class="muted">none</li>'}</ul>
              <h3 class="kit-cat">Covered (latest 15)</h3><ul class="rollover-checks">${covHtml || '<li class="muted">no delivery record</li>'}</ul>
              <h3 class="kit-cat">Notes (latest 15, safeguarding withheld)</h3><ul class="rollover-checks">${notesHtml || '<li class="muted">none</li>'}</ul>
            </details>
          </section>`;
        }),
      );

      const body = `<section class="card">
        <h1>Class history — ${esc(chain[chain.length - 1]!.name)}</h1>
        <p class="muted">The same class across the years (${chain.map((c) => esc(c.name)).join(' → ')}). The record stays with each year; the knowledge travels with the class.</p>
        ${sections.join('')}
      </section>`;
      return reply.type('text/html').send(layout({ title: 'Class history', body, authed: true, csrfToken: csrf }));
    } catch {
      return reply.type('text/html').send(layout({ title: 'Class history', body: '<section class="card"><p class="muted">Unavailable.</p></section>', authed: true, csrfToken: csrf }));
    }
  });
}
