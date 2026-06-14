import { renderNav, navClientJson } from './nav';

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escape a value for safe interpolation into HTML. */
export function esc(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}

interface LayoutOptions {
  title: string;
  body: string;
  authed?: boolean;
  csrfToken?: string;
}

/** The single page chrome. Server-rendered; HTMX is added in Phase 1. */
export function layout({ title, body, authed = false, csrfToken }: LayoutOptions): string {
  const logout =
    authed && csrfToken
      ? `<form method="post" action="/logout" class="inline">
           <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
           <button class="link">Log out</button>
         </form>`
      : '';
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} · School Organiser</title>
  <link rel="stylesheet" href="/static/styles.css">
</head>
<body>
  <header class="topbar"${authed && csrfToken ? ` hx-headers='{"x-csrf-token":"${esc(csrfToken)}"}'` : ''}>
    <div class="bar-left">
      <a class="brand" href="/">School Organiser</a>
      ${authed ? renderNav() : ''}
    </div>
    ${
      authed
        ? `<div class="bar-tools">
            <div class="search-box">
              <input id="global-search" class="topbar-search" type="search" name="q" placeholder="Search…  /" autocomplete="off" aria-label="Search everything"
                hx-get="/search" hx-trigger="input changed delay:250ms, focus" hx-target="#search-results" hx-swap="innerHTML">
              <div id="search-results" class="search-results"></div>
            </div>
            <button type="button" id="note-btn" class="qc-btn" title="Quick note — I'll work out where it goes (or press n)">📝 Note</button>
            <details class="quick-capture">
              <summary class="qc-btn" title="Jot something to deal with later">＋ Capture</summary>
              <form class="qc-form" hx-post="/capture-quick" hx-target="#qc-status" hx-swap="innerHTML" hx-on::after-request="if(event.detail.successful)this.reset()">
                <textarea name="body" rows="2" placeholder="Something you were told…" autocomplete="off"></textarea>
                <button type="submit" class="btn-secondary">Capture</button>
                <span id="qc-status"></span>
              </form>
            </details>
          </div>`
        : ''
    }
    ${logout}
  </header>
  <main>${body}</main>
  ${
    authed && csrfToken
      ? `<dialog id="note-modal" class="note-modal" hx-headers='{"x-csrf-token":"${esc(csrfToken)}"}'>
    <div class="note-modal-card">
      <button type="button" class="note-modal-x" aria-label="Close" onclick="this.closest('dialog').close()">✕</button>
      <h2>Quick note</h2>
      <form id="note-modal-form" hx-post="/note/route" hx-target="#note-modal-body" hx-swap="innerHTML" hx-on::after-request="if(event.detail.successful)this.reset()">
        <textarea name="text" rows="4" placeholder="Jot anything — I'll work out where it goes…"></textarea>
        <label class="note-private"><input type="checkbox" name="private" value="on"> 🔒 keep private (safeguarding — don't send to AI)</label>
        <div class="note-modal-actions">
          <button type="submit" class="btn-secondary">File it ✨</button>
          <button type="button" class="link" hx-post="/note/route/plain" hx-include="#note-modal-form" hx-target="#note-modal-body" hx-swap="innerHTML">just add to notes</button>
        </div>
      </form>
      <div id="note-modal-body" aria-live="polite"></div>
    </div>
  </dialog>`
      : ''
  }
  ${authed ? `<script>window.__NAV__=${navClientJson()};</script>\n  <script src="/static/htmx.min.js"></script>\n  <script src="/static/app.js" defer></script>` : ''}
</body>
</html>`;
}
