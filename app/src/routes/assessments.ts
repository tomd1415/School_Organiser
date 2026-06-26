// Phase 1 — teacher routes for per-unit assessments: the per-unit list + "Generate for class X", the
// draft review/edit page, light inline editing (stem / prompt / marks / mark-points), and "Mark ready".
// Behind the teacher gate; every mutation carries CSRF. Generation degrades cleanly (writes nothing, shows
// a teacher-actionable note). Mirrors routes/schemes.ts structure. Editing is gated to status === 'draft'.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { layout } from '../lib/html';
import { paths } from '../lib/paths';
import {
  assessmentWithQuestions,
  getAssessment,
  listAssessmentsForUnit,
  setAssessmentStatus,
  updateMarkPointFields,
  updatePartFields,
  updateQuestionStem,
} from '../repos/assessments';
import { assessmentReadiness } from '../services/assessment';
import { generateAssessment } from '../services/assessmentGen';
import { getUnitForReview } from '../repos/schemes';
import { listSlotsForCourse } from '../repos/delivery';
import { listSpecPoints } from '../repos/specPoints';
import { normaliseMarkKind } from '../llm/schemas/markScheme';
import { assessmentReviewView, renderGenerateNote, renderUnitAssessments, type ClassOption } from '../lib/assessmentReviewView';
import { renderSavedStatus, renderSaveError } from '../lib/notesView';

// A numeric form field that treats an empty string as "not provided" (so a blank "auto" input is optional).
// `.optional()` must sit INSIDE the preprocess target: an empty string is a present value, so an outer
// `.optional()` wouldn't short-circuit it — the preprocess maps '' → undefined and the inner optional then
// accepts it (an outer optional would feed undefined into z.coerce.number() → NaN → parse failure).
const numField = (min: number, max: number) =>
  z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().int().min(min).max(max).optional());

const idParam = z.object({ id: z.coerce.number().int().positive() });
const unitParam = z.object({ unitId: z.coerce.number().int().positive() });

/** The notice (if any) for a freshly-built paper read back from its blueprint JSON. */
function brandNewClassNotice(blueprint: unknown): string | null {
  const bp = blueprint as { coveredSpecPointIds?: unknown } | null;
  if (bp && Array.isArray(bp.coveredSpecPointIds) && bp.coveredSpecPointIds.length === 0) {
    return 'This class had no taught spec points yet — the paper is mostly diagnostic/stretch. Review it carefully.';
  }
  return null;
}

/** The validator's normalisation notes, persisted into the blueprint JSON at generation time. */
function persistedWarnings(blueprint: unknown): string[] | undefined {
  const bp = blueprint as { warnings?: unknown } | null;
  if (bp && Array.isArray(bp.warnings)) {
    const ws = bp.warnings.filter((w): w is string => typeof w === 'string');
    return ws.length ? ws : undefined;
  }
  return undefined;
}

async function renderReviewSection(assessmentId: number, csrf: string, notice?: string | null): Promise<string | null> {
  const tree = await assessmentWithQuestions(assessmentId);
  if (!tree) return null;
  const specPoints = await listSpecPoints(tree.courseId, true); // include archived so an archived code still renders
  return assessmentReviewView(tree, {
    editable: tree.status === 'draft',
    csrf,
    specPoints,
    readiness: assessmentReadiness(tree),
    warnings: persistedWarnings(tree.blueprint),
    notice: notice ?? brandNewClassNotice(tree.blueprint),
  });
}

