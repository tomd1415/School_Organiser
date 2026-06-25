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
import { renderFocusInner, renderSubStep, type FocusVM } from '../lib/focusView';

const idParam = z.object({ id: z.coerce.number().int().positive() });

function modeForMinutes(minutes: number): FocusMode {
  if (minutes < 9 * 60) return 'morning';
  if (minutes >= 16 * 60) return 'end_of_day';
  return 'free_period';
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
  const subs = picked ? await listSubtasks(picked.id) : [];
  const vm: FocusVM = {
    mode,
    pollUrl,
    picked: picked
      ? { id: picked.id, title: picked.title, urgency: picked.urgency, estimateMin: picked.estimateMin, cognitiveLoad: picked.cognitiveLoad }
      : null,
    windowMinutes,
    hidden,
    subStepsHtml: subs.map(renderSubStep).join(''),
  };
  return { html: renderFocusInner(vm), sig };
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
    return reply.type('text/html').send(layout({ title: 'Focus', body, authed: true, csrfToken: csrf, width: 'working' }));
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
