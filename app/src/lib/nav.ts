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
// Rail & Stage redesign — `tier` gates the rail's "Advanced" section: 'power' items appear only when
// the teacher has turned advanced tools on (the `experience` switch). 'everyday' items always show.
export type NavTier = 'everyday' | 'power';

export interface NavItem {
  href: string;
  label: string;
  key?: string; // single-letter `g`+key jump shortcut, if any
  group: NavGroup; // legacy daily/setup grouping — still drives the configurable "Today" pin set (nav_daily)
  tier: NavTier; // 'power' = lives in the rail's "Advanced" section, hidden until advanced tools are on
}

// Labels/keys match the old hand-written nav; `key` values are exactly the old app.js NAV map (11
// links carry a `g`+letter shortcut). `group` follows the decided default daily set (Now, Focus,
// Timetable, Tasks, Captured) and still drives the configurable Today pins. `tier` is the rail's
// everyday-vs-advanced split: the expert-set-up pages (Pupils, Concepts, Kit, Recurring, Time, Setup,
// Settings) are 'power' and fold into the Advanced section. /concepts (idea 1.1) was added here.
export const NAV_MODEL: readonly NavItem[] = [
  { href: '/', label: 'Now', key: 'h', group: 'daily', tier: 'everyday' },
  { href: '/marking', label: 'Marking', key: 'a', group: 'setup', tier: 'everyday' },
  { href: '/focus', label: 'Focus', key: 'f', group: 'daily', tier: 'everyday' },
  { href: '/timetable', label: 'Timetable', key: 't', group: 'daily', tier: 'everyday' },
  { href: '/oversee', label: 'Oversee', group: 'setup', tier: 'everyday' },
  { href: '/tasks', label: 'Tasks', key: 'k', group: 'daily', tier: 'everyday' },
  { href: '/recurring', label: 'Recurring', group: 'setup', tier: 'power' },
  { href: '/events', label: 'Events', key: 'e', group: 'setup', tier: 'everyday' },
  { href: '/time', label: 'Time', group: 'setup', tier: 'power' },
  { href: '/captured', label: 'Captured', key: 'c', group: 'daily', tier: 'everyday' },
  { href: '/pupils', label: 'Pupils', key: 'p', group: 'setup', tier: 'power' },
  { href: '/safeguarding', label: 'Safeguarding', key: 'g', group: 'setup', tier: 'everyday' },
  { href: '/notes', label: 'Notes', group: 'setup', tier: 'everyday' },
  { href: '/schemes', label: 'Schemes', key: 's', group: 'setup', tier: 'everyday' },
  { href: '/concepts', label: 'Concepts', group: 'setup', tier: 'power' },
  { href: '/coverage', label: 'Coverage', group: 'setup', tier: 'everyday' },
  { href: '/map', label: 'Map', key: 'm', group: 'setup', tier: 'everyday' },
  { href: '/planner', label: 'Planner', group: 'setup', tier: 'everyday' },
  { href: '/kit', label: 'Kit', group: 'setup', tier: 'power' },
  { href: '/resources', label: 'Resources', key: 'r', group: 'setup', tier: 'everyday' },
  { href: '/setup', label: 'Setup', group: 'setup', tier: 'power' },
  { href: '/settings', label: 'Settings', group: 'setup', tier: 'power' },
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

// Rail & Stage redesign — the "experience" switch: 'everyday' (default) hides the Advanced rail
// section and pre-collapses advanced controls; 'power' reveals them. A write-through in-memory value
// (same machinery + rationale as navDailyOverride): layout() reads it synchronously; server.ts primes
// it at boot and the Settings handler updates it on save.
export type Experience = 'everyday' | 'power';
let experienceMode: Experience = 'everyday';

export function setExperienceMode(mode: Experience | string | null): void {
  experienceMode = mode === 'power' ? 'power' : 'everyday';
}

export function getExperienceMode(): Experience {
  return experienceMode;
}

// ── UI overhaul shell selector ──────────────────────────────────────────────────────────────────
// 'classic' = the current Rail & Stage shell; 'next' = the new task-first workspace, built behind this
// flag (docs/ui-design/WORKING_MODEL.md). Same write-through in-memory machinery as experienceMode:
// layout() reads it synchronously (it can't await a DB read), server.ts primes it at boot from the
// `ui_shell` setting, and Settings updates it. Defaults to 'classic' so there is NO change until the
// new shell exists and the flag is flipped — a redesign can therefore merge to main and stay dark.
export type UiShell = 'classic' | 'next';
let uiShell: UiShell = 'classic';

export function setUiShell(mode: UiShell | string | null): void {
  uiShell = mode === 'next' ? 'next' : 'classic';
}

export function getUiShell(): UiShell {
  return uiShell;
}

// Earned, opt-in unlock: once the teacher has taught enough lessons, offer (once, dismissibly) to
// reveal the advanced tools — never auto-promote, never nag. Pure so it's unit-testable.
export const EXPERIENCE_NUDGE_AT = 20;
export function shouldShowExperienceNudge(experience: Experience, dismissed: boolean, lessonsTaught: number, threshold = EXPERIENCE_NUDGE_AT): boolean {
  return experience === 'everyday' && !dismissed && lessonsTaught >= threshold;
}

const SAFEGUARDING_HREF = '/safeguarding';

/**
 * Render the persistent left navigation rail (Rail & Stage). Three groups:
 *  • Today — the configurable pin set (nav_daily; default the leaner five), always shown.
 *  • Safeguarding — pinned on its own, always visible, never gated (SEND non-negotiable).
 *  • Plan — everyday pages not pinned to Today, in a collapsible section.
 *  • Advanced — 'power'-tier pages, shown only when the experience switch is on.
 * Active-state is applied client-side by app.js (it reads window.__NAV__ + the path), so this stays
 * a pure, path-free render — exactly like the old top bar.
 */
const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function esc(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);
}

