import { describe, it, expect } from 'vitest';
import { nextShell, layout } from '../src/lib/html';

// Width-intent contract (docs/UI_SEPARATION_PLAN.md Phase 4): the page's content-column width is set ONCE
// by the shell from a view-declared hint, applied as `cockpit-w-{intent}` on <main>. This beats the legacy
// per-component width rules, so a redesigned view never has to be enrolled in a class list to get its
// width. These assertions pin the mechanism; the intent CSS itself lives in styles.css.
describe('shell width intent', () => {
  it('applies the cockpit-w-{intent} modifier to <main> when width is declared', () => {
    expect(nextShell({ title: 'T', body: '<x></x>', width: 'wide' })).toContain('class="cockpit-workspace cockpit-w-wide"');
    expect(nextShell({ title: 'T', body: '<x></x>', width: 'reading' })).toContain('cockpit-w-reading');
    expect(nextShell({ title: 'T', body: '<x></x>', width: 'full' })).toContain('cockpit-w-full');
    // layout() is the public wrapper and must forward the intent.
    expect(layout({ title: 'T', body: '<x></x>', width: 'working' })).toContain('cockpit-w-working');
  });

  it('omits the modifier when no width is declared (legacy component-class rules still apply)', () => {
    const html = nextShell({ title: 'T', body: '<x></x>' });
    expect(html).toContain('class="cockpit-workspace"');
    expect(html).not.toContain('cockpit-w-');
  });
});
