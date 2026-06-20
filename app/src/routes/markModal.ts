// The per-pupil marking modal (a redesign of the bottom-of-page read-back). One pupil, one screen:
// every question as worded, its MODEL answer (from the mark scheme) and the pupil's answer side by
// side, with a tick/number to mark — pre-filled from the AI marks and kept clearly distinct until the
// teacher confirms. Colour-coded; a Prev / Next walks the class roster. Opened from the work grid,
// the /marking page and the Now screen (all target the shared <dialog id="mark-modal">).
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc } from '../lib/html';
import { pool } from '../db/pool';
import { renderWorksheet } from '../lib/worksheetForm';
import { getLessonWorksheet } from '../services/worksheet';
import { getOccurrenceHeader } from '../repos/occurrence';
import { pupilWorkRows, getAnswers, getPupilLevel, pupilCanAccessOc } from '../repos/pupilWork';
import { marksEnabled } from '../auth/marksGate';
import {
  getScheme, marksForPupil, overrideMark, writeMark, confirmMarksForPupil, getComment, type PupilMarkRow,
} from '../repos/marking';

interface OcInfo {
  occurrenceId: number;
  groupCourseId: number;
  lessonPlanId: number | null;
  courseName: string;
}
async function ocInfo(occurrenceCourseId: number): Promise<OcInfo | null> {
  const { rows } = await pool.query<OcInfo>(
    `SELECT oc.occurrence_id AS "occurrenceId", oc.group_course_id AS "groupCourseId",
            oc.lesson_plan_id AS "lessonPlanId", c.name AS "courseName"
     FROM occurrence_courses oc JOIN group_courses gc ON gc.id = oc.group_course_id
     JOIN courses c ON c.id = gc.course_id WHERE oc.id = $1`,
    [occurrenceCourseId],
  );
  return rows[0] ?? null;
}

const firstNameOf = (full: string): string => full.split(/\s+/)[0] ?? full;

// Shared "open the marking modal" attributes — load a pupil's body into the dialog and show it.
// Used by the work grid, the /marking page and the Now screen so every entry point behaves the same.
const SHOW = `hx-on::after-request="if(event.detail.successful){var d=document.getElementById('mark-modal');if(d&&!d.open)d.showModal();}"`;
export function markOpenAttrs(url: string): string {
  return `hx-get="${esc(url)}" hx-target="#mark-modal-body" hx-swap="innerHTML" ${SHOW}`;
}

// ── one question's mark control (a tick for 1-mark, a number for more) ──────────────────────────
function markControl(oc: number, pid: number, answerId: number, mk: PupilMarkRow | undefined, maxMarks: number): string {
  const awarded = mk?.marksAwarded;
  const set = (m: number | string) =>
    `hx-post="/lesson/oc/${oc}/pupil/${pid}/mark/save" hx-target="#mark-modal-body" hx-swap="innerHTML"`
    + ` hx-vals='{"answerId":"${answerId}","marks":"${m}","total":"${maxMarks}"}'`;
  if (maxMarks <= 1) {
    return `<div class="mm-tick">
      <button type="button" class="mm-t mm-t-yes${awarded === 1 ? ' on' : ''}" ${set(1)} title="correct">✓</button>
      <button type="button" class="mm-t mm-t-no${awarded === 0 ? ' on' : ''}" ${set(0)} title="not yet">✗</button></div>`;
  }
  return `<div class="mm-num">
    <button type="button" class="mm-t mm-t-yes" ${set(maxMarks)} title="full marks">✓</button>
    <input class="mm-score" type="number" min="0" max="${maxMarks}" value="${awarded ?? ''}" inputmode="numeric"
      hx-post="/lesson/oc/${oc}/pupil/${pid}/mark/save" hx-trigger="change" hx-target="#mark-modal-body" hx-swap="innerHTML"
      hx-vals='js:{"answerId":"${answerId}","marks":event.target.value,"total":"${maxMarks}"}'>
    <span class="mm-of">/ ${maxMarks}</span>
    <button type="button" class="mm-t mm-t-no" ${set(0)} title="zero">✗</button></div>`;
}

