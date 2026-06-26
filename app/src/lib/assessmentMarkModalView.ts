// Phase 4 — the teacher marking grid for one attempt + the moderation queue. The teacher sees full PII
// (their own pupils' answers) — nothing here goes to AI. Per part: the pupil's answer, the suggested mark +
// marker badge (auto/ai/teacher) + confidence + evidence + flags (needs_review / disclosure), an editable
// mark + feedback, and a confirm. URLs via paths.ts. Width `working`.
import { esc } from './esc';
import { paths } from './paths';
import type { MarkingRow, ReviewQueueRow } from '../repos/assessmentAttempts';

function markerBadge(marker: string | null): string {
  if (marker === 'teacher') return '<span class="badge good">teacher</span>';
  if (marker === 'ai') return '<span class="badge ai">AI</span>';
  if (marker === 'auto') return '<span class="badge">auto</span>';
  return '<span class="badge warn">unmarked</span>';
}

function flags(r: MarkingRow): string {
  const out: string[] = [];
  if (r.disclosure) out.push('<span class="badge red">⚑ safeguarding — withheld from AI</span>');
  if (r.needsReview) out.push('<span class="badge warn">needs review</span>');
  if (r.status === 'confirmed') out.push('<span class="badge good">confirmed</span>');
  return out.join(' ');
}

function markRow(assessmentId: number, attemptId: number, r: MarkingRow): string {
  const answer = r.answerText && r.answerText.trim() ? `<div class="asmt-mark-answer">${esc(r.answerText)}</div>` : '<div class="asmt-mark-answer muted">(no answer)</div>';
  const meta = r.answerId
    ? `<div class="asmt-mark-meta">${markerBadge(r.marker)} ${flags(r)}
        ${r.confidence != null ? `<span class="muted">confidence ${r.confidence.toFixed(2)}</span>` : ''}
        ${r.evidence && r.evidence.length ? `<span class="muted">evidence: “${esc(r.evidence.join(' · '))}”</span>` : ''}</div>`
    : '';
  const controls = r.answerId
    ? `<form class="asmt-mark-controls" hx-post="${paths.assessmentMarkAnswer(assessmentId, attemptId, r.answerId)}" hx-target="#asmt-marking" hx-swap="outerHTML">
        <label class="asmt-mark-l">Mark <input type="number" name="marks" value="${r.marksAwarded ?? 0}" min="0" max="${r.partMarks}"> / ${r.partMarks}</label>
        <label class="asmt-mark-l asmt-mark-fb">Feedback <input type="text" name="feedback" value="${esc(r.feedback ?? '')}" maxlength="200"></label>
        <button type="submit" class="btn-secondary">Save + confirm</button>
      </form>`
    : '';
  return `<div class="asmt-mark-part">
    <div class="asmt-mark-prompt"><strong>Q${r.qOrder + 1}${esc(r.partLabel)}</strong> ${esc(r.prompt)} <span class="muted">(${r.partMarks} mark${r.partMarks === 1 ? '' : 's'})</span></div>
    ${answer}
    ${meta}
    ${controls}
  </div>`;
}

export interface MarkingGridData {
  assessmentId: number;
  attemptId: number;
  title: string;
  pupilName: string;
  scoreAwarded: number;
  scoreTotal: number;
  rows: MarkingRow[];
  csrf: string;
}

export function renderMarkingGrid(d: MarkingGridData): string {
  const anyUnmarked = d.rows.some((r) => r.answerId && r.status !== 'confirmed');
  return `<section id="asmt-marking" class="asmt-marking card" hx-headers='{"x-csrf-token":"${esc(d.csrf)}"}'>
    <div class="card-head">
      <div><p class="eyebrow">marking</p><h1>${esc(d.title)}</h1><p class="muted">${esc(d.pupilName)} · ${d.scoreAwarded}/${d.scoreTotal} marks</p></div>
      <div class="asmt-mark-actions">
        <button type="button" class="btn-secondary" hx-post="${paths.assessmentMarkNow(d.assessmentId, d.attemptId)}" hx-target="#asmt-marking" hx-swap="outerHTML" hx-disabled-elt="this">✨ Mark now</button>
        <button type="button" class="button"${anyUnmarked ? '' : ' disabled'} hx-post="${paths.assessmentMarkConfirm(d.assessmentId, d.attemptId)}" hx-target="#asmt-marking" hx-swap="outerHTML">Confirm all</button>
      </div>
    </div>
    <p class="muted">Objective parts mark instantly; open parts are AI-suggested (Sonnet) and need your eye. “Confirm all” confirms every suggested mark <strong>except</strong> those flagged needs-review. Safeguarding-flagged answers were withheld from the AI.</p>
    ${d.rows.map((r) => markRow(d.assessmentId, d.attemptId, r)).join('')}
  </section>`;
}

export interface ModerationData {
  rows: Array<ReviewQueueRow & { pupilName: string }>;
  csrf: string;
}

export function renderModerationQueue(d: ModerationData): string {
  const list = d.rows.length
    ? d.rows
        .map(
          (r) => `<li class="asmt-modq-row">
            <a class="link" href="${paths.assessmentAttemptMarks(r.assessmentId, r.attemptId)}">${esc(r.assessmentTitle)} — ${esc(r.pupilName)}</a>
            ${r.disclosure ? `<span class="badge red">⚑ ${r.disclosure} safeguarding</span>` : ''}
            ${r.needsReview ? `<span class="badge warn">${r.needsReview} needs review</span>` : ''}
          </li>`,
        )
        .join('')
    : '<li class="muted">Nothing waiting — every marked attempt is confirmed. 🎉</li>';
  return `<section class="asmt-modq card" hx-headers='{"x-csrf-token":"${esc(d.csrf)}"}'>
    <div class="card-head"><div><p class="eyebrow">marking</p><h1>Marking queue</h1></div></div>
    <p class="muted">Attempts with AI marks that need your eye, or safeguarding-flagged answers — worst first.</p>
    <ul class="asmt-modq-list">${list}</ul>
  </section>`;
}
