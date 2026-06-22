import { describe, expect, it } from 'vitest';
import { renderLessonCockpit } from '../src/lib/lessonView';
import type { LessonDetail } from '../src/services/occurrence';

// The cockpit was a from-scratch rewrite that dropped ~16 affordances the classic lesson screen had.
// This pins the restored set so a future cockpit edit can't silently drop them again. Rendered in LIVE
// mode (no `preview`) — the affordances are gated on !isPreview, so the preview test can't cover them.
const detail: LessonDetail = {
  header: {
    occurrenceId: 10, lessonId: 99, date: '2026-06-22', status: 'planned', purpose: 'teaching',
    periodLabel: 'P1', lessonIndex: 1, start: '09:00', end: '10:00', groupName: '8X/Cm', isSelf: true,
    staffName: 'Me', roomName: 'D3',
  },
  sections: [{
    occurrenceCourseId: 11, groupCourseId: 21, courseId: 4, courseName: 'Computing', colour: null,
    stoppingPoint: null, progressStep: null, lastStop: { stoppingPoint: 'Model an example', date: '2026-06-15' },
    lessonPlanId: 42, planTitle: 'Binary addition', planObjectives: 'Add two binary numbers confidently',
    planOutline: '1. Retrieval starter\n2. Model an example\n3. Independent work\n4. Review',
    planKitNeeded: '16× micro:bit',
  }],
};

const html = renderLessonCockpit({
  detail,
  notes: [{ id: 5, body: 'Watch group B', time: '10:05', category: 'support', safeguarding: false, followups: [] }] as any,
  prep: [],
  plansByCourse: new Map([[21, [{ id: 42, title: 'Binary addition' }, { id: 43, title: 'Hexadecimal' }]]]),
  resByPlan: new Map(),
  matByPlan: new Map(),
  effByKey: new Map(),
  adaptedResByKey: new Map(),
  taFbByOc: new Map([[11, [{ id: 1, pupilsText: 'Asha', lessonText: 'finished early — needs extension', safeguarding: false, createdAt: 'today' }]]]),
  exceptionsHtml: '',
  csrf: 'test-token',
  slidesByKey: new Map([['21:42', '## Slide one\n\nbody']]),
  pupilWorkByOc: new Map([[11, []]]),
});

describe('lesson cockpit feature parity (restored affordances)', () => {
  it('#2 the lesson-flow tracker is tappable and records progress', () => {
    expect(html).toContain('class="step seq-mark"');
    expect(html).toContain('/occurrence-course/11/progress');
    expect(html).toContain('Independent work'); // outline parsed into steps
  });
  it('the stopping-point box is present and not hidden behind the old dead button', () => {
    expect(html).toContain('/occurrence-course/11/stopping');
    expect(html).not.toContain('id="stopping-point-trigger-btn"'); // the old no-op button is gone
  });
  it('shows objectives, kit, and the "Last time" resume hint', () => {
    expect(html).toContain('Add two binary numbers confidently');
    expect(html).toContain('16× micro:bit');
    expect(html).toContain('Last time → stopped at');
  });
  it('has the plan selector + prep checklist + TA-feedback card', () => {
    expect(html).toContain('name="lesson_plan_id"');
    expect(html).toContain('/occurrence-course/11/plan');
    expect(html).toContain('Prep checklist');
    expect(html).toContain('/prep/add');
    expect(html).toContain('TA feedback');
    expect(html).toContain('finished early — needs extension');
  });
  it('has presenter + print links', () => {
    expect(html).toContain('/lesson/present?gc=21');
    expect(html).toContain('/lesson/print?lesson=99');
  });
  it('has the plan-tools card: quick-peek, test-as-pupil, cover-pack, group-context, slots', () => {
    expect(html).toContain('/lesson/worksheet-preview?gc=21');
    expect(html).toContain('/test-pupil/open');
    expect(html).toContain('/lesson/oc/11/cover-pack');
    expect(html).toContain('/lesson/group-context/21');
    expect(html).toContain('/lesson/oc/11/image-todo');
    expect(html).toContain('/lesson/oc/11/spaced-recall');
    expect(html).toContain('/lesson/plan/42/review-flag');
  });
  it('notes are manageable (delete + add follow-up)', () => {
    expect(html).toContain('/notes/5/delete');
    expect(html).toContain('/notes/5/followups');
  });
  it('the slides card carries the live-sync hooks (data-oc + lock toggle)', () => {
    expect(html).toContain('data-oc="11"');
    expect(html).toContain('id="slide-lock-btn"');
  });
});
