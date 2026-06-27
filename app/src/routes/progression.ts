// Phase 16A.2 — the Stages & strands admin: list schemes, view a scheme's Stage × Strand grid, and assign
// a scheme to each class. routes → repos → pure views (URLs via paths.ts). No AI, no pupil identity here.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { layout } from '../lib/html';
import { paths } from '../lib/paths';
import { renderClassHeatMap, renderProgressionAdmin, renderPupilLadder, renderSchemeGrid, renderSchemeMap, type HeatPupil, type SuggestedEvidence } from '../lib/progressionView';
import {
  addEvidence,
  addSpecLink,
  bindClassToScheme,
  coursesForScheme,
  criteriaDetails,
  criteriaForScheme,
  enrolledPupilsForClass,
  evidencedCriterionIds,
  evidencedForPupils,
  getPupilName,
  getSchemeForClass,
  listClassesWithScheme,
  listSchemes,
  listSchemesWithCounts,
  listStages,
  listStrands,
  masteredSpecPointsForPupil,
  pupilClassesWithScheme,
  removeSpecLink,
  schemeCriteriaWithLinks,
  schemeIdForCriterion,
  schemeGrid,
  specLinksForScheme,
  unbindClassScheme,
  yearAnchorsForScheme,
} from '../repos/progression';
import { listSpecPoints } from '../repos/specPoints';
import { currentStagePerStrand, overallRollUp, suggestEvidence } from '../services/progression';

