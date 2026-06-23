import { test, expect } from '@playwright/test';

// TEMPORARY audit: visit each main screen at 1080×1920 portrait, measure horizontal overflow (the main
// portrait failure mode — content wider than the screen) and vertical fit, and screenshot each for review.
const ROUTES = ['/', '/timetable', '/schemes', '/tasks', '/captured', '/coverage', '/focus', '/settings', '/oversee', '/notes'];

for (const route of ROUTES) {
  test(`audit ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 1080, height: 1920 });
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const main = document.querySelector('main.cockpit-workspace') as HTMLElement | null;
      if (!main) return null;
      return {
        overflowX: main.scrollWidth - main.clientWidth,
        overflowY: main.scrollHeight - main.clientHeight,
        clientW: main.clientWidth,
        clientH: main.clientHeight,
      };
    });
    const slug = route === '/' ? 'now' : route.replace(/\//g, '_').replace(/^_/, '');
    await page.screenshot({ path: `test-results/portrait-${slug}.png` });
    console.log(`AUDIT ${route} → ${JSON.stringify(m)}`);
    expect(m).not.toBeNull();
  });
}
