import { describe, it, expect } from 'vitest';
import { buildSchemeTree, type PlanRow, type UnitRow, type SchemeHeader } from '../src/services/scheme';
import { renderPlan, renderSchemeTree, renderSchemesNext, renderClassesMatrix } from '../src/lib/schemeView';
import { GALLERY_SCHEME_MATRIX } from '../src/lib/uiFixtures';

const units: UnitRow[] = [
  { id: 2, title: 'B', displayOrder: 1 },
  { id: 1, title: 'A', displayOrder: 0 },
];
const plan = (id: number, unitId: number | null, title: string, displayOrder: number): PlanRow => ({
  id,
  unitId,
  title,
  objectives: null,
  outline: null,
  durationMin: null,
  displayOrder,
});
const plans: PlanRow[] = [plan(10, 1, 'A2', 1), plan(11, 1, 'A1', 0), plan(12, 2, 'B1', 0), plan(13, null, 'orphan', 0)];

describe('buildSchemeTree', () => {
  const tree = buildSchemeTree(units, plans);

  it('orders units by display order', () => {
    expect(tree.map((u) => u.title)).toEqual(['A', 'B']);
  });

  it('groups + orders plans under their unit', () => {
    expect(tree[0]?.plans.map((p) => p.title)).toEqual(['A1', 'A2']);
    expect(tree[1]?.plans.map((p) => p.title)).toEqual(['B1']);
  });

  it('drops plans with no unit', () => {
    expect(tree.flatMap((u) => u.plans).some((p) => p.title === 'orphan')).toBe(false);
  });
});

describe('renderPlan — Schemes card reuses the pupil preview (13.2)', () => {
  const p: PlanRow = { id: 42, unitId: 1, title: 'Binary', objectives: 'O', outline: 'L', durationMin: 50, displayOrder: 0, kitNeeded: null };
  const html = renderPlan(p, { open: true });

  it('offers "open as pupil" in a NEW TAB, in master mode (no class id)', () => {
    expect(html).toContain('/lesson/pupil-view?master=1&amp;lp=42');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
    expect(html).not.toContain('gc='); // master lesson has no class context
  });

  it('offers a read-only live lesson preview in a new tab', () => {
    expect(html).toContain('/lesson/preview?plan=42');
    expect(html).toContain('Preview live lesson');
    expect(html).toContain('without creating a lesson occurrence');
  });
});

const scheme: SchemeHeader = { id: 7, courseId: 3, courseName: 'Y9 Computing', title: 'Networks', version: 2, active: true, labels: null };

describe('renderSchemeTree — Spine lens (UI rebuild)', () => {
  const withObj = (id: number, unitId: number, planned: boolean): PlanRow => ({
    id, unitId, title: `L${id}`, objectives: planned ? 'O' : null, outline: planned ? 'L' : null, durationMin: 50, displayOrder: id, kitNeeded: null,
  });
  const tree = buildSchemeTree(
    [{ id: 1, title: 'Unit One', displayOrder: 0 }, { id: 2, title: 'Unit Two', displayOrder: 1 }],
    [withObj(10, 1, true), withObj(11, 1, false), withObj(12, 2, true)],
  );
  const html = renderSchemeTree(scheme, tree);

  it('renders the spine layout as #scheme-tree (preserving the swap target)', () => {
    expect(html).toContain('id="scheme-tree"');
    expect(html).toContain('class="sch-spine"');
  });

  it('shows a selectable unit button per unit, the first active', () => {
    expect(html).toContain('class="sch-unit-btn active" data-unit="1"');
    expect(html).toContain('data-unit="2"');
    expect(html).toContain('Unit One');
    expect(html).toContain('Unit Two');
  });

  it('shows the planned% bar (1 of 2 lessons planned in unit one = 50%)', () => {
    expect(html).toContain('50%');
    expect(html).toContain('width:50%');
  });

  it('renders one lesson panel per unit, all but the first hidden', () => {
    expect(html).toContain('class="sch-unit-panel" data-unit="1"');
    expect(html).toContain('class="sch-unit-panel" data-unit="2" hidden');
  });

  it('falls back to an add-unit empty state with no units', () => {
    const empty = renderSchemeTree(scheme, []);
    expect(empty).toContain('sch-tree-empty');
    expect(empty).toContain('No units yet');
  });
});

describe('renderSchemesNext — scheme meta header (UI rebuild)', () => {
  const html = renderSchemesNext({
    courseId: 3,
    currentCourseName: 'Y9 Computing',
    scheme,
    courses: [{ id: 3, name: 'Y9 Computing' }],
    versions: [{ id: 7, version: 2, active: true }, { id: 6, version: 1, active: false }],
    unitCount: 4,
    lessonCount: 18,
    treeHtml: '<div id="scheme-tree"></div>',
    teachingCtxHtml: '',
    allSchemesHtml: '',
    convertPanelHtml: '',
    csrf: 'tok',
  });

  it('renders the header card with the scheme title and real stats', () => {
    expect(html).toContain('class="card sch-header"');
    expect(html).toContain('Networks');
    expect(html).toContain('<span class="sch-stat-v">4</span>');  // units
    expect(html).toContain('<span class="sch-stat-v">18</span>'); // lessons
    expect(html).toContain('<span class="sch-stat-v">2</span>');  // versions
  });

  it('the lens toggle links to both Spine and Classes', () => {
    expect(html).toContain('lens=spine');
    expect(html).toContain('lens=classes');
  });
});

describe('renderClassesMatrix — Classes lens (UI rebuild)', () => {
  const html = renderClassesMatrix(GALLERY_SCHEME_MATRIX);

  it('renders a column per class and a row per lesson', () => {
    expect(html).toContain('class="sch-matrix"');
    expect(html).toContain('>9X<');
    expect(html).toContain('>9Y<');
    expect(html).toContain('>9Z<');
    expect(html).toContain('LANs and WANs');
  });

  it('classifies cells: taught (date) · today · planned · not-placed', () => {
    expect(html).toContain('sch-mx-taught'); // 1:10 in the past
    expect(html).toContain('>today<'); // 1:11 == 2026-06-23
    expect(html).toContain('sch-mx-today');
    expect(html).toContain('sch-mx-planned'); // 2:11 future
    expect(html).toContain('sch-mx-na'); // e.g. 3:11 not placed
    expect(html).toContain('9 Jun'); // 1:10 date formatted
  });

  it('marks an adapted placement with △', () => {
    expect(html).toContain('sch-mx-adapt'); // 2:10 adapted
  });

  it('falls back to a message when no classes are timetabled', () => {
    const empty = renderClassesMatrix({ classes: [], units: [], placements: {}, today: '2026-06-23' });
    expect(empty).toContain('No classes are timetabled');
  });
});
