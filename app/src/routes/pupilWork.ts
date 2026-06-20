// Phase 8.6/8.7 (teacher side): the "Pupil work" panel on the lesson page — a live completion
// grid, per-pupil level chips (🟢🟡🔴), read-back of any pupil's sheet, mark-seen, and an
// AI "summarise the class's work" action whose output joins the adapt-next-lesson history.
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/guard';
import { esc } from '../lib/html';
import { pool } from '../db/pool';
import { renderMarkdown } from '../lib/markdown';
import { renderWorksheet, type Level } from '../lib/worksheetForm';
import { getLessonWorksheet } from '../services/worksheet';
import {
  pupilWorkRows,
  setPupilLevel,
  getPupilLevel,
  getAnswers,
  markAnswersSeen,
  classAnswers,
  classFeedback,
  classFeedbackAllTime,
  pupilCanAccessOc,
} from '../repos/pupilWork';
import { feedbackDigest } from '../lib/feedbackDigest';
import { getGroupTeachingContext, setGroupTeachingContext } from '../repos/adaptations';
import { getLessonWorksheetMeta } from '../services/worksheet';
import { pupilAccessEnabled } from './pupilAuth';
import { marksEnabled } from '../auth/marksGate';
import { callLLM } from '../llm/client';
import { modelForFeature } from '../repos/settings';
import { CLASS_WORK_SYSTEM, CLASS_WORK_VERSION, CLASS_WORK_INSTRUCTION, classWorkItems } from '../llm/prompts/classWork';
import {
  getScheme,
  markSummaries,
  getMarkingSettings,
  marksReleasedAt,
  releaseMarks,
  confirmAllConfident,
  confirmMarksForPupil,
  getComment,
  setComment,
  marksForPupil,
  overrideMark,
  setMarkingSetting,
  dequeueOpenMarkForGroupCourse,
  updateSchemePoint,
  markStatsByField,
  type MarkSummary,
  type SchemePoint,
} from '../repos/marking';
import { deriveScheme, markAll, worksheetAndScheme, setSchemeReadyForOc, buildPupilProfile } from '../services/marking';
import { guardMatch } from '../lib/markSafetyGate';
import { markOpenAttrs } from './markModal';
import { getProfile } from '../repos/pupilProfiles';
import { revokeDevicesForGroup } from '../repos/pupilDevices';

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
     FROM occurrence_courses oc
     JOIN group_courses gc ON gc.id = oc.group_course_id
     JOIN courses c ON c.id = gc.course_id
     WHERE oc.id = $1`,
    [occurrenceCourseId],
  );
  return rows[0] ?? null;
}

const LEVELS: Level[] = ['support', 'core', 'challenge'];
const LEVEL_DOT: Record<Level, string> = { support: '🟢', core: '🟡', challenge: '🔴' };

function levelChips(oc: number, pid: number, current: Level): string {
  return `<span class="lvl-chips" id="lvl-${oc}-${pid}">${LEVELS.map(
    (l) =>
      `<button type="button" class="lvl-chip${l === current ? ' on' : ''}" title="${l}" hx-post="/lesson/oc/${oc}/pupil/${pid}/level" hx-vals='{"level":"${l}"}' hx-target="#lvl-${oc}-${pid}" hx-swap="outerHTML">${LEVEL_DOT[l]}</button>`,
  ).join('')}</span>`;
}

function markCell(oc: number, pid: number, s: MarkSummary | undefined, released: boolean, showScores: boolean): string {
  if (!s || s.marked === 0) return '<td class="pw-mark muted">—</td>';
  const score = showScores ? `${s.awarded}/${s.total}` : `${s.marked}✓`;
  const flags =
    (s.needsReview > 0 ? ` <span class="mk-review" title="${s.needsReview} need your eyes">⚠${s.needsReview}</span>` : '') +
    (s.suggested > 0 ? ` <span class="mk-sugg" title="${s.suggested} unconfirmed">●</span>` : '');
  const confirm = s.suggested > 0 ? ` <button type="button" class="link" hx-post="/lesson/oc/${oc}/pupil/${pid}/confirm" hx-target="#pw-${oc}" hx-swap="outerHTML" title="confirm this pupil's marks">confirm</button>` : '';
  return `<td class="pw-mark">${score}${flags}${released ? ' <span class="mk-released" title="released to pupil">📣</span>' : ''}${confirm}</td>`;
}

// 10.22 — a cheap signature of what the grid is showing, so the live poll only re-renders on REAL
// change (a pupil saved / finished / a mark landed). When unchanged the route returns 204 and HTMX
// leaves the grid — and any open read-back — untouched.
function hashStr(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
function gridSigFrom(
  rows: Array<{ pupilId: number; filled: number; done: boolean; unseen: number; rating: number | null; lastSaved: string | null }>,
  summaries: Map<number, { marked: number; suggested: number; needsReview: number; awarded: number; total: number }>,
  released: boolean,
): string {
  const raw =
    rows
      .map((r) => {
        const s = summaries.get(r.pupilId);
        // include awarded/total so re-overriding an already-confirmed mark (which leaves marked/
        // suggested/needsReview unchanged but changes the score) still triggers a live refresh.
        return `${r.pupilId}.${r.filled}.${r.done ? 1 : 0}.${r.unseen}.${s?.marked ?? 0}.${s?.suggested ?? 0}.${s?.needsReview ?? 0}.${s?.awarded ?? 0}.${s?.total ?? 0}.${r.rating ?? 0}.${r.lastSaved ?? ''}`;
      })
      .join('|') + (released ? '|R' : '');
  return hashStr(raw);
}
async function gridSignature(oc: number, info: OcInfo): Promise<string> {
  const rows = await pupilWorkRows(oc, info.groupCourseId);
  const marking = await marksEnabled();
  const summaries = marking ? await markSummaries(oc) : new Map();
  const released = marking ? (await marksReleasedAt(oc)) != null : false;
  return gridSigFrom(rows, summaries, released);
}

interface BuiltGrid {
  full: string; // the whole panel (#pw-oc): live grid + actions + marking bar + summary + read-back
  live: string; // ONLY the polled #pw-live-oc (heading + table) — what the 30s poll swaps
  sig: string;
}

async function renderGrid(oc: number, info: OcInfo, msg?: string): Promise<string> {
  return (await buildGrid(oc, info, msg)).full;
}

async function buildGrid(oc: number, info: OcInfo, msg?: string): Promise<BuiltGrid> {
  const rows = await pupilWorkRows(oc, info.groupCourseId);
  // Total fillable fields per level (text inputs), so "n of m" matches the pupil's slice. Parse
  // the document ONCE and bucket fields by level (a slice = shared + that level).
  const totals: Record<Level, number> = { support: 0, core: 0, challenge: 0 };
  let wsMeta: Awaited<ReturnType<typeof getLessonWorksheetMeta>> = null;
  if (info.lessonPlanId != null) {
    const ws = await getLessonWorksheet(info.groupCourseId, info.lessonPlanId);
    if (ws) {
      wsMeta = { resourceId: ws.resourceId, versionNo: ws.versionNo, storagePath: '', title: ws.title, adapted: ws.adapted };
      for (const f of renderWorksheet(ws.markdown, { mode: 'review' }).fields) {
        if (f.kind !== 'text') continue;
        if (f.level === 'shared') { totals.support++; totals.core++; totals.challenge++; }
        else totals[f.level]++;
      }
    }
  }
  if (rows.length === 0) {
    const empty = `<div class="pupil-work" id="pw-${oc}"><h3>Pupil work</h3><p class="muted">No pupils enrolled in this class yet.</p></div>`;
    return { full: empty, live: empty, sig: 'none' };
  }

  // Marking surface (gated by the DPIA addendum). Only shown when the gate is on.
  const marking = await marksEnabled();
  const scheme = marking && wsMeta ? await getScheme(wsMeta.resourceId, wsMeta.versionNo) : null;
  const summaries = marking ? await markSummaries(oc) : new Map();
  const settings = marking ? await getMarkingSettings(info.groupCourseId) : null;
  const released = marking ? (await marksReleasedAt(oc)) != null : false;
  const showScores = settings?.showScores ?? false;

  const sig = gridSigFrom(rows, summaries, released);
  const totalUnseen = rows.reduce((a, r) => a + r.unseen, 0);
  const body = rows
    .map((r) => {
      const m = totals[r.level];
      return `<tr id="pw-row-${oc}-${r.pupilId}">
        <td><button type="button" class="link pw-open" ${markOpenAttrs(`/lesson/oc/${oc}/pupil/${r.pupilId}/mark`)} title="open marking">${esc(r.displayName)}</button>${r.unseen > 0 ? ` <span class="pw-new" title="${r.unseen} new">●</span>` : ''}</td>
        <td>${levelChips(oc, r.pupilId, r.level)}</td>
        <td class="pw-prog">${m ? `${Math.min(r.filled, m)} / ${m}` : r.filled}</td>
        <td>${r.done ? '✓' : ''}</td>
        ${marking ? markCell(oc, r.pupilId, summaries.get(r.pupilId), released, showScores) : ''}
        <td>${r.rating ? ['', '🙁', '😐', '🙂', '😀'][r.rating] : ''}</td>
        <td class="muted">${r.lastSaved ? esc(r.lastSaved) : ''}</td>
      </tr>`;
    })
    .join('');

  // The LIVE, polled part — heading + table only. The poll swaps THIS, so an open read-back / mark
  // message / scheme editor (all outside it, below) survive a refresh during the lesson.
  const live = `<div class="pw-live" id="pw-live-${oc}" hx-get="/lesson/oc/${oc}/pupil-work?sig=${sig}" hx-trigger="every 30s" hx-swap="outerHTML">
    <h3>Pupil work <span class="pw-live-badge" title="updates automatically during the lesson">live</span> ${totalUnseen > 0 ? `<span class="pw-new-count">${totalUnseen} new</span>` : ''}</h3>
    ${msg ? `<p class="adapt-note">${esc(msg)}</p>` : ''}
    <table class="pw-grid"><thead><tr><th>Pupil</th><th>Level</th><th>Done fields</th><th>Done ✓</th>${marking ? '<th>Marks</th>' : ''}<th>Lesson</th><th>Saved</th></tr></thead><tbody>${body}</tbody></table>
  </div>`;
  const full = `<div class="pupil-work" id="pw-${oc}">
    ${live}
    <div class="pw-actions">
      ${marking ? `<button type="button" class="btn-secondary pw-mark-open" ${markOpenAttrs(`/lesson/oc/${oc}/mark`)}>✎ Mark this class</button>` : ''}
      <button type="button" class="link" hx-post="/lesson/oc/${oc}/seen" hx-target="#pw-${oc}" hx-swap="outerHTML">mark all seen</button>
      <button type="button" class="link fu-ai" hx-post="/lesson/oc/${oc}/summarise" hx-target="#pw-summary-${oc}" hx-swap="innerHTML" hx-disabled-elt="this">✨ Summarise the class's work (AI)</button>
      <button type="button" class="link" hx-post="/lesson/oc/${oc}/standing-digest" hx-target="#pw-summary-${oc}" hx-swap="innerHTML" title="this class's feedback across all its lessons → teaching context">📊 Feedback so far</button>
      ${info.lessonPlanId != null ? `<a class="link" href="/lesson/oc/${oc}/answer-pack" target="_blank" rel="noopener">🖨 answer pack</a> <a class="link" href="/lesson/oc/${oc}/marks.csv">⬇ marks CSV</a>` : ''}
    </div>
    ${marking ? renderMarkingBar(oc, info, scheme, settings!, released) : `<p class="muted pw-gate">Auto-marking is off — enable it in <a href="/settings">Settings → Auto-marking</a> (needs DPIA addendum sign-off).</p>`}
    <div id="pw-summary-${oc}"></div>
    <div id="pw-readback-${oc}" class="pw-readback"></div>
  </div>`;
  return { full, live, sig };
}

function renderMarkingBar(oc: number, info: OcInfo, scheme: Awaited<ReturnType<typeof getScheme>>, settings: import('../repos/marking').MarkingSettings, released: boolean): string {
  if (info.lessonPlanId == null) return '';
  const schemeState = !scheme
    ? `<button type="button" class="link fu-ai" hx-post="/lesson/oc/${oc}/derive-scheme" hx-target="#pw-mark-msg-${oc}" hx-swap="innerHTML" hx-disabled-elt="this">✨ Derive mark scheme (AI)</button> <span class="muted">no scheme yet</span>`
    : `<span class="muted">scheme: ${scheme.scheme.source}/${scheme.scheme.status} (${scheme.points.length} points)</span>
       <button type="button" class="link" hx-get="/lesson/oc/${oc}/scheme" hx-target="#pw-scheme-${oc}" hx-swap="innerHTML">edit scheme</button>
       <button type="button" class="link fu-ai" hx-post="/lesson/oc/${oc}/mark-now" hx-target="#pw-mark-msg-${oc}" hx-swap="innerHTML" hx-disabled-elt="this">✨ Mark answers now</button>
       <button type="button" class="link" hx-post="/lesson/oc/${oc}/confirm-all" hx-target="#pw-${oc}" hx-swap="outerHTML">confirm all confident</button>`;
  const releaseBtn =
    settings.resultsMode === 'on_release'
      ? ` <button type="button" class="link" hx-post="/lesson/oc/${oc}/release" hx-vals='{"release":"${released ? 'false' : 'true'}"}' hx-target="#pw-${oc}" hx-swap="outerHTML"${released ? ' hx-confirm="Hide these marks from pupils again? They may already have seen them."' : ''}>${released ? 'un-release marks' : '📣 Release marks to pupils'}</button>`
      : `<span class="muted" title="results show as you confirm">results: instant</span>`;
  const sel = (key: string, val: string, opts: Array<[string, string]>): string =>
    `<select hx-post="/lesson/oc/${oc}/mark-setting" hx-vals='js:{"key":"${key}","value":event.target.value}' hx-trigger="change" hx-swap="none">${opts.map(([v, label]) => `<option value="${v}"${v === val ? ' selected' : ''}>${label}</option>`).join('')}</select>`;
  return `<div class="pw-marking" id="pw-marking-${oc}">
    <div class="pw-mark-actions">${schemeState}${releaseBtn}</div>
    <details class="pw-mark-settings"><summary>marking settings for this class</summary>
      <label>When ${sel('markingTrigger', settings.markingTrigger, [['on_done', 'mark as pupils finish'], ['manual', 'only when I press']])}</label>
      <label>Results ${sel('resultsMode', settings.resultsMode, [['instant', 'show as I confirm'], ['on_release', 'hold until I release']])}</label>
      <label><input type="checkbox"${settings.showScores ? ' checked' : ''} hx-post="/lesson/oc/${oc}/mark-setting" hx-vals='js:{"key":"showScores","value":event.target.checked?"true":"false"}' hx-trigger="change" hx-swap="none"> show pupils their scores (default: ticks only)</label>
      <label><input type="checkbox"${settings.devicesEnabled ? ' checked' : ''} hx-post="/lesson/oc/${oc}/mark-setting" hx-vals='js:{"key":"devicesEnabled","value":event.target.checked?"true":"false"}' hx-trigger="change" hx-swap="none"> let pupils "stay signed in on this computer"</label>
    </details>
    <div id="pw-mark-msg-${oc}"></div>
    <div id="pw-scheme-${oc}"></div>
  </div>`;
}

export function registerPupilWorkRoutes(app: FastifyInstance): void {
  const guard = { preHandler: [requireAuth, app.csrfProtection] };
  const ocParam = z.object({ id: z.coerce.number().int().positive() });

  // The lazy-loaded panel on the lesson page. Empty (silent) when pupil access is off.
  app.get('/lesson/oc/:id/pupil-work', { preHandler: requireAuth }, async (req, reply) => {
    if (!(await pupilAccessEnabled())) return reply.type('text/html').send('');
    const p = ocParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const info = await ocInfo(p.data.id);
    if (!info) return reply.type('text/html').send('');
    // No sig → the initial panel load or a manual refresh: render the WHOLE panel (.full).
    // With a sig → the 30s live poll: unchanged → 204 (HTMX won't swap, so an open read-back / in-
    // progress action is never disrupted); changed → swap ONLY the #pw-live-oc inner (heading +
    // table), leaving the read-back/summary/marking below it untouched.
    const sig = typeof (req.query as { sig?: unknown }).sig === 'string' ? (req.query as { sig: string }).sig : null;
    if (sig === null) return reply.type('text/html').send((await buildGrid(p.data.id, info)).full);
    if (sig === (await gridSignature(p.data.id, info))) return reply.code(204).send();
    return reply.type('text/html').send((await buildGrid(p.data.id, info)).live);
  });

  app.post('/lesson/oc/:id/pupil/:pid/level', guard, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive(), pid: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ level: z.enum(['support', 'core', 'challenge']) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    const info = await ocInfo(p.data.id);
    if (!info) return reply.code(404).send('');
    if (!(await pupilCanAccessOc(p.data.pid, p.data.id))) return reply.code(403).send('');
    await setPupilLevel(p.data.pid, info.groupCourseId, b.data.level);
    return reply.type('text/html').send(levelChips(p.data.id, p.data.pid, b.data.level));
  });

  app.get('/lesson/oc/:id/pupil/:pid/work', { preHandler: requireAuth }, async (req, reply) => {
    const p = z.object({ id: z.coerce.number().int().positive(), pid: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const info = await ocInfo(p.data.id);
    if (!info || info.lessonPlanId == null) return reply.type('text/html').send('<p class="muted">No worksheet bound.</p>');
    if (!(await pupilCanAccessOc(p.data.pid, p.data.id))) return reply.code(403).type('text/html').send('<p class="muted">Not in this class.</p>');
    const ws = await getLessonWorksheet(info.groupCourseId, info.lessonPlanId);
    if (!ws) return reply.type('text/html').send('<p class="muted">No worksheet for this lesson.</p>');
    const level = await getPupilLevel(p.data.pid, info.groupCourseId);
    const values = await getAnswers(p.data.pid, p.data.id);
    const rendered = renderWorksheet(ws.markdown, { mode: 'review', level, values });
    await markAnswersSeen(p.data.id, p.data.pid); // opening THIS pupil's sheet marks only their answers seen

    // Phase 9: per-answer marks + a comment-back box, when auto-marking is on.
    let marksBlock = '';
    if (await marksEnabled()) {
      const marks = await marksForPupil(p.data.pid, p.data.id);
      const byKey = new Map(marks.map((m) => [m.fieldKey, m]));
      const rowsHtml = marks
        .map((m) => {
          const flag = m.needsReview ? ' <span class="mk-review">⚠ needs your eyes</span>' : '';
          const conf = m.marker === 'ai' && m.confidence != null ? ` <span class="muted">(${m.marker}, ${Math.round(m.confidence * 100)}%)</span>` : ` <span class="muted">(${m.marker})</span>`;
          return `<div class="pw-markrow"><span class="muted">${esc(m.fieldKey)}</span> <strong>${m.marksAwarded}/${m.marksTotal}</strong>${conf}${flag}
            ${m.feedback ? `<div class="mk-fb">${esc(m.feedback)}</div>` : ''}
            <input class="mk-override" type="number" name="marks" min="0" value="${m.marksAwarded}" title="set mark"
              hx-post="/lesson/oc/${p.data.id}/pupil/${p.data.pid}/override" hx-vals='{"answerId":"${m.pupilAnswerId}"}' hx-trigger="change" hx-target="next .note-status" hx-swap="innerHTML">
            <span class="note-status"></span></div>`;
        })
        .join('');
      const comment = await getComment(p.data.pid, p.data.id);
      const profile = await getProfile(p.data.pid);
      marksBlock = `<div class="pw-marks"><h4>Marks ${byKey.size ? '' : '<span class="muted">— not marked yet</span>'}</h4>${rowsHtml}
        <label class="pw-comment">Comment back to this pupil
          <textarea name="comment" rows="2" hx-post="/lesson/oc/${p.data.id}/pupil/${p.data.pid}/comment" hx-trigger="change" hx-swap="none" placeholder="a kind line they'll see with their marks">${esc(comment)}</textarea>
          <span class="note-status" id="cmt-status-${p.data.pid}"></span></label>
        <div class="pw-profile" id="profile-${p.data.pid}">
          <strong>What works for me</strong> ${profile ? `<span class="muted">(${esc(profile.updatedAt)})</span>` : '<span class="muted">— not built yet</span>'}
          ${profile ? `<p class="rc-comment">${esc(profile.digest)}</p>` : ''}
          <button type="button" class="link fu-ai" hx-post="/lesson/oc/${p.data.id}/pupil/${p.data.pid}/profile" hx-target="#profile-${p.data.pid}" hx-swap="outerHTML" hx-disabled-elt="this">✨ ${profile ? 'refresh' : 'build'} profile (AI)</button>
        </div></div>`;
    }
    return reply.type('text/html').send(`<div class="pw-sheet"><div class="pw-sheet-head"><strong>${esc(ws.title)}</strong>
      <button type="button" class="link" hx-get="/lesson/oc/${p.data.id}/pupil-work" hx-target="#pw-${p.data.id}" hx-swap="outerHTML">↻ refresh grid</button></div>
      ${marksBlock}
      <div class="ws-doc ws-review">${rendered.html}</div></div>`);
  });

  app.post('/lesson/oc/:id/seen', guard, async (req, reply) => {
    const p = ocParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const info = await ocInfo(p.data.id);
    if (!info) return reply.code(404).send('');
    await markAnswersSeen(p.data.id);
    return reply.type('text/html').send(await renderGrid(p.data.id, info, 'Marked all seen.'));
  });

  // 8.7: aggregate (anonymised) → AI → store as a lesson note (joins recentGroupHistory) → show.
  app.post('/lesson/oc/:id/summarise', guard, async (req, reply) => {
    if (!(await pupilAccessEnabled())) return reply.type('text/html').send('<p class="muted">Pupil access is off.</p>');
    const p = ocParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const info = await ocInfo(p.data.id);
    if (!info || info.lessonPlanId == null) return reply.type('text/html').send('<p class="muted">No worksheet bound to summarise.</p>');
    const ws = await getLessonWorksheet(info.groupCourseId, info.lessonPlanId);
    if (!ws) return reply.type('text/html').send('<p class="muted">No worksheet for this lesson.</p>');

    // Map field keys → question labels using the CURRENT worksheet's field inventory. Answers are
    // keyed on the lesson instance and survive a re-version/flip, so a stored key may no longer
    // exist in the current document; drop those (their positional key would otherwise be sent to
    // the AI as a meaningless or mislabelled question). Checklist (task.*) ticks aren't questions.
    const inventory = renderWorksheet(ws.markdown, { mode: 'review' }).fields;
    const labelByKey = new Map(inventory.filter((f) => f.kind === 'text').map((f) => [f.key, f.label]));
    const [answersRaw, feedbackRaw] = await Promise.all([classAnswers(p.data.id), classFeedback(p.data.id)]);
    // SAFEGUARDING: a pupil may type a disclosure or an injection string into an answer/comment.
    // Withhold any guard-matched text from the AI entirely — the same screen markOpen() applies —
    // since pupil free-text has no per-row safeguarding flag of its own.
    const answers = answersRaw.map((a) => ({ ...a, answers: a.answers.filter((v) => !guardMatch(v)) })).filter((a) => a.answers.length > 0);
    const feedback = { ...feedbackRaw, comments: feedbackRaw.comments.filter((c) => !guardMatch(c)) };
    if (answers.length === 0 && feedback.ratings.length === 0 && feedback.liked.length === 0) {
      return reply.type('text/html').send('<p class="muted">No answers or feedback yet to summarise.</p>');
    }
    // 9.7: make the summary mark-aware — fold per-question success/partial/zero counts into each
    // question so the AI can say "most got Q3" rather than just counting answers.
    const statByKey = new Map((await markStatsByField(p.data.id)).map((s) => [s.fieldKey, s]));
    const questions = answers
      .filter((a) => labelByKey.has(a.fieldKey))
      .map((a) => {
        const st = statByKey.get(a.fieldKey);
        const marks = st ? ` [marks: ${st.full} full, ${st.partial} partial, ${st.zero} none]` : '';
        return { label: (labelByKey.get(a.fieldKey)! + marks).slice(0, 400), answers: a.answers };
      });
    const result = await callLLM({
      feature: 'class_work',
      model: await modelForFeature('class_work', 'cheap'),
      promptVersion: CLASS_WORK_VERSION,
      system: CLASS_WORK_SYSTEM,
      context: classWorkItems({ worksheetTitle: ws.title, questions, ratings: feedback.ratings, liked: feedback.liked, disliked: feedback.disliked, comments: feedback.comments }),
      instruction: CLASS_WORK_INSTRUCTION,
      maxTokens: 1500,
    });
    if (result.status !== 'ok' || !result.text) {
      return reply.type('text/html').send(`<p class="error">${esc(result.message ?? 'AI unavailable right now.')}</p>`);
    }
    // Store as a lesson note so "adapt from recent lessons" picks it up. Never let a note-save
    // failure lose the (already billed) summary — show it regardless.
    try {
      await pool.query(`INSERT INTO notes (kind, body, occurrence_id, course_id) VALUES ('ai_summary', $1, $2, $3)`, [
        `Pupil work summary (${ws.title}):\n\n${result.text}`,
        info.occurrenceId,
        null,
      ]);
    } catch (err) {
      app.log.error({ err }, 'failed to save class-work summary note');
    }
    const fbDigest = feedbackDigest(feedback);
    return reply.type('text/html').send(`<div class="pw-summary adapt-note">
      ${renderMarkdown(result.text)}
      <p class="muted">Saved to this lesson's notes — "adapt from recent lessons" will use it.</p>
      ${fbDigest ? `<button type="button" class="link" hx-post="/lesson/oc/${p.data.id}/context-append" hx-vals='${esc(JSON.stringify({ text: fbDigest }))}' hx-target="this" hx-swap="outerHTML">＋ add "${esc(fbDigest)}" to this class's teaching context</button>` : ''}
    </div>`);
  });

  // 10.16 — the STANDING (over-time) feedback digest: aggregate this class's feedback across ALL its
  // lessons into a one-liner the teacher can append to the per-class teaching context every planning
  // call reads. Cohort-level, no AI, no pupil identity.
  app.post('/lesson/oc/:id/standing-digest', guard, async (req, reply) => {
    const p = ocParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const info = await ocInfo(p.data.id);
    if (!info) return reply.code(404).send('');
    const digest = feedbackDigest(await classFeedbackAllTime(info.groupCourseId));
    if (!digest) return reply.type('text/html').send('<p class="muted">Not enough lesson feedback yet to summarise this class.</p>');
    return reply.type('text/html').send(`<p class="adapt-note">${esc(digest)}</p>
      <button type="button" class="link" hx-post="/lesson/oc/${p.data.id}/context-append" hx-vals='${esc(JSON.stringify({ text: digest }))}' hx-target="this" hx-swap="outerHTML">＋ add to this class's teaching context</button>`);
  });

  app.post('/lesson/oc/:id/context-append', guard, async (req, reply) => {
    const p = ocParam.safeParse(req.params);
    const b = z.object({ text: z.string().min(1).max(300) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    const info = await ocInfo(p.data.id);
    if (!info) return reply.code(404).send('');
    const existing = (await getGroupTeachingContext(info.groupCourseId)) ?? '';
    const next = existing.trim() ? `${existing.trim()}\n${b.data.text}` : b.data.text;
    await setGroupTeachingContext(info.groupCourseId, next);
    return reply.type('text/html').send('<span class="note-status saved">added to teaching context ✓</span>');
  });

  // ── Phase 9 marking actions (all gated by the DPIA addendum) ────────────────────────────────
  const gateOr = async (reply: import('fastify').FastifyReply): Promise<boolean> => {
    if (!(await marksEnabled())) {
      reply.type('text/html').send('<p class="muted">Auto-marking is off (Settings → Auto-marking).</p>');
      return false;
    }
    return true;
  };

  app.post('/lesson/oc/:id/derive-scheme', guard, async (req, reply) => {
    if (!(await gateOr(reply))) return;
    const p = ocParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const r = await deriveScheme(p.data.id);
    return reply.type('text/html').send(
      r.ok
        ? `<p class="adapt-note">✓ ${esc(r.message)} <button type="button" class="link" hx-get="/lesson/oc/${p.data.id}/pupil-work" hx-target="#pw-${p.data.id}" hx-swap="outerHTML">refresh</button></p>`
        : `<p class="error">${esc(r.message)}</p>`,
    );
  });

  app.post('/lesson/oc/:id/mark-now', guard, async (req, reply) => {
    if (!(await gateOr(reply))) return;
    const p = ocParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const r = await markAll(p.data.id);
    const bits = [`${r.objective.marked} objective`, `${r.open.marked} written`];
    if (r.open.flagged) bits.push(`${r.open.flagged} need your eyes`);
    const note = r.open.status === 'unavailable' ? ` <span class="error">${esc(r.open.message ?? '')}</span>` : '';
    return reply.type('text/html').send(`<p class="adapt-note">Marked ${bits.join(', ')}.${note} <button type="button" class="link" hx-get="/lesson/oc/${p.data.id}/pupil-work" hx-target="#pw-${p.data.id}" hx-swap="outerHTML">refresh grid</button></p>`);
  });

  app.post('/lesson/oc/:id/confirm-all', guard, async (req, reply) => {
    if (!(await gateOr(reply))) return;
    const p = ocParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const info = await ocInfo(p.data.id);
    if (!info) return reply.code(404).send('');
    const n = await confirmAllConfident(p.data.id);
    return reply.type('text/html').send(await renderGrid(p.data.id, info, `Confirmed ${n} confident mark${n === 1 ? '' : 's'}.`));
  });

  app.post('/lesson/oc/:id/pupil/:pid/confirm', guard, async (req, reply) => {
    if (!(await gateOr(reply))) return;
    const p = z.object({ id: z.coerce.number().int().positive(), pid: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const info = await ocInfo(p.data.id);
    if (!info || !(await pupilCanAccessOc(p.data.pid, p.data.id))) return reply.code(403).send('');
    await confirmMarksForPupil(p.data.pid, p.data.id);
    return reply.type('text/html').send(await renderGrid(p.data.id, info));
  });

  app.post('/lesson/oc/:id/release', guard, async (req, reply) => {
    if (!(await gateOr(reply))) return;
    const p = ocParam.safeParse(req.params);
    const b = z.object({ release: z.enum(['true', 'false']) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    const info = await ocInfo(p.data.id);
    if (!info) return reply.code(404).send('');
    await releaseMarks(p.data.id, b.data.release === 'true');
    return reply.type('text/html').send(await renderGrid(p.data.id, info, b.data.release === 'true' ? 'Marks released to pupils.' : 'Marks held back from pupils.'));
  });

  app.post('/lesson/oc/:id/mark-setting', guard, async (req, reply) => {
    if (!(await marksEnabled())) return reply.code(403).send('');
    const p = ocParam.safeParse(req.params);
    const b = z.object({ key: z.enum(['markingTrigger', 'resultsMode', 'showScores', 'devicesEnabled']), value: z.string().max(20) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    const info = await ocInfo(p.data.id);
    if (!info) return reply.code(404).send('');
    const value = b.data.key === 'showScores' || b.data.key === 'devicesEnabled' ? b.data.value === 'true' : b.data.value;
    await setMarkingSetting(info.groupCourseId, b.data.key, value);
    // Switching to manual must also drop any open-mark jobs already queued for finishers, so they
    // don't still get an automatic AI pass after the teacher turned auto-marking off for the class.
    if (b.data.key === 'markingTrigger' && value === 'manual') await dequeueOpenMarkForGroupCourse(info.groupCourseId);
    // Turning remembered devices OFF revokes the ones already issued for this class — the policy
    // must take effect on existing devices, not just block new ones.
    if (b.data.key === 'devicesEnabled' && value === false) {
      const g = await pool.query<{ groupId: number }>(`SELECT group_id AS "groupId" FROM group_courses WHERE id = $1`, [info.groupCourseId]);
      if (g.rows[0]) await revokeDevicesForGroup(g.rows[0].groupId);
    }
    return reply.send('');
  });

  // Inline scheme editor: list points, edit kind/expected/alternatives/marks, mark ready.
  app.get('/lesson/oc/:id/scheme', { preHandler: requireAuth }, async (req, reply) => {
    if (!(await marksEnabled())) return reply.type('text/html').send('');
    const p = ocParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    return reply.type('text/html').send(await renderSchemeEditor(p.data.id));
  });

  app.post('/lesson/oc/:id/scheme/point/:pointId', guard, async (req, reply) => {
    if (!(await marksEnabled())) return reply.code(403).send('');
    const p = z.object({ id: z.coerce.number().int().positive(), pointId: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ field: z.enum(['kind', 'expected', 'alternatives', 'marks']), value: z.string().max(2000) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    // Only allow editing a point that belongs to THIS lesson's worksheet scheme (not any id).
    const ws = await worksheetAndScheme(p.data.id);
    if (!ws?.scheme || !ws.scheme.points.some((pt) => pt.id === p.data.pointId)) return reply.code(403).send('');
    await updateSchemePoint(p.data.pointId, b.data.field, b.data.value);
    return reply.type('text/html').send('<span class="note-status saved">saved ✓</span>');
  });

  app.post('/lesson/oc/:id/scheme/ready', guard, async (req, reply) => {
    if (!(await marksEnabled())) return reply.code(403).send('');
    const p = ocParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    await setSchemeReadyForOc(p.data.id);
    return reply.type('text/html').send(await renderSchemeEditor(p.data.id, 'Scheme marked ready.'));
  });

  // Per-pupil comment back (in the read-back view).
  app.post('/lesson/oc/:id/pupil/:pid/comment', guard, async (req, reply) => {
    if (!(await marksEnabled())) return reply.code(403).send('');
    const p = z.object({ id: z.coerce.number().int().positive(), pid: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ comment: z.string().max(2000) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    if (!(await pupilCanAccessOc(p.data.pid, p.data.id))) return reply.code(403).send('');
    await setComment(p.data.pid, p.data.id, b.data.comment.trim());
    return reply.type('text/html').send(`<span class="note-status saved" id="cmt-status-${p.data.pid}" hx-swap-oob="true">comment saved ✓</span>`);
  });

  app.post('/lesson/oc/:id/pupil/:pid/profile', guard, async (req, reply) => {
    if (!(await marksEnabled())) return reply.code(403).send('');
    const p = z.object({ id: z.coerce.number().int().positive(), pid: z.coerce.number().int().positive() }).safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    if (!(await pupilCanAccessOc(p.data.pid, p.data.id))) return reply.code(403).send('');
    const r = await buildPupilProfile(p.data.pid);
    const prof = await getProfile(p.data.pid);
    return reply.type('text/html').send(`<div class="pw-profile" id="profile-${p.data.pid}">
      <strong>What works for me</strong> ${prof ? `<span class="muted">(${esc(prof.updatedAt)})</span>` : ''}
      ${prof ? `<p class="rc-comment">${esc(prof.digest)}</p>` : `<p class="error">${esc(r.message)}</p>`}
      <button type="button" class="link fu-ai" hx-post="/lesson/oc/${p.data.id}/pupil/${p.data.pid}/profile" hx-target="#profile-${p.data.pid}" hx-swap="outerHTML" hx-disabled-elt="this">✨ refresh profile (AI)</button>
    </div>`);
  });

  app.post('/lesson/oc/:id/pupil/:pid/override', guard, async (req, reply) => {
    if (!(await marksEnabled())) return reply.code(403).send('');
    const p = z.object({ id: z.coerce.number().int().positive(), pid: z.coerce.number().int().positive() }).safeParse(req.params);
    const b = z.object({ answerId: z.coerce.number().int().positive(), marks: z.coerce.number().int().min(0) }).safeParse(req.body);
    if (!p.success || !b.success) return reply.code(400).send('');
    if (!(await pupilCanAccessOc(p.data.pid, p.data.id))) return reply.code(403).send('');
    const n = await overrideMark(b.data.answerId, p.data.pid, p.data.id, b.data.marks, null);
    return reply.type('text/html').send(n > 0 ? '<span class="note-status saved">mark set ✓</span>' : '<span class="error">that answer isn\'t in this pupil\'s work</span>');
  });

  // Printable answer pack (questions + accepted answers + class stats).
  app.get('/lesson/oc/:id/answer-pack', { preHandler: requireAuth }, async (req, reply) => {
    const p = ocParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    return reply.type('text/html').send(await renderAnswerPack(p.data.id));
  });

  // Marks CSV export for the class.
  app.get('/lesson/oc/:id/marks.csv', { preHandler: requireAuth }, async (req, reply) => {
    const p = ocParam.safeParse(req.params);
    if (!p.success) return reply.code(400).send('');
    const csv = await marksCsv(p.data.id);
    return reply.header('content-type', 'text/csv; charset=utf-8').header('content-disposition', `attachment; filename="marks-oc${p.data.id}.csv"`).send(csv);
  });
}

const MARK_KINDS = ['exact', 'numeric', 'keyword', 'choice', 'tick', 'open'] as const;

/** The inline mark-scheme editor: per-point kind / expected / alternatives / marks, all autosaving. */
async function renderSchemeEditor(oc: number, msg?: string): Promise<string> {
  const ws = await worksheetAndScheme(oc);
  if (!ws) return '<p class="muted">No worksheet bound.</p>';
  if (!ws.scheme) return '<p class="muted">No scheme yet — derive one first.</p>';
  const byField = new Map<string, SchemePoint[]>();
  for (const p of ws.scheme.points) {
    const arr = byField.get(p.fieldKey) ?? [];
    arr.push(p);
    byField.set(p.fieldKey, arr);
  }
  const sections = [...byField.entries()]
    .map(([key, pts]) => {
      const rows = pts
        .map((p) => {
          const kindSel = `<select hx-post="/lesson/oc/${oc}/scheme/point/${p.id}" hx-vals='js:{"field":"kind","value":event.target.value}' hx-trigger="change" hx-target="next .note-status" hx-swap="innerHTML">${MARK_KINDS.map((k) => `<option value="${k}"${k === p.kind ? ' selected' : ''}>${k}</option>`).join('')}</select>`;
          return `<div class="scheme-pt">
            ${kindSel}
            <input value="${esc(p.expected)}" placeholder="expected / guidance" hx-post="/lesson/oc/${oc}/scheme/point/${p.id}" hx-vals='js:{"field":"expected","value":event.target.value}' hx-trigger="change" hx-target="next .note-status" hx-swap="innerHTML">
            <input value="${esc(p.alternatives.join(', '))}" placeholder="also accept (comma-sep)" hx-post="/lesson/oc/${oc}/scheme/point/${p.id}" hx-vals='js:{"field":"alternatives","value":event.target.value}' hx-trigger="change" hx-target="next .note-status" hx-swap="innerHTML">
            <input class="setup-num" style="width:3rem" value="${p.marks}" title="marks" hx-post="/lesson/oc/${oc}/scheme/point/${p.id}" hx-vals='js:{"field":"marks","value":event.target.value}' hx-trigger="change" hx-target="next .note-status" hx-swap="innerHTML">
            <span class="note-status"></span>
          </div>`;
        })
        .join('');
      return `<div class="scheme-field"><strong>${esc(ws.labelByKey.get(key) ?? key)}</strong> <span class="muted">${esc(key)}</span>${rows}</div>`;
    })
    .join('');
  return `<div class="scheme-editor">
    ${msg ? `<p class="adapt-note">${esc(msg)}</p>` : ''}
    <p class="muted">Edit the scheme, then mark it ready. Objective kinds (exact/numeric/keyword/choice/tick) mark instantly; "open" answers are AI-marked.</p>
    ${sections}
    <button type="button" class="link" hx-post="/lesson/oc/${oc}/scheme/ready" hx-target="#pw-scheme-${oc}" hx-swap="innerHTML">mark scheme ready</button>
    <button type="button" class="link" hx-on:click="this.closest('.scheme-editor').remove()">close</button>
  </div>`;
}

/** Printable answer pack: each question, accepted answers, and the class's mark stats. */
async function renderAnswerPack(oc: number): Promise<string> {
  const info = await ocInfo(oc);
  const ws = info ? await worksheetAndScheme(oc) : null;
  if (!info || !ws || !ws.scheme) return '<!doctype html><meta charset="utf-8"><p>No mark scheme to print yet.</p>';
  const answers = await classAnswers(oc); // per field: the class's answers (anonymised)
  const ansByKey = new Map(answers.map((a) => [a.fieldKey, a.answers]));
  const byField = new Map<string, SchemePoint[]>();
  for (const p of ws.scheme.points) {
    const arr = byField.get(p.fieldKey) ?? [];
    arr.push(p);
    byField.set(p.fieldKey, arr);
  }
  const cards = [...byField.entries()]
    .map(([key, pts]) => {
      const total = pts.reduce((s, p) => s + p.marks, 0);
      const accepted = pts.map((p) => `${esc(p.expected)}${p.alternatives.length ? ` (or ${esc(p.alternatives.join(', '))})` : ''} — ${p.marks}m`).join('<br>');
      const n = (ansByKey.get(key) ?? []).length;
      return `<div class="ap-q"><div class="ap-qh">${esc(ws.labelByKey.get(key) ?? key)} <span class="muted">[${total} mark${total === 1 ? '' : 's'}]</span></div>
        <div class="ap-a"><strong>Accepted:</strong><br>${accepted || '(open answer)'}</div>
        <div class="muted">${n} pupil${n === 1 ? '' : 's'} answered</div></div>`;
    })
    .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Answer pack · ${esc(ws.title)}</title>
    <link rel="stylesheet" href="/static/styles.css"></head>
    <body class="cards-page"><div class="cards-toolbar"><button onclick="window.print()">🖨 Print</button> ${esc(ws.title)} — answer pack</div>
    <div class="answer-pack">${cards || '<p>No questions.</p>'}</div></body></html>`;
}

/** Marks CSV for the class: the awarded/total are CONFIRMED marks only (the defensible attainment
 *  figure), with a "pending" column so unconfirmed AI suggestions are never read as final. */
async function marksCsv(oc: number): Promise<string> {
  const rows = await pupilWorkRowsWithMarks(oc);
  // Quote as needed AND neutralise CSV formula-injection (a name starting = + - @ tab CR).
  const esc2 = (s: string): string => {
    const v = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  const lines = ['pupil,awarded,total,pending_confirmation'];
  for (const r of rows) lines.push(`${esc2(r.displayName)},${r.awarded},${r.total},${r.pending}`);
  return lines.join('\n') + '\n';
}

async function pupilWorkRowsWithMarks(oc: number): Promise<Array<{ displayName: string; awarded: number; total: number; pending: number }>> {
  const info = await ocInfo(oc);
  if (!info) return [];
  const grid = await pupilWorkRows(oc, info.groupCourseId);
  const sums = await markSummaries(oc);
  return grid.map((g) => {
    const s = sums.get(g.pupilId);
    // Export CONFIRMED marks only; surface how many marks are still unconfirmed so the export is never
    // mistaken for final attainment when AI suggestions are still awaiting the teacher's review.
    return { displayName: g.displayName, awarded: s?.confirmedAwarded ?? 0, total: s?.confirmedTotal ?? 0, pending: s?.suggested ?? 0 };
  });
}

