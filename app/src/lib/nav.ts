// The single source of truth for the top-bar navigation and the keyboard jump map.
//
// Before Phase 11 these were two hand-maintained copies that drifted: the inline 18-link nav string
// in [html.ts] and the `NAV` object of `g`+letter shortcuts in [public/app.js]. Now the server
// renders the bar from NAV_MODEL and emits the keyed items as inline JSON (`window.__NAV__`) that
// app.js reads for both the jump map and the shortcut cheat-sheet — so the two lists can never drift.
//
// `group` is latent in Wave-0 slice 1 (renderNav renders every item inline, unchanged behaviour);
// slice 2 (idea 6) uses it + a `nav_daily` setting to fold 'setup' links into a menu.

export type NavGroup = 'daily' | 'setup';

export interface NavItem {
  href: string;
  label: string;
  key?: string; // single-letter `g`+key jump shortcut, if any
  group: NavGroup; // 'daily' = always on the bar; 'setup' = foldable into the menu (slice 2)
}

// Labels/keys match the old hand-written nav; `key` values are exactly the old app.js NAV map (11
// links carry a `g`+letter shortcut). `group` follows the decided default daily set (Now, Focus,
// Timetable, Tasks, Captured); everything else is 'setup'. /concepts (idea 1.1) was added here.
export const NAV_MODEL: readonly NavItem[] = [
  { href: '/', label: 'Now', key: 'h', group: 'daily' },
  { href: '/focus', label: 'Focus', key: 'f', group: 'daily' },
  { href: '/timetable', label: 'Timetable', key: 't', group: 'daily' },
  { href: '/oversee', label: 'Oversee', group: 'setup' },
  { href: '/tasks', label: 'Tasks', key: 'k', group: 'daily' },
  { href: '/recurring', label: 'Recurring', group: 'setup' },
  { href: '/events', label: 'Events', key: 'e', group: 'setup' },
  { href: '/time', label: 'Time', group: 'setup' },
  { href: '/captured', label: 'Captured', key: 'c', group: 'daily' },
  { href: '/pupils', label: 'Pupils', key: 'p', group: 'setup' },
  { href: '/safeguarding', label: 'Safeguarding', key: 'g', group: 'setup' },
  { href: '/notes', label: 'Notes', group: 'setup' },
  { href: '/schemes', label: 'Schemes', key: 's', group: 'setup' },
  { href: '/concepts', label: 'Concepts', group: 'setup' },
  { href: '/coverage', label: 'Coverage', group: 'setup' },
  { href: '/map', label: 'Map', key: 'm', group: 'setup' },
  { href: '/kit', label: 'Kit', group: 'setup' },
  { href: '/resources', label: 'Resources', key: 'r', group: 'setup' },
  { href: '/setup', label: 'Setup', group: 'setup' },
  { href: '/settings', label: 'Settings', group: 'setup' },
];

// The daily set is teacher-configurable (idea 6). It's a write-through in-memory value, not a TTL
// cache: layout() renders synchronously so it can't await a DB read. server.ts primes it at boot and
// the Settings handler updates it on save (single-process LAN app — no cross-instance coherence to
// worry about). Unset → the NAV_MODEL 'daily' default (the leaner five).
const KNOWN_HREFS = new Set(NAV_MODEL.map((i) => i.href));
const DEFAULT_DAILY: readonly string[] = NAV_MODEL.filter((i) => i.group === 'daily').map((i) => i.href);
let navDailyOverride: string[] | null = null;

/** Keep only known hrefs, in NAV_MODEL order; drop unknowns (a removed page can't haunt the bar). */
export function sanitiseDaily(hrefs: readonly string[]): string[] {
  const want = new Set(hrefs.filter((h) => KNOWN_HREFS.has(h)));
  return NAV_MODEL.filter((i) => want.has(i.href)).map((i) => i.href);
}

/** Set the configured daily set (null/empty → fall back to the default). Call after load/save. */
export function setNavDailyOverride(hrefs: readonly string[] | null): void {
  const clean = hrefs ? sanitiseDaily(hrefs) : [];
  navDailyOverride = clean.length ? clean : null;
}

/** The hrefs currently pinned to the always-visible bar. */
export function getNavDailyHrefs(): string[] {
  return navDailyOverride ? [...navDailyOverride] : [...DEFAULT_DAILY];
}

/** Render the top-bar nav: the daily set inline, the rest folded into a "Setup & admin" menu. */
export function renderNav(dailyHrefs: readonly string[] = getNavDailyHrefs()): string {
  const daily = new Set(dailyHrefs.length ? dailyHrefs : DEFAULT_DAILY);
  const link = (i: NavItem) => `<a href="${i.href}">${i.label}</a>`;
  const inline = NAV_MODEL.filter((i) => daily.has(i.href)).map(link).join('');
  const folded = NAV_MODEL.filter((i) => !daily.has(i.href)).map(link).join('');
  const menu = folded
    ? `<details class="nav-more"><summary>⚙ Setup &amp; admin</summary><div class="nav-more-panel">${folded}</div></details>`
    : '';
  return `<nav class="nav">${inline}${menu}</nav>`;
}

/** The keyed items, for the client's `g`+letter jump map and the shortcut cheat-sheet. */
export function navClientModel(): Array<{ key: string; href: string; label: string }> {
  return NAV_MODEL.filter((i) => i.key).map((i) => ({ key: i.key as string, href: i.href, label: i.label }));
}

/** Inline-script-safe JSON of navClientModel() for embedding in a `<script>` tag. */
export function navClientJson(): string {
  // Values are static internal constants; escape `<` defensively so an inline `<script>` can't break.
  return JSON.stringify(navClientModel()).replace(/</g, '\\u003c');
}
