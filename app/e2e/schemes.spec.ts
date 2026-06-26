import { test, expect } from '@playwright/test';

// Schemes (`/schemes`) — UI rebuild: the scheme meta header (real stats + Spine|Classes lens) above the
// Spine lens (Units sidebar + per-unit lesson panels). The smoke test asserts it boots cleanly in the
// rebuilt shell and the spine works: a scheme with units shows the header + sidebar + a visible lesson
// panel, selecting a second unit swaps the visible panel, and there are no console errors. A course with
// no scheme yet shows the author/empty state — also valid.
test('Schemes renders in the shell with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });

  await page.goto('/schemes', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('h1', { hasText: 'Schemes of work' })).toBeVisible();
  // either a built scheme (spine) or the empty/author state — both valid
  await expect(page.locator('.sch-spine, .sch-tree-empty, .scheme-author')).not.toHaveCount(0);

  expect(errors, errors.join('\n')).toEqual([]);
});

// Exercise the client-side unit selection against the gallery's deterministic 3-unit fixture (the
// seeded dev DB may have 0–1 units, which wouldn't test the swap). The onclick scopes to .sch-spine, so
// it behaves identically on the live page.
test('Spine unit selection swaps the visible lesson panel', async ({ page }) => {
  await page.goto('/ui-gallery', { waitUntil: 'domcontentloaded' });

  const spine = page.locator('.sch-spine');
  const unitButtons = spine.locator('.sch-unit-btn');
  const panels = spine.locator('.sch-unit-panel');
  await expect(unitButtons).toHaveCount(3);

  // the first unit's panel is visible, the others hidden, on load
  await expect(panels.nth(0)).toBeVisible();
  await expect(panels.nth(1)).toBeHidden();

  // selecting the second unit shows its panel and hides the first
  await unitButtons.nth(1).click();
  await expect(panels.nth(1)).toBeVisible();
  await expect(panels.nth(0)).toBeHidden();
  await expect(unitButtons.nth(1)).toHaveClass(/active/);
});

// The Classes lens: the header toggle links to ?lens=classes, which renders the units × classes matrix
// (or its "no classes timetabled" message). Reuses the live schemes page; tolerant of seed data.
test('Scheme lens toggle switches Spine ↔ Classes', async ({ page }) => {
  await page.goto('/schemes', { waitUntil: 'domcontentloaded' });
  const classesLens = page.locator('.sch-lens a', { hasText: 'Classes' });
  test.skip((await classesLens.count()) === 0, 'no scheme on the first course to show the lens toggle');
  await classesLens.first().click();
  await page.waitForLoadState('domcontentloaded');
  await expect(page).toHaveURL(/lens=classes/);
  // either the matrix or the muted no-classes message — both valid
  await expect(page.locator('.sch-matrix, .sch-matrix-empty')).not.toHaveCount(0);
  // back to Spine
  await page.locator('.sch-lens a', { hasText: 'Spine' }).first().click();
  await page.waitForLoadState('domcontentloaded');
  await expect(page).toHaveURL(/lens=spine/);
});
