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
import { getLessonWorksheets } from '../services/worksheet';
import { getOccurrenceHeader } from '../repos/occurrence';
import { pupilWorkRows, getAnswers, getPupilLevel, pupilCanAccessOc } from '../repos/pupilWork';
import { marksEnabled } from '../auth/marksGate';
import {
  getScheme, marksForPupil, overrideMark, writeMark, confirmMarksForPupil, getComment, type PupilMarkRow,
} from '../repos/marking';
import { getPupilAtl } from '../repos/atl';
import { renderAtlPicker } from './atl';
import { getUiShell } from '../lib/nav';
import { renderMarkModal } from '../lib/markModalView';

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

/** Read a worksheet index (`ws`) from a query/body, default 0. */
function wsOf(src: unknown): number {
  const v = (src as { ws?: unknown } | null)?.ws;
  const n = typeof v === 'string' || typeof v === 'number' ? Number(v) : 0;
  return Number.isInteger(n) && n >= 0 ? n : 0;
}

// Shared "open the marking modal" attributes — load a pupil's body into the dialog and show it.
// Used by the work grid, the /marking page and the Now screen so every entry point behaves the same.
const SHOW = `hx-on::after-request="if(event.detail.successful){var d=document.getElementById('mark-modal');if(d&&!d.open)d.showModal();}"`;
export function markOpenAttrs(url: string): string {
  return `hx-get="${esc(url)}" hx-target="#mark-modal-body" hx-swap="innerHTML" ${SHOW}`;
}

