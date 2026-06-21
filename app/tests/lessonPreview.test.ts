import { describe, expect, it } from 'vitest';
import { renderBoardNext, renderLessonCockpit } from '../src/lib/lessonView';
import type { LessonDetail } from '../src/services/occurrence';

const detail: LessonDetail = {
  header: {
    occurrenceId: 0,
    lessonId: 0,
    date: '',
    status: 'preview',
    purpose: 'preview',
    periodLabel: 'Computing',
    lessonIndex: null,
    start: '',
    end: '',
    groupName: 'Binary addition',
    isSelf: true,
    staffName: 'Preview',
    roomName: 'Data representation',
  },
  sections: [{
    occurrenceCourseId: 0,
    groupCourseId: 0,
    courseId: 4,
    courseName: 'Computing',
    colour: null,
    stoppingPoint: null,
    progressStep: null,
    lastStop: null,
    lessonPlanId: 42,
    planTitle: 'Binary addition',
    planObjectives: 'Add two binary numbers',
    planOutline: 'Retrieval starter\nModel an example\nIndependent work\nReview',
    planKitNeeded: null,
  }],
};

function renderPreview(): string {
  return renderLessonCockpit({
    detail,
    notes: [],
    prep: [],
    plansByCourse: new Map(),
    resByPlan: new Map(),
    matByPlan: new Map(),
    effByKey: new Map(),
    adaptedResByKey: new Map(),
    taFbByOc: new Map(),
    exceptionsHtml: '',
    csrf: 'test-token',
    slidesByKey: new Map([['0:42', '## Explain **carries**\n\nUse `place value` carefully.\n\n- Add from the **right**\n\n> Remember: 1 + 1 = 10\n\n> 🧑‍🏫 Model slowly']]),
    pupilWorkByOc: new Map(),
    preview: { backHref: '/schemes?course=4&scheme=7' },
  });
}

describe('read-only live lesson preview', () => {
  const html = renderPreview();

  it('shows the real cockpit content and an explicit preview state', () => {
    expect(html).toContain('Lesson preview · not live');
    expect(html).toContain('Binary addition');
    expect(html).toContain('Independent work');
    expect(html).toContain('Explain carries');
    expect(html).toContain('No lesson occurrence or pupil record is created');
  });

  it('renders slide Markdown instead of displaying its source markers', () => {
    expect(html).toContain('<h2>Explain <strong>carries</strong></h2>');
    expect(html).toContain('<code>place value</code>');
    expect(html).toContain('<li>Add from the <strong>right</strong></li>');
    expect(html).toContain('<blockquote><p>Remember: 1 + 1 = 10</p></blockquote>');
    expect(html).not.toContain('## Explain');
  });

  it('opens the master board and returns to the originating scheme', () => {
    expect(html).toContain('/lesson/pupil-view?master=1&amp;lp=42&amp;level=core');
    expect(html).toContain('/schemes?course=4&amp;scheme=7');
  });

  it('contains no occurrence mutation or live pupil-data requests', () => {
    expect(html).not.toContain('hx-post=');
    expect(html).not.toContain('/lesson/oc/0/');
    expect(html).not.toContain('/occurrence-course/0/');
    expect(html).not.toContain('groups-dialog');
  });
});

describe('split-lesson section switcher (BUG-052)', () => {
  const split: LessonDetail = {
    header: { ...detail.header, lessonId: 9, date: '2026-06-22', occurrenceId: 5, status: 'live', purpose: 'lesson', groupName: 'Split slot' },
    sections: [
      { ...detail.sections[0]!, occurrenceCourseId: 11, groupCourseId: 21, courseName: 'Computing', lessonPlanId: 42, planOutline: 'CS starter\nCS independent work' },
      { ...detail.sections[0]!, occurrenceCourseId: 12, groupCourseId: 22, courseName: 'Engineering', lessonPlanId: 43, planOutline: 'Eng starter\nEng build task' },
    ],
  };
  const base = {
    notes: [], prep: [], plansByCourse: new Map(), resByPlan: new Map(), matByPlan: new Map(),
    effByKey: new Map(), adaptedResByKey: new Map(), taFbByOc: new Map(), exceptionsHtml: '', csrf: 't',
    slidesByKey: new Map([['21:42', '## CS deck slide'], ['22:43', '## Eng deck slide']]),
    pupilWorkByOc: new Map(),
  };

  it('renders a course tab per section linking to each occurrence-course', () => {
    const html = renderLessonCockpit({ detail: split, ...base });
    expect(html).toContain('cockpit-course-tabs');
    expect(html).toContain('Computing');
    expect(html).toContain('Engineering');
    expect(html).toContain('oc=11');
    expect(html).toContain('oc=12');
  });

  it('defaults to the first section', () => {
    const html = renderLessonCockpit({ detail: split, ...base });
    expect(html).toContain('CS deck slide'); // section 1 slides (keyed 21:42)
    expect(html).toContain('CS independent work'); // section 1 outline
    expect(html).not.toContain('Eng build task'); // section 2 hidden
  });

  it('shows the section the oc param selects, with its tab active and the right deck', () => {
    const html = renderLessonCockpit({ detail: split, ...base, selectedOc: 12 });
    expect(html).toContain('Eng deck slide'); // section 2 slides (keyed 22:43 — no collision with 42)
    expect(html).toContain('Eng build task');
    expect(html).not.toContain('CS independent work');
    expect(html).toContain('class="course-tab active" aria-current="page" href="/lesson?lesson=9&amp;date=2026-06-22&amp;oc=12"');
  });

  it('falls back to the first section when oc is unknown', () => {
    const html = renderLessonCockpit({ detail: split, ...base, selectedOc: 999 });
    expect(html).toContain('CS independent work');
  });
});

describe('next-shell board Markdown', () => {
  const html = renderBoardNext({
    master: { title: 'Binary addition' },
    className: 'Master lesson preview',
    slidesMd: '## Worked **example**\n\nStart with `101`.\n\n- Add from the right\n\n> Check the carry\n\n> 🖼️ [show: binary addition worked example]\n\n> 🧑‍🏫 Secret teacher prompt',
    level: 'core',
    lp: 42,
    gcKey: 0,
  });

  it('uses valid rendered Markdown and retains pupil-facing callouts', () => {
    expect(html).toContain('Worked example');
    expect(html).toContain('<code>101</code>');
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>Add from the right</li>');
    expect(html).toContain('<blockquote><p>Check the carry</p></blockquote>');
    expect(html).not.toContain('<ul><p>');
    expect(html).not.toContain('## Worked');
    expect(html).not.toContain('[show:');
  });

  it('does not expose private teacher notes on the board', () => {
    expect(html).not.toContain('Secret teacher prompt');
    expect(html).not.toContain('🧑‍🏫');
    expect(html).not.toContain('binary addition worked example');
  });
});
