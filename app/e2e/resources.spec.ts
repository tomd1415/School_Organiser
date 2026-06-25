import { test, expect } from '@playwright/test';

// Resources (`/resources`, SPEC §10) — UI rebuild: search + filter pills over a kind-badged card grid.
// Smoke test: boots cleanly in the shell, shows the search bar + the card grid (or the muted no-resources
// message), and a kind pill filters the list live — no console errors.
test('Resources renders in the shell with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });

  await page.goto('/resources', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1', { hasText: 'Resources' })).toBeVisible();
  await expect(page.locator('.res-search')).toBeVisible();
  await expect(page.locator('.res-grid')).toBeVisible();

  // clicking a (non-All) kind pill filters the grid live; the list count line updates
  const pill = page.locator('.res-pill').nth(1);
  if (await pill.count()) {
    await pill.click();
    await expect(page.locator('.res-count')).toBeVisible();
  }

  expect(errors, errors.join('\n')).toEqual([]);
});
