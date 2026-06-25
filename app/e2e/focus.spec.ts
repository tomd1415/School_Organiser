import { test, expect } from '@playwright/test';

// Focus (SPEC §5) in a real browser: the one-thing-now surface renders with its 3-mode segmented control
// and either a focus card (a task was picked) or a wind-down/empty banner — both are valid states — and the
// page boots with no client-side errors. Robust to whatever task data this DB has.
test('Focus renders the one-thing-now surface + mode tabs, no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });

  await page.goto('/focus', { waitUntil: 'domcontentloaded' });

  // the 3-mode segmented control (Morning / Free period / End of day)
  await expect(page.locator('.focus-modes .seg-tab')).toHaveCount(3);
  // either a picked-task card or a wind-down/empty banner is shown
  await expect(page.locator('.focus-card, .focus-done')).not.toHaveCount(0);

  // switching mode navigates and keeps the surface valid
  await page.locator('.focus-modes .seg-tab', { hasText: 'End of day' }).click();
  await expect(page).toHaveURL(/mode=end_of_day/);
  await expect(page.locator('.focus-modes .seg-tab')).toHaveCount(3);

  expect(errors, errors.join('\n')).toEqual([]);
});
