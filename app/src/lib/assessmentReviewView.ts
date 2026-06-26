// Phase 1 — pure views for the per-unit assessment: the per-unit list + "Generate for class X" form, and
// the draft-paper review/edit page. Pure `data → HTML` (no DB, no AI). EVERY route URL comes from paths.ts
// (tests/pathsGuard.test.ts enforces this). Width is `working` (set by the route via the shell). Editing
// affordances render only when `editable` (status === 'draft'); a ready/archived paper renders read-only.
import { esc } from './esc';
import { paths } from './paths';
import type { AssessmentTree, AssessmentPart, AssessmentQuestion } from '../services/assessment';
import type { AssessmentReadiness } from '../services/assessment';
import type { AssessmentSummary } from '../repos/assessments';
import type { MarkKind } from './deterministicMarker';

// ── The per-unit assessments page: list + "Generate for class X" ─────────────────────────────────────

export interface ClassOption {
  groupCourseId: number;
  label: string; // e.g. "11C · Tue P3"
}

export interface UnitAssessmentsData {
  unitId: number;
  unitTitle: string;
  courseName: string;
  assessments: AssessmentSummary[];
  classes: ClassOption[];
  csrf: string;
  notice?: string | null; // a brand-new-class / no-spec-points heads-up
}

const STYLE_LABEL: Record<string, string> = { gcse: 'GCSE', ks3: 'KS3' };

function statusBadge(status: string): string {
  const tone = status === 'ready' ? 'good' : status === 'archived' ? '' : 'warn';
  return `<span class="badge ${tone}">${esc(status)}</span>`;
}

export function renderUnitAssessments(d: UnitAssessmentsData): string {
  const rows = d.assessments.length
    ? d.assessments
        .map(
          (a) => `<li class="asmt-row">
        <a class="link" href="${paths.assessment(a.id)}">${esc(a.title)}</a>
        <span class="badge">${esc(STYLE_LABEL[a.style] ?? a.style)}</span>
        ${statusBadge(a.status)}
        <span class="muted">${a.questionCount} question${a.questionCount === 1 ? '' : 's'} · ${a.marksTotal} mark${a.marksTotal === 1 ? '' : 's'} · ${a.assignedClasses} class${a.assignedClasses === 1 ? '' : 'es'}</span>
      </li>`,
        )
        .join('')
    : '<li class="muted">No assessments for this unit yet — generate one below.</li>';

  const classOptions = d.classes.length
    ? d.classes.map((c) => `<option value="${c.groupCourseId}">${esc(c.label)}</option>`).join('')
    : '';

  const generate = d.classes.length
    ? `<form class="asmt-gen" hx-post="${paths.unitAssessmentsGenerate(d.unitId)}" hx-target="#gen-result" hx-swap="innerHTML" hx-disabled-elt="find button">
        <label>Class
          <select name="groupCourseId" required>${classOptions}</select>
        </label>
        <label>Coverage
          <select name="window">
            <option value="to_date">Taught so far</option>
            <option value="whole">Whole unit (incl. planned)</option>
          </select>
        </label>
        <label>Questions <input type="number" name="questionCount" min="1" max="40" placeholder="auto" inputmode="numeric"></label>
        <label>Total marks <input type="number" name="totalMarks" min="1" max="200" placeholder="auto" inputmode="numeric"></label>
        <button type="submit" class="btn-secondary">✨ Generate assessment</button>
      </form>
      <div id="gen-result" aria-live="polite"></div>`
    : '<p class="muted">No timetabled class teaches this course yet — add one to generate an assessment for it.</p>';

  return `<section class="assessment-unit card" hx-headers='{"x-csrf-token":"${esc(d.csrf)}"}'>
    <div class="card-head"><div><p class="eyebrow">${esc(d.courseName)}</p><h1>Assessments — ${esc(d.unitTitle)}</h1></div></div>
    ${d.notice ? `<p class="adapt-note">${esc(d.notice)}</p>` : ''}
    <ul class="asmt-list">${rows}</ul>
    <h2>Generate a new assessment</h2>
    <p class="muted">The AI builds an end-of-unit paper weighted to what the chosen class has been taught, plus a few stretch questions. It lands as a draft for you to review and Mark ready.</p>
    ${generate}
  </section>`;
}

/** The inline result panel after a generate POST (degrade message or warnings). On success the route
 *  HX-Redirects to the review page, so this is only ever a not-created message. */
