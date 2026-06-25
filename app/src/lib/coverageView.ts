import { esc } from './html';
import { paths } from './paths';
import type { CoverageRow } from '../repos/specPoints';

// Coverage report (SPEC §9): the spec-point backbone for one course's active scheme, shown as cards per
// spec area with a % bar, each point row a status dot (✓ covered green · ○ gap red) · code (mono) · label
// · meta (the covering lesson ↗, or "not yet" in red). A filter (All · Covered · Gaps) hides covered/gap
// points and drops areas left empty. % = covered ÷ total. Read-only — mapping happens below on the page.
// (The data model is binary covered/not — the spec's amber "partial"/"today" states aren't tracked.)

export type CoverageFilter = 'all' | 'covered' | 'gaps';

function areaOf(p: CoverageRow): { key: string; label: string } {
  const hasCode = p.code && p.code !== p.title;
  if (hasCode && p.code.includes('.')) {
    const seg = p.code.split('.')[0]!;
    return { key: seg, label: `Area ${seg}` };
  }
  if (hasCode) return { key: p.code, label: `Area ${p.code}` };
  return { key: '~other', label: 'Other points' };
}

function renderPointRow(c: CoverageRow): string {
  const dot = c.covered
    ? '<span class="cov-dot cov-dot-ok" aria-label="covered">✓</span>'
    : '<span class="cov-dot cov-dot-gap" aria-label="gap">○</span>';
  const code = c.code && c.code !== c.title ? `<code class="cov-code">${esc(c.code)}</code>` : '';
  const meta = c.covered
    ? c.coveringPlanId != null
      ? `<a class="cov-by" href="${paths.lessonPreview(c.coveringPlanId)}" target="_blank" rel="noopener" title="open the lesson that covers this">${esc(c.coveringPlanTitle ?? 'covered')} ↗</a>`
      : '<span class="cov-by">covered</span>'
    : '<span class="cov-notyet">not yet</span>';
  return `<li class="cov-point cov-${c.covered ? 'ok' : 'gap'}">
    <span class="cov-pt-main">${dot}${code}<span class="cov-label">${esc(c.title)}</span></span>
    <span class="cov-pt-meta">${meta}</span>
  </li>`;
}

export interface CoverageReportData {
  courseId: number;
  scheme: { id: number; title: string; version: number } | null;
  coverage: CoverageRow[];
  filter: CoverageFilter;
}

export function renderCoverageReport(data: CoverageReportData): string {
  const { courseId, scheme, coverage, filter } = data;
  if (!scheme) {
    return `<div class="cov-report"><p class="muted">No active scheme of work for this course yet — create one on the <a href="${paths.schemesCourse(courseId)}">Schemes page</a>, then map its lessons here.</p></div>`;
  }

  const total = coverage.length;
  const coveredN = coverage.filter((c) => c.covered).length;
  const pct = total ? Math.round((coveredN / total) * 100) : 0;

  const chip = (f: CoverageFilter, label: string) =>
    `<a class="chip${filter === f ? ' active' : ''}" href="${paths.coverageFiltered(courseId, f)}">${label}</a>`;

  // Group points into spec areas, preserving first-seen order.
  const order: string[] = [];
  const byArea = new Map<string, { label: string; points: CoverageRow[] }>();
  for (const c of coverage) {
    const a = areaOf(c);
    if (!byArea.has(a.key)) {
      byArea.set(a.key, { label: a.label, points: [] });
      order.push(a.key);
    }
    byArea.get(a.key)!.points.push(c);
  }

  const visible = (c: CoverageRow) => (filter === 'all' ? true : filter === 'covered' ? c.covered : !c.covered);

  const cards = order
    .map((key) => {
      const area = byArea.get(key)!;
      const shown = area.points.filter(visible);
      if (!shown.length) return ''; // Gaps drops fully-covered areas; Covered drops all-gap areas.
      const aCov = area.points.filter((c) => c.covered).length;
      const aPct = Math.round((aCov / area.points.length) * 100);
      return `<section class="cov-area">
        <header class="cov-area-head">
          <h3>${esc(area.label)}</h3>
          <span class="cov-area-count">${aCov}/${area.points.length}</span>
          <span class="cov-bar"><span class="cov-bar-fill" style="width:${aPct}%"></span></span>
        </header>
        <ul class="cov-points-list">${shown.map(renderPointRow).join('')}</ul>
      </section>`;
    })
    .join('');

  const body = total
    ? cards || `<p class="muted">Nothing matches this filter.</p>`
    : `<p class="muted">No spec points yet — paste some below to start tracking coverage.</p>`;

  return `<div class="cov-report">
    <div class="cov-report-head">
      <h2>Coverage — ${esc(scheme.title)} <span class="muted">v${scheme.version}</span></h2>
      <div class="cov-overall"><span class="cov-bar cov-bar-lg"><span class="cov-bar-fill" style="width:${pct}%"></span></span><strong>${pct}%</strong> <span class="muted">${coveredN}/${total} covered</span></div>
    </div>
    <div class="cov-filter">${chip('all', 'All')}${chip('covered', 'Covered')}${chip('gaps', 'Gaps')}</div>
    ${body}
  </div>`;
}