function statusBadge(mk: PupilMarkRow | undefined): string {
  if (!mk) return `<span class="mm-badge mm-todo">to mark</span>`;
  if (mk.status === 'confirmed') {
    return `<span class="mm-badge mm-ok" title="you have checked this answer">✓ checked${mk.marker === 'ai' ? ' (AI)' : ''}</span>`;
  }
  const conf = mk.confidence != null ? ` ${Math.round(mk.confidence * 100)}%` : '';
  return `<span class="mm-badge mm-sugg" title="AI suggested — confirm to check it">✨ AI${conf}</span>${mk.needsReview ? ' <span class="mm-badge mm-warn" title="the AI was unsure — please check">⚠ check</span>' : ''}`;
}

/** Build the inner HTML of #mark-modal-body for one pupil. Null if the oc/pupil/worksheet is missing. */
async function buildModal(oc: number, pid: number, marking: boolean): Promise<string | null> {
  const info = await ocInfo(oc);
  if (!info || info.lessonPlanId == null) return null;
  if (!(await pupilCanAccessOc(pid, oc))) return null;

  const [header, ws, roster, level] = await Promise.all([
    getOccurrenceHeader(info.occurrenceId),
    getLessonWorksheet(info.groupCourseId, info.lessonPlanId),
    pupilWorkRows(oc, info.groupCourseId),
    getPupilLevel(pid, info.groupCourseId),
  ]);
  const idx = roster.findIndex((r) => r.pupilId === pid);
  const me = roster[idx];
  if (!me) return null;
  const prev = idx > 0 ? roster[idx - 1] : null;
  const next = idx >= 0 && idx < roster.length - 1 ? roster[idx + 1] : null;
  const first = firstNameOf(me.displayName);

  if (!ws) {
    return `<div class="mm"><header class="mm-head"><div class="mm-htop"><span class="mm-name">${esc(me.displayName)}</span>
      <button type="button" class="mm-x" onclick="this.closest('dialog').close()" aria-label="Close">✕</button></div></header>
      <p class="muted mm-empty">No worksheet is bound to this lesson, so there's nothing to mark.</p></div>`;
  }

  // questions in document order; the scheme supplies model answers + per-question marks
  const fields = renderWorksheet(ws.markdown, { mode: 'review' }).fields;
  const questions = fields.filter((f) => f.kind === 'text' || f.kind === 'blank' || f.kind === 'choice');
  const checks = fields.filter((f) => f.kind === 'check');
  const scheme = await getScheme(ws.resourceId, ws.versionNo);
  const pointByKey = new Map((scheme?.points ?? []).map((p) => [p.fieldKey, p]));

  // pupil answers (with ids, so we can mark even an as-yet-unmarked answer) + their marks
  const ansRows = (await pool.query<{ id: number; field_key: string; value: string }>(
    `SELECT id, field_key, value FROM pupil_answers WHERE pupil_id = $1 AND occurrence_course_id = $2`,
    [pid, oc],
  )).rows;
  const ansByKey = new Map(ansRows.map((r) => [r.field_key, r]));
  const marks = marking ? await marksForPupil(pid, oc) : [];
  const markByKey = new Map(marks.map((m) => [m.fieldKey, m]));

  let awarded = 0, total = 0, checked = 0, markable = 0;
  const rowsHtml = questions
    .map((f, i) => {
      const pt = pointByKey.get(f.key);
      const ans = ansByKey.get(f.key);
      const mk = markByKey.get(f.key);
      const maxMarks = pt?.marks ?? 2;
      markable += 1; total += maxMarks;
      if (mk) { awarded += mk.marksAwarded; if (mk.status === 'confirmed') checked += 1; }
      const state = !mk ? 'mm-todo' : mk.needsReview ? 'mm-review' : mk.marksAwarded >= maxMarks ? 'mm-full' : mk.marksAwarded <= 0 ? 'mm-zero' : 'mm-part';
      const alts = pt && pt.alternatives.length ? ` <span class="mm-alts">also accept: ${esc(pt.alternatives.join(', '))}</span>` : '';
      const control = marking
        ? ans
          ? markControl(oc, pid, ans.id, mk, maxMarks)
          : `<span class="muted mm-noans">nothing to mark</span>`
        : '';
      return `<div class="mm-row ${state}">
        <div class="mm-q"><span class="mm-qn">Q${i + 1}</span><span class="mm-qtext">${esc(f.label)}</span></div>
        <div class="mm-grid">
          <div class="mm-model"><span class="mm-lbl">Model answer${pt ? ` · ${pt.marks} mark${pt.marks > 1 ? 's' : ''}` : ''}</span>
            <div class="mm-modeltext">${pt && pt.expected ? esc(pt.expected) : '<span class="muted">— no model answer —</span>'}${alts}</div></div>
          <div class="mm-ans"><span class="mm-lbl">${esc(first)}'s answer</span>
            <div class="mm-anstext">${ans && ans.value ? esc(ans.value) : '<span class="mm-blank">— left blank —</span>'}</div></div>
          <div class="mm-mk">${control}<div class="mm-mkmeta">${marking ? statusBadge(mk) : ''}</div>
            ${mk && mk.feedback ? `<div class="mm-fb">${esc(mk.feedback)}</div>` : ''}</div>
        </div></div>`;
    })
    .join('');

  // checklist self-assessment (not credited) — a compact summary so the screen stays about the questions
  const ticked = checks.filter((c) => (ansByKey.get(c.key)?.value ?? '') === 'x').length;
  const checksHtml = checks.length
    ? `<div class="mm-checks"><span class="mm-lbl">Self-check</span> ${ticked}/${checks.length} ticked
        ${checks.map((c) => `<span class="mm-chip ${(ansByKey.get(c.key)?.value ?? '') === 'x' ? 'on' : ''}">${(ansByKey.get(c.key)?.value ?? '') === 'x' ? '☑' : '☐'} ${esc(c.label)}</span>`).join('')}</div>`
    : '';

  const comment = marking ? await getComment(pid, oc) : '';
  const scoreState = total === 0 ? '' : awarded >= total ? 'mm-full' : awarded <= 0 ? 'mm-zero' : 'mm-part';
  const className = header?.groupName ?? info.courseName;
  const dateStr = header?.date ?? '';

  const navBtn = (p: typeof prev, label: string, kind: 'get') =>
    p
      ? `<button type="button" class="mm-navbtn" hx-${kind}="/lesson/oc/${oc}/pupil/${p.pupilId}/mark" hx-target="#mark-modal-body" hx-swap="innerHTML">${label}</button>`
      : `<button type="button" class="mm-navbtn" disabled>${label}</button>`;

  const footer = marking
    ? `<footer class="mm-foot">
        <label class="mm-comment">💬 Comment back to ${esc(first)}
          <textarea rows="2" placeholder="a kind line they'll see with their marks"
            hx-post="/lesson/oc/${oc}/pupil/${pid}/comment" hx-trigger="change" hx-swap="none">${esc(comment)}</textarea></label>
        <div class="mm-actions">
          ${navBtn(prev, `← ${prev ? esc(firstNameOf(prev.displayName)) : 'Prev'}`, 'get')}
          <button type="button" class="mm-confirm" hx-post="/lesson/oc/${oc}/pupil/${pid}/mark/confirm" hx-target="#mark-modal-body" hx-swap="innerHTML"
            title="accept every AI mark for this pupil as checked">✓ Confirm all</button>
          ${next
            ? `<button type="button" class="mm-next" hx-post="/lesson/oc/${oc}/pupil/${pid}/mark/confirm" hx-vals='{"next":"${next.pupilId}"}' hx-target="#mark-modal-body" hx-swap="innerHTML">Confirm &amp; next → ${esc(firstNameOf(next.displayName))}</button>`
            : `<span class="mm-last">last pupil</span>`}
          ${navBtn(next, `skip →`, 'get')}
        </div></footer>`
    : `<footer class="mm-foot"><p class="muted">Auto-marking is off — turn it on in <a href="/settings">Settings → Auto-marking</a> to record marks here. (Model answers and pupil answers are shown above.)</p>
        <div class="mm-actions">${navBtn(prev, '← Prev', 'get')}${navBtn(next, 'Next →', 'get')}</div></footer>`;

  return `<div class="mm">
    <header class="mm-head">
      <div class="mm-htop">
        <div class="mm-who"><span class="mm-name">${esc(me.displayName)}</span> <span class="mm-lvl mm-lvl-${level}" title="differentiation level">${level}</span>${me.done ? ' <span class="mm-done" title="pupil marked themselves done">✓ done</span>' : ''}</div>
        <button type="button" class="mm-x" onclick="this.closest('dialog').close()" aria-label="Close">✕</button>
      </div>
      <div class="mm-sub">${esc(className)} · ${esc(ws.title)}${dateStr ? ` · ${esc(dateStr)}` : ''}</div>
      <div class="mm-stat">
        <span class="mm-pos">Pupil ${idx + 1} of ${roster.length}</span>
        ${marking ? `<span class="mm-score-tot ${scoreState}">${awarded}/${total}</span> <span class="mm-checked">${checked}/${markable} checked</span>` : ''}
      </div>
    </header>
    <div class="mm-rows">${rowsHtml || '<p class="muted">This worksheet has no answerable questions.</p>'}</div>
    ${checksHtml}
    ${footer}
  </div>`;
}

