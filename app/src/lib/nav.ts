// The single source of truth for the top-bar navigation and the keyboard jump map.
//
// Before Phase 11 these were two hand-maintained copies that drifted: the inline 18-link nav string
// in [html.ts] and the `NAV` object of `g`+letter shortcuts in [public/app.js]. Now the server
// renders the bar from NAV_MODEL and emits the keyed items as inline JSON (`window.__NAV__`) that
// app.js reads for both the jump map and the shortcut cheat-sheet — so the two lists can never drift.
//
// `group` is latent in Wave-0 slice 1 (renderNav renders every item inline, unchanged behaviour);
// slice 2 (idea 6) uses it + a `nav_daily` setting to fold 'setup' links into a menu.

import { esc } from './esc';

// Rail & Stage rebuild (docs/new-ui): the six semantic rail groups, in render order. The rail renders
// every group always-open (no folding) — `tier` alone gates power-only items. Group labels are the small
// uppercase captions in SPEC §0.
export type NavGroup = 'TODAY' | 'FLAGGED' | 'RECORD' | 'CURRICULUM' | 'CLASSES' | 'SETUP';
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
// Grouping + tiers follow the rebuild SPEC §0 / §"Navigation model": everything touched *during the day*
// is in TODAY; FLAGGED is Safeguarding pinned on its own (everyday, never gated); RECORD is what you log;
// CURRICULUM is planning/curriculum; CLASSES is cohort views; SETUP is admin/config. `tier:'power'` items
// (Coverage, Concepts, Pupils, Kit, Time, Setup, Recurring) only appear when advanced tools are on. `key`
// values are unchanged (the `g`+letter jump map).
export const NAV_MODEL: readonly NavItem[] = [
  { href: '/', label: 'Now', key: 'h', group: 'TODAY', tier: 'everyday' },
  { href: '/timetable', label: 'Timetable', key: 't', group: 'TODAY', tier: 'everyday' },
  { href: '/focus', label: 'Focus', key: 'f', group: 'TODAY', tier: 'everyday' },
  { href: '/tasks', label: 'Tasks', key: 'k', group: 'TODAY', tier: 'everyday' },
  { href: '/marking', label: 'Marking', key: 'a', group: 'TODAY', tier: 'everyday' },
  { href: '/planner', label: 'Planner', group: 'TODAY', tier: 'everyday' },
  { href: '/safeguarding', label: 'Safeguarding', key: 'g', group: 'FLAGGED', tier: 'everyday' },
  { href: '/captured', label: 'Captured', key: 'c', group: 'RECORD', tier: 'everyday' },
  { href: '/notes', label: 'Notes', group: 'RECORD', tier: 'everyday' },
  { href: '/events', label: 'Events', key: 'e', group: 'RECORD', tier: 'everyday' },
  { href: '/recurring', label: 'Recurring', group: 'RECORD', tier: 'power' },
  { href: '/schemes', label: 'Schemes', key: 's', group: 'CURRICULUM', tier: 'everyday' },
  { href: '/map', label: 'Map', key: 'm', group: 'CURRICULUM', tier: 'everyday' },
  { href: '/resources', label: 'Resources', key: 'r', group: 'CURRICULUM', tier: 'everyday' },
  { href: '/coverage', label: 'Coverage', group: 'CURRICULUM', tier: 'power' },
  { href: '/concepts', label: 'Concepts', group: 'CURRICULUM', tier: 'power' },
  { href: '/oversee', label: 'Oversee', group: 'CLASSES', tier: 'everyday' },
  { href: '/pupils', label: 'Pupils', key: 'p', group: 'CLASSES', tier: 'power' },
  { href: '/settings', label: 'Settings', group: 'SETUP', tier: 'everyday' },
  { href: '/kit', label: 'Kit', group: 'SETUP', tier: 'power' },
  { href: '/time', label: 'Time', group: 'SETUP', tier: 'power' },
  { href: '/setup', label: 'Setup', group: 'SETUP', tier: 'power' },
];

