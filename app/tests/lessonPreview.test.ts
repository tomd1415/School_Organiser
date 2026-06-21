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
    slidesByPlan: new Map([[42, '## Explain **carries**\n\nUse `place value` carefully.\n\n- Add from the **right**\n\n> Remember: 1 + 1 = 10\n\n> 🧑‍🏫 Model slowly']]),
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
