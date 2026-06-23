import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Phase 0 board slide-sync: the projector board (/lesson/pupil-view opened from a LIVE cockpit) FOLLOWS the
// teacher's slide navigation over SSE — like a pupil's /me does, but via the teacher-readable stream
// /lesson/oc/:id/slide-stream. One browser context (the teacher), two pages: cockpit drives, board follows.

function planIds(): number[] {
  try {
    return JSON.parse(readFileSync('e2e/.auth/plan-ids.json', 'utf8')) as number[];
  } catch {
    return [];
  }
}

test('the projector board follows the cockpit’s slide navigation over SSE', async ({ page, context }) => {
  test.setTimeout(90_000);

  // A plan with >=2 slides (the board only needs slides, not a worksheet).
  let plan: number | null = null;
  for (const id of planIds()) {
    const r = await page.request.get(`/lesson/pupil-preview?master=1&lp=${id}&level=core`);
    if (!r.ok()) continue;
    if ((((await r.text()).match(/class="pslide[ "]/g)) || []).length >= 2) {
      plan = id;
      break;
    }
  }
  test.skip(!plan, 'no plan with ≥2 slides in the dev DB');

  // A sandbox lesson that yields a real occurrence-course; bind the slides plan to it.
  const fl = await page.request.get('/test-lab');
  const links = [...(await fl.text()).matchAll(/\/lesson\?lesson=(\d+)&(?:amp;)?date=(\d{4}-\d{2}-\d{2})/g)];
  test.skip(links.length === 0, 'no timetabled lesson');
  let lesson = '';
  let date = '';
  let oc = '';
  let csrf = '';
  for (const m of links) {
    const res = await page.request.get(`/lesson?lesson=${m[1]}&date=${m[2]}&lab=1`);
    if (!res.ok()) continue;
    const html = await res.text();
    const real = [...html.matchAll(/id="oc-(\d+)-plan"/g)].map((x) => x[1]!).find((n) => Number(n) > 0);
    if (real) {
      lesson = m[1]!;
      date = m[2]!;
      oc = real;
      csrf = html.match(/name="_csrf" value="([^"]+)"/)?.[1] ?? '';
      break;
    }
  }
  test.skip(!oc || !csrf, 'no sandbox occurrence-course');
  const bind = await page.request.post(`/occurrence-course/${oc}/plan`, {
    headers: { 'x-csrf-token': csrf!, 'content-type': 'application/x-www-form-urlencoded' },
    data: `lesson_plan_id=${plan}`,
  });
  expect(bind.ok()).toBeTruthy();

  // Teacher cockpit (drives). Read the real "Open board screen" href (it now carries &oc=).
  const teacher = page;
  await teacher.goto(`/lesson?lesson=${lesson}&date=${date}&oc=${oc}&lab=1`, { waitUntil: 'domcontentloaded' });
  await expect(teacher.locator(`.slides-card[data-oc="${oc}"]`)).toBeVisible();
  expect(await teacher.locator('.slide-preview .pslide').count()).toBeGreaterThanOrEqual(2);
  const boardHref = await teacher.locator('a:has-text("Open board screen")').getAttribute('href');
  expect(boardHref, 'board link carries the live occurrence').toContain(`oc=${oc}`);

  // Board page (follows). Its deck subscribes to the teacher stream for this oc.
  const board = await context.newPage();
  const sseReady = board.waitForResponse((r) => r.url().includes(`/lesson/oc/${oc}/slide-stream`), { timeout: 20_000 });
  await board.goto(boardHref!, { waitUntil: 'domcontentloaded' });
  const deck = board.locator(`.pupil-slides[data-deck="${oc}"]`);
  await expect(deck).toBeVisible();
  await sseReady; // SSE connected — live moves now arrive

  const slideOf = async () => deck.locator('.pslide.on').getAttribute('data-slide');
  // Normalise to slide 0 (persisted state may be non-zero), then prove Next advances the BOARD.
  await teacher.locator('#slide-prev-btn').click();
  await expect.poll(slideOf, { timeout: 15_000 }).toBe('0');
  await teacher.locator('#slide-next-btn').click();
  await expect.poll(slideOf, { timeout: 15_000 }).toBe('1');
});
