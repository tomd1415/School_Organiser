import { esc } from './html';
import { renderAtlPicker } from '../routes/atl';
import { renderWorksheet } from './worksheetForm';
import { type Level } from './worksheetForm';
import { type PupilMarkRow } from '../repos/marking';
import { type PupilWorkRow } from '../repos/pupilWork';
import { type OccurrenceHeader } from '../services/occurrence';
import { paths } from './paths';

export interface MarkModalViewOptions {
  oc: number;
  pid: number;
  marking: boolean;
  wsIndex: number;
  header: OccurrenceHeader | null;
  worksheets: any[];
  roster: PupilWorkRow[];
  level: Level;
  atlScore: number | null;
  ansRows: Array<{ id: number; field_key: string; value: string }>;
  marks: PupilMarkRow[];
  comment: string;
  scheme: any;
}

const firstNameOf = (full: string): string => full.split(/\s+/)[0] ?? full;

function markControl(oc: number, pid: number, answerId: number, mk: PupilMarkRow | undefined, maxMarks: number, wi: number): string {
  const awarded = mk?.marksAwarded;
  const set = (m: number | string) =>
    `hx-post="${paths.occPupilMarkSave(oc, pid)}" hx-target="#mark-modal-body" hx-swap="innerHTML"`
    + ` hx-vals='{"answerId":"${answerId}","marks":"${m}","total":"${maxMarks}","ws":"${wi}"}'`;
  if (maxMarks <= 1) {
    return `<div class="mm-tick">
      <button type="button" class="mm-t mm-t-yes${awarded === 1 ? ' on' : ''}" ${set(1)} title="correct">✓</button>
      <button type="button" class="mm-t mm-t-no${awarded === 0 ? ' on' : ''}" ${set(0)} title="not yet">✗</button></div>`;
  }
  return `<div class="mm-num">
    <button type="button" class="mm-t mm-t-yes" ${set(maxMarks)} title="full marks">✓</button>
    <input class="mm-score" type="number" min="0" max="${maxMarks}" value="${awarded ?? ''}" inputmode="numeric"
      hx-post="${paths.occPupilMarkSave(oc, pid)}" hx-trigger="change" hx-target="#mark-modal-body" hx-swap="innerHTML"
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

export function renderMarkModal(options: MarkModalViewOptions): string {
  const { oc, pid, marking, wsIndex, header, worksheets, roster, level, atlScore, ansRows, marks, comment, scheme } = options;

  const idx = roster.findIndex((r) => r.pupilId === pid);
  const me = roster[idx];
  if (!me) return `<p class="muted mm-empty">Pupil not found in class roster.</p>`;
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

  const ansByKey = new Map(ansRows.map((r) => [r.field_key, r]));
  const markByKey = new Map(marks.map((m) => [m.fieldKey, m]));
  // Enumerate exactly the questions THIS pupil saw: the shared blocks + their own differentiation level.
  // Listing every level's questions (the previous behaviour) showed far more rows than the pupil was given
  // and rendered every other-level question as a permanent "— left blank —" (BUG: marking didn't match the
  // pupil's work). field_keys carry no level, so we slice by re-rendering at the pupil's level. The union
  // with answered/marked keys keeps a pupil's saved rows visible even if they were re-levelled after working.
  const shownKeys = new Set(
    renderWorksheet(ws.markdown, { mode: 'review', level, keyPrefix: ws.keyPrefix }).fields.map((f) => f.key),
  );
  const fields = renderWorksheet(ws.markdown, { mode: 'review', keyPrefix: ws.keyPrefix }).fields.filter(
    (f) => shownKeys.has(f.key) || ansByKey.has(f.key) || markByKey.has(f.key),
  );
  const questions = fields.filter((f) => f.kind === 'text' || f.kind === 'blank' || f.kind === 'choice' || f.kind === 'code' || f.kind === 'parsons');
  const checks = fields.filter((f) => f.kind === 'check');
  const pointByKey = new Map<string, any>((scheme?.points ?? []).map((p: any) => [ws.keyPrefix + p.fieldKey, p]));

  const wsTabs = worksheets.length > 1
    ? `<div class="mm-wstabs" role="tablist" aria-label="Worksheets">${worksheets
        .map((w, i) => `<button type="button" class="ws-tab${i === wi ? ' is-on' : ''}" role="tab" aria-selected="${i === wi}" hx-get="${paths.occPupilMarkWs(oc, pid, i)}" hx-target="#mark-modal-body" hx-swap="innerHTML">${esc(w.title.replace(/\s*[—-]\s*worksheet\.md$/i, '').trim() || `Worksheet ${i + 1}`)}</button>`)
        .join('')}</div>`
    : '';

  let awarded = 0, total = 0, checked = 0, markable = 0;
  const rowsHtml = questions
    .map((f, i) => {
      const pt = pointByKey.get(f.key);
      const ans = ansByKey.get(f.key);
      const mk = markByKey.get(f.key);
      const codey = f.kind === 'code' || f.kind === 'parsons';
      const maxMarks = pt?.marks ?? (f.kind === 'parsons' ? 1 : 2);
      total += maxMarks;
      if (ans) markable += 1;
      if (mk) { awarded += mk.marksAwarded; if (mk.status === 'confirmed') checked += 1; }
      const state = !mk ? 'mm-todo' : mk.needsReview ? 'mm-review' : mk.marksAwarded >= maxMarks ? 'mm-full' : mk.marksAwarded <= 0 ? 'mm-zero' : 'mm-part';
      const alts = pt && pt.alternatives.length ? ` <span class="mm-alts">also accept: ${esc(pt.alternatives.join(', '))}</span>` : '';
      const modelText = f.kind === 'parsons' ? (f.solution ?? []).join('\n') : (pt?.expected ?? '');
      const ansVal = ans?.value ?? '';
      const mono = (s: string): string => `<pre class="mm-code">${esc(s)}</pre>`;
      const modelHtml = modelText ? (codey ? mono(modelText) : esc(modelText) + alts) : '<span class="muted">— no model answer —</span>';
      const ansHtml = ansVal ? (codey ? mono(ansVal) : esc(ansVal)) : '<span class="mm-blank">— left blank —</span>';
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

  const checksHtml = checks.length
    ? `<div class="mm-checks"><span class="mm-lbl">Self-check</span> ${tickedCount(checks, ansByKey)}/${checks.length} ticked
        ${checks.map((c) => `<span class="mm-chip ${(ansByKey.get(c.key)?.value ?? '') === 'x' ? 'on' : ''}">${(ansByKey.get(c.key)?.value ?? '') === 'x' ? '☑' : '☐'} ${esc(c.label)}</span>`).join('')}</div>`
    : '';

  const scoreState = total === 0 ? '' : awarded >= total ? 'mm-full' : awarded <= 0 ? 'mm-zero' : 'mm-part';
  const className = header?.groupName ?? scheme?.courseName ?? '';
  const dateStr = header?.date ?? '';

  const navBtn = (p: typeof prev, label: string, dir: 'prev' | 'next') =>
    p
      ? `<button type="button" class="mm-navbtn" data-mark-nav="${dir}" hx-get="${paths.occPupilMark(oc, p.pupilId)}" hx-target="#mark-modal-body" hx-swap="innerHTML">${label}</button>`
      : `<button type="button" class="mm-navbtn" disabled>${label}</button>`;

  const footer = marking
    ? `<footer class="mm-foot">
        <label class="mm-comment">💬 Comment back to ${esc(first)}
          <textarea rows="2" placeholder="a kind line they'll see with their marks"
            hx-post="${paths.occPupilComment(oc, pid)}" hx-trigger="change" hx-swap="none">${esc(comment)}</textarea></label>
        <div class="mm-actions">
          ${navBtn(prev, `← ${prev ? esc(firstNameOf(prev.displayName)) : 'Prev'}`, 'prev')}
          <button type="button" class="mm-confirm" hx-post="${paths.occPupilMarkConfirm(oc, pid)}" hx-vals='{"ws":"${wi}"}' hx-target="#mark-modal-body" hx-swap="innerHTML"
            title="accept every AI mark for this pupil as checked">✓ Confirm all</button>
          ${next
            ? `<button type="button" class="mm-next" hx-post="${paths.occPupilMarkConfirm(oc, pid)}" hx-vals='{"next":"${next.pupilId}","ws":"${wi}"}' hx-target="#mark-modal-body" hx-swap="innerHTML">Confirm &amp; next → ${esc(firstNameOf(next.displayName))}</button>`
            : `<span class="mm-last">last pupil</span>`}
          ${navBtn(next, `skip →`, 'next')}
        </div></footer>`
    : `<footer class="mm-foot"><p class="muted">Auto-marking is off — turn it on in <a href="${paths.settings()}">Settings → Auto-marking</a> to record marks here. (Model answers and pupil answers are shown above.)</p>
        <div class="mm-actions">${navBtn(prev, '← Prev', 'prev')}${navBtn(next, 'Next →', 'next')}</div></footer>`;

  return `<div class="mm">
    <header class="mm-head">
      <div class="mm-htop">
        <div class="mm-who"><span class="mm-name">${esc(me.displayName)}</span> <span class="mm-lvl mm-lvl-${level}" title="differentiation level">${level}</span>${me.done ? ' <span class="mm-done" title="pupil marked themselves done">✓ done</span>' : ''}${renderAtlPicker(oc, pid, atlScore)}</div>
        <button type="button" class="mm-x" onclick="this.closest('dialog').close()" aria-label="Close">✕</button>
      </div>
      <div class="mm-sub">${esc(className)}${dateStr ? ` · ${esc(dateStr)}` : ''} · ${esc(ws.title)}</div>
      <div class="mm-stat">
        <span class="mm-pos">Pupil ${idx + 1} of ${roster.length}</span>
        ${marking ? `<span class="mm-score-tot ${scoreState}">${awarded}/${total}</span> <span class="mm-checked">${checked}/${markable} checked</span>` : ''}
        ${roster.length > 1 ? '<span class="mm-kbd" title="use the arrow keys to move through the class">← →</span>' : ''}
        <a class="mm-atl-link" href="${paths.occAtl(oc)}" title="open the whole-class ATL grid (for live use during the lesson)">ATL grid →</a>
      </div>
      ${wsTabs}
    </header>
    <div class="mm-rows">${rowsHtml || '<p class="muted">This worksheet has no answerable questions.</p>'}</div>
    ${checksHtml}
    ${footer}
  </div>`;
}

function tickedCount(checks: any[], ansByKey: Map<string, { value: string }>): number {
  return checks.filter((c) => (ansByKey.get(c.key)?.value ?? '') === 'x').length;
}
