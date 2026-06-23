import { test, expect } from '@playwright/test';

// The Now screen must fit on ONE screen in portrait (target: a 1080×1920 desk monitor turned 90°) with a
// multi-column layout and a thin (~⅓-width) timeline — not collapse into one long scroll.

async function gridTracks(page: import('@playwright/test').Page): Promise<number[]> {
  const cols = await page.locator('.now-grid').evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  return cols.split(' ').filter(Boolean).map((v) => parseFloat(v));
}

test('Now fits a 1080×1920 portrait monitor with a thin-timeline 3-column grid', async ({ page }) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.now-grid')).toBeVisible();

  const tracks = await gridTracks(page);
  expect(tracks).toHaveLength(3); // did NOT collapse to one column
  // the middle column (timeline) is the thinnest — roughly a third of the usable width
  expect(tracks[1]).toBeLessThan(tracks[0]!);
  expect(tracks[1]).toBeLessThan(tracks[2]!);
  const total = tracks[0]! + tracks[1]! + tracks[2]!;
  expect(tracks[1]! / total).toBeLessThan(0.34);
  expect(tracks[1]! / total).toBeGreaterThan(0.22);

  // everything fits on one screen — no meaningful vertical scroll
  const { scrollH, clientH } = await page.evaluate(() => {
    const el = document.scrollingElement || document.documentElement;
    return { scrollH: el.scrollHeight, clientH: el.clientHeight };
  });
  expect(scrollH, `content ${scrollH}px must fit the ${clientH}px viewport`).toBeLessThanOrEqual(clientH + 8);

  await page.screenshot({ path: 'test-results/now-portrait.png' });
});

test('landscape keeps the wide 3-column layout', async ({ page }) => {
  await page.setViewportSize({ width: 1536, height: 864 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const tracks = await gridTracks(page);
  expect(tracks).toHaveLength(3);
  await page.screenshot({ path: 'test-results/now-landscape.png' });
});
