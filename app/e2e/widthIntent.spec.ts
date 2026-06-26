import { test, expect } from '@playwright/test';

// Phase 4 width-intent contract (docs/UI_SEPARATION_PLAN.md): page width is set by a shell-applied
// `cockpit-w-{intent}` class on <main>, NOT by which component class the root happens to carry. We verify
// the class is present AND that it actually drives the rendered content-column width — at a wide viewport a
// `reading` page must be visibly narrower than a `wide` page. This also pins the bug fix: /pedagogy used to
// render at the 1180px `.card` width because `.card` shadowed its reading intent; it must now be ~800px.

async function contentWidth(page: import('@playwright/test').Page): Promise<number> {
  // the first element child of <main> is the page root the width rule caps.
  return page.evaluate(() => {
    const main = document.querySelector('main.cockpit-workspace') as HTMLElement;
    const child = main?.firstElementChild as HTMLElement | null;
    return child ? child.getBoundingClientRect().width : main.getBoundingClientRect().width;
  });
}

test('width intent: reading pages are narrower than wide pages, driven by the shell class', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1200 });

  // a WIDE page (schemes) — note /timetable is now 'full' width (UI rebuild), so it's no longer the
  // 'wide' exemplar; schemes carries the 'wide' intent.
  await page.goto('/schemes', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main.cockpit-workspace.cockpit-w-wide')).toBeAttached();
  const wide = await contentWidth(page);

  // a READING page (pedagogy) — was buggily 1180 before the intent fix
  await page.goto('/pedagogy', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main.cockpit-workspace.cockpit-w-reading')).toBeAttached();
  const reading = await contentWidth(page);

  expect(reading, `reading content ${reading}px should be ~800px`).toBeLessThanOrEqual(820);
  expect(wide, `wide content ${wide}px should be ~1540px`).toBeGreaterThan(1200);
  expect(reading).toBeLessThan(wide);
});
