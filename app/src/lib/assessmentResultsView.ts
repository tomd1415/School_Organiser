// Phase 5 — results views: the teacher dashboard (per-pupil table + per-spec-point RAG heatmap + per-class
// release control) and the gated, confirmed-only PUPIL results panel (light theme). All URLs via paths.ts.
// The pupil panel never carries mark-points / model answers — only confirmed marks + feedback.
import { esc } from './esc';
import { paths } from './paths';
import type { TeacherResults, PupilResults } from '../services/assessmentResults';

function ragClass(pct: number | null): string {
  if (pct == null) return '';
  if (pct >= 70) return 'good';
  if (pct >= 40) return 'warn';
  return 'red';
}
const pctOf = (a: number, t: number): number | null => (t > 0 ? Math.round((100 * a) / t) : null);

export interface TeacherResultsView extends TeacherResults {
  pupilNames: Map<number, string>;
  classNames: Map<number, string>;
  csrf: string;
}

export interface ReleaseSectionData {
  assessmentId: number;
  assignments: TeacherResults['assignments'];
  classNames: Map<number, string>;
  csrf: string;
}

export function renderReleaseSection(d: ReleaseSectionData): string {
  const rows = d.assignments.length
    ? d.assignments
        .map((a) => {
          const name = esc(d.classNames.get(a.groupCourseId) ?? `class #${a.groupCourseId}`);
          const mode = a.resultsMode === 'instant' ? '<span class="badge">instant</span>' : '<span class="badge">on release</span>';
          const released = a.releasedAt != null;
          const btn =
            a.resultsMode === 'instant'
              ? '<span class="muted">shown as marks are confirmed</span>'
              : `<button type="submit" class="btn-secondary">${released ? 'Un-release' : 'Release results'}</button>`;
          return `<form class="asmt-rel-row" hx-post="${paths.assessmentRelease(d.assessmentId, a.groupCourseId)}" hx-target="#asmt-release" hx-swap="outerHTML">
            <input type="hidden" name="released" value="${released ? 'false' : 'true'}">
            <span><strong>${name}</strong> ${mode} ${released ? '<span class="badge good">released</span>' : '<span class="badge warn">held</span>'}</span>
            ${btn}
          </form>`;
        })
        .join('')
    : '<p class="muted">Not assigned to any class yet.</p>';
  return `<section id="asmt-release" class="asmt-release" hx-headers='{"x-csrf-token":"${esc(d.csrf)}"}'>
    <h2>Release</h2>
    <p class="muted">Pupils see only <strong>confirmed</strong> marks. On-release classes stay hidden until you release; instant classes see each mark the moment you confirm it.</p>
    ${rows}
  </section>`;
}

export function renderTeacherResults(d: TeacherResultsView): string {
  const heat = d.specPoints.length
    ? `<div class="asmt-heat">${d.specPoints
        .map((s) => `<div class="asmt-heat-cell badge ${ragClass(s.pct)}" title="${esc(s.title)} · ${s.nPupils} pupil(s)">${esc(s.code)} ${s.pct != null ? `${s.pct}%` : '—'}</div>`)
        .join('')}</div><p class="muted">Per-spec-point mastery (objective questions only) across the class, RAG by %.</p>`
    : '<p class="muted">No per-spec-point data yet — objective parts populate this as attempts are marked.</p>';

  const rows = d.perPupil.length
    ? d.perPupil
        .map((p) => {
          const name = esc(d.pupilNames.get(p.pupilId) ?? `pupil #${p.pupilId}`);
          const pct = pctOf(p.scoreAwarded, p.scoreTotal);
          const flags = [
            p.disclosure ? `<span class="badge red">⚑ ${p.disclosure}</span>` : '',
            p.needsReview ? `<span class="badge warn">${p.needsReview} review</span>` : '',
          ].join(' ');
          return `<tr>
            <td>${name}</td>
            <td>${p.status === 'submitted' ? '<span class="badge good">submitted</span>' : '<span class="badge">in progress</span>'}</td>
            <td class="num"><span class="badge ${ragClass(pct)}">${p.scoreAwarded}/${p.scoreTotal}${pct != null ? ` · ${pct}%` : ''}</span></td>
            <td>${flags} <a class="link" href="${paths.assessmentAttemptMarks(d.assessmentId, p.attemptId)}">mark →</a></td>
          </tr>`;
        })
        .join('')
    : '<tr><td colspan="4" class="muted">No pupil attempts yet.</td></tr>';

  return `<section class="asmt-results card">
    <div class="card-head"><div><p class="eyebrow">results</p><h1>${esc(d.title)}</h1><p class="muted">${d.marksTotal} marks · ${d.perPupil.length} attempt(s)</p></div></div>
    ${heat}
    <table class="asmt-results-table">
      <thead><tr><th>Pupil</th><th>Status</th><th>Score</th><th>Flags</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${renderReleaseSection({ assessmentId: d.assessmentId, assignments: d.assignments, classNames: d.classNames, csrf: d.csrf })}
  </section>`;
}

/** The pupil's own results — confirmed marks + per-part feedback (+ spec-point breakdown). Light theme. */
export function renderPupilResults(d: PupilResults): string {
  const pct = pctOf(d.awarded, d.total);
  const items = d.items.length
    ? d.items
        .map((i) => `<li class="asmt-presult-item"><div>${esc(i.label)}</div><div><strong>${i.awarded}/${i.total}</strong>${i.feedback ? ` — ${esc(i.feedback)}` : ''}</div></li>`)
        .join('')
    : '<li class="pupil-note">Your marks aren’t confirmed yet — check back soon.</li>';
  const spec = d.specPoints.length
    ? `<h2>By topic</h2><ul class="asmt-presult-spec">${d.specPoints.map((s) => `<li>${esc(s.code === s.title ? s.title : `${s.code} ${s.title}`)}: <strong>${s.awarded}/${s.total}</strong></li>`).join('')}</ul>`
    : '';
  return `<section class="pupil-card asmt-presult">
    <h1>${esc(d.title)} — your results</h1>
    <p class="pupil-note">You scored <strong>${d.awarded} out of ${d.total}</strong>${pct != null ? ` (${pct}%)` : ''}.</p>
    <ul class="asmt-presult-items">${items}</ul>
    ${spec}
    <p><a class="link" href="${paths.meAssessments()}">← back to assessments</a></p>
  </section>`;
}

/** The "not released yet" pupil panel. */
export function renderPupilResultsHeld(title: string): string {
  return `<section class="pupil-card"><h1>${esc(title)}</h1><p class="pupil-note">Your results aren’t ready yet — your teacher will release them soon.</p><p><a class="link" href="${paths.meAssessments()}">← back to assessments</a></p></section>`;
}
