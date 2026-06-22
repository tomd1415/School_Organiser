import { test, expect } from '@playwright/test';

// THE test that would have caught the bug that wasted days: app.js threw at load on every authed page,
// silently killing all client behaviour. A real browser surfaces that as a `pageerror`. Assert there are
// none (and no console errors) on every key authed page — this guards the whole "script crashes on load"
// class that app.inject + jsdom can't fully cover.
const PAGES = ['/', '/timetable', '/tasks', '/captured', '/schemes', '/focus', '/coverage', '/settings'];

for (const path of PAGES) {
  test(`no client-side JS error on ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
    });
    await page.goto(path, { waitUntil: 'networkidle' });
    expect(errors, `client errors on ${path}:\n${errors.join('\n')}`).toEqual([]);
  });
}

test('app.js actually ran (active-nav highlight is applied client-side)', async ({ page }) => {
  // The active-page indicator lives AFTER the line that used to crash — if app.js died, no link gets
  // aria-current. Its presence proves app.js executed past the old crash point.
  await page.goto('/timetable', { waitUntil: 'networkidle' });
  await expect(page.locator('.scaffolded-ribbon a.ribbon-link[aria-current="page"]')).toHaveCount(1);
});
