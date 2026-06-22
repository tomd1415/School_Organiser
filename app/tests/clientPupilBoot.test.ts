import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

// pupil.js is the most safety-critical client script (it buffers + autosaves pupil work). Like app.js it's
// one IIFE — a load-time throw would silently kill autosave/restore/slide-follow. Boot it in a real DOM on
// a representative pupil page and prove (a) no crash and (b) the slide deck still navigates locally.
function bootPupil() {
  const html = `<!doctype html><html><body data-shell="next" class="pupil-body">
    <main class="pupil-main" hx-headers='{"x-csrf-token":"t"}'>
      <section class="pupil-work-card">
        <input class="ws-input" name="value" hx-post="/me/answer?oc=11&amp;key=t1.r1.c2" aria-label="q1">
      </section>
      <section class="pupil-slides" data-deck="11" aria-label="Lesson slides">
        <div class="pslide-head"><span class="pslide-count">Slide <b class="pslide-n">1</b> / 2</span></div>
        <div class="pslide-stage">
          <div class="pslide on" data-slide="0">one</div>
          <div class="pslide" data-slide="1">two</div>
        </div>
        <div class="pslide-nav">
          <button class="pslide-prev">Back</button>
          <button class="pslide-next">Next</button>
        </div>
      </section>
    </main></body></html>`;
  const dom = new JSDOM(html, { url: 'http://localhost/me', pretendToBeVisual: true, runScripts: 'dangerously' });
  const { window } = dom;
  (window as any).fetch = () => Promise.resolve({ ok: true, status: 204, headers: { get: () => null }, text: () => Promise.resolve('') });
  // EventSource is intentionally absent → pupil.js must guard and skip the live-sync subscription.
  let loadError = '';
  window.onerror = (msg: any, _s: any, l: any) => { loadError = `${msg} @${l}`; return false; };
  const pupilJs = readFileSync(new URL('../public/pupil.js', import.meta.url), 'utf8');
  const s = window.document.createElement('script');
  s.textContent = pupilJs;
  window.document.body.appendChild(s);
  return { window, loadError: () => loadError };
}

describe('pupil.js boots on a pupil page (no load-time crash)', () => {
  it('loads without throwing (autosave/restore handlers attach)', () => {
    const { window, loadError } = bootPupil();
    expect(loadError()).toBe('');
    window.close();
  });

  it('the pupil slide deck navigates locally', () => {
    const { window } = bootPupil();
    const doc = window.document;
    const deck = doc.querySelector('.pupil-slides')!;
    const active = () => Array.from(deck.querySelectorAll('.pslide')).findIndex((s) => s.classList.contains('on'));
    expect(active()).toBe(0);
    (deck.querySelector('.pslide-next') as any).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(active()).toBe(1);
    window.close();
  });
});
