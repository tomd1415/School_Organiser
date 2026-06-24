import { describe, expect, it } from 'vitest';
import {
  renderReview,
  renderClassCompare,
  renderConvertDup,
  renderPlan,
  renderLayForm,
  renderSchemeTree,
  renderConvertPanel,
  renderSchemeEmpty,
  renderSchemeLabels,
  renderSchemeControls,
  renderAllSchemes,
  renderTeachingContext,
  renderSchemesNext,
} from '../src/lib/schemeView';
import type { PlanRow, SchemeHeader, UnitWithPlans } from '../src/services/scheme';
import type { SchemeListRow } from '../src/repos/schemes';
import type { CourseSlot } from '../src/repos/delivery';
import type { ReviewRow } from '../src/repos/reviews';
import type { PlanAdaptation } from '../src/repos/adaptations';

// Oracle test for the Schemes view's route URLs (docs/UI_SEPARATION_PLAN.md Phase 2). schemeView.ts is the
// largest URL family (~46 sites) and is now fully on paths.ts. We render every scheme render fn with a
// fixture and concatenate the output, then assert the EXACT rendered URLs as hard-coded literals — caught
// here even though pathsGuard.test.ts only proves the literals are gone from the view source. IDs are
// distinct per entity (review 5, plan 42, unit 4, scheme 11, course 7) so each assertion is unambiguous.

const PLAN: PlanRow = {
  id: 42,
  unitId: 4,
  title: 'Binary',
  objectives: 'O',
  outline: 'L',
  durationMin: 50,
  displayOrder: 0,
  kitNeeded: null,
};

const REVIEW: ReviewRow = {
  id: 5,
  lessonPlanId: 9,
  groupCourseId: null,
  verdict: 'tweak', // not 'keep' + has a suggestion ⇒ the "Apply to master" button renders
  findings: [{ issue: 'i', fix: 'f' }],
  suggestedObjectives: 'obj',
  suggestedOutline: 'out',
  rationale: 'r',
  model: null,
  promptVersion: null,
  status: 'open',
  createdAt: '2026-06-24 09:00',
};

const ADAPTATION: PlanAdaptation = {
  groupCourseId: 3,
  groupName: '7A',
  objectives: 'class obj',
  outline: 'class out',
  adaptationNote: null,
  updatedAt: '2026-06-24',
};

const SCHEME: SchemeHeader = {
  id: 11,
  courseId: 7,
  courseName: 'Computing 7',
  title: 'KS3 Computing',
  version: 2,
  active: false, // draft ⇒ the "Make live" (activate) button renders
  labels: 'Year 7',
};

const UNIT: UnitWithPlans = { id: 4, title: 'Networks', displayOrder: 0, plans: [PLAN] };

const SLOT: CourseSlot = {
  lessonId: 1,
  groupCourseId: 3,
  groupName: '7A',
  weekday: 1,
  slotOrder: 0,
  periodLabel: 'P1',
  start: '09:00',
};

const SCHEME_LIST: SchemeListRow = {
  id: 11,
  courseId: 7,
  courseName: 'Computing 7',
  title: 'KS3 Computing',
  version: 2,
  active: true,
  labels: 'Year 7',
  units: 3,
  plans: 12,
};

const COURSES = [
  { id: 7, name: 'Computing 7' },
  { id: 8, name: 'Computing 8' },
];

// Concatenate every scheme render fn's output so one assertion list can sweep all of them.
const html = [
  renderReview(REVIEW),
  renderClassCompare(PLAN, [ADAPTATION]),
  renderConvertDup(7, 'year_7', '', '', ['Existing unit']),
  renderPlan(PLAN, { open: true, reviewOpen: true }),
  renderSchemeTree(SCHEME, [UNIT]),
  renderLayForm(4, [SLOT], 3, '2026-09-01'),
  renderConvertPanel(7, [SLOT], '2026-09-01'),
  renderSchemeEmpty(7),
  renderSchemeLabels(11, 'Year 7'),
  renderSchemeControls(SCHEME, COURSES),
  renderAllSchemes([SCHEME_LIST], 11),
  renderTeachingContext(7, 'cohort prose'),
  renderSchemesNext({
    courseId: 7,
    currentCourseName: 'Computing 7',
    scheme: { id: 11, title: 'KS3 Computing', version: 2, active: false },
    courses: COURSES,
    versions: [{ id: 11, version: 2, active: false }],
    treeHtml: '',
    teachingCtxHtml: '',
    allSchemesHtml: '',
    convertPanelHtml: '',
    csrf: 'csrf-token',
  }),
].join('\n');

describe('schemeView route URLs (oracle)', () => {
  it.each([
    // advisory-review cards
    'hx-post="/schemes/review/5/apply"',
    'hx-post="/schemes/review/5/dismiss"',
    // cross-group compare reuses the lesson apply-improvement route
    'hx-post="/lesson/plan/42/apply-improvement"',
    // plan-scoped
    'hx-post="/schemes/plan/42"',
    'hx-post="/schemes/plan/42/draft"',
    'hx-post="/schemes/plan/42/resources-ai"',
    'hx-post="/schemes/plan/42/review-ai"',
    'hx-get="/schemes/plan/42/review"',
    'hx-get="/schemes/plan/42/resources"',
    'hx-get="/schemes/plan/42/compare"',
    // plan preview links (master mode, no class id) — query strings use &amp;
    'href="/lesson/preview?plan=42"',
    'href="/test-lab/plan/42"',
    'href="/lesson/pupil-preview?master=1&amp;lp=42&amp;level=core"',
    'href="/lesson/pupil-view?master=1&amp;lp=42&amp;level=core"',
    // tree-row controls (unit + plan)
    'hx-post="/schemes/unit/4/move/up"',
    'hx-post="/schemes/unit/4/move/down"',
    'hx-post="/schemes/unit/4/delete"',
    'hx-post="/schemes/plan/42/move/up"',
    'hx-post="/schemes/plan/42/move/down"',
    'hx-post="/schemes/plan/42/delete"',
    // unit-scoped
    'hx-post="/schemes/unit/4"',
    'hx-post="/schemes/unit/4/plan"',
    'hx-post="/schemes/unit/4/resources-ai"',
    'hx-post="/schemes/unit/4/review-ai"',
    'hx-post="/schemes/unit/4/review-sequence"',
    'hx-get="/schemes/unit/4/lay-form"',
    'hx-post="/schemes/unit/4/lay-down"',
    // scheme-scoped (header row)
    'hx-post="/schemes/11/unit"',
    'hx-post="/schemes/11/labels"',
    'hx-post="/schemes/11/move-course"',
    'hx-post="/schemes/11/delete"',
    'hx-post="/schemes/11/activate"',
    'hx-post="/schemes/11/version"',
    'href="/schemes/11/export"',
    // course-scoped
    'hx-post="/schemes/course/7/convert"',
    'hx-get="/schemes/course/7/convert-panel"',
    'hx-get="/schemes/course/7/convert-search"',
    'hx-post="/schemes/course/7/summary"',
    'hx-post="/schemes/course/7/context"',
    'href="/schemes?course=7&amp;scheme=11"',
    // top-level
    'hx-post="/schemes/author?course=7"',
    'hx-post="/schemes/create?course=7"',
    'hx-post="/schemes/spot-check"',
    'hx-post="/schemes/import"',
    'href="/schemes?course=7"', // course tab
    'href="/pedagogy"',
    'hx-get="/kit/panel"',
  ])('emits %s', (snippet) => {
    expect(html).toContain(snippet);
  });
});
