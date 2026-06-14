import { describe, it, expect, afterEach } from 'vitest';
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

const ALL_HREFS = NAV_MODEL.map((i) => i.href);
const DEFAULT_DAILY = ['/', '/focus', '/timetable', '/tasks', '/captured'];
const ADVANCED = ['/recurring', '/time', '/pupils', '/concepts', '/kit', '/setup', '/settings'];

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

  it('hrefs are unique and the daily default is exactly the leaner five', () => {
    expect(new Set(ALL_HREFS).size).toBe(ALL_HREFS.length);
    expect(NAV_MODEL.filter((i) => i.group === 'daily').map((i) => i.href)).toEqual(DEFAULT_DAILY);
  });
});

describe('renderRail (Rail & Stage)', () => {
  it('everyday: Today = the leaner five, a pinned Safeguarding link, a Plan section, NO Advanced', () => {
    const html = renderRail('everyday');
    expect(html).toContain('class="rail"');
    for (const h of DEFAULT_DAILY) expect(html).toContain(`<a href="${h}">`);
    expect(html).toContain('<span class="rail-h">Today</span>');
    expect(html).toContain('class="rail-link rail-sg" href="/safeguarding"');
    expect(html).toContain('<details class="rail-sec rail-plan"');
    expect(html).toContain('<a href="/schemes">Schemes</a>'); // a Plan item
    // Advanced is hidden in everyday mode — neither the section nor its pages render.
    expect(html).not.toContain('rail-adv');
    for (const h of ADVANCED) expect(html).not.toContain(`<a href="${h}">`);
  });

  it('power: the Advanced section appears with the expert-setup pages', () => {
    const html = renderRail('power');
    expect(html).toContain('<details class="rail-sec rail-adv"');
    for (const h of ADVANCED) expect(html).toContain(`<a href="${h}">`);
  });

  it('Safeguarding is pinned exactly once and never duplicated into Today/Plan', () => {
    const html = renderRail('power');
    expect(html.match(/href="\/safeguarding"/g)).toHaveLength(1);
  });

  it('the configurable daily set pins items into Today, ahead of the Plan section', () => {
    setNavDailyOverride(['/', '/schemes']);
    const html = renderRail('everyday');
    const schemes = html.indexOf('>Schemes<');
    const planSummary = html.indexOf('<summary>Plan</summary>');
    expect(schemes).toBeGreaterThan(-1);
    expect(planSummary).toBeGreaterThan(-1);
    expect(schemes).toBeLessThan(planSummary); // pinned Schemes sits in Today, before Plan
  });

  it('pinning all links puts every page in Today (the rail still renders them all)', () => {
    const html = renderRail('power', ALL_HREFS);
    for (const h of ALL_HREFS) expect(html).toContain(`href="${h}"`);
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

  it('renderRail defaults its experience arg from the write-through value', () => {
    setExperienceMode('power');
    expect(renderRail()).toContain('rail-adv');
    setExperienceMode('everyday');
    expect(renderRail()).not.toContain('rail-adv');
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
  it('the client jump map is exactly the old app.js NAV object', () => {
    const map: Record<string, string> = {};
    for (const i of navClientModel()) map[i.key] = i.href;
    expect(map).toEqual({
      h: '/', t: '/timetable', f: '/focus', k: '/tasks', s: '/schemes', p: '/pupils',
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