export function registerAssessmentRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  // ── The per-unit assessments page: list + "Generate for class X" ────────────────────────────────
  app.get('/units/:unitId/assessments', { preHandler: requireAuth }, async (req, reply) => {
    const p = unitParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const csrf = reply.generateCsrf();
    const unit = await getUnitForReview(p.data.unitId);
    if (!unit) {
      return reply.type('text/html').send(layout({ title: 'Assessments', body: '<section class="card"><p class="muted">No such unit.</p></section>', authed: true, csrfToken: csrf, width: 'working' }));
    }
    const [assessments, slots] = await Promise.all([listAssessmentsForUnit(p.data.unitId), listSlotsForCourse(unit.courseId)]);
    const seen = new Set<number>();
    const classes: ClassOption[] = [];
    for (const s of slots) {
      if (seen.has(s.groupCourseId)) continue;
      seen.add(s.groupCourseId);
      classes.push({ groupCourseId: s.groupCourseId, label: `${s.groupName ?? 'class'}${s.periodLabel ? ` · ${s.periodLabel}` : ''}` });
    }
    const body = renderUnitAssessments({ unitId: p.data.unitId, unitTitle: unit.unitTitle, courseName: unit.courseName, assessments, classes, csrf });
    return reply.type('text/html').send(layout({ title: 'Assessments', body, authed: true, csrfToken: csrf, width: 'working' }));
  });

  app.post('/units/:unitId/assessments/generate', guard, async (req, reply) => {
    const p = unitParam.safeParse(req.params);
    const b = z
      .object({
        groupCourseId: z.coerce.number().int().positive(),
        window: z.enum(['to_date', 'whole']).optional(),
        questionCount: numField(1, 40),
        totalMarks: numField(1, 200),
      })
      .safeParse(req.body ?? {});
    if (!p.success || !b.success) return reply.type('text/html').send(renderGenerateNote('Pick a class first.'));
    const res = await generateAssessment(p.data.unitId, b.data.groupCourseId, {
      window: b.data.window,
      questionCount: b.data.questionCount,
      totalMarks: b.data.totalMarks,
    });
    if (res.ok && res.assessmentId) {
      reply.header('HX-Redirect', paths.assessment(res.assessmentId));
      return reply.send('');
    }
    return reply.type('text/html').send(renderGenerateNote(res.message, res.warnings));
  });

  // ── The draft review / edit page ────────────────────────────────────────────────────────────────
  app.get('/assessments/:id', { preHandler: requireAuth }, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const csrf = reply.generateCsrf();
    const section = await renderReviewSection(p.data.id, csrf);
    const body = section ?? '<section class="card"><p class="muted">No such assessment.</p></section>';
    const title = section ? 'Review assessment' : 'Assessment';
    return reply.type('text/html').send(layout({ title, body, authed: true, csrfToken: csrf, width: 'working' }));
  });

  app.post('/assessments/:id/ready', guard, async (req, reply) => {
    const p = idParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const csrf = reply.generateCsrf();
    const tree = await assessmentWithQuestions(p.data.id);
    if (!tree) return reply.code(404).type('text/html').send('<p class="muted">No such assessment.</p>');
    // Guard: only a valid DRAFT flips to ready (≥1 question, every part has ≥1 mark point, marks_total > 0).
    if (tree.status === 'draft' && assessmentReadiness(tree).ok) await setAssessmentStatus(p.data.id, 'ready');
    const section = await renderReviewSection(p.data.id, csrf);
    return reply.type('text/html').send(section ?? '<section class="card"><p class="muted">No such assessment.</p></section>');
  });

  // ── Light inline editing — gated to drafts; each helper is scoped by assessment id in the repo ─────
  app.post('/assessments/:id/questions/:qid', guard, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive(), qid: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const status = `q-${p.data.qid}-status`;
    const a = await getAssessment(p.data.id);
    if (!a || a.status !== 'draft') return reply.type('text/html').send(renderSaveError(status, 'Only drafts can be edited.'));
    const b = z.object({ stem: z.string().max(4000) }).safeParse(req.body ?? {});
    if (!b.success) return reply.type('text/html').send(renderSaveError(status, 'Could not save.'));
    const ok = await updateQuestionStem(p.data.id, p.data.qid, b.data.stem);
    return reply.type('text/html').send(ok ? renderSavedStatus(status) : renderSaveError(status, 'Not found.'));
  });

  app.post('/assessments/:id/parts/:pid', guard, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive(), pid: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const status = `part-${p.data.pid}-status`;
    const a = await getAssessment(p.data.id);
    if (!a || a.status !== 'draft') return reply.type('text/html').send(renderSaveError(status, 'Only drafts can be edited.'));
    const b = z.object({ prompt: z.string().max(4000).optional(), marks: numField(0, 20) }).safeParse(req.body ?? {});
    if (!b.success) return reply.type('text/html').send(renderSaveError(status, 'Could not save.'));
    const ok = await updatePartFields(p.data.id, p.data.pid, { prompt: b.data.prompt, marks: b.data.marks });
    if (!ok) return reply.type('text/html').send(renderSaveError(status, 'Not found.'));
    // A marks change re-rolls the question + paper totals (and the Mark-ready bar), so re-render the whole
    // section. A prompt-only edit is a quiet autosave (status span), so the textarea cursor isn't disturbed.
    if (b.data.marks !== undefined) {
      const section = await renderReviewSection(p.data.id, reply.generateCsrf());
      if (section) return reply.type('text/html').send(section);
    }
    return reply.type('text/html').send(renderSavedStatus(status));
  });

  app.post('/assessments/:id/markpoints/:mid', guard, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive(), mid: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const status = `mp-${p.data.mid}-status`;
    const a = await getAssessment(p.data.id);
    if (!a || a.status !== 'draft') return reply.type('text/html').send(renderSaveError(status, 'Only drafts can be edited.'));
    const b = z.object({ text: z.string().max(2000).optional(), marks: numField(0, 20), kind: z.string().max(20).optional() }).safeParse(req.body ?? {});
    if (!b.success) return reply.type('text/html').send(renderSaveError(status, 'Could not save.'));
    const ok = await updateMarkPointFields(p.data.id, p.data.mid, {
      text: b.data.text,
      marks: b.data.marks,
      kind: b.data.kind != null ? normaliseMarkKind(b.data.kind) : undefined,
    });
    return reply.type('text/html').send(ok ? renderSavedStatus(status) : renderSaveError(status, 'Not found.'));
  });
}