// ── one question's mark control (a tick for 1-mark, a number for more) ──────────────────────────
function markControl(oc: number, pid: number, answerId: number, mk: PupilMarkRow | undefined, maxMarks: number, wi: number): string {
  const awarded = mk?.marksAwarded;
  const set = (m: number | string) =>
    `hx-post="/lesson/oc/${oc}/pupil/${pid}/mark/save" hx-target="#mark-modal-body" hx-swap="innerHTML"`
    + ` hx-vals='{"answerId":"${answerId}","marks":"${m}","total":"${maxMarks}","ws":"${wi}"}'`;
  if (maxMarks <= 1) {
    return `<div class="mm-tick">
      <button type="button" class="mm-t mm-t-yes${awarded === 1 ? ' on' : ''}" ${set(1)} title="correct">✓</button>
      <button type="button" class="mm-t mm-t-no${awarded === 0 ? ' on' : ''}" ${set(0)} title="not yet">✗</button></div>`;
  }
  return `<div class="mm-num">
    <button type="button" class="mm-t mm-t-yes" ${set(maxMarks)} title="full marks">✓</button>
    <input class="mm-score" type="number" min="0" max="${maxMarks}" value="${awarded ?? ''}" inputmode="numeric"
      hx-post="/lesson/oc/${oc}/pupil/${pid}/mark/save" hx-trigger="change" hx-target="#mark-modal-body" hx-swap="innerHTML"
      hx-vals='js:{"answerId":"${answerId}","marks":event.target.value,"total":"${maxMarks}","ws":"${wi}"}'>
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

/** Build the inner HTML of #mark-modal-body for one pupil. `wsIndex` picks which worksheet (a lesson
 * may have several). Null if the oc/pupil/worksheet is missing. */
async function buildModal(oc: number, pid: number, marking: boolean, wsIndex = 0): Promise<string | null> {
  const info = await ocInfo(oc);
  if (!info || info.lessonPlanId == null) return null;
  if (!(await pupilCanAccessOc(pid, oc))) return null;

  const [header, worksheets, roster, level, atlScore] = await Promise.all([
    getOccurrenceHeader(info.occurrenceId),
    getLessonWorksheets(info.groupCourseId, info.lessonPlanId),
    pupilWorkRows(oc, info.groupCourseId),
    getPupilLevel(pid, info.groupCourseId),
    getPupilAtl(pid, oc),
  ]);
  const idx = roster.findIndex((r) => r.pupilId === pid);
  const me = roster[idx];
  if (!me) return null;
  const prev = idx > 0 ? roster[idx - 1] : null;
  const next = idx >= 0 && idx < roster.length - 1 ? roster[idx + 1] : null;
  const first = firstNameOf(me.displayName);
  const wi = Math.max(0, Math.min(wsIndex, worksheets.length - 1));
  const ws = worksheets[wi];

  if (!ws) {
    return `<div class="mm"><header class="mm-head"><div class="mm-htop"><span class="mm-name">${esc(me.displayName)}</span>
      <button type="button" class="mm-x" onclick="this.closest('dialog').close()" aria-label="Close">✕</button></div></header>
      <p class="muted mm-empty">No worksheet is bound to this lesson, so there's nothing to mark.</p></div>`;
  }

  // questions in document order; the scheme supplies model answers + per-question marks. Parson's
  // (parsons) carry their own model order in the field; code is open text shown monospaced. Render
  // with this worksheet's key prefix so the keys match the stored answers.
  const fields = renderWorksheet(ws.markdown, { mode: 'review', keyPrefix: ws.keyPrefix }).fields;
  const questions = fields.filter((f) => f.kind === 'text' || f.kind === 'blank' || f.kind === 'choice' || f.kind === 'code' || f.kind === 'parsons');
  const checks = fields.filter((f) => f.kind === 'check');
  const scheme = await getScheme(ws.resourceId, ws.versionNo);
  // scheme point keys are stored unprefixed (per the worksheet's own resource) → prefix to match.
  const pointByKey = new Map((scheme?.points ?? []).map((p) => [ws.keyPrefix + p.fieldKey, p]));
  // when there are several worksheets, a picker switches between them (same pupil).
  const wsTabs = worksheets.length > 1
    ? `<div class="mm-wstabs" role="tablist" aria-label="Worksheets">${worksheets
        .map((w, i) => `<button type="button" class="ws-tab${i === wi ? ' is-on' : ''}" role="tab" aria-selected="${i === wi}" hx-get="/lesson/oc/${oc}/pupil/${pid}/mark?ws=${i}" hx-target="#mark-modal-body" hx-swap="innerHTML">${esc(w.title.replace(/\s*[—-]\s*worksheet\.md$/i, '').trim() || `Worksheet ${i + 1}`)}</button>`)
        .join('')}</div>`
    : '';

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
      const codey = f.kind === 'code' || f.kind === 'parsons';
      const maxMarks = pt?.marks ?? (f.kind === 'parsons' ? 1 : 2);
      total += maxMarks; // score is out of every question's marks (a blank scores 0/n)
      if (ans) markable += 1; // ...but only an answered question can be marked & "checked"
      if (mk) { awarded += mk.marksAwarded; if (mk.status === 'confirmed') checked += 1; }
      const state = !mk ? 'mm-todo' : mk.needsReview ? 'mm-review' : mk.marksAwarded >= maxMarks ? 'mm-full' : mk.marksAwarded <= 0 ? 'mm-zero' : 'mm-part';
      const alts = pt && pt.alternatives.length ? ` <span class="mm-alts">also accept: ${esc(pt.alternatives.join(', '))}</span>` : '';
      // Parson's model = the correct line order (carried on the field); others = the scheme's expected.
      const modelText = f.kind === 'parsons' ? (f.solution ?? []).join('\n') : (pt?.expected ?? '');
      const ansVal = ans?.value ?? '';
      const mono = (s: string): string => `<pre class="mm-code">${esc(s)}</pre>`;
      const modelHtml = modelText ? (codey ? mono(modelText) : esc(modelText) + alts) : '<span class="muted">— no model answer —</span>';
      const ansHtml = ansVal ? (codey ? mono(ansVal) : esc(ansVal)) : '<span class="mm-blank">— left blank —</span>';
      // For Parson's, a quick "right order?" hint for the teacher (whitespace-normalised compare).
      const norm = (s: string): string => s.replace(/\r/g, '').split('\n').map((l) => l.trimEnd()).join('\n').trim();
      const parsonsHint = f.kind === 'parsons' && ansVal
        ? norm(ansVal) === norm(modelText) ? ' <span class="mm-badge mm-ok">✓ correct order</span>' : ' <span class="mm-badge mm-warn">order differs</span>'
        : '';
      const kindTag = f.kind === 'parsons' ? '<span class="mm-tag">Parson’s</span>' : f.kind === 'code' ? '<span class="mm-tag">code</span>' : '';
      const control = marking
        ? ans
          ? markControl(oc, pid, ans.id, mk, maxMarks, wi)
          : `<span class="muted mm-noans">nothing to mark</span>`
        : '';
      return `<div class="mm-row ${state}">
        <div class="mm-q"><span class="mm-qn">Q${i + 1}</span><span class="mm-qtext">${esc(f.label)}</span>${kindTag}</div>
        <div class="mm-grid">
          <div class="mm-model"><span class="mm-lbl">${f.kind === 'parsons' ? 'Correct order' : 'Model answer'}${pt ? ` · ${pt.marks} mark${pt.marks > 1 ? 's' : ''}` : ''}</span>
            <div class="mm-modeltext">${modelHtml}</div></div>
          <div class="mm-ans"><span class="mm-lbl">${esc(first)}'s answer${parsonsHint}</span>
            <div class="mm-anstext">${ansHtml}</div></div>
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

  if (getUiShell() === 'next') {
    return renderMarkModal({
      oc,
      pid,
      marking,
      wsIndex,
      header,
      worksheets,
      roster,
      level,
      atlScore,
      ansRows,
      marks,
      comment,
      scheme,
    });
  }
  const scoreState = total === 0 ? '' : awarded >= total ? 'mm-full' : awarded <= 0 ? 'mm-zero' : 'mm-part';
  const className = header?.groupName ?? info.courseName;
  const dateStr = header?.date ?? '';

  // `data-mark-nav` lets the keyboard handler (app.js) drive ← / → through the class.
  const navBtn = (p: typeof prev, label: string, dir: 'prev' | 'next') =>
    p
      ? `<button type="button" class="mm-navbtn" data-mark-nav="${dir}" hx-get="/lesson/oc/${oc}/pupil/${p.pupilId}/mark" hx-target="#mark-modal-body" hx-swap="innerHTML">${label}</button>`
      : `<button type="button" class="mm-navbtn" disabled>${label}</button>`;

  const footer = marking
    ? `<footer class="mm-foot">
        <label class="mm-comment">💬 Comment back to ${esc(first)}
          <textarea rows="2" placeholder="a kind line they'll see with their marks"
            hx-post="/lesson/oc/${oc}/pupil/${pid}/comment" hx-trigger="change" hx-swap="none">${esc(comment)}</textarea></label>
        <div class="mm-actions">
          ${navBtn(prev, `← ${prev ? esc(firstNameOf(prev.displayName)) : 'Prev'}`, 'prev')}
          <button type="button" class="mm-confirm" hx-post="/lesson/oc/${oc}/pupil/${pid}/mark/confirm" hx-vals='{"ws":"${wi}"}' hx-target="#mark-modal-body" hx-swap="innerHTML"
            title="accept every AI mark for this pupil as checked">✓ Confirm all</button>
          ${next
            ? `<button type="button" class="mm-next" hx-post="/lesson/oc/${oc}/pupil/${pid}/mark/confirm" hx-vals='{"next":"${next.pupilId}","ws":"${wi}"}' hx-target="#mark-modal-body" hx-swap="innerHTML">Confirm &amp; next → ${esc(firstNameOf(next.displayName))}</button>`
            : `<span class="mm-last">last pupil</span>`}
          ${navBtn(next, `skip →`, 'next')}
        </div></footer>`
    : `<footer class="mm-foot"><p class="muted">Auto-marking is off — turn it on in <a href="/settings">Settings → Auto-marking</a> to record marks here. (Model answers and pupil answers are shown above.)</p>
        <div class="mm-actions">${navBtn(prev, '← Prev', 'prev')}${navBtn(next, 'Next →', 'next')}</div></footer>`;

  return `<div class="mm">
    <header class="mm-head">
      <div class="mm-htop">
        <div class="mm-who"><span class="mm-name">${esc(me.displayName)}</span> <span class="mm-lvl mm-lvl-${level}" title="differentiation level">${level}</span>${me.done ? ' <span class="mm-done" title="pupil marked themselves done">✓ done</span>' : ''}${renderAtlPicker(oc, pid, atlScore)}</div>
        <button type="button" class="mm-x" onclick="this.closest('dialog').close()" aria-label="Close">✕</button>
      </div>
      <div class="mm-sub">${esc(className)} · ${esc(ws.title)}${dateStr ? ` · ${esc(dateStr)}` : ''}</div>
      <div class="mm-stat">
        <span class="mm-pos">Pupil ${idx + 1} of ${roster.length}</span>
        ${marking ? `<span class="mm-score-tot ${scoreState}">${awarded}/${total}</span> <span class="mm-checked">${checked}/${markable} checked</span>` : ''}
        ${roster.length > 1 ? '<span class="mm-kbd" title="use the arrow keys to move through the class">← →</span>' : ''}
        <a class="mm-atl-link" href="/lesson/oc/${oc}/atl" title="open the whole-class ATL grid (for live use during the lesson)">ATL grid →</a>
      </div>
      ${wsTabs}
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
    const body = await buildModal(p.data.id, p.data.pid, await marksEnabled(), wsOf(req.query));
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
    const body = await buildModal(p.data.id, p.data.pid, true, wsOf(req.body));
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
    const body = await buildModal(p.data.id, target, true, wsOf(req.body));
    return reply.type('text/html').send(body ?? '');
  });
}
