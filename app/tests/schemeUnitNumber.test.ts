import { describe, expect, it } from 'vitest';
import { renderSchemeTree } from '../src/lib/schemeView';
import type { PlanRow, SchemeHeader, UnitWithPlans } from '../src/services/scheme';

// Regression for docs/noted_bugs.md #3 (unit title prefixed with the unit number) and #2 (the unit
// navigator is its own scroll region). The number is PRESENTATION — it must NOT be folded into the
// editable title <input value>, and it must track position (so unit 2 shows "Unit 2"), not the DB id.

const PLAN: PlanRow = { id: 42, unitId: 4, title: 'Binary', objectives: 'O', outline: 'L', durationMin: 50, displayOrder: 0, kitNeeded: null };
const SCHEME: SchemeHeader = { id: 11, courseId: 7, courseName: 'Computing 7', title: 'KS3 Computing', version: 2, active: true, labels: null };
const UNIT_A: UnitWithPlans = { id: 40, title: 'Networks', displayOrder: 0, plans: [PLAN] };
const UNIT_B: UnitWithPlans = { id: 9, title: 'Programming', displayOrder: 1, plans: [PLAN] }; // smaller id, later position

describe('scheme view — unit numbering (#3) + navigator scroll (#2)', () => {
  const html = renderSchemeTree(SCHEME, [UNIT_A, UNIT_B]);

  it('shows a "Unit N" badge by POSITION, not by id', () => {
    expect(html).toContain('<span class="unit-num" title="Unit number (position in the scheme)">Unit 1</span>');
    expect(html).toContain('<span class="unit-num" title="Unit number (position in the scheme)">Unit 2</span>');
    // the navigator spine also gets the "1." / "2." prefix
    expect(html).toContain('<span class="sch-unit-num">1.</span>');
    expect(html).toContain('<span class="sch-unit-num">2.</span>');
  });

  it('does NOT bake the number into the editable title value', () => {
    // the input still carries the raw stored title — saving it back must not persist a number
    expect(html).toContain('class="unit-title" type="text" name="title" value="Networks"');
    expect(html).toContain('value="Programming"');
    expect(html).not.toContain('value="Unit 1 Networks"');
    expect(html).not.toContain('value="1. Networks"');
  });

  it('renders the unit navigator container (the #2 scroll region)', () => {
    expect(html).toContain('class="sch-units"');
  });
});
