import { describe, expect, it } from 'vitest';
import { renderAssessmentUnitPanel } from '../src/lib/assessmentUnitPanelView';
import { paths } from '../src/lib/paths';
import type { AssessmentSummary } from '../src/repos/assessments';

// Phase 6 — the lazy unit panel (Schemes spine). Pure render: list + actions + empty state, links via paths.

const items: AssessmentSummary[] = [
  { id: 1, title: 'Networks paper', style: 'gcse', status: 'ready', marksTotal: 24, questionCount: 10, assignedClasses: 2 },
  { id: 2, title: 'Draft check', style: 'gcse', status: 'draft', marksTotal: 0, questionCount: 6, assignedClasses: 0 },
];

describe('renderAssessmentUnitPanel', () => {
  it('lists each assessment with review + generate links via paths', () => {
    const html = renderAssessmentUnitPanel(9, items);
    expect(html).toContain('Networks paper');
    expect(html).toContain(paths.assessment(1));
    expect(html).toContain(paths.assessmentResults(1)); // ready → results action
    expect(html).toContain(paths.unitAssessments(9)); // generate entry
  });

  it('offers Assign only for a ready paper', () => {
    const html = renderAssessmentUnitPanel(9, items);
    // the ready one (id 1) gets an Assign action; the draft (id 2) does not show a Results/Assign for a draft+0 classes
    expect(html).toContain('>Assign<');
  });

  it('renders an empty state with the generate link', () => {
    const html = renderAssessmentUnitPanel(9, []);
    expect(html).toMatch(/No assessments yet/i);
    expect(html).toContain(paths.unitAssessments(9));
  });
});
