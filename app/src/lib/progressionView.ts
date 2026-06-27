// Phase 16A.2/16A.3 — pure views for the Stages & strands surface (data → HTML; URLs via paths.ts only).
import { esc } from './esc';
import { paths } from './paths';
import type { SchemeWithCounts, GridCell, ClassSchemeRow } from '../repos/progression';

const KIND_LABEL: Record<string, string> = {
  year_ladder: 'Year ladder',
  gcse_grades: 'GCSE grades',
  qualification: 'Qualification',
};

/** The progression admin: the scheme catalogue + per-class scheme assignment. */
export function renderProgressionAdmin(data: { schemes: SchemeWithCounts[]; classes: ClassSchemeRow[]; csrf: string }): string {
  const schemeRows = data.schemes.length
    ? data.schemes
        .map(
          (s) => `<tr>
            <td><a class="link" href="${paths.progressionScheme(s.id)}">${esc(s.name)}</a></td>
            <td>${esc(KIND_LABEL[s.kind] ?? s.kind)}${s.examBoard ? ` · ${esc(s.examBoard)}` : ''}</td>
            <td class="num">${s.strands}</td><td class="num">${s.stages}</td>
            <td class="num">${s.units}</td><td class="num">${s.criteria}</td>
          </tr>`,
        )
        .join('')
    : '<tr><td colspan="6" class="muted">No schemes yet — run the progression seed (docs).</td></tr>';

  const schemeOpts = (selected: number | null): string =>
    `<option value="">— none —</option>` +
    data.schemes.map((s) => `<option value="${s.id}"${s.id === selected ? ' selected' : ''}>${esc(s.name)}</option>`).join('');

  const classRows = data.classes
    .map(
      (c) => `<tr>
        <td>${esc(c.label)}</td>
        <td>
          <form method="post" action="${paths.progressionAssign()}" class="prog-assign-form">
            <input type="hidden" name="_csrf" value="${esc(data.csrf)}">
            <input type="hidden" name="gc" value="${c.groupCourseId}">
            <select name="scheme" onchange="this.form.requestSubmit()">${schemeOpts(c.schemeId)}</select>
            <noscript><button type="submit" class="primary">Save</button></noscript>
          </form>
        </td>
        <td>${c.schemeId ? `<a class="link" href="${paths.progressionClass(c.groupCourseId)}">heat-map →</a>` : '<span class="muted">not yet assigned</span>'}</td>
      </tr>`,
    )
    .join('');

  return `<section class="card">
    <h1>Stages &amp; strands</h1>
    <p class="muted">Progression schemes — a class follows one. Each scheme owns its strands, ordered stages, and the tickable “I can…” criteria.</p>
    <h2>Schemes</h2>
    <table class="prog-table">
      <thead><tr><th>Scheme</th><th>Kind</th><th class="num">Strands</th><th class="num">Stages</th><th class="num">Units</th><th class="num">Criteria</th></tr></thead>
      <tbody>${schemeRows}</tbody>
    </table>
    <h2>Assign a scheme to each class</h2>
    <table class="prog-table">
      <thead><tr><th>Class</th><th>Scheme</th><th></th></tr></thead>
      <tbody>${classRows || '<tr><td colspan="3" class="muted">No active classes.</td></tr>'}</tbody>
    </table>
  </section>`;
}

export interface HeatStrand {
  id: number;
  code: string;
  name: string;
}
export interface HeatPupil {
  id: number;
  name: string;
  perStrand: Record<number, number | null>; // strandId → current stage ordinal (or null)
  overall: number | null;
}
export interface ClassHeatMapData {
  schemeName: string;
  className: string;
  strands: HeatStrand[];
  labelByOrdinal: Record<number, string>;
  pupils: HeatPupil[];
}

function stageLabel(labelByOrdinal: Record<number, string>, ord: number | null): string {
  if (ord == null) return '<span class="prog-cell empty" title="not yet on the ladder">–</span>';
  return esc(labelByOrdinal[ord] ?? `Stage ${ord}`);
}

