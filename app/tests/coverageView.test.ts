import { describe, expect, it } from 'vitest';
import { renderCoverageReport } from '../src/lib/coverageView';
import { GALLERY_COVERAGE } from '../src/lib/uiFixtures';

// Coverage report (SPEC §9): spec-area cards + % bars + status-dot point rows, filterable. DB-free.

describe('renderCoverageReport', () => {
  it('shows the no-scheme message when there is no active scheme', () => {
    const html = renderCoverageReport({ courseId: 2, scheme: null, coverage: [], filter: 'all' });
    expect(html).toContain('No active scheme');
    expect(html).toContain('/schemes?course=2');
  });

  it('groups points into spec areas with per-area + overall % (3 of 6 covered = 50%)', () => {
    const html = renderCoverageReport(GALLERY_COVERAGE);
    expect(html).toContain('Area 1');
    expect(html).toContain('Area 2');
    expect(html).toContain('50%'); // overall 3/6 covered
    expect(html).toContain('cov-bar-fill');
  });

  it('covered points link to the covering lesson; gaps read "not yet"', () => {
    const html = renderCoverageReport(GALLERY_COVERAGE);
    expect(html).toContain('/lesson/preview?plan=81');
    expect(html).toContain('Inside the CPU');
    expect(html).toContain('not yet');
    expect(html).toContain('cov-dot-ok');
    expect(html).toContain('cov-dot-gap');
  });

  it('filter chips link to each filter with the active one marked', () => {
    const html = renderCoverageReport({ ...GALLERY_COVERAGE, filter: 'gaps' });
    expect(html).toContain('/coverage?course=2&amp;cov=covered');
    expect(html).toMatch(/class="chip active"[^>]*href="\/coverage\?course=2&amp;cov=gaps"/);
  });

  it('Gaps filter hides covered points and drops fully-covered areas', () => {
    const html = renderCoverageReport({ ...GALLERY_COVERAGE, filter: 'gaps' });
    // Area 2 is all gaps → shown; its covered-only siblings in Area 1 are hidden
    expect(html).toContain('Network topologies'); // a gap
    expect(html).not.toContain('Von Neumann architecture'); // covered → hidden under Gaps
  });
});
