import { test, expect } from '@playwright/test';

// Lesson cockpit (`/lesson/:id`, SPEC §17) — UI rebuild: the top is kept light and the old horizontal
// action button row is now a thin sticky vertical icon rail beside the content grid; Focus mode lights its
// toggle and collapses the grid (hiding the right live-tools column). Smoke test against a real timetabled
// lesson. (Opening a not-yet-occurring lesson fires a benign /oc/0/pupil-work 400 — a data condition, not a
// JS error — so we only fail on pageerror, not network/console noise.)
test('Cockpit shows the §17 action rail + Focus mode collapses the grid', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto('/timetable', { waitUntil: 'networkidle' });
  const link = page.locator('a[href*="/lesson?lesson="]').first();
  test.skip((await link.count()) === 0, 'no timetabled lesson to open');
  const href = (await link.getAttribute('href'))!.replace(/&amp;/g, '&');
  await page.goto(href, { waitUntil: 'domcontentloaded' });

  await expect(page.locator('.overhaul-cockpit')).toBeVisible();
  // the thin vertical action rail, with Board as the primary icon button
  await expect(page.locator('.action-rail')).toBeVisible();
  await expect(page.locator('.action-btn.action-primary')).toBeVisible();
  // the old horizontal button row is gone (decluttered top)
  await expect(page.locator('.live-bar .lesson-actions')).toHaveCount(0);

  // Focus mode: toggling lights the rail button + hides the right live-tools column
  const rightCol = page.locator('.cockpit-column').last();
  await expect(rightCol).toBeVisible();
  await page.locator('.action-rail .focus-mode-toggle').click();
  await expect(page.locator('body')).toHaveClass(/focus-mode/);
  await expect(rightCol).toBeHidden();

  expect(pageErrors, pageErrors.join('\n')).toEqual([]);
});
