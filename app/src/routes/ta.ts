// The TA view: logs straight into the CURRENT lesson — the effective plan (the class's adapted
// version where one exists) and its resources, strictly read-only — with a "next lesson" tab for
// early arrivals, and a two-part feedback form (how the pupils were / thoughts on the lesson)
// that lands on the teacher's lesson page and in the AI adapt-next-lesson history. No notes, no
// pupil names, no navigation: the global lockdown hook keeps TA sessions on this surface.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { esc } from '../lib/html';
import { classifyDay, resolveNow } from '../services/clock';
import { getClockContext } from '../repos/clock';
import { findOrCreateOccurrence, getOccurrenceCourses, taMayAccessOccurrenceCourse } from '../repos/occurrence';
import { listExceptionsBetween } from '../repos/exceptions';
import { indexDayExceptions, exceptionForLesson, describeException, effectiveRoom, NO_EXCEPTION, type ExceptionEffect } from '../services/exceptions';
import { getEffectiveLesson } from '../repos/adaptations';
import { listResourcesForPlan, listResourcesForAdaptation, type LinkedResource } from '../repos/resources';
import { addTaFeedback, listTaFeedback } from '../repos/taFeedback';
import { formatObjectives, formatOutline } from '../lib/formatLesson';
import { pool } from '../db/pool';
import { renderTaPage, renderLessonBlock as renderLessonBlockOverhaul, renderMyLessonsList, SectionDetails } from '../lib/taView';

function requireTa(req: { session: { get: (k: string) => unknown } }): boolean {
  return req.session.get('authed') === true; // role gating is the global hook; teachers may peek too
}

function taLayout(body: string, csrf: string): string {
  const cssHtml = '<link rel="stylesheet" href="/static/styles.css">';
  const shellAttr = ' data-shell="next"';
  const headerHtml = `<header class="topbar context-header">
        <div class="header-left"><span class="brand">School Organiser · TA view</span></div>
        <div class="header-right">
          <form class="inline" method="post" action="/logout"><input type="hidden" name="_csrf" value="${csrf}"><button type="submit" class="chip chip-btn">Log out</button></form>
        </div>
       </header>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>TA view · School Organiser</title>${cssHtml}</head>
<body${shellAttr}>
  ${headerHtml}
  <main>${body}</main>
  <script src="/static/htmx.min.js"></script>
</body></html>`;
}

interface SlotLesson {
  lessonId: number;
  groupName: string | null;
  roomName: string | null;
  label: string;
  start: string;
  end: string;
  isSelf: boolean;
  staffName: string;
  staffId: number;
}

/** Every lesson running in a given (weekday, slot) — the teacher's own and TA-led ones. */
async function lessonsAt(weekday: number, slotOrder: number): Promise<SlotLesson[]> {
  const { rows } = await pool.query<SlotLesson>(
    `SELECT tl.id AS "lessonId", g.name AS "groupName", r.name AS "roomName",
            p.label, to_char(p.start_time,'HH24:MI') AS start, to_char(p.end_time,'HH24:MI') AS "end",
            s.is_self AS "isSelf", s.name AS "staffName", s.id AS "staffId"
     FROM timetabled_lessons tl
     JOIN period_definitions p ON p.id = tl.period_definition_id
     JOIN staff s ON s.id = tl.staff_id
     LEFT JOIN groups g ON g.id = tl.group_id
     LEFT JOIN rooms r ON r.id = tl.room_id
     WHERE p.weekday = $1 AND p.slot_order = $2 AND tl.purpose IN ('teaching', 'form')
       AND p.academic_year_id = (SELECT id FROM academic_years WHERE is_current)
     ORDER BY s.is_self DESC, g.name`,
    [weekday, slotOrder],
  );
  return rows;
}

/** One timetabled lesson by id, in the SlotLesson shape the lesson block builders expect. */
async function lessonById(lessonId: number): Promise<(SlotLesson & { staffId: number; weekday: number }) | null> {
  const { rows } = await pool.query<SlotLesson & { staffId: number; weekday: number }>(
    `SELECT tl.id AS "lessonId", g.name AS "groupName", r.name AS "roomName",
            p.label, to_char(p.start_time,'HH24:MI') AS start, to_char(p.end_time,'HH24:MI') AS "end",
            s.is_self AS "isSelf", s.name AS "staffName", s.id AS "staffId", p.weekday
     FROM timetabled_lessons tl
     JOIN period_definitions p ON p.id = tl.period_definition_id
     JOIN staff s ON s.id = tl.staff_id
     LEFT JOIN groups g ON g.id = tl.group_id
     LEFT JOIN rooms r ON r.id = tl.room_id
     WHERE tl.id = $1`,
    [lessonId],
  );
  return rows[0] ?? null;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)) + days));
  return d.toISOString().slice(0, 10);
}

