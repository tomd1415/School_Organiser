import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import {
  findOrCreateOccurrence,
  getLastStoppingPoints,
  getOccurrenceCourses,
  getOccurrenceHeader,
  getOccurrenceNotes,
  setOccurrenceCoursePlan,
} from '../repos/occurrence';
import { getLessonPlan, listCoursePlans } from '../repos/schemes';
import { listResourcesForPlan, type LinkedResource } from '../repos/resources';
import { getFollowupsForOccurrence } from '../repos/notes';
import { buildLessonDetail, type CourseSection, type LessonDetail } from '../services/occurrence';
import { renderLinkedResources } from '../lib/resourceView';
import { renderNewNoteButton, renderNotesList, renderSavedStatus, type FollowupItem, type NoteItem } from '../lib/notesView';
import { listOccurrencePrep, type PrepItem } from '../repos/prep';
import { renderPrepList } from '../lib/prepView';

const TZ = 'Europe/London';
const Query = z.object({
  lesson: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function purposeLabel(purpose: string): string {
  const map: Record<string, string> = {
    free: 'Free period',
    form: 'Form',
    club: 'Computing Club',
    open_room: 'Open room',
    duty: 'Duty',
    meeting: 'Meeting',
  };
  return map[purpose] ?? 'Lesson';
}

function fmtLong(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${iso}T12:00:00Z`));
}

function errorPage(reply: { generateCsrf: () => string }, code: number, message: string) {
  const body = `<section class="card"><h1>Lesson</h1><p>${esc(message)}</p><p><a href="/timetable">← Timetable</a></p></section>`;
  return { code, html: layout({ title: 'Lesson', body, authed: true, csrfToken: reply.generateCsrf() }) };
}

function renderPlanContent(ocId: number, title: string | null, objectives: string | null, outline: string | null, oob = false): string {
  const detail = `${objectives ? `<p><strong>Objectives:</strong> ${esc(objectives)}</p>` : ''}${outline ? `<p><strong>Outline:</strong> ${esc(outline)}</p>` : ''}`;
  const inner = title ? detail || '<span class="muted">(plan has no detail yet)</span>' : '<span class="muted">No plan bound.</span>';
  return `<div id="oc-${ocId}-plan" class="oc-plan"${oob ? ' hx-swap-oob="true"' : ''}>${inner}</div>`;
}

function renderSection(s: CourseSection, plans: Array<{ id: number; title: string }>, resources: LinkedResource[]): string {
  const colour = s.colour ?? '#94a3b8';
  const oc = s.occurrenceCourseId;
  const planOpts =
    `<option value=""${s.lessonPlanId == null ? ' selected' : ''}>— no plan —</option>` +
    plans.map((p) => `<option value="${p.id}"${p.id === s.lessonPlanId ? ' selected' : ''}>${esc(p.title)}</option>`).join('');
  const last = s.lastStop
    ? `<p class="ld-last">Last time → stopped at <strong>${esc(s.lastStop.stoppingPoint)}</strong> <span class="muted">(${esc(s.lastStop.date)})</span></p>`
    : '';
  return `
    <section class="ld-course" style="border-left-color:${esc(colour)}">
      <h2>${esc(s.courseName)}</h2>
      <label class="stop-label">Plan
        <select name="lesson_plan_id" hx-post="/occurrence-course/${oc}/plan" hx-trigger="change" hx-swap="none">${planOpts}</select>
        <a class="link" href="/schemes?course=${s.courseId}">edit →</a>
        <span class="note-status" id="oc-${oc}-plan-status"></span>
      </label>
      ${renderPlanContent(oc, s.planTitle, s.planObjectives, s.planOutline)}
      <div class="ld-res"><span class="ld-res-label">Resources</span> ${renderLinkedResources(resources)}</div>
      ${last}
      <label class="stop-label">Stopping point
        <input class="stop-input" name="stopping_point" value="${esc(s.stoppingPoint ?? '')}" placeholder="where we got to…"
          hx-post="/occurrence-course/${oc}/stopping" hx-trigger="input changed delay:800ms, blur" hx-swap="none">
        <span class="note-status" id="oc-${oc}-status"></span>
      </label>
    </section>`;
}

function renderDetail(
  detail: LessonDetail,
  notes: NoteItem[],
  prep: PrepItem[],
  plansByCourse: Map<number, Array<{ id: number; title: string }>>,
  resByPlan: Map<number, LinkedResource[]>,
  csrf: string,
): string {
  const h = detail.header;
  const heading = h.groupName ? esc(h.groupName) : esc(purposeLabel(h.purpose));
  const flag = h.isSelf ? '' : '⚑ ';
  const meta = [fmtLong(h.date), h.periodLabel, h.start && h.end ? `${h.start}–${h.end}` : '', h.roomName ?? '']
    .filter(Boolean)
    .map((x) => esc(x))
    .join(' · ');

  const sections =
    detail.sections.length > 0
      ? detail.sections.map((s) => renderSection(s, plansByCourse.get(s.courseId) ?? [], (s.lessonPlanId != null && resByPlan.get(s.lessonPlanId)) || [])).join('')
      : `<p class="muted">${h.purpose === 'free' ? 'Free period — protected work time.' : 'No courses attached to this slot.'}</p>`;

  const listId = `notes-list-${h.occurrenceId}`;
  return `
    <section class="ld" hx-headers='{"x-csrf-token":"${csrf}"}'>
      <p class="kicker">${flag}${h.isSelf ? 'Lesson' : 'Lesson I oversee'}</p>
      <h1>${heading}</h1>
      <p class="ld-meta">${meta}</p>
      ${sections}
      ${prep.length ? `<section class="ld-notesblock"><h2>Before the bell</h2>${renderPrepList(prep, '/prep', 'prep', `prep-${detail.header.occurrenceId}`)}</section>` : ''}
      <section class="ld-notesblock">
        <div class="ld-notes-head"><h2>Notes</h2>${renderNewNoteButton(listId, { kind: 'lesson', occurrence: h.occurrenceId })}</div>
        ${renderNotesList(listId, notes)}
      </section>
      <p><a href="/timetable">← Timetable</a></p>
    </section>`;
}

export function registerLessonRoutes(app: FastifyInstance): void {
  app.get('/lesson', { preHandler: requireAuth }, async (req, reply) => {
    const parsed = Query.safeParse(req.query);
    if (!parsed.success) {
      const e = errorPage(reply, 400, 'That lesson reference looks wrong.');
      return reply.code(e.code).type('text/html').send(e.html);
    }
    const { lesson, date } = parsed.data;

    try {
      const occurrenceId = await findOrCreateOccurrence(lesson, date);
      const header = await getOccurrenceHeader(occurrenceId);
      if (!header) {
        const e = errorPage(reply, 404, 'That lesson no longer exists.');
        return reply.code(e.code).type('text/html').send(e.html);
      }
      const [courses, lastStops, noteRows, followups, prep] = await Promise.all([
        getOccurrenceCourses(occurrenceId),
        getLastStoppingPoints(header.lessonId, date),
        getOccurrenceNotes(occurrenceId),
        getFollowupsForOccurrence(occurrenceId),
        listOccurrencePrep(occurrenceId),
      ]);

      const fuByNote = new Map<number, FollowupItem[]>();
      for (const f of followups) {
        const arr = fuByNote.get(f.noteId) ?? [];
        arr.push({ id: f.id, text: f.text, done: f.done });
        fuByNote.set(f.noteId, arr);
      }
      const noteItems: NoteItem[] = noteRows.map((n) => ({
        id: n.id,
        body: n.body,
        time: n.time,
        followups: fuByNote.get(n.id) ?? [],
      }));

      const detail = buildLessonDetail(header, courses, lastStops);
      const courseIds = [...new Set(courses.map((c) => c.courseId))];
      const planLists = await Promise.all(courseIds.map((cid) => listCoursePlans(cid)));
      const plansByCourse = new Map<number, Array<{ id: number; title: string }>>();
      courseIds.forEach((cid, i) => plansByCourse.set(cid, planLists[i] ?? []));

      // Resources linked to each bound plan, shown read-only on the lesson.
      const planIds = [...new Set(detail.sections.map((s) => s.lessonPlanId).filter((x): x is number => x != null))];
      const resLists = await Promise.all(planIds.map((pid) => listResourcesForPlan(pid)));
      const resByPlan = new Map<number, LinkedResource[]>();
      planIds.forEach((pid, i) => resByPlan.set(pid, resLists[i] ?? []));

      const csrf = reply.generateCsrf();
      const title = header.groupName ?? purposeLabel(header.purpose);
      return reply.type('text/html').send(layout({ title, body: renderDetail(detail, noteItems, prep, plansByCourse, resByPlan, csrf), authed: true, csrfToken: csrf }));
    } catch {
      const body = `<section class="card"><h1>Lesson</h1><p class="muted">Lesson detail is unavailable — the database is not reachable.</p><p><a href="/timetable">← Timetable</a></p></section>`;
      return reply.type('text/html').send(layout({ title: 'Lesson', body, authed: true, csrfToken: reply.generateCsrf() }));
    }
  });

  // Bind a lesson plan to a course in this occurrence (per course for splits).
  app.post('/occurrence-course/:id/plan', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const params = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
    const body = z.object({ lesson_plan_id: z.string().optional() }).safeParse(req.body);
    if (!params.success || !body.success) return reply.code(400).send('');
    const raw = body.data.lesson_plan_id;
    const planId = raw && raw !== '' && Number.isFinite(Number(raw)) ? Number(raw) : null;
    await setOccurrenceCoursePlan(params.data.id, planId);
    const plan = planId ? await getLessonPlan(planId) : null;
    return reply
      .type('text/html')
      .send(renderPlanContent(params.data.id, plan?.title ?? null, plan?.objectives ?? null, plan?.outline ?? null, true) + renderSavedStatus(`oc-${params.data.id}-plan-status`));
  });
}
