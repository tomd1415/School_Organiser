import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/guard';
import { appConfig } from '../config/app';
import { layout } from '../lib/html';
import { renderSlideDeck } from '../lib/meView';
import { renderWorksheet } from '../lib/worksheetForm';
import { renderTimelineCard } from '../lib/nowView';
import {
  GALLERY_LESSONS,
  GALLERY_NOW_STATE,
  GALLERY_PERIODS,
  SAMPLE_SLIDES_MD,
  SAMPLE_WORKSHEET_MD,
} from '../lib/uiFixtures';

// UI component gallery (Phase 1 of docs/UI_SEPARATION_PLAN.md): renders view functions with FIXTURE data so
// the UI can be redesigned + screenshot-tested in isolation from the back-end. Dev-only (off in production).
// Extend by importing more view fns + fixtures and adding an `item(...)` below.
export function registerUiGalleryRoutes(app: FastifyInstance): void {
  app.get('/ui-gallery', { preHandler: requireAuth }, async (_req, reply) => {
    if (appConfig.NODE_ENV === 'production') {
      return reply.code(404).type('text/html').send('<p>Not found.</p>');
    }

    const item = (title: string, note: string, html: string): string =>
      `<section class="gallery-item card">
        <div class="card-head"><div><p class="eyebrow">component</p><h2>${title}</h2></div></div>
        <p class="muted">${note}</p>
        <div class="gallery-stage">${html}</div>
      </section>`;

    const primitives = `
      <div class="card-head"><div><p class="eyebrow">eyebrow label</p><h2>Card header</h2></div><span class="badge good">badge · good</span></div>
      <p>Body text with an <a class="link">anchor link</a> and a <button type="button" class="link">button link</button>.</p>
      <p>
        <button type="button" class="button">button</button>
        <button type="button" class="button ghost">button ghost</button>
        <button type="button" class="button small">button small</button>
        <button type="button" class="btn-soft">btn-soft</button>
      </p>
      <p>
        <span class="badge">badge</span>
        <span class="badge ai">badge · ai</span>
        <span class="badge good">badge · good</span>
        <span class="badge warn">badge · warn</span>
      </p>`;

    const worksheetHtml = `<div class="ws-doc ws-doc-preview">${renderWorksheet(SAMPLE_WORKSHEET_MD, { mode: 'preview', level: 'core', autofill: { name: '(pupil’s name — auto)', date: '(today — auto)' } }).html}</div>`;

    const body = `<section class="card workspace-width">
      <div class="card-head"><div><p class="eyebrow">dev</p><h1>UI gallery</h1></div></div>
      <p class="muted">Every showcased view, rendered with fixture data — no DB, no live state. Redesign the
        UI (views + CSS + client JS) against this page in isolation from the back-end. See
        <code>docs/UI_SEPARATION_PLAN.md</code>.</p>
      ${item('Primitives', 'Shared chrome: card header (eyebrow + title + badge), buttons, links, badges.', primitives)}
      ${item('Slide deck', 'renderPslide via renderSlideDeck — one per-slide renderer shared by pupil / preview / presenter / board / cockpit (note the table + blockquote framing).', renderSlideDeck(SAMPLE_SLIDES_MD, 'gallery', 'core'))}
      ${item('Worksheet (read-only preview)', 'renderWorksheet, preview mode.', worksheetHtml)}
      ${item('Now — day timeline', 'renderTimelineCard with a fixed clock (P1 done · P2 active · P3 next).', renderTimelineCard(GALLERY_LESSONS, GALLERY_PERIODS, GALLERY_NOW_STATE, new Date('2026-06-23T10:05:00Z'), 'Europe/London'))}
    </section>`;

    return reply.type('text/html').send(layout({ title: 'UI gallery', body, authed: true, csrfToken: reply.generateCsrf() }));
  });
}
