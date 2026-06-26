import { renderRail, navClientJson, getExperienceMode, renderHeader } from './nav';
import { esc } from './esc';

// Re-exported so the many `import { esc } from '../lib/html'` call sites keep working.
export { esc };

// `width` is the page's WIDTH INTENT — the single, explicit way to set the content column width, applied
// by the shell to <main> (see the width-intent block in styles.css). It beats the legacy per-component
// width rules, so a redesigned view never has to be added to a class list to get the right width. Omit it
// to fall through to the legacy component-class width rules (the default for ordinary card pages).
type WidthIntent = 'reading' | 'working' | 'wide' | 'full';

interface LayoutOptions {
  title: string;
  body: string;
  authed?: boolean;
  csrfToken?: string;
  width?: WidthIntent;
}

export function nextShell({ title, body, authed = false, csrfToken, width }: LayoutOptions): string {
  const exp = getExperienceMode();
  const csrfHdr = authed && csrfToken ? ` hx-headers='{"x-csrf-token":"${esc(csrfToken)}"}'` : '';
  
  const logoutNext =
    authed && csrfToken
      ? `<form method="post" action="/logout" class="inline">
           <input type="hidden" name="_csrf" value="${esc(csrfToken)}">
           <button class="ribbon-link logout-btn" title="Log out">
             <span class="icon">🚪</span>
             <span class="lbl-txt">Log out</span>
           </button>
         </form>`
      : '';

  const railFootNext =
    authed && csrfToken
      ? `<div class="ribbon-tier tier-foot"${csrfHdr}>
          <form class="rail-exp" role="group" aria-label="Experience level" hx-post="/settings/experience" hx-swap="none" hx-on::after-request="if(event.detail.successful)location.reload()">
            <button type="submit" name="experience" value="everyday" class="rail-exp-btn${exp === 'everyday' ? ' is-on' : ''}"${exp === 'everyday' ? ' aria-current="true"' : ''} title="Everyday: the daily core">Everyday</button>
            <button type="submit" name="experience" value="power" class="rail-exp-btn${exp === 'power' ? ' is-on' : ''}"${exp === 'power' ? ' aria-current="true"' : ''} title="Power: reveal planning, authoring &amp; admin">⚡ Power</button>
          </form>
          <a class="ribbon-link rail-gear" href="/settings" title="Settings">
            <span class="icon">⚙️</span>
            <span class="lbl-txt">Settings</span>
          </a>
          <details class="a11y">
            <summary class="ribbon-link" title="Accessibility preferences">
              <span class="icon">Aa</span>
              <span class="lbl-txt">Accessibility</span>
            </summary>
            <div class="a11y-panel">
              <div class="a11y-row" data-a11y="fontsize">
                <span>Text size</span>
                <button type="button" data-val="">A</button>
                <button type="button" data-val="large">A+</button>
                <button type="button" data-val="larger">A++</button>
              </div>
              <div class="a11y-row" data-a11y="theme">
                <span>Contrast</span>
                <button type="button" data-val="">Standard</button>
                <button type="button" data-val="contrast">High</button>
              </div>
              <div class="a11y-row" data-a11y="font">
                <span>Font</span>
                <button type="button" data-val="" title="Atkinson Hyperlegible — built for legibility">Legible</button>
                <button type="button" data-val="system">System</button>
              </div>
            </div>
          </details>
          ${logoutNext}
        </div>`
      : '';

  const headerBlock = authed ? renderHeader(title) : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)} · School Organiser</title>
  <script>(function(){try{var d=document.documentElement,s=window.localStorage;var m={theme:'data-theme',fontsize:'data-fontsize',font:'data-font'};for(var k in m){var v=s.getItem('a11y-'+k);if(v)d.setAttribute(m[k],v);}}catch(e){}})();</script>
  <link rel="stylesheet" href="/static/styles.css">
</head>
<body data-experience="${esc(exp)}" data-shell="next" data-orientation="landscape">
  <script>(function(){try{if(window.localStorage.getItem('focus-mode')==='true')document.body.classList.add('focus-mode');}catch(e){}})();</script>
  <div class="unified-console-wrapper${authed ? '' : ' console-bare'}">
    ${authed ? renderRail(exp, undefined, railFootNext) : ''}
    <div class="console-main-container">
      ${headerBlock}
      <main id="main-content" class="cockpit-workspace${width ? ` cockpit-w-${width}` : ''}">${body}</main>
    </div>
  </div>
  ${
    authed && csrfToken
      ? `<dialog id="note-modal" class="note-modal" hx-headers='{"x-csrf-token":"${esc(csrfToken)}"}'>
    <div class="note-modal-card">
      <button type="button" class="note-modal-x" aria-label="Close" onclick="this.closest('dialog').close()">✕</button>
      <h2>Quick note</h2>
      <form id="note-modal-form" hx-post="/note/route" hx-target="#note-modal-body" hx-swap="innerHTML" hx-on::after-request="if(window.htmxSaved(event))this.reset()">
        <textarea name="text" rows="4" placeholder="Jot anything — I'll work out where it goes…"></textarea>
        <label class="note-private"><input type="checkbox" name="private" value="on"> 🔒 keep private (safeguarding — don't send to AI)</label>
        <div class="note-modal-actions">
          <button type="submit" class="btn-secondary">File it ✨</button>
          <button type="button" class="link" hx-post="/note/route/plain" hx-include="#note-modal-form" hx-target="#note-modal-body" hx-swap="innerHTML">just add to notes</button>
        </div>
      </form>
      <div id="note-modal-body" aria-live="polite"></div>
    </div>
  </dialog>
  <dialog id="mark-modal" class="mark-modal" hx-headers='{"x-csrf-token":"${esc(csrfToken)}"}'>
    <div id="mark-modal-body" aria-live="polite"></div>
  </dialog>`
      : ''
  }
  ${authed ? `<script>window.__NAV__=${navClientJson()};</script>\n  <script src="/static/htmx.min.js"></script>\n  <script src="/static/app.js" defer></script>` : ''}
</body>
</html>`;
}

/** The single page chrome (Rail & Stage): a persistent left nav rail + a main "stage" pane. */
export function layout({ title, body, authed = false, csrfToken, width }: LayoutOptions): string {
  return nextShell({ title, body, authed, csrfToken, width });
}
