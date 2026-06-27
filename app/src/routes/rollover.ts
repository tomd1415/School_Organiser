// Phase 6.4: the September rollover wizard. Everything happens against a DRAFT target year —
// the live year is untouched until the explicit "go live" at the bottom (which is just the
// Setup page's make-current). Re-enterable and idempotent: groups already moved show as done.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc, layout } from '../lib/html';
import {
  bumpName,
  getCurrentYearId,
  listPeriods,
  listRolloverGroups,
  listTerms,
  listYears,
  rolloverGroup,
  type YearRow,
} from '../repos/setup';

function pickerForm(years: YearRow[], from: number, to: number | null): string {
  const opts = (sel: number | null, excl?: number) =>
    years
      .filter((y) => Number(y.id) !== excl)
      .map((y) => `<option value="${y.id}"${Number(y.id) === sel ? ' selected' : ''}>${esc(y.name)}${y.isCurrent ? ' (current)' : ''}</option>`)
      .join('');
  return `<form method="get" action="/setup/rollover" class="setup-add">
    <label>From <select name="from" onchange="this.form.submit()">${opts(from)}</select></label>
    <label>→ to <select name="to" onchange="this.form.submit()">
      <option value="">— pick the new year —</option>${opts(to)}</select></label>
    <noscript><button type="submit">Go</button></noscript>
  </form>`;
}

export function registerRolloverRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };

  app.get('/setup/rollover', { preHandler: requireAuth }, async (req, reply) => {
    const csrf = reply.generateCsrf();
    let body: string;
    try {
      const years = await listYears();
      const currentId = await getCurrentYearId();
      const q = z
        .object({ from: z.coerce.number().int().positive().optional(), to: z.coerce.number().int().positive().optional() })
        .safeParse(req.query);
      const from = (q.success && q.data.from) || Number(currentId);
      const to = (q.success && q.data.to) || null;

      let steps = '';
      if (to && to !== from) {
        const [terms, periods, groups] = await Promise.all([listTerms(to), listPeriods(to), listRolloverGroups(from, to)]);
        const toName = esc(years.find((y) => Number(y.id) === to)?.name ?? '');
        const groupRows = groups
          .map((g) => {
            if (g.successorId) {
              return `<tr class="map-past"><td>${esc(g.name)}</td><td colspan="3">→ <strong>${esc(g.successorName ?? '')}</strong> ✓ moved up (pupils + courses + class context)</td></tr>`;
            }
            return `<tr>
              <td><label><input type="checkbox" name="take" value="${g.id}" checked> ${esc(g.name)}</label></td>
              <td><input name="name-${g.id}" value="${esc(bumpName(g.name))}" maxlength="50"></td>
              <td class="muted">${g.pupilCount} pupils</td>
              <td class="muted">${esc(g.courseNames ?? '—')}</td>
            </tr>`;
          })
          .join('');
        steps = `
          <h2>1 · The new year's bones</h2>
          <ul class="rollover-checks">
            <li>${terms.length ? `✓ ${terms.length} term/holiday rows` : '⚠ no term dates yet'} — <a href="/setup?tab=year&year=${to}">edit terms →</a></li>
            <li>${periods.length ? `✓ ${periods.length} periods in the day shape` : '⚠ no day shape yet'} — <a href="/setup?tab=day&year=${to}">edit day shape →</a> (it has a one-click "copy from ${esc(years.find((y) => Number(y.id) === from)?.name ?? '')}")</li>
          </ul>

          <h2>2 · Classes move up</h2>
          <p class="muted">Tick the classes continuing in ${toName} (untick leavers — Y11s etc.), check the suggested new names, then create them.
            Each new class keeps its <strong>pupils</strong>, <strong>courses</strong> and <strong>per-class teaching context</strong>, and is chained to its old self so history stays one click away.
            Lesson adaptations stay with the old year — the masters already absorbed what worked.</p>
          <form hx-post="/setup/rollover/groups?from=${from}&to=${to}" hx-target="closest section" hx-swap="outerHTML">
            <div class="table-scroll"><table class="setup-table">
              <thead><tr><th>This year</th><th>New name in ${toName}</th><th></th><th>Courses</th></tr></thead>
              <tbody>${groupRows || '<tr><td colspan="4" class="muted">no active groups in the source year</td></tr>'}</tbody>
            </table></div>
            ${groups.some((g) => !g.successorId) ? '<button type="submit" class="primary">Move the ticked classes up →</button>' : '<p class="muted">All classes are moved. ✓</p>'}
          </form>

          <h2>3 · New intake &amp; pupil moves</h2>
          <p class="muted">Add the new Year 7 groups (and any pupils changing class) on
            <a href="/setup?tab=groups&year=${to}">Groups &amp; pupils for ${toName} →</a></p>

          <h2>4 · The new timetable</h2>
          <p class="muted">Fill the week from the school's published timetable:
            <a href="/setup?tab=timetable&year=${to}">Timetable editor for ${toName} →</a>
            (nothing carries over — every year starts from a clean grid).</p>

          <h2>5 · Go live</h2>
          <p class="muted">When September arrives, flip the app to the new year on
            <a href="/setup?tab=year&year=${to}">Year &amp; terms</a> ("make current").
            Until then everything above is a draft and the current year runs untouched.</p>`;
      } else {
        steps = `<p class="muted">Pick the year you're rolling into. If it doesn't exist yet, create it first on
          <a href="/setup?tab=year">Year &amp; terms</a> — it stays a draft until you go live.</p>`;
      }

      body = `
        <section class="card setup" hx-headers='{"x-csrf-token":"${csrf}"}'>
          <h1>September rollover</h1>
          <p class="muted">Build the next year well in advance — the live year is never touched until step 5.</p>
          ${pickerForm(years, from, to)}
          ${steps}
        </section>`;
    } catch (err) {
      app.log.error({ err }, 'page render failed (shown as unavailable)');
      body = '<section class="card"><h1>September rollover</h1><p class="muted">Unavailable — the database is not reachable.</p></section>';
    }
    return reply.type('text/html').send(layout({ title: 'Rollover', body, authed: true, csrfToken: csrf }));
  });

  app.post('/setup/rollover/groups', guard, async (req, reply) => {
    const q = z.object({ from: z.coerce.number().int().positive(), to: z.coerce.number().int().positive() }).safeParse(req.query);
    if (!q.success || q.data.from === q.data.to) return reply.code(400).send('');
    const body = req.body as Record<string, string | string[]>;
    const take = ([] as string[]).concat(body.take ?? []);
    const results: string[] = [];
    for (const idStr of take) {
      const id = Number(idStr);
      if (!Number.isInteger(id) || id <= 0) continue;
      const name = String(body[`name-${id}`] ?? '').trim();
      if (!name) continue;
      const newId = await rolloverGroup(id, q.data.to, name);
      results.push(newId ? `${esc(name)} ✓` : `${esc(name)} — skipped (name already used in that year)`);
    }
    reply.header('HX-Redirect', `/setup/rollover?from=${q.data.from}&to=${q.data.to}`);
    return reply.send(results.join(', '));
  });
}
