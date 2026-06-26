import { test, expect } from '@playwright/test';

// Pupils (`/pupils`, SPEC §11) — teacher-only roster. UI rebuild: a red privacy banner (AI never sees
// names) + an initials-avatar card grid, with the GDPR actions tucked into a ⋯ menu. Smoke test only.
test('Pupils renders the privacy banner + roster grid, no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.goto('/pupils', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1', { hasText: 'Pupils' })).toBeVisible();
  await expect(page.locator('.privacy-banner')).toBeVisible();
  await expect(page.locator('.privacy-banner')).toContainText('never named');
  // roster grid renders (cards when pupils exist) — the grid container is always present
  await expect(page.locator('.roster-grid')).toBeVisible();

  expect(errors, errors.join('\n')).toEqual([]);
});

// §11 cohort analytics: class chips select a roster; the selected class shows its cohort (header +
// level/completion/ATL cards). Tolerant of seed data (a class may have no levels recorded yet).
test('Pupils class chips switch to the per-class cohort view', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/pupils', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.pupil-classchips')).toBeVisible();
  const classChip = page.locator('.pupil-classchips .chip').nth(1); // [0] is "All"
  test.skip((await classChip.count()) === 0, 'no class with a roster in the seed');
  await classChip.click();
  await page.waitForLoadState('domcontentloaded');
  await expect(page).toHaveURL(/class=\d+/);
  await expect(page.locator('.cohort-head')).toBeVisible();   // class header (count · course · midpoint)
  await expect(page.locator('.roster-card .lvl-chip').first()).toBeVisible(); // each card carries a level chip
  expect(errors, errors.join('\n')).toEqual([]);
});