export function renderGenerateNote(message: string, warnings?: string[]): string {
  const warn = warnings && warnings.length ? `<ul class="muted">${warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : '';
  return `<p class="adapt-note">${esc(message)}</p>${warn}`;
}

// ── The draft-paper review / edit page ───────────────────────────────────────────────────────────────

export interface ReviewOpts {
  editable: boolean;
  csrf: string;
  specPoints?: Array<{ id: number; code: string; title: string }>;
  readiness?: AssessmentReadiness;
  warnings?: string[]; // generation warnings to surface once, on first review
  notice?: string | null;
}

const KIND_ORDER: MarkKind[] = ['exact', 'numeric', 'keyword', 'choice', 'tick', 'open'];
const KIND_LABEL: Record<MarkKind, string> = { exact: 'exact', numeric: 'numeric', keyword: 'keyword', choice: 'choice', tick: 'tick', open: 'open (AI)' };

function kindBadge(kind: MarkKind): string {
  return kind === 'open' ? '<span class="badge ai">AI-marked</span>' : '<span class="badge good">auto</span>';
}

function specChip(specPointId: number | null, codeById: Map<number, { code: string; title: string }>): string {
  if (specPointId == null) return '<span class="chip muted" title="no spec point">general</span>';
  const sp = codeById.get(specPointId);
  return sp ? `<span class="chip" title="${esc(sp.title)}">${esc(sp.code)}</span>` : `<span class="chip">spec #${specPointId}</span>`;
}

function modelAnswerBlock(modelAnswer: string | null): string {
  if (!modelAnswer || !modelAnswer.trim()) return '';
  return `<details class="asmt-model"><summary>Model answer</summary><div>${esc(modelAnswer)}</div></details>`;
}

function renderMarkPoint(assessmentId: number, mp: AssessmentPart['markPoints'][number], editable: boolean): string {
  const status = `mp-${mp.id}-status`;
  const url = paths.assessmentMarkPoint(assessmentId, mp.id);
  const required = mp.isRequired ? '<span class="badge">required</span>' : '';
  const alts = mp.acceptedAlternatives.length ? `<span class="muted">also: ${esc(mp.acceptedAlternatives.join(', '))}</span>` : '';
  if (!editable) {
    return `<li class="asmt-mp">${kindBadge(mp.kind)} <span>${esc(mp.text)}</span> <span class="muted">${mp.marks} mark${mp.marks === 1 ? '' : 's'}</span> ${required} ${alts}</li>`;
  }
  const kindOpts = KIND_ORDER.map((k) => `<option value="${k}"${k === mp.kind ? ' selected' : ''}>${esc(KIND_LABEL[k])}</option>`).join('');
  return `<li class="asmt-mp">
    ${kindBadge(mp.kind)}
    <input class="asmt-edit" type="text" name="text" value="${esc(mp.text)}" hx-post="${url}" hx-swap="none" hx-trigger="change, blur" aria-label="Mark-point text">
    <input class="asmt-marks" type="number" name="marks" value="${mp.marks}" min="0" max="20" hx-post="${url}" hx-swap="none" hx-trigger="change" aria-label="Mark-point marks">
    <select name="kind" hx-post="${url}" hx-swap="none" hx-trigger="change" aria-label="Mark-point kind">${kindOpts}</select>
    <span class="note-status" id="${status}"></span>
    ${alts}
  </li>`;
}

function renderPart(assessmentId: number, p: AssessmentPart, editable: boolean): string {
  const url = paths.assessmentPart(assessmentId, p.id);
  const status = `part-${p.id}-status`;
  const widget = `<span class="badge">${esc(p.expectedResponseType)}</span>`;
  const options =
    p.partConfig && typeof p.partConfig === 'object' && Array.isArray((p.partConfig as { options?: unknown }).options)
      ? `<p class="muted">Options: ${((p.partConfig as { options: string[] }).options).map((o) => esc(o)).join(' · ')}</p>`
      : '';
  const marksPts = p.markPoints.map((mp) => renderMarkPoint(assessmentId, mp, editable)).join('');
  const misc = p.misconceptions.length
    ? `<details class="asmt-misc"><summary>${p.misconceptions.length} misconception${p.misconceptions.length === 1 ? '' : 's'}</summary><ul>${p.misconceptions
        .map((m) => `<li><strong>${esc(m.label)}</strong>${m.description ? ` — ${esc(m.description)}` : ''}</li>`)
        .join('')}</ul></details>`
    : '';

  const promptBlock = editable
    ? `<label class="asmt-l">Prompt
        <textarea name="prompt" rows="2" hx-post="${url}" hx-swap="none" hx-trigger="input changed delay:800ms, blur">${esc(p.prompt)}</textarea>
      </label>
      <label class="asmt-l asmt-marks-l">Marks
        <input type="number" name="marks" value="${p.marks}" min="0" max="20" hx-post="${url}" hx-swap="none" hx-trigger="change">
      </label>
      <span class="note-status" id="${status}"></span>`
    : `<p>${esc(p.prompt)} <span class="muted">(${p.marks} mark${p.marks === 1 ? '' : 's'})</span></p>`;

  return `<div class="asmt-part" id="asmt-part-${p.id}">
    <div class="asmt-part-head"><strong>${esc(p.partLabel)})</strong> ${widget}</div>
    ${promptBlock}
    ${options}
    <ul class="asmt-mps">${marksPts}</ul>
    ${modelAnswerBlock(p.modelAnswer)}
    ${misc}
  </div>`;
}

