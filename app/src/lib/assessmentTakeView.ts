// Phase 3 — pure pupil-facing views (light theme), rendered ONLY from the PII-safe TakePaper projection
// (services/assessmentTake.ts). These views never receive mark-points / model answers / misconceptions, so
// the answer key cannot leak by construction. All route URLs come from paths.ts. Autosave mirrors /me.
import { esc } from './esc';
import { paths } from './paths';
import type { TakePaper, TakeQuestion, TakePart } from '../services/assessmentTake';
import type { AvailableAssessment } from '../repos/assessmentAttempts';

const STATUS_LABEL: Record<string, string> = { not_started: 'Start', in_progress: 'Resume', submitted: 'Submitted' };

export function renderAvailableList(items: AvailableAssessment[], pupilName: string): string {
  const cards = items.length
    ? items
        .map((a) => {
          const action =
            a.attemptStatus === 'submitted'
              ? `<span class="badge good">submitted</span> <a class="pupil-go" href="${paths.meAssessmentResults(a.id)}">See results →</a>`
              : `<a class="pupil-go" href="${paths.meAssessment(a.id)}">${esc(STATUS_LABEL[a.attemptStatus] ?? 'Start')} →</a>`;
          return `<li class="asmt-take-card">
            <div><strong>${esc(a.title)}</strong> <span class="muted">${a.marksTotal} mark${a.marksTotal === 1 ? '' : 's'} · ${esc(a.style === 'gcse' ? 'GCSE' : 'KS3')}</span></div>
            <div class="asmt-take-action">${action}</div>
          </li>`;
        })
        .join('')
    : '<li class="pupil-note">No assessments to do right now. 🎉</li>';
  return `<section class="pupil-card asmt-take-list">
    <h1>Assessments</h1>
    <p class="pupil-note">Hi ${esc(pupilName)} — here are the assessments set for your class.</p>
    <ul class="asmt-take-cards">${cards}</ul>
  </section>`;
}

/** The answer widget for one part. Each posts (partId + value) to the answer route on change (autosave).
 *  `saved` is the pupil's restored answer for an in-progress attempt. */
function widget(assessmentId: number, p: TakePart, saved: string): string {
  const post = `hx-post="${paths.meAssessmentAnswer(assessmentId)}" hx-target="#save-${p.partId}" hx-swap="innerHTML"`;
  const partField = `<input type="hidden" name="partId" value="${p.partId}">`;
  const status = `<span class="note-status" id="save-${p.partId}" aria-live="polite"></span>`;
  if (p.responseType === 'multiple_choice') {
    const radios = p.options
      .map((o, i) => `<label class="asmt-opt"><input type="radio" name="value" value="${esc(o)}"${saved === o ? ' checked' : ''} ${post} hx-trigger="change"> ${esc(o)}</label>`)
      .join('');
    return `<form class="asmt-take-widget">${partField}<div class="asmt-opts">${radios || '<span class="muted">(no options)</span>'}</div>${status}</form>`;
  }
  if (p.responseType === 'tick_box') {
    const picked = new Set(saved.split('\n').map((s) => s.trim()).filter(Boolean));
    // A tick group autosaves the WHOLE set on any change (hx-include the form), joined server-side.
    const boxes = p.options
      .map((o) => `<label class="asmt-opt"><input type="checkbox" name="value" value="${esc(o)}"${picked.has(o) ? ' checked' : ''} ${post} hx-trigger="change" hx-include="closest form"> ${esc(o)}</label>`)
      .join('');
    return `<form class="asmt-take-widget">${partField}<div class="asmt-opts">${boxes || '<span class="muted">(no options)</span>'}</div>${status}</form>`;
  }
  const rows = p.responseType === 'extended_response' ? 8 : p.responseType === 'medium_text' ? 4 : p.responseType === 'code' ? 8 : 2;
  const mono = p.responseType === 'code' ? ' class="asmt-code"' : '';
  if (p.responseType === 'short_text') {
    return `<form class="asmt-take-widget">${partField}<input type="text" name="value" value="${esc(saved)}" ${post} hx-trigger="change, keyup changed delay:800ms" autocomplete="off">${status}</form>`;
  }
  return `<form class="asmt-take-widget">${partField}<textarea name="value" rows="${rows}"${mono} ${post} hx-trigger="change, keyup changed delay:800ms">${esc(saved)}</textarea>${status}</form>`;
}

function renderQuestion(assessmentId: number, q: TakeQuestion, index: number, answers: Map<number, string>): string {
  const parts = q.parts
    .map(
      (p) => `<div class="asmt-take-part">
        <p class="asmt-take-prompt"><strong>${esc(p.partLabel)})</strong> ${esc(p.prompt)} <span class="muted">(${p.marks} mark${p.marks === 1 ? '' : 's'})</span></p>
        ${widget(assessmentId, p, answers.get(p.partId) ?? '')}
      </div>`,
    )
    .join('');
  return `<section class="asmt-take-q">
    <h2>Question ${index + 1}</h2>
    ${q.stem.trim() ? `<p class="asmt-take-stem">${esc(q.stem)}</p>` : ''}
    ${parts}
  </section>`;
}

export function renderTakePage(paper: TakePaper, answers: Map<number, string>): string {
  const questions = paper.questions.map((q, i) => renderQuestion(paper.id, q, i, answers)).join('');
  return `<section class="pupil-card asmt-take">
    <div class="asmt-take-head">
      <a class="link" href="${paths.meAssessments()}">← back to assessments</a>
      <h1>${esc(paper.title)}</h1>
      <p class="pupil-note">${paper.marksTotal} mark${paper.marksTotal === 1 ? '' : 's'}. Your answers save as you go. When you’re finished, press Submit — you can’t change your answers after that.</p>
    </div>
    ${questions}
    <form class="asmt-take-submit" hx-post="${paths.meAssessmentSubmit(paper.id)}" hx-target="#asmt-take-root" hx-swap="innerHTML" hx-confirm="Submit your answers? You can’t change them after this.">
      <button type="submit" class="pupil-go">Submit my answers ✓</button>
    </form>
  </section>`;
}

/** The post-submit (or already-submitted) confirmation — no answer key, just a friendly note. */
export function renderSubmitted(paper: { id: number; title: string }, opts: { resultsAvailable: boolean } = { resultsAvailable: false }): string {
  return `<section class="pupil-card asmt-take-done">
    <h1>Submitted ✓</h1>
    <p class="pupil-note">Thanks — your answers to <strong>${esc(paper.title)}</strong> are in. Your teacher will mark them.</p>
    ${opts.resultsAvailable ? `<a class="pupil-go" href="${paths.meAssessmentResults(paper.id)}">See my results →</a>` : '<p class="pupil-note">Your results will appear here once your teacher releases them.</p>'}
    <p><a class="link" href="${paths.meAssessments()}">← back to assessments</a></p>
  </section>`;
}

/** A tiny inline "saved ✓" fragment (HTMX autosave target), like /me's savedTick. */
export function renderTakeSaved(): string {
  return '<span class="note-status saved">saved ✓</span>';
}

export function renderTakeError(message: string): string {
  return `<section class="pupil-card"><h1>Not available</h1><p class="pupil-note">${esc(message)}</p><p><a class="link" href="${paths.meAssessments()}">← back to assessments</a></p></section>`;
}
