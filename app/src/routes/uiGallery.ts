import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/guard';
import { appConfig } from '../config/app';
import { layout } from '../lib/html';
import { renderSlideDeck } from '../lib/meView';
import { renderWorksheet } from '../lib/worksheetForm';
import { renderTimelineCard } from '../lib/nowView';
import { renderToggle } from '../lib/components';
import { renderCaptureBar, renderCapturedChips, renderCapturedList } from '../lib/capturedView';
import { renderNotesSearch, renderNotesChips, renderNotesGrid } from '../lib/notesView';
import { renderEventsGrouped } from '../lib/eventView';
import { renderTaskList } from '../lib/taskView';
import {
  GALLERY_LESSONS,
  GALLERY_NOW_STATE,
  GALLERY_PERIODS,
  SAMPLE_SLIDES_MD,
  SAMPLE_WORKSHEET_MD,
  GALLERY_CAPTURED,
  GALLERY_CAPTURED_COUNTS,
  GALLERY_GROUPS,
  GALLERY_NOTES,
  GALLERY_NOTES_COUNTS,
  GALLERY_EVENTS,
  GALLERY_EVENTS_TODAY,
  GALLERY_TASKS,
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

    // The shared component vocabulary for the Rail & Stage rebuild (docs/new-ui). Build screens from these.
    const kitRow = (cap: string, html: string): string =>
      `<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">
        <span style="min-width:150px;color:var(--quiet);font-size:12px;text-transform:uppercase;letter-spacing:.5px">${cap}</span>${html}</div>`;
    const componentKit = `
      ${kitRow('Badges (category tones)', `
        <span class="badge live">Logistics</span>
        <span class="badge warn">Pupil</span>
        <span class="badge">Admin</span>
        <span class="badge good">Curriculum</span>
        <span class="badge red">⚑ Safeguarding</span>
        <span class="badge ai">AI</span>`)}
      ${kitRow('Filter chips + count', `
        <span class="chip active">All <span class="chip-count">12</span></span>
        <span class="chip">Logistics <span class="chip-count">4</span></span>
        <span class="chip">Pupil <span class="chip-count">3</span></span>`)}
      ${kitRow('Segmented tabs', `
        <span class="ws-tab is-on">Inbox</span><span class="ws-tab">Today</span><span class="ws-tab">Scheduled</span><span class="ws-tab">Done</span>`)}
      ${kitRow('Toggle (off / on)', `${renderToggle({ label: 'Off', checked: false })} ${renderToggle({ label: 'On', checked: true })}`)}
      ${kitRow('Status dots', `
        <span class="tt-dot tt-dot-red"></span><span class="tt-dot tt-dot-purple"></span><span class="tt-dot tt-dot-blue"></span>`)}
      ${kitRow('Saved affordance', `<span class="note-status saved">saved ✓</span>`)}
      <div class="stats-grid" style="margin-top:6px">
        <div class="stat-card"><span class="stat-label">Lessons</span><strong class="stat-value">7</strong></div>
        <div class="stat-card"><span class="stat-label">To mark</span><strong class="stat-value">18</strong></div>
        <div class="stat-card"><span class="stat-label">AI calls</span><strong class="stat-value" style="color:var(--teal)">42</strong></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
        <div class="card" style="border-left:3px solid var(--teal);padding:14px 16px"><strong>Tone-left-border card</strong><p class="muted" style="margin:.25rem 0 0">teal · Logistics</p></div>
        <div class="card" style="border-left:3px solid var(--red);padding:14px 16px"><strong>Safeguarding card</strong><p class="muted" style="margin:.25rem 0 0">red · withheld from AI</p></div>
      </div>`;

    const worksheetHtml = `<div class="ws-doc ws-doc-preview">${renderWorksheet(SAMPLE_WORKSHEET_MD, { mode: 'preview', level: 'core', autofill: { name: '(pupil’s name — auto)', date: '(today — auto)' } }).html}</div>`;

    const body = `<section class="card workspace-width">
      <div class="card-head"><div><p class="eyebrow">dev</p><h1>UI gallery</h1></div></div>
      <p class="muted">Every showcased view, rendered with fixture data — no DB, no live state. Redesign the
        UI (views + CSS + client JS) against this page in isolation from the back-end. See
        <code>docs/UI_SEPARATION_PLAN.md</code>.</p>
      ${item('Component kit (Rail & Stage rebuild)', 'The shared vocabulary every redesigned screen is built from — badges in the SPEC category tones (Logistics→teal · Pupil→amber · Admin→grey · Curriculum→green · Safeguarding→red), filter chips, segmented tabs, the pill+knob toggle, status dots, the saved affordance, stat grid, and tone-left-border cards.', componentKit)}
      ${item('Primitives', 'Shared chrome: card header (eyebrow + title + badge), buttons, links, badges.', primitives)}
      ${item('Slide deck', 'renderPslide via renderSlideDeck — one per-slide renderer shared by pupil / preview / presenter / board / cockpit (note the table + blockquote framing).', renderSlideDeck(SAMPLE_SLIDES_MD, 'gallery', 'core'))}
      ${item('Captured (SPEC §1)', 'renderCaptureBar + renderCapturedChips + renderCapturedList — the capture bar, category-filter chips with counts, and tone-left-border triage cards. The safeguarding-flagged card is withheld from AI and routes to the register (Open register), never "Make a task".', renderCaptureBar() + renderCapturedChips(GALLERY_CAPTURED_COUNTS, undefined) + renderCapturedList(GALLERY_CAPTURED, GALLERY_GROUPS))}
      ${item('Notes (SPEC §2)', 'renderNotesSearch + renderNotesChips + renderNotesGrid — a searchable knowledge-base grid; each card has a kind badge (by what it links to: Course green · Group teal · Pupil amber · General grey), the date, the editable body, and link chips. Pupil shown as a PUPIL_n token.', renderNotesSearch('', '') + renderNotesChips(GALLERY_NOTES_COUNTS, '', '') + renderNotesGrid(GALLERY_NOTES))}
      ${item('Events (SPEC §7)', 'renderEventsGrouped — upcoming events grouped by how-soon (This week / Next two weeks / Later / No date yet), each a card with a tone date chip (Deadline red · Trip amber · Parents/Open teal · Meeting grey), editable title, kind badge and an "in N days" line.', renderEventsGrouped(GALLERY_EVENTS, GALLERY_EVENTS_TODAY))}
      ${item('Tasks (SPEC §4)', 'renderTaskList — tone-left-border task cards (urgency: urgent→red · by-next-lesson→amber · this-week/email/scheduled→teal · someday→grey), an EMAIL source tag, a done-checkbox (struck when done), the urgency badge, and triage/edit controls in a disclosure. The live page wraps these in a segmented Inbox/Open/Done/Interest tab control with counts.', `<div class="tasks-page">${renderTaskList('gallery-tasks', GALLERY_TASKS, GALLERY_GROUPS)}</div>`)}
      ${item('Worksheet (read-only preview)', 'renderWorksheet, preview mode.', worksheetHtml)}
      ${item('Now — day timeline', 'renderTimelineCard with a fixed clock (P1 done · P2 active · P3 next).', renderTimelineCard(GALLERY_LESSONS, GALLERY_PERIODS, GALLERY_NOW_STATE, new Date('2026-06-23T10:05:00Z'), 'Europe/London'))}
    </section>`;

    return reply.type('text/html').send(layout({ title: 'UI gallery', body, authed: true, csrfToken: reply.generateCsrf() }));
  });
}
