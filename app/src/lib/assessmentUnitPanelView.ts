// Phase 6 — the lazy "Assessments" panel shown under each unit on the Schemes spine. A compact list of the
// unit's assessments + a row of actions wired to Phases 1–5 (Review/Edit · Assign · Results), plus a
// "Generate" entry. Pure `data → HTML`; all URLs via paths.ts.
import { esc } from './esc';
import { paths } from './paths';
import type { AssessmentSummary } from '../repos/assessments';

const STYLE_LABEL: Record<string, string> = { gcse: 'GCSE', ks3: 'KS3' };

function statusBadge(status: string): string {
  const tone = status === 'ready' ? 'good' : status === 'archived' ? '' : 'warn';
  return `<span class="badge ${tone}">${esc(status)}</span>`;
}

function row(a: AssessmentSummary): string {
  const reviewLabel = a.status === 'draft' ? 'Review / edit' : 'Review';
  const assign = a.status === 'ready' ? ` · <a class="link" href="${paths.assessment(a.id)}">Assign</a>` : '';
  const results = a.assignedClasses > 0 || a.status !== 'draft' ? ` · <a class="link" href="${paths.assessmentResults(a.id)}">Results</a>` : '';
  return `<li class="asmt-unit-row">
    <a class="link asmt-unit-title" href="${paths.assessment(a.id)}">${esc(a.title)}</a>
    <span class="badge">${esc(STYLE_LABEL[a.style] ?? a.style)}</span> ${statusBadge(a.status)}
    <span class="muted">${a.marksTotal} mark${a.marksTotal === 1 ? '' : 's'} · ${a.questionCount} q · ${a.assignedClasses} class${a.assignedClasses === 1 ? '' : 'es'}</span>
    <span class="asmt-unit-actions"><a class="link" href="${paths.assessment(a.id)}">${reviewLabel}</a>${assign}${results}</span>
  </li>`;
}

export function renderAssessmentUnitPanel(unitId: number, items: AssessmentSummary[]): string {
  const list = items.length ? `<ul class="asmt-unit-list">${items.map(row).join('')}</ul>` : '<p class="muted">No assessments yet — generate one for a class.</p>';
  return `<div class="asmt-unit-panel">
    ${list}
    <a class="link asmt-unit-gen" href="${paths.unitAssessments(unitId)}">✨ Generate an assessment for a class →</a>
  </div>`;
}
