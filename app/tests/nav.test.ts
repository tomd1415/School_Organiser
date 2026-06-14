import { describe, it, expect, afterEach } from 'vitest';
import { NAV_MODEL, renderNav, navClientModel, navClientJson, sanitiseDaily, setNavDailyOverride, getNavDailyHrefs } from '../src/lib/nav';

const ALL_HREFS = NAV_MODEL.map((i) => i.href);
const DEFAULT_DAILY = ['/', '/focus', '/timetable', '/tasks', '/captured'];

// renderNav reads module-level override state; always reset it.
afterEach(() => setNavDailyOverride(null));

describe('nav model (single source of truth)', () => {
  it('default render: the leaner-five daily set inline + the rest in a "Setup & admin" menu', () => {
    const expected =
      '<nav class="nav">' +
      '<a href="/">Now</a><a href="/focus">Focus</a><a href="/timetable">Timetable</a>' +
      '<a href="/tasks">Tasks</a><a href="/captured">Captured</a>' +
      '<details class="nav-more"><summary>⚙ Setup &amp; admin</summary><div class="nav-more-panel">' +
      '<a href="/oversee">Oversee</a><a href="/recurring">Recurring</a><a href="/events">Events</a>' +
      '<a href="/time">Time</a><a href="/pupils">Pupils</a><a href="/safeguarding">Safeguarding</a>' +
      '<a href="/notes">Notes</a><a href="/schemes">Schemes</a><a href="/concepts">Concepts</a><a href="/map">Map</a><a href="/kit">Kit</a>' +
      '<a href="/resources">Resources</a><a href="/setup">Setup</a><a href="/settings">Settings</a>' +
      '</div></details></nav>';
    expect(renderNav()).toBe(expected);
  });

  it('pinning all links = the old flat 18-link bar (no menu)', () => {
    const flat =
      '<nav class="nav"><a href="/">Now</a><a href="/focus">Focus</a><a href="/timetable">Timetable</a>' +
      '<a href="/oversee">Oversee</a><a href="/tasks">Tasks</a><a href="/recurring">Recurring</a>' +
      '<a href="/events">Events</a><a href="/time">Time</a><a href="/captured">Captured</a>' +
      '<a href="/pupils">Pupils</a><a href="/safeguarding">Safeguarding</a><a href="/notes">Notes</a>' +
      '<a href="/schemes">Schemes</a><a href="/concepts">Concepts</a><a href="/map">Map</a><a href="/kit">Kit</a>' +
      '<a href="/resources">Resources</a><a href="/setup">Setup</a><a href="/settings">Settings</a></nav>';
    expect(renderNav(ALL_HREFS)).toBe(flat);
    expect(renderNav(ALL_HREFS)).not.toContain('nav-more'); // every link pinned ⇒ no menu
  });

  it('renders a custom subset inline and folds the rest, both in NAV_MODEL order', () => {
    const html = renderNav(['/schemes', '/']); // out of order on input
    const menuStart = html.indexOf('nav-more');
    expect(html.indexOf('>Now<')).toBeLessThan(html.indexOf('>Schemes<')); // restored to model order
    expect(html.indexOf('>Schemes<')).toBeLessThan(menuStart); // both daily, before the menu
    expect(html.indexOf('>Focus<')).toBeGreaterThan(menuStart); // Focus folded into the menu
  });

  it('sanitiseDaily drops unknown hrefs and restores NAV_MODEL order', () => {
    expect(sanitiseDaily(['/captured', '/nope', '/'])).toEqual(['/', '/captured']);
    expect(sanitiseDaily([])).toEqual([]);
  });

  it('setNavDailyOverride round-trips; empty/unknown-only falls back to the default', () => {
    setNavDailyOverride(['/', '/schemes']);
    expect(getNavDailyHrefs()).toEqual(['/', '/schemes']);
    setNavDailyOverride([]); // empty ⇒ default (the bar can never be empty)
    expect(getNavDailyHrefs()).toEqual(DEFAULT_DAILY);
    setNavDailyOverride(['/unknown-only']);
    expect(getNavDailyHrefs()).toEqual(DEFAULT_DAILY);
  });

  it('the configured set drives renderNav() (write-through, no DB)', () => {
    setNavDailyOverride(['/']);
    const html = renderNav();
    expect(html).toContain('<a href="/">Now</a><details'); // only Now is daily
    expect(html).toContain('<a href="/focus">Focus</a>'); // Focus now lives in the menu
  });

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

  it('hrefs are unique and the daily default is exactly the leaner five', () => {
    expect(new Set(ALL_HREFS).size).toBe(ALL_HREFS.length);
    expect(NAV_MODEL.filter((i) => i.group === 'daily').map((i) => i.href)).toEqual(DEFAULT_DAILY);
  });
});
