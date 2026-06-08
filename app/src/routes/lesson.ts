import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../db/pool';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';

// Phase 1.4 placeholder so timetable cells resolve. Phase 1.5 turns this into the
// real lesson-detail screen (find-or-create the occurrence, notes, plan, splits).
const Query = z.object({
  lesson: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export function registerLessonRoutes(app: FastifyInstance): void {
  app.get('/lesson', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = Query.safeParse(req.query);
    if (!parsed.success) {
      const body = `<section class="card"><h1>Lesson</h1><p>That lesson reference looks wrong.</p><p><a href="/timetable">← Timetable</a></p></section>`;
      return reply.code(400).type('text/html').send(layout({ title: 'Lesson', body, authed: true, csrfToken: reply.generateCsrf() }));
    }
    const { lesson, date } = parsed.data;

    let heading = 'Lesson';
    let courses = '';
    try {
      const { rows } = await pool.query<{ groupName: string | null; purpose: string; courses: string[] }>(
        `SELECT g.name AS "groupName", tl.purpose,
                COALESCE(json_agg(c.name ORDER BY c.name) FILTER (WHERE c.id IS NOT NULL), '[]') AS courses
         FROM timetabled_lessons tl
         LEFT JOIN groups g ON g.id = tl.group_id
         LEFT JOIN timetabled_lesson_courses tlc ON tlc.timetabled_lesson_id = tl.id
         LEFT JOIN group_courses gc ON gc.id = tlc.group_course_id
         LEFT JOIN courses c ON c.id = gc.course_id
         WHERE tl.id = $1
         GROUP BY g.name, tl.purpose`,
        [lesson],
      );
      const r = rows[0];
      if (r) {
        heading = r.groupName ?? r.purpose;
        courses = r.courses.join(' · ');
      }
    } catch {
      // Render without DB.
    }

    const body = `
      <section class="card">
        <p class="kicker">Lesson detail · arriving in Phase 1.5</p>
        <h1>${esc(heading)}</h1>
        ${courses ? `<p>${esc(courses)}</p>` : ''}
        <p class="muted">${esc(date)} — notes, “where we got to”, plan and resources will live here.</p>
        <p><a href="/timetable">← Timetable</a></p>
      </section>`;
    return reply.type('text/html').send(layout({ title: heading, body, authed: true, csrfToken: reply.generateCsrf() }));
  });
}
