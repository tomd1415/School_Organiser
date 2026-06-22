// Phase 6.2: the Setup area — everything the seed used to hard-code, editable in-app.
// Tabs: Year & terms · Day shape · Rooms & staff · Courses · Groups & pupils.
// Year-scoped tabs carry an explicit ?year= so next September is built as a DRAFT alongside the
// live year: nothing the user does here touches the current year until "make current" (go-live).
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { renderSavedStatus } from '../lib/notesView';
import { weekdayName } from '../services/delivery';
import {
  applyModelDay,
  copyDayShape,
  createCourse,
  createGroup,
  createPeriod,
  createRoom,
  createStaff,
  createTerm,
  createYear,
  deletePeriod,
  deleteTerm,
  enrolPupil,
  getCurrentYearId,
  listAllCourses,
  listEnrolled,
  listGroups,
  listPeriods,
  listRooms,
  listStaff,
  listTerms,
  listYears,
  makeYearCurrent,
  moveEnrolment,
  setCourseActive,
  setGroupActive,
  setGroupCourse,
  setRoomActive,
  setStaffActive,
  unenrolPupil,
  updateCourseField,
  updateGroupField,
  updatePeriodField,
  updateTermField,
  updateYearField,
  createLessonOnPeriod,
  deleteLesson,
  listEditorLessons,
  toggleLessonCourse,
  updateLessonField,
  type ApplyModelDayResult,
  type EditorLesson,
  type YearRow,
} from '../repos/setup';
import { listPupils } from '../repos/pupils';

const idParam = z.object({ id: z.coerce.number().int().positive() });
const TABS = ['year', 'day', 'people', 'courses', 'groups', 'timetable'] as const;
type Tab = (typeof TABS)[number];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Banner shown after a "model day" apply, summarising what changed and what was protected. */
function applyModelNotice(r: ApplyModelDayResult): string {
  if (r.modelPeriods === 0)
    return `<p class="muted lay-note">${weekdayName(r.model)} has no periods yet — add some before applying it to the week.</p>`;
  const names = (ds: number[]) => ds.map(weekdayName).join(', ');
  const applied = r.applied.length
    ? `Applied <strong>${weekdayName(r.model)}</strong>'s day shape to ${names(r.applied)}.`
    : 'No other days were changed.';
  const blocked = r.blocked.length
    ? ` Left ${names(r.blocked)} untouched — ${r.blocked.length === 1 ? 'it already has classes' : 'they already have classes'} assigned (clear those on the Timetable tab to include them).`
    : '';
  return `<p class="muted lay-note">${applied}${blocked}</p>`;
}

// ── the page + all POST handlers ─────────────────────────────────────────────────────────────

