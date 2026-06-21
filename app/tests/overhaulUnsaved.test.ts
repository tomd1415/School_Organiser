/** @vitest-environment jsdom */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// BUG-063: the next-shell client (app-overhaul.js) is a SEPARATE bundle from app.js, so a fix to the
// shared "never lose work" contract can land in one and not the other — which is exactly how BUG-053
// (the per-element unsaved key) regressed. This runs the SAME jsdom harness as appjsUnsaved.test.ts
// against the overhaul bundle, so the contract is proven for both. (The overhaul bundle starts a clock
// setInterval at load; we stub it so the timer doesn't leak across re-loads.)
const APP_JS = readFileSync(join(__dirname, '..', 'public', 'app.js'), 'utf8');
const realSetInterval = globalThis.setInterval;

function load(): void {
  globalThis.setInterval = (() => 0) as unknown as typeof setInterval; // no clock timer during tests
  document.documentElement.innerHTML = '<head></head><body></body>';
  new Function(APP_JS)();
}
afterAll(() => { globalThis.setInterval = realSetInterval; });

let nextId = 0;
function field(name?: string): HTMLInputElement {
  const el = document.createElement('input');
  el.setAttribute('name', name ?? `f${++nextId}`);
  document.body.appendChild(el);
  return el;
}
function afterRequest(elt: Element, successful: boolean, verb = 'post'): void {
  elt.dispatchEvent(new CustomEvent('htmx:afterRequest', { bubbles: true, detail: { successful, elt, target: elt, requestConfig: { verb } } }));
}
function saveFailed(): void {
  document.body.dispatchEvent(new CustomEvent('app:save-failed', { bubbles: true, detail: {} }));
}
const shown = (): boolean => { const t = document.getElementById('hx-toast'); return !!t && t.classList.contains('show'); };
const text = (): string => document.getElementById('hx-toast')?.textContent ?? '';

describe('app-overhaul.js unsaved-work banner — parity with app.js (BUG-053 / BUG-063)', () => {
  beforeEach(load);

  it('a failed WRITE raises the "not saved" banner', () => {
    afterRequest(field(), false, 'post');
    expect(shown()).toBe(true);
    expect(text()).toContain('Not saved');
  });

  it('a genuine success clears its own field', () => {
    const a = field('value');
    afterRequest(a, false, 'post');
    expect(shown()).toBe(true);
    afterRequest(a, true, 'post');
    expect(shown()).toBe(false);
  });

  // The exact BUG-053 regression: many overhaul controls share name="value"; one's success must not
  // wipe another's "not saved" warning (the bundle used to key by name, so it did).
  it('two fields sharing a name do NOT clear each other\'s warning (BUG-053)', () => {
    const a = field('value');
    const b = field('value'); // same name as A
    afterRequest(a, false, 'post'); // A fails
    expect(shown()).toBe(true);
    afterRequest(b, true, 'post'); // a DIFFERENT same-named field saves OK…
    expect(shown()).toBe(true); // …must NOT clear A's warning
    afterRequest(a, true, 'post'); // A retried and saved
    expect(shown()).toBe(false);
  });

  it('an unrelated success does not wipe a pending warning', () => {
    const a = field('field-a');
    afterRequest(a, false, 'post');
    afterRequest(field('field-b'), true, 'post');
    expect(shown()).toBe(true);
  });

  it('a 200-swallowed server error (app:save-failed) is not cleared by the same request\'s success', () => {
    const a = field('answer');
    saveFailed();
    afterRequest(a, true, 'post');
    expect(shown()).toBe(true);
  });

  it('a failed READ (search/poll) is not treated as unsaved work', () => {
    afterRequest(field('global-search'), false, 'get');
    expect(shown()).toBe(false);
  });
});