function renderQuestion(assessmentId: number, q: AssessmentQuestion, index: number, editable: boolean, codeById: Map<number, { code: string; title: string }>): string {
  const url = paths.assessmentQuestion(assessmentId, q.id);
  const status = `q-${q.id}-status`;
  const cover = q.isUncovered ? '<span class="badge warn">stretch · not yet taught</span>' : '<span class="badge good">covered</span>';
  const cmd = q.commandWordCode ? `<span class="badge">${esc(q.commandWordCode)}</span>` : '';
  const diff = q.difficultyBand != null ? `<span class="muted">difficulty ${q.difficultyBand}${q.difficultyStep != null ? `.${q.difficultyStep}` : ''}</span>` : '';
  const stemBlock = editable
    ? `<label class="asmt-l">Stem
        <textarea name="stem" rows="2" hx-post="${url}" hx-swap="none" hx-trigger="input changed delay:800ms, blur">${esc(q.stem)}</textarea>
      </label>
      <span class="note-status" id="${status}"></span>`
    : q.stem.trim()
      ? `<p>${esc(q.stem)}</p>`
      : '';
  const parts = q.parts.map((p) => renderPart(assessmentId, p, editable)).join('');
  return `<article class="asmt-q card" id="asmt-q-${q.id}">
    <header class="asmt-q-head">
      <strong>Q${index + 1}</strong> ${specChip(q.specPointId, codeById)} ${cover} ${cmd}
      <span class="muted">${q.marksTotal} mark${q.marksTotal === 1 ? '' : 's'}</span> ${diff}
    </header>
    ${stemBlock}
    ${parts}
    ${modelAnswerBlock(q.modelAnswer)}
  </article>`;
}

export function assessmentReviewView(tree: AssessmentTree, opts: ReviewOpts): string {
  const codeById = new Map<number, { code: string; title: string }>();
  for (const sp of opts.specPoints ?? []) codeById.set(sp.id, { code: sp.code, title: sp.title });

  const coverSummary = (() => {
    let covered = 0;
    let stretch = 0;
    for (const q of tree.questions) (q.isUncovered ? stretch++ : covered++);
    return `${covered} covered · ${stretch} stretch`;
  })();

  const head = `<div class="card-head">
    <div>
      <p class="eyebrow">${esc(tree.examBoard ?? (tree.style === 'gcse' ? 'GCSE' : 'KS3'))}</p>
      <h1>${esc(tree.title)}</h1>
    </div>
    <div class="asmt-head-badges">
      <span class="badge">${esc(STYLE_LABEL[tree.style] ?? tree.style)}</span>
      ${statusBadge(tree.status)}
      <span class="badge">${tree.questions.length} question${tree.questions.length === 1 ? '' : 's'}</span>
      <span class="badge">${tree.marksTotal} mark${tree.marksTotal === 1 ? '' : 's'}</span>
    </div>
  </div>`;

  const warnings = opts.warnings && opts.warnings.length
    ? `<details class="asmt-warnings"><summary>${opts.warnings.length} note${opts.warnings.length === 1 ? '' : 's'} from generation</summary><ul class="muted">${opts.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></details>`
    : '';

  const readiness = opts.readiness;
  let readyBar = '';
  if (opts.editable) {
    if (readiness && !readiness.ok) {
      readyBar = `<div class="asmt-ready-bar" id="asmt-ready-bar">
        <p class="muted">Before you can Mark ready: ${readiness.reasons.map((r) => esc(r)).join(' · ')}</p>
        <button type="button" class="button" disabled title="Resolve the items above first">Mark ready</button>
      </div>`;
    } else {
      readyBar = `<div class="asmt-ready-bar" id="asmt-ready-bar">
        <button type="button" class="button" hx-post="${paths.assessmentReady(tree.id)}" hx-target="#assessment-review" hx-swap="outerHTML">Mark ready</button>
        <span class="muted">Flip the paper to <strong>ready</strong> so it can be assigned to classes.</span>
      </div>`;
    }
  } else if (tree.status === 'ready') {
    readyBar = '<p class="adapt-note">This paper is <strong>ready</strong> — assign it to a class to deliver it.</p>';
  }

  const notice = opts.notice ? `<p class="adapt-note">${esc(opts.notice)}</p>` : '';
  const summary = `<p class="muted">Coverage: ${esc(coverSummary)}. ${opts.editable ? 'Edit any stem, prompt, marks or mark-point below — changes save as you type.' : 'Read-only.'}</p>`;
  const questions = tree.questions.length
    ? tree.questions.map((q, i) => renderQuestion(tree.id, q, i, opts.editable, codeById)).join('')
    : '<p class="muted">This paper has no questions.</p>';

  return `<section id="assessment-review" class="assessment-review card" hx-headers='{"x-csrf-token":"${esc(opts.csrf)}"}'>
    ${head}
    ${notice}
    ${warnings}
    ${summary}
    ${readyBar}
    ${questions}
  </section>`;
}