export function registerSetupRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  async function renderSetup(tab: Tab, yearId: number, csrf: string, notice = ''): Promise<string> {
      const [years, terms, periods, rooms, staff, courses, groups, pupils, lessons] = await Promise.all([
        listYears(),
        listTerms(yearId),
        listPeriods(yearId),
        listRooms(),
        listStaff(),
        listAllCourses(),
        listGroups(yearId, true),
        listPupils(),
        listEditorLessons(yearId),
      ]);
      const enrolmentsByGroup = new Map<number, any[]>();
      await Promise.all(groups.map(async (g) => {
        const enrolled = await listEnrolled(g.id);
        enrolmentsByGroup.set(g.id, enrolled);
      }));
      const { renderSetupPage } = await import('../lib/setupView');
      return renderSetupPage({
        tab: tab as any,
        yearId,
        csrf,
        notice,
        years,
        terms,
        periods,
        rooms,
        staff,
        courses,
        groups,
        pupils,
        lessons,
        enrolmentsByGroup,
      });
  }

  app.get('/setup', { preHandler: requireAuth }, async (req, reply) => {
    const q = z
      .object({ tab: z.enum(TABS).optional(), year: z.coerce.number().int().positive().optional() })
      .safeParse(req.query);
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const tab: Tab = (q.success && q.data.tab) || 'year';
      const years = await listYears();
      const yearId = (q.success && q.data.year) || (await getCurrentYearId()) || (years[0] ? Number(years[0].id) : 0);
      if (!yearId && tab !== 'year') {
        body = '<section class="card"><h1>Setup</h1><p class="muted">No academic year yet — create one on <a href="/setup?tab=year">Year &amp; terms</a> first.</p></section>';
      } else {
        body = await renderSetup(tab, Number(yearId), csrf);
      }
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      body = '<section class="card"><h1>Setup</h1><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Setup', body, authed: true, csrfToken: csrf }));
  });

  // Re-render the whole section after a structural add (simplest correct swap).
  const section = async (req: { query: unknown; headers: Record<string, unknown> }, reply: { generateCsrf: () => string }, tab: Tab, yearId?: number, notice = '') => {
    const y = yearId ?? (await getCurrentYearId());
    return renderSetup(tab, Number(y), reply.generateCsrf(), notice);
  };

  // years
  app.post('/setup/year/add', guard, async (req, reply) => {
    const b = z.object({ name: z.string().trim().min(1).max(50), start: z.string().regex(DATE), end: z.string().regex(DATE) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    const id = await createYear(b.data.name, b.data.start, b.data.end);
    return reply.type('text/html').send(await section(req, reply, 'year', id));
  });
  app.post('/setup/year/:id', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ field: z.string(), value: z.string().max(100) }).safeParse(req.body);
    if (!p.success || !b.success || !(await updateYearField(p.data.id, b.data.field, b.data.value))) return reply.code(400).send('');
    return reply.type('text/html').send(renderSavedStatus(`yr-${p.data.id}-status`));
  });
  app.post('/setup/year/:id/make-current', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    if (!(await makeYearCurrent(p.data.id))) return reply.code(400).send(''); // unknown year — leave current as-is
    return reply.send('');
  });

  // terms
  app.post('/setup/term/add', guard, async (req, reply) => {
    const q = z.object({ year: z.coerce.number().int().positive() }).safeParse(req.query);
    const b = z
      .object({ name: z.string().trim().min(1).max(100), kind: z.enum(['term', 'half_term', 'holiday', 'inset']), start: z.string().regex(DATE), end: z.string().regex(DATE) })
      .safeParse(req.body);
    if (!q.success || !b.success) return reply.code(400).send('');
    const termId = await createTerm(q.data.year, b.data.name, b.data.start, b.data.end, b.data.kind);
    const notice = termId === null ? `<p class="muted lay-note">“${esc(b.data.name)}” on ${esc(b.data.start)} is already in this year — repeat names on other dates are fine.</p>` : '';
    return reply.type('text/html').send(await section(req, reply, 'year', q.data.year, notice));
  });
  app.post('/setup/term/:id', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ field: z.string(), value: z.string().max(100) }).safeParse(req.body);
    if (!p.success || !b.success || !(await updateTermField(p.data.id, b.data.field, b.data.value))) return reply.code(400).send('');
    return reply.type('text/html').send(renderSavedStatus(`term-${p.data.id}-status`));
  });
  app.post('/setup/term/:id/delete', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    await deleteTerm(p.data.id);
    return reply.send('');
  });

  // day shape
  app.post('/setup/period/add', guard, async (req, reply) => {
    const q = z.object({ year: z.coerce.number().int().positive(), weekday: z.coerce.number().int().min(1).max(7) }).safeParse(req.query);
    if (!q.success) return reply.code(400).send('');
    await createPeriod(q.data.year, q.data.weekday);
    return reply.type('text/html').send(await section(req, reply, 'day', q.data.year));
  });
  app.post('/setup/period/:id', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ field: z.string(), value: z.string().max(100).optional() }).safeParse(req.body);
    if (!p.success || !b.success || !(await updatePeriodField(p.data.id, b.data.field, b.data.value ?? null))) return reply.code(400).send('');
    return reply.type('text/html').send(renderSavedStatus(`pd-${p.data.id}-status`));
  });
  app.post('/setup/period/:id/delete', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const ok = await deletePeriod(p.data.id);
    if (!ok) return reply.code(409).type('text/html').send(`<tr id="pd-${p.data.id}"><td colspan="7" class="error">Can't delete — lessons are timetabled on this period. Clear them in the timetable editor first.</td></tr>`);
    return reply.send('');
  });
  app.post('/setup/day/copy', guard, async (req, reply) => {
    const q = z.object({ year: z.coerce.number().int().positive() }).safeParse(req.query);
    const b = z.object({ from: z.coerce.number().int().positive() }).safeParse(req.body);
    if (!q.success || !b.success) return reply.code(400).send('');
    await copyDayShape(b.data.from, q.data.year);
    return reply.type('text/html').send(await section(req, reply, 'day', q.data.year));
  });

  app.post('/setup/day/apply-model', guard, async (req, reply) => {
    const q = z.object({ year: z.coerce.number().int().positive() }).safeParse(req.query);
    const b = z.object({ model: z.coerce.number().int().min(1).max(5) }).safeParse(req.body);
    if (!q.success || !b.success) return reply.code(400).send('');
    let notice: string;
    try {
      notice = applyModelNotice(await applyModelDay(q.data.year, b.data.model));
    } catch (err) {
      if ((err as { code?: string }).code === '23503')
        notice = `<p class="muted lay-note">Couldn't replace some days — they have records linked to their periods. Clear those first, then try again.</p>`;
      else throw err;
    }
    return reply.type('text/html').send(await section(req, reply, 'day', q.data.year, notice));
  });

  // rooms / staff / courses
  app.post('/setup/room/add', guard, async (req, reply) => {
    const b = z.object({ name: z.string().trim().min(1).max(100) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    await createRoom(b.data.name);
    return reply.type('text/html').send(await section(req, reply, 'people'));
  });
  for (const [verb, active] of [['archive', false], ['restore', true]] as const) {
    app.post(`/setup/room/:id/${verb}`, guard, async (req, reply) => {
      const p = idParam.safeParse(req.params);
      if (!p.success) return reply.code(400).send('');
      await setRoomActive(p.data.id, active);
      return reply.type('text/html').send(await section(req, reply, 'people'));
    });
    app.post(`/setup/staff/:id/${verb}`, guard, async (req, reply) => {
      const p = idParam.safeParse(req.params);
      if (!p.success) return reply.code(400).send('');
      await setStaffActive(p.data.id, active);
      return reply.type('text/html').send(await section(req, reply, 'people'));
    });
    app.post(`/setup/course/:id/${verb}`, guard, async (req, reply) => {
      const p = idParam.safeParse(req.params);
      if (!p.success) return reply.code(400).send('');
      await setCourseActive(p.data.id, active);
      return reply.type('text/html').send(await section(req, reply, 'courses'));
    });
  }
  app.post('/setup/staff/add', guard, async (req, reply) => {
    const b = z.object({ name: z.string().trim().min(1).max(100), role: z.string().max(20) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    await createStaff(b.data.name, b.data.role);
    return reply.type('text/html').send(await section(req, reply, 'people'));
  });
  app.post('/setup/course/add', guard, async (req, reply) => {
    const b = z.object({ name: z.string().trim().min(1).max(100) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    await createCourse(b.data.name);
    return reply.type('text/html').send(await section(req, reply, 'courses'));
  });
  app.post('/setup/course/:id', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ field: z.string(), value: z.string().max(100).optional() }).safeParse(req.body);
    if (!p.success || !b.success || !(await updateCourseField(p.data.id, b.data.field, b.data.value ?? null))) return reply.code(400).send('');
    return reply.type('text/html').send(renderSavedStatus(`course-${p.data.id}-status`));
  });

  // groups & enrolments
  app.post('/setup/group/add', guard, async (req, reply) => {
    const q = z.object({ year: z.coerce.number().int().positive() }).safeParse(req.query);
    const b = z.object({ name: z.string().trim().min(1).max(50), year_group: z.string().trim().max(20).optional() }).safeParse(req.body);
    if (!q.success || !b.success) return reply.code(400).send('');
    await createGroup(q.data.year, b.data.name, b.data.year_group || null, null);
    return reply.type('text/html').send(await section(req, reply, 'groups', q.data.year));
  });
  app.post('/setup/group/:id', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ field: z.string(), value: z.string().max(100).optional() }).safeParse(req.body);
    if (!p.success || !b.success || !(await updateGroupField(p.data.id, b.data.field, b.data.value ?? null))) return reply.code(400).send('');
    return reply.type('text/html').send(renderSavedStatus(`grp-${p.data.id}-status`));
  });
  for (const [verb, active] of [['archive', false], ['restore', true]] as const) {
    app.post(`/setup/group/:id/${verb}`, guard, async (req, reply) => {
      const p = idParam.safeParse(req.params);
      if (!p.success) return reply.code(400).send('');
      await setGroupActive(p.data.id, active);
      const g = await poolGroupYear(p.data.id);
      return reply.type('text/html').send(await section(req, reply, 'groups', g ?? undefined));
    });
  }
  app.post('/setup/group/:id/course/:courseId', guard, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive(), courseId: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ on: z.string() }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    await setGroupCourse(p.data.id, p.data.courseId, b.data.on === '1');
    return reply.send('');
  });
  app.post('/setup/group/:id/enrol', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ pupil: z.coerce.number().int().positive() }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    await enrolPupil(b.data.pupil, p.data.id);
    return reply.type('text/html').send(await groupDetail(p.data.id));
  });
  app.post('/setup/enrolment/:id/remove', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const g = await pool_enrolmentGroup(p.data.id);
    await unenrolPupil(p.data.id);
    return reply.type('text/html').send(g ? await groupDetail(g) : '');
  });
  app.post('/setup/enrolment/:id/move', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const q = z.object({ year: z.coerce.number().int().positive() }).safeParse(req.query);
    const b = z.object({ to: z.coerce.number().int().positive() }).safeParse(req.body);
    if (!p.success || !q.success || !b.success) return reply.code(400).send('');
    await moveEnrolment(p.data.id, b.data.to);
    return reply.type('text/html').send(await section(req, reply, 'groups', q.data.year));
  });


  // timetable editor (6.3)
  app.post('/setup/lesson/add', guard, async (req, reply) => {
    const q = z.object({ period: z.coerce.number().int().positive(), year: z.coerce.number().int().positive() }).safeParse(req.query);
    if (!q.success) return reply.code(400).send('');
    await createLessonOnPeriod(q.data.period);
    return reply.type('text/html').send(await section(req, reply, 'timetable', q.data.year));
  });
  app.post('/setup/lesson/:id', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    const b = z.object({ field: z.string(), value: z.string().max(50).optional() }).safeParse(req.body);
    if (!p.success || !b.success || !(await updateLessonField(p.data.id, b.data.field, b.data.value ?? null))) return reply.code(400).send('');
    return reply.type('text/html').send(renderSavedStatus(`tl-${p.data.id}-status`));
  });
  app.post('/setup/lesson/:id/delete', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const ok = await deleteLesson(p.data.id);
    if (!ok) return reply.code(409).type('text/html').send(`<div class="tt-ed-lesson error" id="tl-${p.data.id}">has taught history — can't delete</div>`);
    return reply.send('');
  });
  app.post('/setup/lesson/:id/course/:courseId', guard, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive(), courseId: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ on: z.string() }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    await toggleLessonCourse(p.data.id, p.data.courseId, b.data.on === '1');
    return reply.send('');
  });

  // helpers that need one-off SQL
  async function poolGroupYear(groupId: number): Promise<number | null> {
    const { pool } = await import('../db/pool');
    const { rows } = await pool.query<{ y: number }>(`SELECT academic_year_id AS y FROM groups WHERE id = $1`, [groupId]);
    return rows[0]?.y ?? null;
  }
  async function pool_enrolmentGroup(enrolmentId: number): Promise<number | null> {
    const { pool } = await import('../db/pool');
    const { rows } = await pool.query<{ g: number }>(`SELECT group_id AS g FROM enrolments WHERE id = $1`, [enrolmentId]);
    return rows[0]?.g ?? null;
  }
  async function groupDetail(groupId: number): Promise<string> {
    const [enrolled, pupils] = await Promise.all([listEnrolled(groupId), listPupils()]);
    const pupilOpts = pupils
      .filter((p) => p.active && !enrolled.some((e) => Number(e.pupilId) === Number(p.id)))
      .map((p) => `<option value="${p.id}">${esc(p.displayName)}</option>`)
      .join('');
    const chips = enrolled
      .map(
        (e) => `<span class="grp-chip">${esc(e.displayName)}
          <button type="button" class="link danger" title="remove from group" hx-post="/setup/enrolment/${e.enrolmentId}/remove" hx-target="#grp-${groupId}-detail" hx-swap="outerHTML">✕</button></span>`,
      )
      .join(' ');
    return `<div id="grp-${groupId}-detail">
      <p class="grp-pupils">${chips || '<span class="muted">no pupils enrolled</span>'}
        ${pupilOpts ? `<select hx-post="/setup/group/${groupId}/enrol" hx-vals='js:{"pupil":event.target.value}' hx-trigger="change" hx-target="#grp-${groupId}-detail" hx-swap="outerHTML">
          <option value="">＋ add pupil…</option>${pupilOpts}</select>` : ''}
      </p>
    </div>`;
  }
}