export function renderRail(
  experience: Experience = getExperienceMode(),
  dailyHrefs: readonly string[] = getNavDailyHrefs(),
  railFoot = '',
): string {
  if (getUiShell() === 'next') {
    const link = (href: string, icon: string, label: string, extraClass = '', extraSpan = '') => `
      <a href="${href}" class="ribbon-link${extraClass}" title="${esc(label)}">
        <span class="icon">${icon}</span>
        <span class="lbl-txt">${esc(label)}</span>
        ${extraSpan}
      </a>`;

    return `<nav class="scaffolded-ribbon" id="scaffolded-ribbon" aria-label="Global navigation">
      <!-- Brand Link at the top -->
      <a href="/" class="ribbon-brand" title="School Organiser">
        <span class="icon">🏫</span>
        <span class="lbl-txt">School Organiser</span>
      </a>

      <!-- Tier 1: Safety & Active Tracking -->
      <div class="ribbon-tier tier-urgency">
        <span class="tier-label">Tier 1: Safety</span>
        ${link('/', '🌅', 'Now Screen')}
        ${link('/safeguarding', '⚑', 'Safeguarding', ' sg-flag', '<span class="ribbon-indicator"></span>')}
        ${link('/oversee', '🖥️', 'Oversee')}
      </div>

      <!-- Tier 2: Daily Operations -->
      <div class="ribbon-tier tier-operations">
        <span class="tier-label">Tier 2: Daily Ops</span>
        ${link('/timetable', '📅', 'Timetable')}
        ${link('/tasks', '📝', 'Checklists')}
        ${link('/marking', '🏆', 'Marking Queue')}
        ${link('/captured', '📥', 'Mind Inbox')}
        ${link('/events', '📣', 'Events')}
        ${link('/notes', '📓', 'Notes')}
        ${link('/coverage', '📊', 'Coverage')}
        ${link('/map', '🗺️', 'Map')}
        ${link('/planner', '🗓️', 'Planner')}
        ${link('/resources', '🗂️', 'Resources')}
      </div>

      <!-- Tier 3: Collapsible Drawer (Long-term admin/planning) -->
      <div class="ribbon-tier tier-admin collapsible-drawer" id="ribbon-drawer">
        <button class="drawer-header-btn" type="button" id="ribbon-drawer-toggle">
          <span class="icon">⚙️</span>
          <span class="lbl-txt">Advanced Drawer</span>
          <span class="drawer-arrow">▶</span>
        </button>
        <div class="drawer-links">
          ${link('/schemes', '📚', 'Schemes')}
          ${link('/concepts', '🧬', 'Concepts')}
          ${link('/setup', '🔌', 'Setup')}
          ${link('/kit', '🛒', 'Kit Carts')}
          ${link('/settings', '🔧', 'Settings')}
          ${link('/recurring', '🔁', 'Recurring')}
          ${link('/time', '⏱️', 'Time')}
          ${link('/pupils', '👥', 'Pupils')}
        </div>
      </div>

      <!-- Tier 4: Bottom ribbon foot controls -->
      ${railFoot}
    </nav>`;
  }

  const daily = new Set((dailyHrefs.length ? dailyHrefs : DEFAULT_DAILY).filter((h) => h !== SAFEGUARDING_HREF));
  const link = (i: NavItem) => `<a href="${i.href}">${i.label}</a>`;
  const today = NAV_MODEL.filter((i) => daily.has(i.href));
  const plan = NAV_MODEL.filter((i) => !daily.has(i.href) && i.tier !== 'power' && i.href !== SAFEGUARDING_HREF);
  const advanced = NAV_MODEL.filter((i) => i.tier === 'power' && !daily.has(i.href) && i.href !== SAFEGUARDING_HREF);

  const planSec = plan.length
    ? `<details class="rail-sec rail-plan" open><summary>Plan</summary><div class="rail-links">${plan.map(link).join('')}</div></details>`
    : '';
  const advSec =
    experience === 'power' && advanced.length
      ? `<details class="rail-sec rail-adv" open><summary>Advanced</summary><div class="rail-links">${advanced.map(link).join('')}</div></details>`
      : '';

  return `<nav class="rail" aria-label="Main navigation">
    <div class="rail-sec rail-today"><span class="rail-h">Today</span><div class="rail-links">${today.map(link).join('')}</div></div>
    <a class="rail-link rail-sg" href="${SAFEGUARDING_HREF}">⚑ Safeguarding</a>
    ${planSec}
    ${advSec}
  </nav>`;
}

/** Output a dynamic header block containing placeholders to load asynchronously via HTMX. */
export function renderHeader(title: string): string {
  const escTitle = encodeURIComponent(title);
  return `<header id="context-header" class="context-header" hx-get="/header-overhaul?title=${escTitle}" hx-trigger="load" hx-swap="outerHTML">
    <div class="header-left">Loading...</div>
    <div class="header-middle"></div>
    <div class="header-right"></div>
  </header>`;
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
