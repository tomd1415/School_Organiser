// Free-period workspace. A free period (purpose='free' or a dated 'free'/'cancelled'/'off_timetable'
// exception) is NOT a teaching lesson, so clicking it lands here — not the lesson interface. Here the
// teacher earmarks tasks from the main Tasks list to do during the period, and can flip the slot back
// to teaching. The period is the (date, timetabled_lesson) pair.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { getLessonSlot } from '../repos/timetable';
import { listExceptionsFor, addException, deleteException } from '../repos/exceptions';
import { describeException } from '../services/exceptions';
import { listPeriodTasks, listAssignableTasks, assignTaskToPeriod, unassignTaskFromPeriod } from '../repos/periodTasks';
import { createTask, setTaskStatus } from '../repos/tasks';
import type { TaskRow } from '../repos/tasks';

const TZ = 'Europe/London';
const Slot = z.object({ lesson: z.coerce.number().int().positive(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${iso}T12:00:00Z`));
}

/** The id of a dated free-mode exception for THIS lesson+date (so it can be reverted), or null. */
async function datedFreeExceptionId(date: string, lessonId: number): Promise<number | null> {
  const exs = await listExceptionsFor(date, lessonId);
  const ex = exs.find((e) => e.timetabledLessonId === lessonId && describeException(e).mode === 'free');
  return ex?.id ?? null;
}

function taskRow(t: TaskRow, lesson: number, date: string): string {
  const done = t.status === 'done' || t.status === 'dropped';
  const vals = `hx-vals='{"lesson":"${lesson}","date":"${esc(date)}","task":"${t.id}"}'`;
  return `<li class="free-task${done ? ' done' : ''}">
    <label>
      <input type="checkbox" ${done ? 'checked' : ''} ${vals} hx-post="/free/task-done" hx-target="#free-tasks" hx-swap="innerHTML">
      <span class="free-task-title">${esc(t.title)}</span>
    </label>
    <button type="button" class="link" title="Remove from this period" ${vals} hx-post="/free/unassign" hx-target="#free-tasks" hx-swap="innerHTML">✕</button>
  </li>`;
}

/** The tasks panel (assigned tasks + the add controls) — the fragment every action re-renders. */
async function tasksPanel(date: string, lesson: number): Promise<string> {
  const [assigned, available] = await Promise.all([listPeriodTasks(date, lesson), listAssignableTasks(date, lesson)]);
  const vals = `hx-vals='{"lesson":"${lesson}","date":"${esc(date)}"}'`;
  const list = assigned.length
    ? `<ul class="free-tasks-list">${assigned.map((t) => taskRow(t, lesson, date)).join('')}</ul>`
    : `<p class="muted">No tasks for this period yet — add some below.</p>`;
  const pick = available.length
    ? `<ul class="free-pick-list">${available
        .map(
          (t) =>
            `<li><button type="button" class="link" hx-post="/free/assign" hx-vals='{"lesson":"${lesson}","date":"${esc(date)}","task":"${t.id}"}' hx-target="#free-tasks" hx-swap="innerHTML">＋ ${esc(t.title)}</button></li>`,
        )
        .join('')}</ul>`
    : `<p class="muted">No other open tasks to pull in.</p>`;
  return `
    <h2>To do this period</h2>
    ${list}
    <details class="free-add">
      <summary>＋ Add a task</summary>
      <form class="free-new" ${vals} hx-post="/free/new" hx-target="#free-tasks" hx-swap="innerHTML" hx-on::after-request="if(event.detail.successful)this.reset()">
        <input type="text" name="title" placeholder="New task for this period…" maxlength="200" required autocomplete="off">
        <button type="submit" class="button small">Add</button>
      </form>
      <p class="muted">…or pull in an existing task:</p>
      ${pick}
    </details>`;
}

function freePage(opts: {
  slotLabel: string;
  time: string;
  dateLabel: string;
  date: string;
  lesson: number;
  isTeaching: boolean;
  datedFreeExId: number | null;
  panel: string;
  csrf: string;
}): string {
  const { slotLabel, time, dateLabel, date, lesson, isTeaching, datedFreeExId, panel, csrf } = opts;
  const vals = `hx-vals='{"lesson":"${lesson}","date":"${esc(date)}"}'`;
  // A teaching slot reached here (e.g. a "make free" link) offers to free it; a freed slot offers revert.
  const stateBar = isTeaching
    ? `<div class="free-state">
         <p>This is a <strong>teaching lesson</strong>. <a href="/lesson?lesson=${lesson}&date=${esc(date)}">Open the lesson →</a></p>
         <button type="button" class="button" ${vals} hx-post="/free/mark">Make this period free</button>
       </div>`
    : `<div class="free-state">
         <p class="muted">Protected work time — no class this period.</p>
         ${datedFreeExId != null
           ? `<button type="button" class="button ghost" ${vals} hx-post="/free/unmark" hx-confirm="Mark this period as teaching again?">Mark as teaching again</button>`
           : `<span class="muted">Permanent free slot (change it in Setup → Timetable).</span>`}
       </div>`;
  return `
    <section class="free-page card" hx-headers='{"x-csrf-token":"${csrf}"}'>
      <div class="free-head">
        <p class="eyebrow">Free period · ${esc(dateLabel)}</p>
        <h1>${esc(slotLabel)}${time ? ` <span class="muted">${esc(time)}</span>` : ''}</h1>
      </div>
      ${stateBar}
      <div id="free-tasks" class="free-tasks">${panel}</div>
      <p class="free-back"><a href="/timetable?date=${esc(date)}">← Back to timetable</a></p>
    </section>`;
}

export function registerFreeRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/free', { preHandler: requireAuth }, async (req, reply) => {
    const p = Slot.safeParse(req.query);
    if (!p.success) {
      return reply.code(400).type('text/html').send(layout({ title: 'Free period', body: '<section class="card"><h1>Free period</h1><p>That period reference looks wrong.</p><p><a href="/timetable">← Timetable</a></p></section>', authed: true, csrfToken: reply.generateCsrf() }));
    }
    const { lesson, date } = p.data;
    const csrf = reply.generateCsrf();
    const slot = await getLessonSlot(lesson);
    if (!slot) {
      return reply.code(404).type('text/html').send(layout({ title: 'Free period', body: '<section class="card"><h1>Free period</h1><p>That period no longer exists.</p><p><a href="/timetable">← Timetable</a></p></section>', authed: true, csrfToken: csrf }));
    }
    const datedFreeExId = await datedFreeExceptionId(date, lesson);
    const isTeaching = slot.purpose === 'teaching' && datedFreeExId == null;
    const panel = await tasksPanel(date, lesson);
    const body = freePage({
      slotLabel: slot.purpose === 'free' || datedFreeExId != null ? `${slot.label} — Free` : slot.label,
      time: slot.start && slot.end ? `${slot.start}–${slot.end}` : '',
      dateLabel: fmtDate(date),
      date,
      lesson,
      isTeaching,
      datedFreeExId,
      panel,
      csrf,
    });
    return reply.type('text/html').send(layout({ title: 'Free period', body, authed: true, csrfToken: csrf }));
  });

  // ── task assignment (all return the refreshed #free-tasks panel) ──────────────────────────────
  const panelReply = async (reply: import('fastify').FastifyReply, date: string, lesson: number) =>
    reply.type('text/html').send(await tasksPanel(date, lesson));

  app.post('/free/assign', guard, async (req, reply) => {
    const b = Slot.extend({ task: z.coerce.number().int().positive() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    await assignTaskToPeriod(b.data.date, b.data.lesson, b.data.task);
    return panelReply(reply, b.data.date, b.data.lesson);
  });

  app.post('/free/unassign', guard, async (req, reply) => {
    const b = Slot.extend({ task: z.coerce.number().int().positive() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    await unassignTaskFromPeriod(b.data.date, b.data.lesson, b.data.task);
    return panelReply(reply, b.data.date, b.data.lesson);
  });

  app.post('/free/new', guard, async (req, reply) => {
    const b = Slot.extend({ title: z.string().min(1).max(200) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    const id = await createTask(b.data.title.trim());
    await assignTaskToPeriod(b.data.date, b.data.lesson, id);
    return panelReply(reply, b.data.date, b.data.lesson);
  });

  app.post('/free/task-done', guard, async (req, reply) => {
    const b = Slot.extend({ task: z.coerce.number().int().positive() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    // A checkbox sends its value only when checked, so presence of `done` = now ticked.
    const ticked = typeof (req.body as Record<string, unknown>).done !== 'undefined';
    await setTaskStatus(b.data.task, ticked ? 'done' : 'triaged');
    return panelReply(reply, b.data.date, b.data.lesson);
  });

  // ── mark free / revert to teaching ────────────────────────────────────────────────────────────
  app.post('/free/mark', guard, async (req, reply) => {
    const b = Slot.safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    if ((await datedFreeExceptionId(b.data.date, b.data.lesson)) == null) {
      await addException({ date: b.data.date, timetabledLessonId: b.data.lesson, kind: 'free', roomId: null, staffId: null, note: null });
    }
    reply.header('HX-Redirect', `/free?lesson=${b.data.lesson}&date=${encodeURIComponent(b.data.date)}`);
    return reply.send('');
  });

  app.post('/free/unmark', guard, async (req, reply) => {
    const b = Slot.safeParse(req.body);
    if (!b.success) return reply.code(400).send('');
    const exId = await datedFreeExceptionId(b.data.date, b.data.lesson);
    if (exId != null) await deleteException(exId);
    reply.header('HX-Redirect', `/lesson?lesson=${b.data.lesson}&date=${encodeURIComponent(b.data.date)}`);
    return reply.send('');
  });
}
