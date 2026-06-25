import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { calibrationHeadline, calibrationInsight, gatherCalibration } from '../services/estimateCalibration';
import { createTask, createTaskFromEmail, getTaskRow, listGroups, listInterestTasks, listTasks, setTaskStatus, taskCounts, toggleTaskInterest, updateTaskField, type GroupOpt, type TaskRow } from '../repos/tasks';
import { parseEmail } from '../services/emailIntake';
import { renderTaskItem } from '../lib/taskView';
import { renderSavedStatus, renderSaveError } from '../lib/notesView';
import { getRunningTimer } from '../repos/timeEntries';
import { renderTimerBanner } from './timer';
import type { TaskView } from '../services/task';

const idParam = z.object({ id: z.coerce.number().int().positive() });

export function registerTaskRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/tasks', { preHandler: requireAuth }, async (req, reply) => {
    const q = z.object({ view: z.enum(['inbox', 'open', 'done', 'interest']).default('inbox') }).safeParse(req.query);
    const view = q.success ? q.data.view : 'inbox';
    const csrf = reply.generateCsrf();

    let banner = renderTimerBanner(null);
    let tasks: TaskRow[] = [];
    let groups: GroupOpt[] = [];
    let running: Awaited<ReturnType<typeof getRunningTimer>> = null;
    let counts = { inbox: 0, open: 0, done: 0, interest: 0 };
    try {
      [tasks, groups, running, counts] = await Promise.all([
        view === 'interest' ? listInterestTasks() : listTasks(view),
        listGroups(),
        getRunningTimer(),
        taskCounts(),
      ]);
      banner = renderTimerBanner(running);
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
    }

    const { renderTasksPage } = await import('../lib/tasksView');
    const body = renderTasksPage({ view, csrf, tasks, groups, bannerHtml: banner, counts });
    return reply.type('text/html').send(layout({ title: 'Tasks', body, authed: true, csrfToken: csrf, width: 'working' }));
  });

  // D1: calibrate the teacher's time estimates from their timed history (deterministic headline +
  // an optional cheap AI insight; degrades cleanly when AI is off). Lazy-loaded from the panel above.
  app.get('/tasks/calibrate', { preHandler: requireAuth }, async (_req, reply) => {
    const { calibration, samples } = await gatherCalibration();
    if (!calibration) {
      return reply.type('text/html').send('<p class="muted">Not enough data yet — start a timer on a task that has an estimate, finish a few, then check back.</p>');
    }
    const insight = await calibrationInsight(calibration, samples).catch(() => '');
    const byLoad = calibration.byLoad.length
      ? `<ul class="cal-byload">${calibration.byLoad.map((g) => `<li>${esc(g.load)} load: ${g.medianRatio.toFixed(1)}× <span class="muted">(${g.count})</span></li>`).join('')}</ul>`
      : '';
    return reply.type('text/html').send(`<div class="task-cal-result">
        <p class="cal-headline">${esc(calibrationHeadline(calibration))}</p>
        ${byLoad}
        ${insight ? `<p class="cal-insight">💡 ${esc(insight)}</p>` : ''}
      </div>`);
  });

  // Create a (blank) task in the inbox; returns the editable item to append.
  app.post('/tasks', guard, async (_req, reply) => {
    const id = await createTask('New task');
    const groups = await listGroups();
    return reply.type('text/html').send(
      renderTaskItem(
        { id, title: 'New task', urgency: 'this_week', estimateMin: null, cognitiveLoad: null, groupId: null, context: null, status: 'inbox', interest: false },
        groups,
      ),
    );
  });

  // Paste an email → a draft task (source='email'), kept in email_intake.
  app.post('/tasks/paste', guard, async (req, reply) => {
    const b = z.object({ email: z.string().max(50000).default('') }).safeParse(req.body);
    if (!b.success || b.data.email.trim() === '') return reply.type('text/html').send('');
    const parsed = parseEmail(b.data.email);
    const id = await createTaskFromEmail(parsed, b.data.email);
    const groups = await listGroups();
    return reply
      .type('text/html')
      .send(
        renderTaskItem(
          { id, title: parsed.title, urgency: 'this_week', estimateMin: null, cognitiveLoad: null, groupId: null, context: null, status: 'inbox', interest: false },
          groups,
        ),
      );
  });

  // Autosave a single field (HTMX sends just the changed one). Returns an OOB "saved".
  app.post('/tasks/:id', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const body = (req.body ?? {}) as Record<string, unknown>;
    for (const [field, raw] of Object.entries(body)) {
      if (field === '_csrf') continue;
      // A required (NOT NULL) title cleared to empty: reject with a clear message, write nothing — the
      // existing title is preserved instead of a generic DB error (BUG-035).
      if (field === 'title' && (typeof raw !== 'string' || raw.trim() === '')) {
        return reply.type('text/html').send(renderSaveError(`task-${id.data.id}-status`, 'Title can’t be empty.'));
      }
      let value: string | number | null = typeof raw === 'string' ? raw : null;
      if (value === '') value = null;
      if ((field === 'estimate_min' || field === 'group_id') && value !== null) {
        const n = Number(value);
        value = Number.isFinite(n) ? n : null;
      }
      await updateTaskField(id.data.id, field, value);
    }
    return reply.type('text/html').send(renderSavedStatus(`task-${id.data.id}-status`));
  });

  // Toggle the "current interest" ⭐ flag — re-renders the item.
  app.post('/tasks/:id/interest', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    await toggleTaskInterest(id.data.id);
    const [row, groups] = await Promise.all([getTaskRow(id.data.id), listGroups()]);
    return reply.type('text/html').send(row ? renderTaskItem(row, groups) : '');
  });

  // Status transitions — each empties the targeted item out of the current view.
  const transitions: Array<[string, string]> = [
    ['triage', 'triaged'],
    ['done', 'done'],
    ['drop', 'dropped'],
  ];
  for (const [path, status] of transitions) {
    app.post(`/tasks/:id/${path}`, guard, async (req, reply) => {
      const id = idParam.safeParse(req.params);
      if (!id.success) return reply.code(400).send('');
      await setTaskStatus(id.data.id, status);
      return reply.type('text/html').send('');
    });
  }
}
