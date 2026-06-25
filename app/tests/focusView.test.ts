import { describe, it, expect } from 'vitest';
import { renderFocusInner, renderSubStep, type FocusVM } from '../src/lib/focusView';

// Focus (SPEC §5) render: the picked-task card, the wind-down banner, and the 3-mode segmented control.
// URLs must go through paths.ts (the pathsGuard enforces no raw literals in the view).
const base: FocusVM = { mode: 'free_period', pollUrl: '/focus/inner?sig=x', picked: null, windowMinutes: 30, hidden: 0, subStepsHtml: '' };

describe('focusView — renderFocusInner', () => {
  it('renders the picked task as a focus card: title, caption, steps, break-down + Done & next', () => {
    const html = renderFocusInner({
      ...base,
      picked: { id: 7, title: 'Mark 9X books', urgency: 'by_next_lesson', estimateMin: 25, cognitiveLoad: 'medium' },
      hidden: 3,
      subStepsHtml: renderSubStep({ id: 1, title: 'Mark the first ten', done: false }),
    });
    expect(html).toContain('class="focus-card"');
    expect(html).toContain('Mark 9X books');
    expect(html).toContain('Done &amp; next');
    expect(html).toContain('hx-post="/focus/7/done"'); // via paths.focusDone
    expect(html).toContain('hx-post="/focus/7/breakdown"'); // via paths.focusBreakdown
    expect(html).toContain('Mark the first ten'); // the step
    expect(html).toContain('window'); // caption shows the ~N min window
    expect(html).toContain('25 min'); // and the estimate
    expect(html).toContain('3 other tasks hidden');
  });

  it('shows the green "you\'re done" wind-down banner when nothing is picked at end of day', () => {
    const html = renderFocusInner({ ...base, mode: 'end_of_day', picked: null });
    expect(html).toContain("You're done");
    expect(html).toContain('focus-clear');
    expect(html).not.toContain('class="focus-card"');
  });

  it('renders the 3-mode segmented control, marking the active mode', () => {
    const html = renderFocusInner({ ...base, mode: 'morning' });
    expect(html).toContain('focus-modes');
    expect(html).toContain('href="/focus?mode=morning"'); // via paths.focusMode
    expect(html).toContain('href="/focus?mode=end_of_day"');
    expect(html).toMatch(/href="\/focus\?mode=morning" class="seg-tab is-on"/); // active
  });

  it('renderSubStep toggles via paths.focusSubstepToggle and reflects done state', () => {
    expect(renderSubStep({ id: 5, title: 'x', done: true })).toContain('hx-post="/focus/substep/5/toggle"');
    expect(renderSubStep({ id: 5, title: 'x', done: true })).toContain('class="fu done"');
    expect(renderSubStep({ id: 5, title: 'x', done: false })).toContain('class="fu"');
  });
});