async function buildNextGenLessonBlock(l: SlotLesson, date: string, csrf: string, effect: ExceptionEffect): Promise<string> {
  const occId = await findOrCreateOccurrence(l.lessonId, date);
  const sections = await getOccurrenceCourses(occId);
  const sectionDetails: SectionDetails[] = [];
  for (const s of sections) {
    let eff = { adapted: false, objectives: null as string | null, outline: null as string | null, adaptationId: null as number | null };
    let resources: LinkedResource[] = [];
    if (s.lessonPlanId != null) {
      const effLesson = await getEffectiveLesson(s.groupCourseId, s.lessonPlanId, { objectives: s.planObjectives, outline: s.planOutline });
      eff = {
        adapted: effLesson.adapted,
        objectives: effLesson.objectives,
        outline: effLesson.outline,
        adaptationId: effLesson.adaptationId,
      };
      resources = [
        ...(await listResourcesForPlan(s.lessonPlanId)),
        ...(effLesson.adaptationId != null ? await listResourcesForAdaptation(effLesson.adaptationId) : []),
      ];
    }
    const existingFeedback = await listTaFeedback(s.occurrenceCourseId);
    sectionDetails.push({
      occurrenceCourseId: Number(s.occurrenceCourseId),
      groupCourseId: Number(s.groupCourseId),
      lessonPlanId: s.lessonPlanId,
      planTitle: s.planTitle,
      courseName: s.courseName,
      colour: s.colour,
      eff,
      resources,
      existingFeedback: existingFeedback.map(f => ({
        createdAt: f.createdAt,
        pupilsText: f.pupilsText,
        lessonText: f.lessonText,
      })),
    });
  }
  return renderLessonBlockOverhaul(l, date, csrf, effect, sectionDetails);
}

async function buildNextGenMyLessons(staffId: number, fromIso: string, terms: Parameters<typeof classifyDay>[2], taName: string | null): Promise<string> {
  const { rows } = await pool.query<{ lessonId: number; weekday: number; label: string; start: string; groupName: string | null }>(
    `SELECT tl.id AS "lessonId", p.weekday, p.label, to_char(p.start_time,'HH24:MI') AS start, g.name AS "groupName"
     FROM timetabled_lessons tl
     JOIN period_definitions p ON p.id = tl.period_definition_id
     LEFT JOIN groups g ON g.id = tl.group_id
     WHERE tl.staff_id = $1 AND tl.purpose IN ('teaching', 'form')
       AND p.academic_year_id = (SELECT id FROM academic_years WHERE is_current)
     ORDER BY p.weekday, p.slot_order`,
    [staffId],
  );
  const items: Array<{ lessonId: number; iso: string; isToday: boolean; label: string; start: string; groupName: string | null }> = [];
  for (let d = 0; d < 14 && items.length < 12; d++) {
    const iso = addDaysIso(fromIso, d);
    const dow = new Date(`${iso}T12:00:00Z`).getUTCDay() === 0 ? 7 : new Date(`${iso}T12:00:00Z`).getUTCDay();
    if (!classifyDay(iso, dow, terms).isSchoolDay) continue;
    for (const r of rows.filter((x) => x.weekday === dow)) {
      items.push({
        lessonId: r.lessonId,
        iso,
        isToday: d === 0,
        label: r.label,
        start: r.start,
        groupName: r.groupName,
      });
    }
  }
  return renderMyLessonsList(items, taName);
}

