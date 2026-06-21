import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import { resolveNow } from '../services/clock';
import { getClockContext, getSelfLessonAt } from '../repos/clock';
import { eligibleCount, pickNext, type Candidate, type FocusMode } from '../services/focus';
import { beforeNextBell, type BellTask } from '../services/task';
import {
  createSubtask,
  getGroupSlots,
  getTaskRow,
  listFocusCandidates,
  listSubtasks,
  setTaskStatus,
  toggleSubtaskDone,
  type SubStep,
} from '../repos/tasks';
import { modelForFeature } from '../repos/settings';
import { getRunningTimer } from '../repos/timeEntries';
import { renderTimerBanner } from './timer';
import { callLLMStructured } from '../llm/client';
import { taskBreakdownSchema } from '../llm/schemas/taskBreakdown';
import { TASK_BREAKDOWN_SYSTEM, TASK_BREAKDOWN_VERSION, taskBreakdownInstruction } from '../llm/prompts/taskBreakdown';

const idParam = z.object({ id: z.coerce.number().int().positive() });

function modeForMinutes(minutes: number): FocusMode {
  if (minutes < 9 * 60) return 'morning';
  if (minutes >= 16 * 60) return 'end_of_day';
  return 'free_period';
}

function renderSubStep(s: SubStep): string {
  return `<li id="substep-${s.id}" class="fu${s.done ? ' done' : ''}"><label><input type="checkbox" ${s.done ? 'checked' : ''} hx-post="/focus/substep/${s.id}/toggle" hx-target="#substep-${s.id}" hx-swap="outerHTML"> ${esc(s.title)}</label></li>`;
}

/** Build the focus card (everything inside #focus-inner). Reused by GET /focus and done-and-next.
 * Returns the HTML plus a `sig` of what's shown, so the self-poll can skip the swap when nothing
 * meaningful changed (and so never wipe a sub-step you're typing). */
async function buildInner(now: Date, modeOverride: FocusMode | null): Promise<{ html: string; sig: string }> {
  const ctx = await getClockContext();
  const state = resolveNow(now, ctx);
  const currentLesson =
    state.isSchoolDay && state.current ? await getSelfLessonAt(state.current.weekday, state.current.slotOrder) : null;

  const inWorkWindow =
    !!state.current &&
    ((state.current.slotType === 'before_school' && state.current.label !== 'Coffee') ||
      state.current.slotType === 'after_school' ||
      currentLesson?.purpose === 'free');
  const windowMinutes = inWorkWindow && state.minutesRemaining != null ? state.minutesRemaining : null;
  const mode: FocusMode = modeOverride ?? modeForMinutes(state.minutes);

  const [cands, groupSlots] = await Promise.all([listFocusCandidates(), getGroupSlots()]);
  const nextBell = state.nextTeaching ? { date: state.nextTeaching.date, startMin: state.nextTeaching.startMin } : null;
  const bellTasks: BellTask[] = cands.map((c) => ({ id: c.id, title: c.title, urgency: c.urgency, dueAt: c.dueAt, dueRule: c.dueRule, groupId: c.groupId }));
  const bellIds = new Set(beforeNextBell(bellTasks, nextBell, now, groupSlots, ctx.terms, ctx.tz).map((t) => t.id));
  const candidates: Candidate[] = cands.map((c) => ({
    id: c.id,
    title: c.title,
    urgency: c.urgency,
    estimateMin: c.estimateMin,
    cognitiveLoad: c.cognitiveLoad,
    interest: c.interest,
    beforeBell: bellIds.has(c.id),
  }));

  const picked = pickNext(candidates, mode, windowMinutes);
  const hidden = Math.max(0, eligibleCount(candidates, mode, windowMinutes) - (picked ? 1 : 0));

  // What's on screen: the picked task + the effective mode. The poll re-renders only when this shifts.
  const sig = `${picked?.id ?? 'none'}|${mode}`;
  const pollUrl = `/focus/inner?sig=${encodeURIComponent(sig)}${modeOverride ? `&mode=${modeOverride}` : ''}`;
  const poller = `<div class="focus-poll" data-bg-poll hx-get="${pollUrl}" hx-trigger="every 45s" hx-target="#focus-inner" hx-swap="innerHTML" style="display:none"></div>`;

  const tab = (m: FocusMode, label: string) =>
    `<a href="/focus?mode=${m}"${m === mode ? ' class="active"' : ''}>${label}</a>`;
  const modeNav = `<nav class="task-tabs">${tab('morning', 'Morning')} ${tab('free_period', 'Free period')} ${tab('end_of_day', 'End of day')}</nav>`;

  if (!picked) {
    const done =
      mode === 'end_of_day'
        ? `<div class="focus-done"><h1>✅ You're done — go home.</h1><p class="muted">Nothing quick or urgent is left. Anything heavier is parked for tomorrow.</p></div>`
        : `<div class="focus-done"><h1>Nothing to focus on</h1><p class="muted">No eligible task right now${windowMinutes != null ? ` that fits ${windowMinutes} min` : ''}.</p></div>`;
    return { html: `${modeNav}${done}${poller}`, sig };
  }

  const subs = await listSubtasks(picked.id);
  const subList = subs.map(renderSubStep).join('');
  const window = windowMinutes != null ? ` · ~${windowMinutes} min window` : '';

  return { html: `${modeNav}
    <div class="focus-card">
      <p class="kicker">Do this now${window}</p>
      <h1>${esc(picked.title)}</h1>
      <ul class="followups" id="substeps-${picked.id}">${subList}</ul>
      <form class="fu-form" hx-post="/focus/${picked.id}/breakdown" hx-target="#substeps-${picked.id}" hx-swap="beforeend" hx-on::after-request="if(window.htmxSaved(event))this.reset()">
        <input type="text" name="text" data-followup placeholder="+ break into a step" autocomplete="off">
      </form>
      <button type="button" class="link fu-ai" hx-post="/focus/${picked.id}/breakdown-ai" hx-target="#substeps-${picked.id}" hx-swap="beforeend" hx-disabled-elt="this">✨ Break down with AI</button>
      <div class="focus-actions">
        <button type="button" class="btn-secondary" hx-post="/timer/start" hx-vals='{"task":${picked.id}}' hx-target="#timer-banner" hx-swap="outerHTML">▶ start</button>
        <button type="button" class="btn-secondary" hx-post="/focus/${picked.id}/done" hx-target="#focus-inner" hx-swap="innerHTML">✓ done &amp; next</button>
        <a class="link" href="/tasks">see all tasks</a>
      </div>
      <p class="muted">${hidden} other task${hidden === 1 ? '' : 's'} hidden — on purpose.</p>
    </div>${poller}`, sig };
}