/** The class heat-map: each pupil's current stage per strand + overall, scheme-aware. PII (teacher-only). */
export function renderClassHeatMap(data: ClassHeatMapData): string {
  const head = `<tr><th>Pupil</th>${data.strands.map((s) => `<th title="${esc(s.name)}">${esc(s.code)}</th>`).join('')}<th>Overall</th></tr>`;
  const rows = data.pupils.length
    ? data.pupils
        .map(
          (p) => `<tr>
            <td class="prog-pupil"><a class="link" href="${paths.progressionPupil(p.id)}">${esc(p.name)}</a></td>
            ${data.strands.map((s) => `<td class="prog-cell">${stageLabel(data.labelByOrdinal, p.perStrand[s.id] ?? null)}</td>`).join('')}
            <td class="prog-cell prog-overall">${stageLabel(data.labelByOrdinal, p.overall)}</td>
          </tr>`,
        )
        .join('')
    : '<tr><td colspan="99" class="muted">No pupils enrolled in this class.</td></tr>';
  return `<section class="card">
    <p><a class="link" href="${paths.progression()}">← all schemes</a></p>
    <h1>${esc(data.className)} <span class="muted">— heat-map</span></h1>
    <p class="prog-privacy">⚠ Pupil names &amp; progress shown — teacher only. Never sent to AI.</p>
    <p class="muted">Each pupil's current stage per strand (${esc(data.schemeName)}), with the overall roll-up. A cell is the highest stage whose criteria are all evidenced.</p>
    <table class="prog-grid prog-heat">
      <thead>${head}</thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

export interface PupilLadderClass {
  groupCourseId: number;
  className: string;
  schemeName: string;
  strands: Array<{ id: number; code: string; name: string; ordinal: number | null }>;
  overall: number | null;
  labelByOrdinal: Record<number, string>;
}
export interface PupilLadderData {
  pupilName: string;
  classes: PupilLadderClass[];
}

/** The per-pupil ladder: per-strand current stage + overall, per class the pupil is in. PII (teacher-only). */
export function renderPupilLadder(data: PupilLadderData): string {
  const blocks = data.classes.length
    ? data.classes
        .map(
          (c) => `<div class="prog-pupil-class">
            <h2>${esc(c.className)} <span class="muted">— ${esc(c.schemeName)}</span></h2>
            <table class="prog-grid">
              <thead><tr>${c.strands.map((s) => `<th title="${esc(s.name)}">${esc(s.code)}</th>`).join('')}<th>Overall</th></tr></thead>
              <tbody><tr>
                ${c.strands.map((s) => `<td class="prog-cell">${stageLabel(c.labelByOrdinal, s.ordinal)}</td>`).join('')}
                <td class="prog-cell prog-overall">${stageLabel(c.labelByOrdinal, c.overall)}</td>
              </tr></tbody>
            </table>
            <p class="muted"><a class="link" href="${paths.progressionClass(c.groupCourseId)}">class heat-map →</a></p>
          </div>`,
        )
        .join('')
    : '<p class="muted">This pupil is not in any class with a progression scheme assigned.</p>';
  return `<section class="card">
    <p><a class="link" href="${paths.progression()}">← all schemes</a></p>
    <h1>${esc(data.pupilName)} <span class="muted">— progression</span></h1>
    <p class="prog-privacy">⚠ Pupil name &amp; progress shown — teacher only. Never sent to AI.</p>
    ${blocks}
  </section>`;
}

/** The Stage × Strand grid for one scheme (course-planning view): unit + criteria counts per cell. */
export function renderSchemeGrid(data: { schemeName: string; grid: GridCell[] }): string {
  // strands (columns) in display order; stages (rows) by ordinal.
  const strands = new Map<number, { code: string; name: string; order: number }>();
  const stages = new Map<number, string>();
  for (const c of data.grid) {
    if (!strands.has(c.strandId)) strands.set(c.strandId, { code: c.strandCode, name: c.strandName, order: c.strandOrder });
    if (!stages.has(c.stageOrdinal)) stages.set(c.stageOrdinal, c.stageLabel);
  }
  const strandList = [...strands.entries()].sort((a, b) => a[1].order - b[1].order);
  const byCell = new Map<string, GridCell>();
  for (const c of data.grid) byCell.set(`${c.stageOrdinal}#${c.strandId}`, c);
  const stageList = [...stages.entries()].sort((a, b) => a[0] - b[0]);

  const head = `<tr><th>Stage</th>${strandList.map(([, s]) => `<th title="${esc(s.name)}">${esc(s.code)}</th>`).join('')}</tr>`;
  const rows = stageList
    .map(([ord, label]) => {
      const cells = strandList
        .map(([sid]) => {
          const cell = byCell.get(`${ord}#${sid}`);
          if (!cell || cell.criteria === 0) return '<td class="prog-cell empty">·</td>';
          return `<td class="prog-cell" title="${cell.units} unit${cell.units === 1 ? '' : 's'}, ${cell.criteria} criteria">${cell.criteria}</td>`;
        })
        .join('');
      return `<tr><th class="prog-stage">${esc(label)}</th>${cells}</tr>`;
    })
    .join('');

  return `<section class="card">
    <p><a class="link" href="${paths.progression()}">← all schemes</a></p>
    <h1>${esc(data.schemeName)}</h1>
    <p class="muted">Stage × strand — each cell shows the number of “I can…” criteria (hover for units). Empty cells aren’t taught at that stage.</p>
    <table class="prog-grid">
      <thead>${head}</thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}
