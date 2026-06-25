import { test, expect } from '@playwright/test';

// Coverage (`/coverage`, SPEC §9) — UI rebuild: spec-area cards + % bars + status-dot rows, with an
// All · Covered · Gaps filter. Smoke test: boots cleanly in the shell, shows the course selector + the
// coverage report (area cards) or a muted no-scheme/no-course message, and the filter navigates — no
// console errors.
test('Coverage renders in the shell with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });

  await page.goto('/coverage', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1', { hasText: 'Curriculum coverage' })).toBeVisible();
  // the §9 report (area cards or its filter) or a muted no-scheme/no-course message — all valid
  await expect(page.locator('.cov-report, .cov-area, .coverage .muted, .setup .muted')).not.toHaveCount(0);

  // when a report renders, the Gaps filter chip navigates with ?cov=gaps
  const gaps = page.locator('.cov-filter a', { hasText: 'Gaps' });
  if (await gaps.count()) {
    await gaps.first().click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/[?&]cov=gaps/);
  }

  expect(errors, errors.join('\n')).toEqual([]);
});