export function registerFocusRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/focus', { preHandler: requireAuth }, async (req, reply) => {
    const q = z.object({ mode: z.enum(['morning', 'free_period', 'end_of_day']).optional() }).safeParse(req.query);
    const csrf = reply.generateCsrf();
    let inner: string;
    let banner = '<div id="timer-banner"></div>';
    try {
      inner = (await buildInner(new Date(), q.success && q.data.mode ? q.data.mode : null)).html;
      banner = renderTimerBanner(await getRunningTimer());
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      inner = `<p class="muted">Focus is unavailable — the database is not reachable.</p>`;
    }
    const body = `<section class="card focus" hx-headers='{"x-csrf-token":"${csrf}"}'>${banner}<div id="focus-inner">${inner}</div></section>`;
    return reply.type('text/html').send(layout({ title: 'Focus', body, authed: true, csrfToken: csrf }));
  });

  // Self-poll target (every 45s from inside #focus-inner): re-render only when the picked task or mode
  // has shifted. Unchanged → HX-Reswap:none, so HTMX leaves the card (and any half-typed step) alone.
  app.get('/focus/inner', { preHandler: requireAuth }, async (req, reply) => {
    const q = z.object({ sig: z.string().optional(), mode: z.enum(['morning', 'free_period', 'end_of_day']).optional() }).safeParse(req.query);
    try {
      const built = await buildInner(new Date(), q.success && q.data.mode ? q.data.mode : null);
      if (q.success && q.data.sig === built.sig) return reply.header('HX-Reswap', 'none').send('');
      return reply.type('text/html').send(built.html);
    } catch {
      return reply.header('HX-Reswap', 'none').send('');
    }
  });

  app.post('/focus/:id/done', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    await setTaskStatus(id.data.id, 'done');
    return reply.type('text/html').send((await buildInner(new Date(), null)).html);
  });

  app.post('/focus/:id/breakdown', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    const body = z.object({ text: z.string().trim().max(500) }).safeParse(req.body);
    if (!id.success || !body.success || body.data.text === '') return reply.type('text/html').send('');
    return reply.type('text/html').send(renderSubStep(await createSubtask(id.data.id, body.data.text)));
  });

  // AI task breakdown (4.6): generate sub-steps for the focused task and append them.
  app.post('/focus/:id/breakdown-ai', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const task = await getTaskRow(id.data.id);
    if (!task) return reply.code(404).send('');
    const result = await callLLMStructured(
      {
        feature: 'task_breakdown',
        model: await modelForFeature('task_breakdown', 'cheap'),
        promptVersion: TASK_BREAKDOWN_VERSION,
        system: TASK_BREAKDOWN_SYSTEM,
        context: [{ text: taskBreakdownInstruction(task.title, task.context) }],
        instruction: 'Break it down now.',
        maxTokens: 1000,
      },
      taskBreakdownSchema,
    );
    if (result.status !== 'ok' || !result.data) {
      return reply.type('text/html').send(`<li class="muted">${esc(result.message ?? 'AI unavailable.')}</li>`);
    }
    const made: string[] = [];
    for (const step of result.data.steps.slice(0, 8)) {
      const t = step.trim().slice(0, 200);
      if (t) made.push(renderSubStep(await createSubtask(id.data.id, t)));
    }
    return reply.type('text/html').send(made.join(''));
  });

  app.post('/focus/substep/:id/toggle', guard, async (req, reply) => {
    const id = idParam.safeParse(req.params);
    if (!id.success) return reply.code(400).send('');
    const s = await toggleSubtaskDone(id.data.id);
    return reply.type('text/html').send(s ? renderSubStep(s) : '');
  });
}