export function registerProgressionRoutes(app: FastifyInstance): void {
  app.get('/progression', { preHandler: requireAuth }, async (_req, reply) => {
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const [schemes, classes] = await Promise.all([listSchemesWithCounts(), listClassesWithScheme()]);
      body = renderProgressionAdmin({ schemes, classes, csrf });
    } catch (err) {
      app.log.error({ err }, 'progression admin render failed');
      body = '<section class="card"><h1>Stages &amp; strands</h1><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Stages & strands', body, authed: true, csrfToken: csrf, width: 'wide' }));
  });

  app.get('/progression/scheme/:id', { preHandler: requireAuth }, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
    const csrf = reply.generateCsrf();
    if (!p.success) return reply.code(400).type('text/html').send(layout({ title: 'Stages & strands', body: '<section class="card"><p class="error">Bad scheme id.</p></section>', authed: true, csrfToken: csrf }));
    let body: string;
    try {
      const scheme = (await listSchemes()).find((s) => s.id === p.data.id);
      if (!scheme) {
        body = `<section class="card"><p class="muted">No such scheme. <a class="link" href="${paths.progression()}">← all schemes</a></p></section>`;
      } else {
        body = renderSchemeGrid({ schemeId: p.data.id, schemeName: scheme.name, grid: await schemeGrid(p.data.id) });
      }
    } catch (err) {
      app.log.error({ err }, 'progression scheme grid render failed');
      body = '<section class="card"><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Stages & strands', body, authed: true, csrfToken: csrf, width: 'wide' }));
  });

  // 16A.3 — the class heat-map: each pupil's current stage per strand + overall (computed via the pure
  // roll-up). PII (teacher-only, behind auth; never to AI).
  app.get('/progression/class/:gc', { preHandler: requireAuth }, async (req, reply) => {
    const p = z.object({ gc: z.coerce.number().int().positive() }).safeParse(req.params);
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      if (!p.success) throw new Error('bad id');
      const gc = p.data.gc;
      const schemeId = await getSchemeForClass(gc);
      const className = (await listClassesWithScheme()).find((c) => c.groupCourseId === gc)?.label ?? `Class ${gc}`;
      if (schemeId == null) {
        body = `<section class="card"><h1>${className}</h1><p class="muted">No scheme assigned. <a class="link" href="${paths.progression()}">assign one →</a></p></section>`;
      } else {
        const [criteria, strands, stages, pupils] = await Promise.all([
          criteriaForScheme(schemeId),
          listStrands(schemeId),
          listStages(schemeId),
          enrolledPupilsForClass(gc),
        ]);
        const [evidence, anchors] = await Promise.all([
          evidencedForPupils(pupils.map((x) => x.id)),
          yearAnchorsForScheme(pupils.map((x) => x.id), schemeId),
        ]);
        const labelByOrdinal: Record<number, string> = {};
        for (const s of stages) labelByOrdinal[s.ordinal] = s.label;
        const heatPupils: HeatPupil[] = pupils.map((pu) => {
          const perStrandArr = currentStagePerStrand(criteria, evidence.get(pu.id) ?? new Set());
          const perStrand: Record<number, number | null> = {};
          for (const ps of perStrandArr) perStrand[ps.strandId] = ps.stageOrdinal;
          // 16A.5: a recorded year-end overall anchors the overall (else the computed cross-strand mean).
          const overall = overallRollUp(perStrandArr, { yearAssessmentOrdinal: anchors.get(pu.id) ?? null }).overallOrdinal;
          return { id: pu.id, name: pu.displayName, perStrand, overall };
        });
        const schemeName = (await listSchemes()).find((s) => s.id === schemeId)?.name ?? '';
        body = renderClassHeatMap({ schemeName, className, strands: strands.map((s) => ({ id: s.id, code: s.code, name: s.name })), labelByOrdinal, pupils: heatPupils });
      }
    } catch (err) {
      app.log.error({ err }, 'progression class heat-map render failed');
      body = '<section class="card"><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Stages & strands', body, authed: true, csrfToken: csrf, width: 'wide' }));
  });

  // 16A.3 — the per-pupil ladder: per-strand current stage + overall, per scheme-bound class. PII.
  app.get('/progression/pupil/:id', { preHandler: requireAuth }, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      if (!p.success) throw new Error('bad id');
      const pupilName = (await getPupilName(p.data.id)) ?? `Pupil ${p.data.id}`;
      const classes = await pupilClassesWithScheme(p.data.id);
      const [ev, mastered] = await Promise.all([evidencedCriterionIds(p.data.id), masteredSpecPointsForPupil(p.data.id)]);
      const built = [];
      for (const cl of classes) {
        const [criteria, strands, stages, anchors, links] = await Promise.all([
          criteriaForScheme(cl.schemeId),
          listStrands(cl.schemeId),
          listStages(cl.schemeId),
          yearAnchorsForScheme([p.data.id], cl.schemeId),
          specLinksForScheme(cl.schemeId),
        ]);
        const perStrandArr = currentStagePerStrand(criteria, ev);
        const ordById = new Map(perStrandArr.map((ps) => [ps.strandId, ps.stageOrdinal]));
        const labelByOrdinal: Record<number, string> = {};
        for (const s of stages) labelByOrdinal[s.ordinal] = s.label;
        // 16A.4: suggest criteria linked to spec points the pupil has mastered (not yet evidenced).
        const suggestIds = suggestEvidence(mastered, links, ev);
        const details = await criteriaDetails(suggestIds);
        const suggestions: SuggestedEvidence[] = details.map((d) => ({ criterionId: d.id, descriptor: d.descriptor, stageLabel: d.stageLabel, strandCode: d.strandCode }));
        built.push({
          groupCourseId: cl.groupCourseId,
          className: cl.label,
          schemeName: cl.schemeName,
          strands: strands.map((s) => ({ id: s.id, code: s.code, name: s.name, ordinal: ordById.get(s.id) ?? null })),
          overall: overallRollUp(perStrandArr, { yearAssessmentOrdinal: anchors.get(p.data.id) ?? null }).overallOrdinal,
          labelByOrdinal,
          suggestions,
        });
      }
      body = renderPupilLadder({ pupilId: p.data.id, pupilName, classes: built, csrf });
    } catch (err) {
      app.log.error({ err }, 'progression pupil ladder render failed');
      body = '<section class="card"><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Stages & strands', body, authed: true, csrfToken: csrf, width: 'wide' }));
  });

  // 16A.4 — the criterion ↔ spec-point mapping editor (drives the auto-suggest). No AI.
  app.get('/progression/scheme/:id/map', { preHandler: requireAuth }, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      if (!p.success) throw new Error('bad id');
      const scheme = (await listSchemes()).find((s) => s.id === p.data.id);
      if (!scheme) {
        body = `<section class="card"><p class="muted">No such scheme. <a class="link" href="${paths.progression()}">← all schemes</a></p></section>`;
      } else {
        const [criteria, courses] = await Promise.all([schemeCriteriaWithLinks(p.data.id), coursesForScheme(p.data.id)]);
        // spec points come from the scheme's bound course(s); use the first course that has any.
        let specPoints: Array<{ id: number; code: string; title: string }> = [];
        let courseName: string | null = null;
        for (const c of courses) {
          const sp = await listSpecPoints(c.courseId);
          if (sp.length) {
            specPoints = sp.map((s) => ({ id: s.id, code: s.code, title: s.title }));
            courseName = c.courseName;
            break;
          }
        }
        body = renderSchemeMap({ schemeId: p.data.id, schemeName: scheme.name, courseName, criteria, specPoints, csrf });
      }
    } catch (err) {
      app.log.error({ err }, 'progression scheme map render failed');
      body = '<section class="card"><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Stages & strands', body, authed: true, csrfToken: csrf, width: 'wide' }));
  });

  app.post('/progression/spec-link', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const b = z
      .object({ action: z.enum(['add', 'remove']), criterion: z.coerce.number().int().positive(), spec: z.coerce.number().int().positive() })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send('Bad request.');
    if (b.data.action === 'add') await addSpecLink(b.data.criterion, b.data.spec);
    else await removeSpecLink(b.data.criterion, b.data.spec);
    // back to the map for the scheme the criterion belongs to
    const schemeId = await schemeIdForCriterion(b.data.criterion);
    const to = schemeId ? paths.progressionSchemeMap(schemeId) : paths.progression();
    reply.header('HX-Redirect', to);
    return reply.redirect(to);
  });

  // 16A.4 — confirm a suggested criterion as evidence (teacher action; never auto-applied).
  app.post('/progression/evidence/confirm', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const b = z.object({ pupil: z.coerce.number().int().positive(), criterion: z.coerce.number().int().positive() }).safeParse(req.body);
    if (!b.success) return reply.code(400).send('Bad request.');
    await addEvidence({ pupilId: b.data.pupil, criterionId: b.data.criterion, sourceKind: 'assessment', note: 'confirmed from marking suggestion' });
    const to = paths.progressionPupil(b.data.pupil);
    reply.header('HX-Redirect', to);
    return reply.redirect(to);
  });

  app.post('/progression/assign', { preHandler: [requireAuth, app.csrfProtection] }, async (req, reply) => {
    const b = z
      .object({ gc: z.coerce.number().int().positive(), scheme: z.union([z.coerce.number().int().positive(), z.literal('')]).optional() })
      .safeParse(req.body);
    if (!b.success) return reply.code(400).send('Bad request.');
    const schemeId = b.data.scheme === '' || b.data.scheme == null ? null : b.data.scheme;
    if (schemeId == null) await unbindClassScheme(b.data.gc); // "— none —" clears the binding
    else await bindClassToScheme(b.data.gc, schemeId);
    reply.header('HX-Redirect', paths.progression());
    return reply.redirect(paths.progression());
  });
}