// The daily set is teacher-configurable (idea 6). It's a write-through in-memory value, not a TTL
// cache: layout() renders synchronously so it can't await a DB read. server.ts primes it at boot and
// the Settings handler updates it on save (single-process LAN app — no cross-instance coherence to
// worry about). Unset → the NAV_MODEL 'daily' default (the leaner five).
const KNOWN_HREFS = new Set(NAV_MODEL.map((i) => i.href));
const DEFAULT_DAILY: readonly string[] = NAV_MODEL.filter((i) => i.group === 'TODAY').map((i) => i.href);
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

// Earned, opt-in unlock: once the teacher has taught enough lessons, offer (once, dismissibly) to
// reveal the advanced tools — never auto-promote, never nag. Pure so it's unit-testable.
export const EXPERIENCE_NUDGE_AT = 20;
export function shouldShowExperienceNudge(experience: Experience, dismissed: boolean, lessonsTaught: number, threshold = EXPERIENCE_NUDGE_AT): boolean {
  return experience === 'everyday' && !dismissed && lessonsTaught >= threshold;
}

const SAFEGUARDING_HREF = '/safeguarding';

// The six groups in render order, each with its caption + a status-dot tone (mapped to a repo token).
const RAIL_GROUPS: ReadonlyArray<{ id: NavGroup; label: string; tone: string }> = [
  { id: 'TODAY', label: 'Today', tone: 'teal' },
  { id: 'FLAGGED', label: 'Flagged', tone: 'red' },
  { id: 'RECORD', label: 'Record', tone: 'quiet' },
  { id: 'CURRICULUM', label: 'Curriculum', tone: 'green' },
  { id: 'CLASSES', label: 'Classes', tone: 'amber' },
  { id: 'SETUP', label: 'Setup', tone: 'quiet' },
];

/**
 * Render the persistent left navigation rail (Rail & Stage rebuild — docs/new-ui SPEC §0). Always-open
 * 232px rail: brand, then the six semantic groups (each a small uppercase caption + items). Every item is
 * a status dot + label (+ optional count pill, wired later). `tier:'power'` items appear only when the
 * experience switch is on; FLAGGED/Safeguarding is always shown and never gated. Renders from NAV_MODEL —
 * the single source of truth — so the rail can no longer drift from the jump map. Active-state is applied
 * client-side by app.js (it reads the path, adds `.active`+`aria-current` to the matching `.ribbon-link`),
 * so this stays a pure, path-free render. `dailyHrefs` is unused by the always-open rail (kept for
 * signature stability + the Settings nav-config, which still persists a pin set).
 *
 * `counts` optionally supplies per-href attention counts → a count pill (e.g. Tasks 5, Marking 18).
 */
export function renderRail(
  experience: Experience = getExperienceMode(),
  _dailyHrefs: readonly string[] = getNavDailyHrefs(),
  railFoot = '',
  counts: Readonly<Record<string, number>> = {},
): string {
  const dotVar = (tone: string) => (tone === 'quiet' ? 'var(--quiet)' : `var(--${tone})`);

  const item = (it: NavItem, tone: string): string => {
    const isSg = it.href === SAFEGUARDING_HREF;
    const n = counts[it.href];
    return `
    <a href="${it.href}" class="ribbon-link${isSg ? ' sg-flag' : ''}" title="${esc(it.label)}">
      <span class="rail-dot" style="background:${dotVar(tone)}"></span>
      <span class="lbl-txt">${esc(it.label)}</span>
      ${n ? `<span class="rail-count">${n}</span>` : ''}
      ${isSg ? '<span class="ribbon-indicator"></span>' : ''}
    </a>`;
  };

  const groups = RAIL_GROUPS.map((g) => {
    const items = NAV_MODEL.filter((i) => i.group === g.id && (i.tier === 'everyday' || experience === 'power'));
    if (!items.length) return '';
    return `<div class="rail-group">
      <span class="rail-group-label">${esc(g.label)}</span>
      ${items.map((i) => item(i, g.tone)).join('')}
    </div>`;
  }).join('');

  return `<nav class="scaffolded-ribbon" id="scaffolded-ribbon" aria-label="Global navigation">
    <a href="/" class="ribbon-brand" title="School Organiser">
      <span class="brand-mark" aria-hidden="true">SO</span>
      <span class="lbl-txt">School Organiser</span>
    </a>
    ${groups}
    ${railFoot}
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
