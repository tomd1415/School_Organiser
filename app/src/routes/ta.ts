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
import { getEffectiveLesson } from '../repos/adaptations';
import { listResourcesForPlan, listResourcesForAdaptation, type LinkedResource } from '../repos/resources';
import { addTaFeedback, listTaFeedback } from '../repos/taFeedback';
import { formatObjectives, formatOutline } from '../lib/formatLesson';
import { pool } from '../db/pool';

function requireTa(req: { session: { get: (k: string) => unknown } }): boolean {
  return req.session.get('authed') === true; // role gating is the global hook; teachers may peek too
}

function taLayout(body: string, csrf: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>TA view · School Organiser</title><link rel="stylesheet" href="/static/styles.css"></head>
<body>
  <header class="topbar"><div class="bar-left"><span class="brand">School Organiser · TA view</span></div>
    <form class="inline" method="post" action="/logout"><input type="hidden" name="_csrf" value="${csrf}"><button type="submit" class="link">Log out</button></form>
  </header>
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

async function renderLessonBlock(l: SlotLesson, date: string, csrf: string): Promise<string> {
  const occId = await findOrCreateOccurrence(l.lessonId, date);
  const sections = await getOccurrenceCourses(occId);
  const parts: string[] = [];
  for (const s of sections) {
    let planHtml = '<p class="muted">No plan bound yet for this lesson.</p>';
    let resources: LinkedResource[] = [];
    if (s.lessonPlanId != null) {
      const eff = await getEffectiveLesson(s.groupCourseId, s.lessonPlanId, { objectives: s.planObjectives, outline: s.planOutline });
      planHtml = `
        ${s.planTitle ? `<h3 class="ta-plan-title">${esc(s.planTitle)}${eff.adapted ? ' <span class="adapt-badge on">✏ adapted for this class</span>' : ''}</h3>` : ''}
        ${eff.objectives ? `<div class="oc-block oc-objectives"><span class="oc-label">Objectives</span>${formatObjectives(eff.objectives)}</div>` : ''}
        ${eff.outline ? `<div class="oc-block"><span class="oc-label">Outline</span>${formatOutline(eff.outline)}</div>` : ''}`;
      resources = [
        ...(await listResourcesForPlan(s.lessonPlanId)),
        ...(eff.adaptationId != null ? await listResourcesForAdaptation(eff.adaptationId) : []),
      ];
    }
    const resHtml = resources.length
      ? `<div class="ld-res"><span class="ld-res-label">Resources</span> ${resources
          .map((r) => `<a href="/resources/${r.resourceId}/view" target="_blank" rel="noopener">${esc(r.title)}</a>`)
          .join(' · ')}</div>`
      : '';
    const existing = await listTaFeedback(s.occurrenceCourseId);
    const existingHtml = existing.length
      ? `<ul class="ta-fb-list">${existing.map((f) => `<li><span class="muted">${esc(f.createdAt)}</span> ${esc((f.pupilsText + ' ' + f.lessonText).slice(0, 120))}…</li>`).join('')}</ul>`
      : '';
    parts.push(`
      <section class="ld-course" style="border-left-color:${esc(s.colour ?? '#94a3b8')}">
        <h2>${esc(s.courseName)}</h2>
        ${planHtml}
        ${resHtml}
        <div class="ta-fb" id="ta-fb-${s.occurrenceCourseId}">
          <span class="oc-label">Your feedback for the teacher</span>
          ${existingHtml}
          <form hx-post="/ta/feedback" hx-target="#ta-fb-${s.occurrenceCourseId}" hx-swap="outerHTML">
            <input type="hidden" name="oc" value="${s.occurrenceCourseId}">
            <label class="adapt-l">How were the pupils?<textarea name="pupils" rows="2" placeholder="settled after the starter, two needed movement breaks…"></textarea></label>
            <label class="adapt-l">Thoughts on the lesson<textarea name="lesson" rows="2" placeholder="the card sort worked well; the typing task ran long…"></textarea></label>
            <label class="ta-sg"><input type="checkbox" name="safeguarding" value="true"> safeguarding concern (also tell the teacher in person — flagged items are kept out of AI)</label>
            <button type="submit" class="btn-secondary">Send feedback</button>
          </form>
        </div>
      </section>`);
  }
  return `
    <div class="ta-lesson-head">
      <h1>${esc(l.groupName ?? 'Lesson')}</h1>
      <p class="ld-meta">${esc(l.label)} · ${esc(l.start)}–${esc(l.end)}${l.roomName ? ` · ${esc(l.roomName)}` : ''}${l.isSelf ? '' : ` · led by ${esc(l.staffName)}`}</p>
    </div>
    ${parts.join('') || '<p class="muted">No courses attached to this lesson.</p>'}`;
}

/** One timetabled lesson by id, in the SlotLesson shape renderLessonBlock expects. */
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

/** The named TA's lessons over the next two weeks of school days — "my upcoming lessons" (8.1). */
async function renderMyLessons(staffId: number, fromIso: string, terms: Parameters<typeof classifyDay>[2]): Promise<string> {
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
  const items: string[] = [];
  for (let d = 0; d < 14 && items.length < 12; d++) {
    const iso = addDaysIso(fromIso, d);
    const dow = new Date(`${iso}T12:00:00Z`).getUTCDay() === 0 ? 7 : new Date(`${iso}T12:00:00Z`).getUTCDay();
    if (!classifyDay(iso, dow, terms).isSchoolDay) continue;
    for (const r of rows.filter((x) => x.weekday === dow)) {
      items.push(`<li><a href="/ta?lesson=${r.lessonId}&date=${iso}">${esc(iso)}${d === 0 ? ' (today)' : ''} · ${esc(r.label)} ${esc(r.start)} · ${esc(r.groupName ?? 'lesson')}</a></li>`);
    }
  }
  return `<h1>My upcoming lessons</h1>
    ${items.length ? `<ul class="ta-mine">${items.join('')}</ul>` : '<p class="muted">Nothing timetabled for you in the next two weeks.</p>'}
    <p class="muted">Open one to read its plan and resources ahead of time.</p>`;
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
      const tabs = `<nav class="task-tabs">
        <a href="/ta"${which === 'now' ? ' class="active"' : ''}>This lesson</a>
        <a href="/ta?which=next"${which === 'next' ? ' class="active"' : ''}>Next lesson (if you're early)</a>
        ${taStaffId > 0 ? `<a href="/ta?which=mine"${which === 'mine' ? ' class="active"' : ''}>My lessons</a>` : ''}
      </nav>`;

      // A specific upcoming lesson, opened from "my lessons" (read-only, ±31 days sanity bound).
      if (q.success && q.data.lesson != null && q.data.date) {
        const l = await lessonById(q.data.lesson);
        const dayDiff = Math.abs((Date.parse(q.data.date) - Date.parse(state.isoDate)) / 86400000);
        // A shared-password TA (taStaffId 0) gets no "my lessons" tab and may NOT deep-link to an
        // arbitrary lesson by id — only named TAs (their own staff row) or the teacher peeking.
        const allowed = l && dayDiff <= 31 && (l.staffId === taStaffId || req.session.get('role') === 'teacher');
        if (!l || !allowed) {
          body = `<section class="card">${tabs}<p class="muted">That lesson isn't available.</p></section>`;
        } else {
          const block = await renderLessonBlock(l, q.data.date, csrf);
          body = `<section class="card ta" hx-headers='{"x-csrf-token":"${csrf}"}'>${tabs}
            <p class="ld-meta">Preparing ahead: <strong>${esc(q.data.date)}</strong></p>${block}</section>`;
        }
        return reply.type('text/html').send(taLayout(body, csrf));
      }

      if (which === 'mine' && taStaffId > 0) {
        body = `<section class="card ta">${tabs}${await renderMyLessons(taStaffId, state.isoDate, ctx.terms)}
          ${typeof taName === 'string' && taName ? `<p class="muted">Signed in as ${esc(taName)}.</p>` : ''}</section>`;
        return reply.type('text/html').send(taLayout(body, csrf));
      }
      let chosen: { weekday: number; slotOrder: number; date: string } | null = null;
      if (which === 'now' && state.isSchoolDay && state.current && state.current.slotType === 'lesson') {
        chosen = { weekday: state.weekday, slotOrder: state.current.slotOrder, date: state.isoDate };
      } else if (state.nextTeaching && state.nextTeaching.date === state.isoDate) {
        chosen = { weekday: state.nextTeaching.weekday, slotOrder: state.nextTeaching.slotOrder, date: state.nextTeaching.date };
      }
      if (!chosen) {
        body = `<section class="card">${tabs}<h1>No lesson ${which === 'now' ? 'right now' : 'coming up today'}</h1>
          <p class="muted">${state.isSchoolDay ? 'Check back at lesson time.' : 'No school today.'}</p></section>`;
      } else {
        // A NAMED TA (their own staff row) sees only their own lesson in the slot — not every lesson
        // running that period. Shared-account TAs (taStaffId 0) and the teacher peeking still see all.
        const slotLessons = await lessonsAt(chosen.weekday, chosen.slotOrder);
        const lessons = taStaffId > 0 ? slotLessons.filter((l) => l.staffId === taStaffId) : slotLessons;
        const blocks: string[] = [];
        for (const l of lessons) blocks.push(await renderLessonBlock(l, chosen.date, csrf));
        body = `<section class="card ta" hx-headers='{"x-csrf-token":"${csrf}"}'>${tabs}
          ${blocks.join('<hr>') || '<p class="muted">Nothing timetabled in this slot.</p>'}
        </section>`;
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
