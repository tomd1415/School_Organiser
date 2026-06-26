// Phase 4 — teacher marking routes: the per-attempt marking grid, manual "mark now", per-answer override,
// confirm-all, and the moderation queue. Behind the teacher gate; mutations CSRF-protected. The teacher sees
// full PII (their own pupils' answers); nothing here is sent to AI.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { layout } from '../lib/html';
import { getAssessment } from '../repos/assessments';
import {
  attemptMarkingRows,
  attemptsNeedingReview,
  confirmMarksForAttempt,
  getAttempt,
  listAssignmentsForAssessment,
  overrideMark,
  writeAwardedMark,
} from '../repos/assessmentAttempts';
import { classNamesFor } from '../repos/assessmentAnalytics';
import { getPupilName } from '../repos/pupilCredentials';
import { markAttempt, recomputeAttempt } from '../services/assessmentMarking';
import { releaseFor, teacherResults } from '../services/assessmentResults';
import { renderMarkingGrid, renderModerationQueue } from '../lib/assessmentMarkModalView';
import { renderReleaseSection, renderTeacherResults } from '../lib/assessmentResultsView';

const attemptParams = z.object({ id: z.coerce.number().int().positive(), attemptId: z.coerce.number().int().positive() });
const idParam = z.object({ id: z.coerce.number().int().positive() });

async function gridFor(assessmentId: number, attemptId: number, csrf: string): Promise<string | null> {
  const [attempt, a] = await Promise.all([getAttempt(attemptId), getAssessment(assessmentId)]);
  if (!attempt || !a || attempt.assessmentId !== assessmentId) return null;
  const [rows, pupilName] = await Promise.all([attemptMarkingRows(attemptId), getPupilName(attempt.pupilId).then((n) => n ?? `pupil #${attempt.pupilId}`)]);
  return renderMarkingGrid({
    assessmentId, attemptId, title: a.title, pupilName,
    scoreAwarded: attempt.scoreAwarded, scoreTotal: attempt.scoreTotal, rows, csrf,
  });
}

export function registerAssessmentMarkRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  // The moderation queue (attempts with needs_review / disclosure marks).
  app.get('/assessments/marking', { preHandler: requireAuth }, async (_req, reply) => {
    const csrf = reply.generateCsrf();
    const rows = await attemptsNeedingReview();
    const withNames = await Promise.all(rows.map(async (r) => ({ ...r, pupilName: (await getPupilName(r.pupilId)) ?? `pupil #${r.pupilId}` })));
    const body = renderModerationQueue({ rows: withNames, csrf });
    return reply.type('text/html').send(layout({ title: 'Marking queue', body, authed: true, csrfToken: csrf, width: 'working' }));
  });

  app.get('/assessments/:id/attempts/:attemptId/marks', { preHandler: requireAuth }, async (req, reply) => {
    const p = attemptParams.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const csrf = reply.generateCsrf();
    const grid = await gridFor(p.data.id, p.data.attemptId, csrf);
    const body = grid ?? '<section class="card"><p class="muted">No such attempt.</p></section>';
    return reply.type('text/html').send(layout({ title: 'Marking', body, authed: true, csrfToken: csrf, width: 'working' }));
  });

  app.post('/assessments/:id/attempts/:attemptId/mark', guard, async (req, reply) => {
    const p = attemptParams.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    await markAttempt(p.data.attemptId); // objective + open (AI off → leaves open for the teacher); recomputes caches
    const grid = await gridFor(p.data.id, p.data.attemptId, reply.generateCsrf());
    return reply.type('text/html').send(grid ?? '<section class="card"><p class="muted">No such attempt.</p></section>');
  });

  app.post('/assessments/:id/attempts/:attemptId/answers/:answerId/override', guard, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive(), attemptId: z.coerce.number().int().positive(), answerId: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ marks: z.coerce.number().int().min(0).max(1000), feedback: z.string().max(200).optional() }).safeParse(req.body ?? {});
    if (!p.success || !b.success) return reply.code(400).send('');
    // Clamp to the part's tariff (read from the grid rows we re-render anyway).
    const rows = await attemptMarkingRows(p.data.attemptId);
    const row = rows.find((r) => r.answerId === p.data.answerId);
    if (row) {
      const marks = Math.max(0, Math.min(row.partMarks, b.data.marks));
      if (row.marker == null) {
        // No awarded-mark row yet (e.g. an OPEN answer the AI couldn't mark / AI off) — insert a fresh
        // teacher-confirmed mark, so the teacher can always mark by hand (mirrors routes/markModal.ts).
        await writeAwardedMark({
          answerId: p.data.answerId, marksAwarded: marks, marksTotal: row.partMarks, marker: 'teacher',
          confidence: null, status: 'confirmed', needsReview: false, feedback: b.data.feedback ?? '',
          pointsHit: [], evidence: [], historyEntry: { override: true },
        });
      } else {
        await overrideMark(p.data.answerId, marks, b.data.feedback ?? null);
      }
      await recomputeAttempt(p.data.attemptId);
    }
    const grid = await gridFor(p.data.id, p.data.attemptId, reply.generateCsrf());
    return reply.type('text/html').send(grid ?? '<section class="card"><p class="muted">No such attempt.</p></section>');
  });

  app.post('/assessments/:id/attempts/:attemptId/confirm', guard, async (req, reply) => {
    const p = attemptParams.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    await confirmMarksForAttempt(p.data.attemptId); // skips needs_review
    await recomputeAttempt(p.data.attemptId);
    const grid = await gridFor(p.data.id, p.data.attemptId, reply.generateCsrf());
    return reply.type('text/html').send(grid ?? '<section class="card"><p class="muted">No such attempt.</p></section>');
  });

  // ── Phase 5: teacher results dashboard + per-class release ────────────────────────────────────────
  app.get('/assessments/:id/results', { preHandler: requireAuth }, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const csrf = reply.generateCsrf();
    const data = await teacherResults(p.data.id);
    if (!data) {
      return reply.type('text/html').send(layout({ title: 'Results', body: '<section class="card"><p class="muted">No such assessment.</p></section>', authed: true, csrfToken: csrf, width: 'wide' }));
    }
    const [pupilNames, classNames] = await Promise.all([
      Promise.all(data.perPupil.map(async (pp) => [pp.pupilId, (await getPupilName(pp.pupilId)) ?? `pupil #${pp.pupilId}`] as const)).then((e) => new Map(e)),
      classNamesFor(data.assignments.map((a) => a.groupCourseId)),
    ]);
    const body = renderTeacherResults({ ...data, pupilNames, classNames, csrf });
    return reply.type('text/html').send(layout({ title: `${data.title} — results`, body, authed: true, csrfToken: csrf, width: 'wide' }));
  });

  app.post('/assessments/:id/release/:gcId', guard, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive(), gcId: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ released: z.enum(['true', 'false']) }).safeParse(req.body ?? {});
    if (!p.success || !b.success) return reply.code(400).send('');
    await releaseFor(p.data.id, p.data.gcId, b.data.released === 'true');
    const assignments = await listAssignmentsForAssessment(p.data.id);
    const classNames = await classNamesFor(assignments.map((a) => a.groupCourseId));
    return reply.type('text/html').send(renderReleaseSection({ assessmentId: p.data.id, assignments, classNames, csrf: reply.generateCsrf() }));
  });
}
