import { test, expect } from '@playwright/test';

// Planner (`/planner`) — the lesson-laying drag-grid (the repo's own curriculum-planning feature; the
// prototype's "Planner (time & actuals)" §6 maps to /time, not here). This is a design-system alignment
// (wide width), so the smoke test just asserts it boots cleanly in the rebuilt shell: the page renders the
// drag grid (when a class has weekly slots) or a "no slots" message — both valid — with no console errors.
test('Planner renders in the shell with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });

  await page.goto('/planner', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1', { hasText: 'Planner' })).toBeVisible();
  // the drag grid (has weekly slots) or the muted "no slots / unavailable" message — both are valid
  await expect(page.locator('.pl-grid-wrap, .card p.muted')).not.toHaveCount(0);
  // the wide width intent is applied by the shell
  await expect(page.locator('main.cockpit-w-wide')).toBeVisible();

  expect(errors, errors.join('\n')).toEqual([]);
});
