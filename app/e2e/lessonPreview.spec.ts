import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// The flows the teacher reported broken, in a real browser. We probe real plan ids (from global-setup)
// against the live server to find one with slides / a worksheet, then assert — self-consistent and
// independent of the timetable + the Schemes UI. Skips cleanly if this DB has no suitable content (the
// cockpit nav is also covered by tests/clientAppBoot.test.ts).
function planIds(): number[] {
  try {
    return JSON.parse(readFileSync('e2e/.auth/plan-ids.json', 'utf8')) as number[];
  } catch {
    return [];
  }
}

test('cockpit slide Now/Next advances the deck', async ({ page }) => {
  test.setTimeout(120_000);
  const ids = planIds();
  test.skip(ids.length === 0, 'no lesson plans in this DB');
  let done = false;
  for (const id of ids) {
    await page.goto(`/lesson/preview?plan=${id}`, { waitUntil: 'domcontentloaded' });
    if ((await page.locator('.slide-preview .pslide').count()) < 2) continue;
    const before = await page.locator('.slide-preview .pslide.on').getAttribute('data-slide');
    await page.locator('#slide-next-btn').click();
    await expect
      .poll(() => page.locator('.slide-preview .pslide.on').getAttribute('data-slide'))
      .toBe(String(Number(before) + 1));
    await page.locator('#slide-prev-btn').click();
    await expect.poll(() => page.locator('.slide-preview .pslide.on').getAttribute('data-slide')).toBe(before);
    done = true;
    break;
  }
  test.skip(!done, 'no plan with ≥2 slides in this DB (slide nav is also covered by tests/clientAppBoot.test.ts)');
});

test('"Preview as pupil" shows the worksheet, not just the slides board', async ({ page }) => {
  test.setTimeout(120_000);
  const ids = planIds();
  test.skip(ids.length === 0, 'no lesson plans in this DB');
  // The board (/lesson/pupil-view) has NO worksheet markup at all; the pupil preview must include the
  // worksheet two-pane. Assert the worksheet structure is present (visibility depends on the pane toggle
  // + content height, which is a separate UX concern).
  let done = false;
  for (const id of ids) {
    await page.goto(`/lesson/pupil-preview?master=1&lp=${id}&level=core`, { waitUntil: 'domcontentloaded' });
    if ((await page.locator('.ws-doc, .pupil-pane-work, .ws-table, .ws-input, .ws-blank').count()) > 0) {
      await expect(page.getByText(/preview as a pupil/i)).toBeVisible(); // it's the pupil view, never the board
      await expect(page.locator('.ws-doc, .pupil-pane-work, .ws-table, .ws-input, .ws-blank').first()).toBeAttached();
      // Width regression guard: a two-pane pupil surface must be FULL-WIDTH — never squeezed into a reading
      // column by the md-doc cap (the deck's .slide-content.md-doc once shrank the whole pupil page to 800px).
      await page.setViewportSize({ width: 1280, height: 900 });
      const twopane = page.locator('.pupil-twopane');
      if (await twopane.count()) {
        const w = await twopane.first().evaluate((el) => el.getBoundingClientRect().width);
        expect(w, 'pupil two-pane must be full-width, not a 40rem/50rem reading column').toBeGreaterThan(1000);
      }
      done = true;
      break;
    }
  }
  test.skip(!done, 'no plan with a worksheet in this DB to preview');
});
