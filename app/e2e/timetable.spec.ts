import { test, expect } from '@playwright/test';

// Timetable (`/timetable`) — the week grid. Design-system alignment pass (full width + portrait
// scroll via .table-scroll/min-width on .tt-table). The smoke test asserts it boots cleanly in the
// rebuilt shell: the grid renders (or a muted "DB unavailable" message), the readiness-dot legend is
// present, week nav works, the full width intent is applied, and there are no console errors.
test('Timetable renders in the shell with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });

  await page.goto('/timetable', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1', { hasText: 'Timetable' })).toBeVisible();
  // the week grid (when an academic year/structure exists) or the muted "unavailable" message — both valid
  await expect(page.locator('table.tt-table, .tt-overhaul p.muted')).not.toHaveCount(0);
  // the readiness-dot legend is part of the rebuilt screen
  await expect(page.locator('.tt-legend')).toBeVisible();
  // the full width intent is applied by the shell
  await expect(page.locator('main.cockpit-w-full')).toBeVisible();

  expect(errors, errors.join('\n')).toEqual([]);
});

test('Timetable week nav advances to the next week', async ({ page }) => {
  await page.goto('/timetable', { waitUntil: 'domcontentloaded' });
  await page.locator('.tt-weeknav a', { hasText: 'Next' }).click();
  await page.waitForLoadState('domcontentloaded');
  // a ?date= query param is now present (the nav navigated to a specific week)
  await expect(page).toHaveURL(/[?&]date=\d{4}-\d{2}-\d{2}/);
  await expect(page.locator('h1', { hasText: 'Timetable' })).toBeVisible();
});
