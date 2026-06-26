// Phase 3 — the pupil take-flow routes (behind the pupil gate, light theme). Mirrors routes/me.ts:
// a real pupil (role 'pupil', needs the DPIA access gate) OR a teacher driving the fictitious TEST pupil
// (is_test attempts, bypasses the gate). No AI here — submission only enqueues marking. Every render goes
// through the PII-safe TakePaper projection, so the answer key never reaches the pupil.
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { pupilAccessEnabled, pupilLayout } from './pupilAuth';
import { getPupilName } from '../repos/pupilCredentials';
import { availableForPupil, answer as saveTakeAnswer, startTake, submit } from '../services/assessmentTake';
import { getPupilAttempt } from '../repos/assessmentAttempts';
import { getAssessment } from '../repos/assessments';
import {
  renderAvailableList,
  renderSubmitted,
  renderTakeError,
  renderTakePage,
  renderTakeSaved,
} from '../lib/assessmentTakeView';

interface ActingPupil {
  id: number;
  isTest: boolean;
}
function actingPupil(req: FastifyRequest): ActingPupil | null {
  if (req.session.get('role') === 'pupil') {
    const id = Number(req.session.get('pupilId') ?? 0);
    return id ? { id, isTest: false } : null;
  }
  if (req.session.get('authed') && req.session.get('role') !== 'ta') {
    const id = Number(req.session.get('testPupilId') ?? 0);
    return id ? { id, isTest: true } : null;
  }
  return null;
}

/** Resolve the acting pupil and enforce the DPIA access gate for REAL pupils (the test pupil bypasses it).
 *  Returns null (and writes a redirect/response) when no pupil is acting. */
async function resolvePupil(req: FastifyRequest, reply: FastifyReply): Promise<ActingPupil | null> {
  const acting = actingPupil(req);
  if (!acting) {
    void reply.redirect(req.session.get('role') === 'pupil' ? '/pupil' : '/');
    return null;
  }
  if (!acting.isTest && !(await pupilAccessEnabled())) {
    req.session.delete();
    void reply.redirect('/pupil');
    return null;
  }
  return acting;
}

const idParam = z.object({ id: z.coerce.number().int().positive() });

export function registerAssessmentTakeRoutes(app: FastifyInstance): void {
  const csrfGuard = { preHandler: app.csrfProtection };

  app.get('/me/assessments', async (req, reply) => {
    const acting = await resolvePupil(req, reply);
    if (!acting) return;
    const csrf = reply.generateCsrf();
    const [items, name] = await Promise.all([
      availableForPupil(acting.id, acting.isTest),
      acting.isTest ? Promise.resolve('Test Pupil') : (getPupilName(acting.id).then((n) => n ?? 'you')),
    ]);
    return reply.type('text/html').send(pupilLayout(renderAvailableList(items, name), csrf));
  });

  app.get('/me/assessments/:id', async (req, reply) => {
    const acting = await resolvePupil(req, reply);
    if (!acting) return;
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const csrf = reply.generateCsrf();
    const res = await startTake(p.data.id, acting.id, acting.isTest);
    if ('error' in res) return reply.type('text/html').send(pupilLayout(renderTakeError(res.error), csrf));
    // A submitted attempt shows the confirmation, not the editable form.
    if (res.attempt.status === 'submitted') {
      return reply.type('text/html').send(pupilLayout(renderSubmitted({ id: p.data.id, title: res.paper.title }), csrf));
    }
    const body = `<div id="asmt-take-root">${renderTakePage(res.paper, res.answers)}</div>`;
    return reply.type('text/html').send(pupilLayout(body, csrf));
  });

  app.post('/me/assessments/:id/answer', csrfGuard, async (req, reply) => {
    const acting = await resolvePupil(req, reply);
    if (!acting) return;
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    // value may be a single string OR (for a tick_box checkbox group) an array; join the set.
    const b = z
      .object({ partId: z.coerce.number().int().positive(), value: z.union([z.string(), z.array(z.string())]).optional() })
      .safeParse(req.body ?? {});
    if (!b.success) return reply.code(400).send('');
    const attempt = await getPupilAttempt(p.data.id, acting.id, acting.isTest);
    if (!attempt) return reply.code(409).type('text/html').send('<span class="note-status">not saved</span>');
    const value = Array.isArray(b.data.value) ? b.data.value.join('\n') : (b.data.value ?? '');
    const r = await saveTakeAnswer(p.data.id, attempt, b.data.partId, value);
    return reply.type('text/html').send(r.ok ? renderTakeSaved() : '<span class="note-status">not saved</span>');
  });

  app.post('/me/assessments/:id/submit', csrfGuard, async (req, reply) => {
    const acting = await resolvePupil(req, reply);
    if (!acting) return;
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const attempt = await getPupilAttempt(p.data.id, acting.id, acting.isTest);
    const a = await getAssessment(p.data.id);
    const title = a?.title ?? 'your assessment';
    if (!attempt) return reply.type('text/html').send(renderTakeError('No attempt to submit.'));
    await submit(attempt); // double-submit guarded inside; never blocks on AI
    return reply.type('text/html').send(renderSubmitted({ id: p.data.id, title }));
  });
}
