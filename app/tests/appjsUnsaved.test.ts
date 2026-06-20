/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

// Wave-0 HTMX harness: run the REAL public/app.js in jsdom and drive it with synthetic htmx events, so
// the "never lose work" banner logic (BUG-013 / BUG-033) is tested deterministically — no browser, no
// network, no flaky timing. app.js is an IIFE that wires listeners onto document.body at load; it
// null-checks every other feature's elements, so a minimal DOM is enough.
const APP_JS = readFileSync(join(__dirname, '..', 'public', 'app.js'), 'utf8');

function load(): void {
  // Fresh <body> each time so app.js's listeners don't accumulate across tests (its internal unsaved
  // state lives in the IIFE closure, so a fresh run = clean state).
  document.documentElement.innerHTML = '<head></head><body></body>';
  new Function(APP_JS)();
}

let nextId = 0;
function field(name?: string): HTMLInputElement {
  const el = document.createElement('input');
  el.setAttribute('name', name ?? `f${++nextId}`);
  document.body.appendChild(el);
  return el;
}
// htmx dispatches afterRequest on the triggering element; it bubbles to body where app.js listens.
function afterRequest(elt: Element, successful: boolean, verb = 'post'): void {
  elt.dispatchEvent(new CustomEvent('htmx:afterRequest', { bubbles: true, detail: { successful, elt, target: elt, requestConfig: { verb } } }));
}
// The server's HX-Trigger for a 200-swallowed server error, fired on <body>.
function saveFailed(): void {
  document.body.dispatchEvent(new CustomEvent('app:save-failed', { bubbles: true, detail: {} }));
}
const toast = (): HTMLElement | null => document.getElementById('hx-toast');
const shown = (): boolean => !!toast() && toast()!.classList.contains('show');
const text = (): string => toast()?.textContent ?? '';

describe('app.js unsaved-work banner (jsdom harness — BUG-013 / BUG-033)', () => {
  beforeEach(load);

  it('a failed WRITE raises the "not saved" banner', () => {
    afterRequest(field(), false, 'post');
    expect(shown()).toBe(true);
    expect(text()).toContain('Not saved');
  });

  it('a 200-swallowed server error (app:save-failed) is NOT cleared by the same request\'s success (BUG-013)', () => {
    const a = field('answer');
    saveFailed(); // HX-Trigger fires first…
    afterRequest(a, true, 'post'); // …then the same request's afterRequest reports the 200 as "successful"
    expect(shown()).toBe(true); // pre-fix this cleared the banner the server had just raised
  });

  it('an UNRELATED success does not wipe the warning; only the same operation\'s retry clears it (BUG-033)', () => {
    const a = field('field-a');
    const b = field('field-b');
    afterRequest(a, false, 'post');
    expect(shown()).toBe(true);
    afterRequest(b, true, 'post'); // a different field succeeding…
    expect(shown()).toBe(true); // …must NOT clear field A's unsaved warning
    afterRequest(a, true, 'post'); // field A retried and saved
    expect(shown()).toBe(false);
  });

  it('counts several outstanding fields and clears only when all are saved', () => {
    const a = field('a');
    const b = field('b');
    afterRequest(a, false, 'post');
    afterRequest(b, false, 'post');
    expect(text()).toContain('2 changes not saved');
    afterRequest(a, true, 'post');
    expect(shown()).toBe(true);
    expect(text()).toContain('Not saved'); // back to one
    afterRequest(b, true, 'post');
    expect(shown()).toBe(false);
  });

  it('a failed READ (search/poll) is not treated as unsaved work', () => {
    afterRequest(field('global-search'), false, 'get');
    expect(shown()).toBe(false);
  });

  it('a background poll succeeding does not clear a pending unsaved warning', () => {
    afterRequest(field('answer'), false, 'post');
    expect(shown()).toBe(true);
    afterRequest(field('now-clock'), true, 'get'); // the 30s poll completes…
    expect(shown()).toBe(true); // …the failed save is still unsaved
  });
});
