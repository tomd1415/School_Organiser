// Phase 16A.2 — the Stages & strands admin: list schemes, view a scheme's Stage × Strand grid, and assign
// a scheme to each class. routes → repos → pure views (URLs via paths.ts). No AI, no pupil identity here.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { layout } from '../lib/html';
import { paths } from '../lib/paths';
import { renderClassHeatMap, renderProgressionAdmin, renderPupilLadder, renderSchemeGrid, type HeatPupil } from '../lib/progressionView';
import {
  bindClassToScheme,
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
  pupilClassesWithScheme,
  schemeGrid,
  unbindClassScheme,
} from '../repos/progression';
import { currentStagePerStrand, overallRollUp } from '../services/progression';

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
        body = renderSchemeGrid({ schemeName: scheme.name, grid: await schemeGrid(p.data.id) });
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
        const evidence = await evidencedForPupils(pupils.map((x) => x.id));
        const labelByOrdinal: Record<number, string> = {};
        for (const s of stages) labelByOrdinal[s.ordinal] = s.label;
        const heatPupils: HeatPupil[] = pupils.map((pu) => {
          const perStrandArr = currentStagePerStrand(criteria, evidence.get(pu.id) ?? new Set());
          const perStrand: Record<number, number | null> = {};
          for (const ps of perStrandArr) perStrand[ps.strandId] = ps.stageOrdinal;
          return { id: pu.id, name: pu.displayName, perStrand, overall: overallRollUp(perStrandArr).overallOrdinal };
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
      const ev = await evidencedCriterionIds(p.data.id);
      const built = [];
      for (const cl of classes) {
        const [criteria, strands, stages] = await Promise.all([criteriaForScheme(cl.schemeId), listStrands(cl.schemeId), listStages(cl.schemeId)]);
        const perStrandArr = currentStagePerStrand(criteria, ev);
        const ordById = new Map(perStrandArr.map((ps) => [ps.strandId, ps.stageOrdinal]));
        const labelByOrdinal: Record<number, string> = {};
        for (const s of stages) labelByOrdinal[s.ordinal] = s.label;
        built.push({
          groupCourseId: cl.groupCourseId,
          className: cl.label,
          schemeName: cl.schemeName,
          strands: strands.map((s) => ({ id: s.id, code: s.code, name: s.name, ordinal: ordById.get(s.id) ?? null })),
          overall: overallRollUp(perStrandArr).overallOrdinal,
          labelByOrdinal,
        });
      }
      body = renderPupilLadder({ pupilName, classes: built });
    } catch (err) {
      app.log.error({ err }, 'progression pupil ladder render failed');
      body = '<section class="card"><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Stages & strands', body, authed: true, csrfToken: csrf, width: 'wide' }));
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
