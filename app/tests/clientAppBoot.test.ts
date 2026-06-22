import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { renderLessonCockpit } from '../src/lib/lessonView';
import { layout } from '../src/lib/html';
import type { LessonDetail } from '../src/services/occurrence';

// app.js is one big IIFE: if anything throws at load, EVERY enhancement registered after that point dies
// silently (no test caught BUG: `row is not defined` at the a11y-rows loop crashed it on every authed page,
// killing slide Now/Next, the tracker tap, keyboard shortcuts, focus mode…). This boots app.js in a real
// DOM on the full rendered shell and proves (a) it loads clean and (b) the slide nav actually moves slides.
function bootCockpit() {
  const detail: LessonDetail = {
    header: { occurrenceId: 10, lessonId: 99, date: '2026-06-22', status: 'planned', purpose: 'teaching', periodLabel: 'P1', lessonIndex: 1, start: '09:00', end: '10:00', groupName: '8X', isSelf: true, staffName: 'Me', roomName: 'D3' },
    sections: [{ occurrenceCourseId: 11, groupCourseId: 21, courseId: 4, courseName: 'Computing', colour: null, stoppingPoint: null, progressStep: null, lastStop: null, lessonPlanId: 42, planTitle: 'T', planObjectives: 'O', planOutline: '1. A\n2. B', planKitNeeded: null }],
  };
  const slides = '## One\n\na\n\n---\n\n## Two\n\nb\n\n---\n\n## Three\n\nc';
  const body = renderLessonCockpit({
    detail, notes: [], prep: [], plansByCourse: new Map(), resByPlan: new Map(), matByPlan: new Map(),
    effByKey: new Map(), adaptedResByKey: new Map(), taFbByOc: new Map(), exceptionsHtml: '', csrf: 't',
    slidesByKey: new Map([['21:42', slides]]), pupilWorkByOc: new Map([[11, []]]),
  });
  // The full shell (rail + a11y rows + dialogs) — exactly what the browser receives on an authed page.
  const page = layout({ title: 'Lesson', body, authed: true, csrfToken: 'csrf-tok' });
  const dom = new JSDOM(page, { url: 'http://localhost/lesson', pretendToBeVisual: true, runScripts: 'dangerously' });
  const { window } = dom;
  (window as any).fetch = () => Promise.resolve({ ok: true, status: 204, headers: { get: () => null }, text: () => Promise.resolve('') });
  let loadError = '';
  window.onerror = (msg: any, _s: any, l: any) => { loadError = `${msg} @${l}`; return false; };
  const appJs = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const s = window.document.createElement('script');
  s.textContent = appJs;
  window.document.body.appendChild(s);
  return { window, loadError: () => loadError };
}

describe('app.js boots on the full authed page (no load-time crash)', () => {
  it('loads without throwing', () => {
    const { window, loadError } = bootCockpit();
    expect(loadError()).toBe('');
    window.close(); // stop app.js timers so the test process exits
  });

  it('slide Now/Next actually advances the cockpit deck', () => {
    const { window } = bootCockpit();
    const doc = window.document;
    const active = () => Array.from(doc.querySelectorAll('.slide-preview .pslide')).findIndex((s) => s.classList.contains('on'));
    expect(active()).toBe(0);
    doc.getElementById('slide-next-btn')!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(active()).toBe(1);
    doc.getElementById('slide-prev-btn')!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(active()).toBe(0);
    window.close();
  });
});
