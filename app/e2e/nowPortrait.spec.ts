import { test, expect } from '@playwright/test';

// The Now screen must fit on ONE screen in portrait (target: a 1080×1920 desk monitor turned 90°) with a
// multi-column layout and a thin (~⅓-width) timeline — not collapse into one long scroll.

async function gridTracks(page: import('@playwright/test').Page): Promise<number[]> {
  const cols = await page.locator('.now-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  return cols.split(' ').filter(Boolean).map((v) => parseFloat(v));
}

test('Now fits a 1080×1920 portrait monitor — timeline ⅓ left, content ⅔ right, filled', async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.now-hero')).toBeVisible(); // the rebuilt hero sits above the grid
  await expect(page.locator('.now-grid')).toBeVisible();

  const tracks = await gridTracks(page);
  expect(tracks).toHaveLength(2); // two columns: timeline (left) + content (right)
  // the LEFT column (timeline) is the thinner ~⅓; the right content column takes ~⅔
  expect(tracks[0]).toBeLessThan(tracks[1]!);
  const total = tracks[0]! + tracks[1]!;
  expect(tracks[0]! / total).toBeGreaterThan(0.28);
  expect(tracks[0]! / total).toBeLessThan(0.40);

  // everything fits on one screen — the workspace (the real scroll container, overflow-y:auto) must not
  // scroll — AND the content should fill most of the height (redistributed, not bunched at the top).
  const { scrollH, clientH } = await page.evaluate(() => {
    const el = document.querySelector('main.cockpit-workspace') as HTMLElement;
    return { scrollH: el.scrollHeight, clientH: el.clientHeight };
  });
  expect(scrollH, `workspace content ${scrollH}px must fit its ${clientH}px height (no scroll)`).toBeLessThanOrEqual(clientH + 8);
  const fill = await page.locator('.now-grid').evaluate((el) => el.getBoundingClientRect().height);
  expect(fill, `grid ${fill}px should fill most of the ${clientH}px workspace`).toBeGreaterThan(clientH * 0.8);

  await page.screenshot({ path: 'test-results/now-portrait.png' });
});

test('landscape keeps the wide 3-column layout', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 864 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const tracks = await gridTracks(page);
  expect(tracks).toHaveLength(3);
  await page.screenshot({ path: 'test-results/now-landscape.png' });
});