export function registerTaRoutes(app: FastifyInstance): void {
  app.get('/ta', async (req, reply) => {
    if (!requireTa(req)) return reply.redirect('/login');
    const csrf = reply.generateCsrf();
    const q = z
      .object({
        which: z.enum(['now', 'next', 'mine']).optional(),
        lesson: z.coerce.number().int().positive().optional(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      })
      .safeParse(req.query);
    const which = (q.success && q.data.which) || 'now';
    const taStaffId = Number(req.session.get('taStaffId') ?? 0);
    const taName = req.session.get('taName');
    let body: string;
    try {
      const ctx = await getClockContext();
      const state = resolveNow(new Date(), ctx);

      {
        let bodyHtml = '';
        if (q.success && q.data.lesson != null && q.data.date) {
          const l = await lessonById(q.data.lesson);
          const dayDiff = Math.abs((Date.parse(q.data.date) - Date.parse(state.isoDate)) / 86400000);
          const allowed = l && dayDiff <= 31 && (l.staffId === taStaffId || req.session.get('role') === 'teacher');
          const exEffect = l
            ? describeException(exceptionForLesson(indexDayExceptions(await listExceptionsBetween(q.data.date, q.data.date)), l.lessonId))
            : NO_EXCEPTION;
          if (!l || !allowed) {
            bodyHtml = `<p class="muted">That lesson isn't available.</p>`;
          } else if (exEffect.mode === 'free') {
            bodyHtml = `<p class="muted">That lesson is off timetable / cancelled on ${esc(q.data.date)}.</p>`;
          } else {
            const block = await buildNextGenLessonBlock(l, q.data.date, csrf, exEffect);
            bodyHtml = `<p class="ld-meta">Preparing ahead: <strong>${esc(q.data.date)}</strong></p>${block}`;
          }
        } else if (which === 'mine' && taStaffId > 0) {
          bodyHtml = await buildNextGenMyLessons(taStaffId, state.isoDate, ctx.terms, taName ?? null);
        } else {
          let chosen: { weekday: number; slotOrder: number; date: string } | null = null;
          if (which === 'now' && state.isSchoolDay && state.current && state.current.slotType === 'lesson') {
            chosen = { weekday: state.weekday, slotOrder: state.current.slotOrder, date: state.isoDate };
          } else if (state.nextTeaching && state.nextTeaching.date === state.isoDate) {
            chosen = { weekday: state.nextTeaching.weekday, slotOrder: state.nextTeaching.slotOrder, date: state.nextTeaching.date };
          }
          if (!chosen) {
            bodyHtml = `<h1>No lesson ${which === 'now' ? 'right now' : 'coming up today'}</h1>
              <p class="muted">${state.isSchoolDay ? 'Check back at lesson time.' : 'No school today.'}</p>`;
          } else {
            const slotLessons = await lessonsAt(chosen.weekday, chosen.slotOrder);
            const mine = taStaffId > 0 ? slotLessons.filter((l) => l.staffId === taStaffId) : slotLessons;
            const dx = indexDayExceptions(await listExceptionsBetween(chosen.date, chosen.date));
            const lessons = mine.filter((l) => describeException(exceptionForLesson(dx, l.lessonId)).mode !== 'free');
            const blocks: string[] = [];
            for (const l of lessons) {
              blocks.push(await buildNextGenLessonBlock(l, chosen.date, csrf, describeException(exceptionForLesson(dx, l.lessonId))));
            }
            bodyHtml = blocks.join('<hr>') || '<p class="muted">Nothing timetabled in this slot.</p>';
          }
        }
        body = renderTaPage({
          which,
          taName: taName ?? null,
          taStaffId,
          csrf,
          bodyHtml,
        });
      }
    } catch (err) {
      app.log.error({ err }, 'TA view failed');
      body = '<section class="card"><h1>TA view</h1><p class="muted">Unavailable right now — please tell the teacher.</p></section>';
    }
    return reply.type('text/html').send(taLayout(body, csrf));
  });

  app.post('/ta/feedback', { preHandler: app.csrfProtection }, async (req, reply) => {
    if (!requireTa(req)) return reply.redirect('/login');
    const b = z
      .object({
        oc: z.coerce.number().int().positive(),
        pupils: z.string().max(4000).default(''),
        lesson: z.string().max(4000).default(''),
        safeguarding: z.string().optional(),
      })
      .safeParse(req.body);
    if (!b.success || (b.data.pupils.trim() === '' && b.data.lesson.trim() === '')) {
      return reply.code(400).type('text/html').send('<p class="error">Write something in at least one box.</p>');
    }
    // Scope: a TA may only file feedback on an occurrence-course for a lesson they may see (their own,
    // or one happening today) — not any oc id they can guess. Teachers peeking are unrestricted.
    if (req.session.get('role') === 'ta') {
      const taStaffId = Number(req.session.get('taStaffId') ?? 0);
      if (!(await taMayAccessOccurrenceCourse(b.data.oc, taStaffId))) {
        return reply.code(403).type('text/html').send('<p class="error">That lesson isn\'t one of yours.</p>');
      }
    }
    await addTaFeedback({
      occurrenceCourseId: b.data.oc,
      pupilsText: b.data.pupils.trim(),
      lessonText: b.data.lesson.trim(),
      safeguarding: b.data.safeguarding === 'true',
    });
    return reply.type('text/html').send(`<div class="ta-fb" id="ta-fb-${b.data.oc}">
      <p class="adapt-note">✓ Sent to the teacher — thank you.${b.data.safeguarding === 'true' ? ' Please also speak to the teacher directly about the safeguarding concern.' : ''}</p>
    </div>`);
  });
}
