import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import {
  NAV_MODEL,
  renderRail,
  navClientModel,
  navClientJson,
  sanitiseDaily,
  setNavDailyOverride,
  getNavDailyHrefs,
  setExperienceMode,
  getExperienceMode,
  shouldShowExperienceNudge,
  EXPERIENCE_NUDGE_AT,
} from '../src/lib/nav';
import { layout } from '../src/lib/html';

const ALL_HREFS = NAV_MODEL.map((i) => i.href);
// Rail & Stage rebuild: the TODAY group is the daily default; power = expert-setup + Coverage (Settings
// moved to everyday). Kept in NAV_MODEL order for the group assertion below.
const DEFAULT_DAILY = ['/', '/timetable', '/focus', '/tasks', '/marking', '/planner'];
const ADVANCED = ['/recurring', '/coverage', '/concepts', '/progression', '/pupils', '/kit', '/time', '/setup'];

// renderRail reads module-level override + experience state; always reset both.
afterEach(() => {
  setNavDailyOverride(null);
  setExperienceMode('everyday');
});

describe('nav model (single source of truth)', () => {
  it('has a tier on every item, and the advanced (power) set is the expert-setup pages', () => {
    expect(NAV_MODEL.every((i) => i.tier === 'everyday' || i.tier === 'power')).toBe(true);
    expect(NAV_MODEL.filter((i) => i.tier === 'power').map((i) => i.href).sort()).toEqual([...ADVANCED].sort());
  });

  it('hrefs are unique and the TODAY group is the daily default', () => {
    expect(new Set(ALL_HREFS).size).toBe(ALL_HREFS.length);
    expect(NAV_MODEL.filter((i) => i.group === 'TODAY').map((i) => i.href)).toEqual(DEFAULT_DAILY);
  });
});

describe('renderRail (Scaffolded Ribbon)', () => {
  it('renders the overhauled ribbon scaffold and all operational/admin links', () => {
    const html = renderRail('everyday');
    expect(html).toContain('class="scaffolded-ribbon"');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/safeguarding"');
    expect(html).toContain('href="/timetable"');
    expect(html).toContain('href="/focus"');
    expect(html).toContain('href="/marking"');
    expect(html).toContain('href="/settings"');
  });

  it('embeds custom bottom controls/railFoot', () => {
    const foot = '<div class="custom-foot">Foot Content</div>';
    const html = renderRail('everyday', undefined, foot);
    expect(html).toContain(foot);
  });
});

describe('rail grouping (Rail & Stage rebuild)', () => {
  const GROUPS = ['TODAY', 'FLAGGED', 'RECORD', 'CURRICULUM', 'CLASSES', 'SETUP'];

  it('every nav item belongs to one of the six semantic groups', () => {
    expect(NAV_MODEL.every((i) => GROUPS.includes(i.group))).toBe(true);
    // Safeguarding is the sole FLAGGED item and is everyday (never gated).
    const flagged = NAV_MODEL.filter((i) => i.group === 'FLAGGED');
    expect(flagged.map((i) => i.href)).toEqual(['/safeguarding']);
    expect(flagged[0]?.tier).toBe('everyday');
  });

  it('renders the six group captions and a status dot per item', () => {
    const html = renderRail('power');
    for (const label of ['Today', 'Flagged', 'Record', 'Curriculum', 'Classes', 'Setup']) {
      expect(html).toContain(`>${label}<`);
    }
    expect(html).toContain('class="rail-dot"');
    expect(html).toContain('class="rail-group-label"');
  });

  it('power-only items are hidden in everyday and shown in power; Safeguarding always shows', () => {
    const everyday = renderRail('everyday');
    const power = renderRail('power');
    for (const href of ['/coverage', '/pupils', '/kit', '/setup']) {
      expect(everyday).not.toContain(`href="${href}"`);
      expect(power).toContain(`href="${href}"`);
    }
    // Everyday items + Safeguarding render regardless of experience.
    expect(everyday).toContain('href="/safeguarding"');
    expect(everyday).toContain('href="/settings"'); // Settings is everyday now
    expect(everyday).toContain('class="ribbon-indicator"'); // safeguarding pulse, never gated
  });
});

describe('experience switch (write-through)', () => {
  it('defaults to everyday and round-trips power/everyday/garbage', () => {
    expect(getExperienceMode()).toBe('everyday');
    setExperienceMode('power');
    expect(getExperienceMode()).toBe('power');
    setExperienceMode('everyday');
    expect(getExperienceMode()).toBe('everyday');
    setExperienceMode('nonsense');
    expect(getExperienceMode()).toBe('everyday'); // anything but 'power' = everyday
    setExperienceMode(null);
    expect(getExperienceMode()).toBe('everyday');
  });
});

describe('earned-unlock nudge gate', () => {
  it('shows only for an everyday teacher, not dismissed, at/over the threshold', () => {
    expect(shouldShowExperienceNudge('everyday', false, EXPERIENCE_NUDGE_AT)).toBe(true);
    expect(shouldShowExperienceNudge('everyday', false, EXPERIENCE_NUDGE_AT - 1)).toBe(false); // below threshold
    expect(shouldShowExperienceNudge('everyday', true, EXPERIENCE_NUDGE_AT)).toBe(false); // dismissed
    expect(shouldShowExperienceNudge('power', false, EXPERIENCE_NUDGE_AT * 10)).toBe(false); // already power
  });
});

describe('nav_daily configuration (unchanged machinery)', () => {
  it('sanitiseDaily drops unknown hrefs and restores NAV_MODEL order', () => {
    expect(sanitiseDaily(['/captured', '/nope', '/'])).toEqual(['/', '/captured']);
    expect(sanitiseDaily([])).toEqual([]);
  });

  it('setNavDailyOverride round-trips; empty/unknown-only falls back to the default', () => {
    setNavDailyOverride(['/', '/schemes']);
    expect(getNavDailyHrefs()).toEqual(['/', '/schemes']);
    setNavDailyOverride([]);
    expect(getNavDailyHrefs()).toEqual(DEFAULT_DAILY);
    setNavDailyOverride(['/unknown-only']);
    expect(getNavDailyHrefs()).toEqual(DEFAULT_DAILY);
  });
});

describe('client jump-map (unchanged)', () => {
  it('the client jump map is the old app.js NAV object plus Marking (a)', () => {
    const map: Record<string, string> = {};
    for (const i of navClientModel()) map[i.key] = i.href;
    expect(map).toEqual({
      h: '/', a: '/marking', t: '/timetable', f: '/focus', k: '/tasks', s: '/schemes', p: '/pupils',
      c: '/captured', e: '/events', r: '/resources', m: '/map', g: '/safeguarding',
    });
  });

  it('every key is a single character and unique; labels travel for the cheat-sheet', () => {
    const keys = navClientModel().map((i) => i.key);
    expect(keys.every((k) => k.length === 1)).toBe(true);
    expect(new Set(keys).size).toBe(keys.length);
    expect(navClientModel().find((i) => i.key === 'h')).toEqual({ key: 'h', href: '/', label: 'Now' });
  });

  it('navClientJson is valid JSON and escapes "<" for inline-script safety', () => {
    const json = navClientJson();
    expect(json).not.toContain('<');
    expect(JSON.parse(json)).toEqual(navClientModel());
  });
});

describe('shell chrome (single dark shell)', () => {
  it('layout() always renders data-shell="next" on <body>', () => {
    expect(layout({ title: 't', body: '<p>x</p>' })).toContain('data-shell="next"');
  });
});
