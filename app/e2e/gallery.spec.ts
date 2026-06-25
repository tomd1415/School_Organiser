import { test, expect } from '@playwright/test';

// Phase 1 of the UI separation plan: the component gallery renders view fns with fixture data (no DB) so
// the UI can be redesigned/verified in isolation. This guard asserts it loads cleanly + shows each section,
// and snapshots it as a visual-regression baseline (a redesign's diffs then become reviewable screenshots).
test('UI gallery renders every showcased component with no client-side errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });

  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.goto('/ui-gallery', { waitUntil: 'domcontentloaded' });

  await expect(page.locator('h1', { hasText: 'UI gallery' })).toBeVisible();
  // each section renders (component kit + 7 fixture-backed views)
  await expect(page.locator('.gallery-item')).toHaveCount(8);
  await expect(page.locator('.gallery-stage .captured-card').first()).toBeVisible(); // Captured cards
  await expect(page.locator('.gallery-stage .note-card').first()).toBeVisible(); // Notes grid
  await expect(page.locator('.gallery-stage .event-card').first()).toBeVisible(); // Events grouped
  await expect(page.locator('.gallery-stage .toggle-switch').first()).toBeVisible(); // component kit toggle
  await expect(page.locator('.gallery-stage .pslide').first()).toBeVisible(); // slide deck
  await expect(page.locator('.gallery-stage .ws-doc')).toBeVisible(); // worksheet
  await expect(page.locator('.gallery-stage .timeline-slot').first()).toBeVisible(); // now timeline

  expect(errors, errors.join('\n')).toEqual([]);
  await page.screenshot({ path: 'test-results/ui-gallery.png', fullPage: true });
});
