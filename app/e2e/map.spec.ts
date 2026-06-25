import { test, expect } from '@playwright/test';

// Curriculum map (`/map`, SPEC §8) — UI rebuild: the term-calendar timeline rail. The smoke test asserts
// it boots cleanly in the rebuilt shell: the page renders the timeline (with its drag hooks) when a slot
// exists, or the muted "no weekly slots" message — both valid — with no console errors.
test('Map renders in the shell with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });

  await page.goto('/map', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1', { hasText: 'Curriculum map' })).toBeVisible();
  // the timeline rail (when a weekly slot exists) or the muted "no slots" message — both valid
  await expect(page.locator('.map-timeline, .map p.muted, .map .muted')).not.toHaveCount(0);

  // when a rail renders it carries the drag hooks the client uses to move future weeks
  const rail = page.locator('.map-timeline');
  if (await rail.count()) {
    await expect(rail).toHaveAttribute('data-map-slot', /^\d+:\d+$/);
  }

  expect(errors, errors.join('\n')).toEqual([]);
});
