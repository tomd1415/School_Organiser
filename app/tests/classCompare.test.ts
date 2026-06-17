import { describe, it, expect } from 'vitest';
import { renderClassCompare } from '../src/lib/schemeView';
import type { PlanRow } from '../src/services/scheme';
import type { PlanAdaptation } from '../src/repos/adaptations';

const PLAN: PlanRow = {
  id: 7,
  unitId: 1,
  title: 'Binary',
  objectives: 'Convert denary to binary',
  outline: '1. Recap place value\n2. Practise',
  durationMin: 60,
  displayOrder: 0,
  kitNeeded: null,
};

describe('renderClassCompare (C2 cross-group compare)', () => {
  it('no adaptations ⇒ a calm "nobody has their own version yet" message, no promote form', () => {
    const html = renderClassCompare(PLAN, []);
    expect(html).toContain('No class has its own version');
    expect(html).not.toContain('apply-improvement');
  });

  it('shows the master beside each class, marks inherited fields, and promotes the EFFECTIVE version', () => {
    const adaptations: PlanAdaptation[] = [
      { groupCourseId: 42, groupName: '7ARO', objectives: 'Convert small numbers to binary', outline: null, adaptationNote: 'shorter, more scaffolding', updatedAt: '2026-06-17' },
    ];
    const html = renderClassCompare(PLAN, adaptations);
    // master column + the class column
    expect(html).toContain('cc-master');
    expect(html).toContain('7ARO');
    expect(html).toContain('shorter, more scaffolding');
    // the class overrode objectives but inherits the master outline — that's labelled
    expect(html).toContain('Convert small numbers to binary');
    expect(html).toContain('inherits master');
    // promote reuses the 5.5b apply-improvement route and carries the effective content (overridden
    // objectives + the inherited master outline) so the master gets a complete lesson
    expect(html).toContain('hx-post="/lesson/plan/7/apply-improvement"');
    expect(html).toContain('Convert small numbers to binary'); // effective objectives
    expect(html).toContain('Recap place value'); // inherited master outline goes too
  });
});
