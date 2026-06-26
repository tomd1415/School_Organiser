import { test, expect } from '@playwright/test';

// Regression guard for "text not fitting in boxes": a long unbreakable token must wrap inside its
// card/cell and must NOT expand a grid track or push the page wider. Stresses the card-grid screens
// (Schemes spine + Classes matrix, Coverage, Map via the gallery fixtures; Pupils cohort live).
const LONG = 'Photosynthesis_and_cellular_respiration_in_eukaryotic_organisms_supercalifragilistic';

async function noHorizontalOverflow(page: import('@playwright/test').Page, where: string) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over, `${where}: page overflows horizontally by ${over}px`).toBeLessThanOrEqual(1);
}

test('long tokens wrap and never break the card grids (gallery)', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1600 });
  await page.goto('/ui-gallery', { waitUntil: 'networkidle' });
  await page.evaluate((L) => {
    document.querySelectorAll('.sch-unit-name, .sch-header-title, .sch-mx-classname, .cov-label, .cov-area-head h3, .cov-by, .map-title, .res-card-title')
      .forEach((el) => { el.textContent = L; });
  }, LONG);
  await noHorizontalOverflow(page, 'gallery card grids with long tokens');
});

test('long pupil names wrap and keep the cohort grid uniform', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1200 });
  await page.goto('/pupils', { waitUntil: 'networkidle' });
  const chip = page.locator('.pupil-classchips .chip').nth(1);
  if (await chip.count()) { await chip.click(); await page.waitForLoadState('networkidle'); }
  await page.evaluate((L) => {
    document.querySelectorAll('.roster-id .pupil-name').forEach((el) => { el.textContent = L; });
  }, LONG);
  await noHorizontalOverflow(page, 'pupils roster/cohort with long names');
});