export function registerMarkModalRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };
  const params = z.object({ id: z.coerce.number().int().positive(), pid: z.coerce.number().int().positive() });

  // open at the first pupil with work (the /marking + Now entry points use this — no pid needed)
  app.get('/lesson/oc/:id/mark', { preHandler: requireAuth }, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).type('text/html').send('<p class="muted mm-empty">Bad reference.</p>');
    const info = await ocInfo(p.data.id);
    if (!info) return reply.type('text/html').send('<p class="muted mm-empty">Nothing to mark here.</p>');
    const roster = await pupilWorkRows(p.data.id, info.groupCourseId);
    const start = roster.find((r) => r.filled > 0) ?? roster[0];
    if (!start) return reply.type('text/html').send('<p class="muted mm-empty">No pupils in this class yet.</p>');
    const body = await buildModal(p.data.id, start.pupilId, await marksEnabled());
    return reply.type('text/html').send(body ?? '<p class="muted mm-empty">Nothing to mark here.</p>');
  });

  // open / navigate: render the modal body for one pupil
  app.get('/lesson/oc/:id/pupil/:pid/mark', { preHandler: requireAuth }, async (req, reply) => {
    const p = params.safeParse(req.params);
    if (!p.success) return reply.code(400).type('text/html').send('<p class="muted mm-empty">Bad reference.</p>');
    const body = await buildModal(p.data.id, p.data.pid, await marksEnabled());
    return reply.type('text/html').send(body ?? '<p class="muted mm-empty">Nothing to mark here.</p>');
  });

  // set one mark (tick/number). Updates an existing mark, or creates a teacher mark on an unmarked
  // answer. Either way it becomes a CHECKED (confirmed, teacher) mark. Returns the refreshed body.
  app.post('/lesson/oc/:id/pupil/:pid/mark/save', guard, async (req, reply) => {
    const p = params.safeParse(req.params);
    const b = z.object({ answerId: z.coerce.number().int().positive(), marks: z.coerce.number().int().min(0), total: z.coerce.number().int().min(1) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).type('text/html').send('');
    if (!(await marksEnabled())) return reply.code(403).type('text/html').send('');
    const awarded = Math.min(b.data.marks, b.data.total);
    const updated = await overrideMark(b.data.answerId, p.data.pid, p.data.id, awarded, null);
    if (updated === 0) {
      // no mark row yet — record a fresh teacher-confirmed mark (FK guards the answer belongs here)
      const owns = await pool.query(`SELECT 1 FROM pupil_answers WHERE id = $1 AND pupil_id = $2 AND occurrence_course_id = $3`, [b.data.answerId, p.data.pid, p.data.id]);
      if (owns.rowCount) {
        await writeMark({ pupilAnswerId: b.data.answerId, marksAwarded: awarded, marksTotal: b.data.total, pointsHit: [], evidence: [], marker: 'teacher', confidence: null, status: 'confirmed', needsReview: false, feedback: '' });
      }
    }
    const body = await buildModal(p.data.id, p.data.pid, true);
    return reply.type('text/html').send(body ?? '');
  });

  // confirm every suggested mark for this pupil (accept the AI). Optional ?next advances to the next pupil.
  app.post('/lesson/oc/:id/pupil/:pid/mark/confirm', guard, async (req, reply) => {
    const p = params.safeParse(req.params);
    if (!p.success) return reply.code(400).type('text/html').send('');
    if (!(await marksEnabled())) return reply.code(403).type('text/html').send('');
    await confirmMarksForPupil(p.data.pid, p.data.id);
    const nextRaw = (req.body as { next?: unknown })?.next;
    const nextPid = typeof nextRaw === 'string' || typeof nextRaw === 'number' ? Number(nextRaw) : NaN;
    const target = Number.isInteger(nextPid) && nextPid > 0 && (await pupilCanAccessOc(nextPid, p.data.id)) ? nextPid : p.data.pid;
    const body = await buildModal(p.data.id, target, true);
    return reply.type('text/html').send(body ?? '');
  });
}
