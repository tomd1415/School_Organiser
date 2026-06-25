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
