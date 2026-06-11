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
  <header class="topbar">
    <div class="bar-left">
      <a class="brand" href="/">School Organiser</a>
      ${authed ? '<nav class="nav"><a href="/">Now</a><a href="/focus">Focus</a><a href="/timetable">Timetable</a><a href="/oversee">Oversee</a><a href="/tasks">Tasks</a><a href="/events">Events</a><a href="/time">Time</a><a href="/captured">Captured</a><a href="/pupils">Pupils</a><a href="/notes">Notes</a><a href="/schemes">Schemes</a><a href="/map">Map</a><a href="/kit">Kit</a><a href="/resources">Resources</a></nav>' : ''}
    </div>
    ${logout}
  </header>
  <main>${body}</main>
  ${authed ? '<script src="/static/htmx.min.js"></script>\n  <script src="/static/app.js" defer></script>' : ''}
</body>
</html>`;
}
