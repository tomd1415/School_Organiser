import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Two-context slide-sync: the teacher's cockpit drives + locks the pupil's slide deck live over SSE.
// This is the headline feature from the trial ("move the pupils' slides… lock the pupil's slide and
// unlock it"). It runs as ONE browser context with TWO pages — the test pupil is a session overlay on the
// teacher's own session, so both pages share the cookie jar (teacher cockpit + the test pupil's /me).
//
// The pupil deck only renders (and subscribes to SSE) when its section has BOTH slides and a worksheet,
// so the test finds such a plan, binds it to the occurrence via the cockpit's plan picker, then asserts
// the round-trip. Skips cleanly if the dev DB has no suitable plan/lesson.

function planIds(): number[] {
  try {
    return JSON.parse(readFileSync('e2e/.auth/plan-ids.json', 'utf8')) as number[];
  } catch {
    return [];
  }
}

test('teacher drives + locks the pupil deck live over SSE (one session, two pages)', async ({ page, context }) => {
  test.setTimeout(90_000);

  // Find a plan with BOTH ≥2 (core) slides and a worksheet — the pupil deck needs both to render.
  let plan: number | null = null;
  for (const id of planIds()) {
    const r = await page.request.get(`/lesson/pupil-preview?master=1&lp=${id}&level=core`);
    if (!r.ok()) continue;
    const html = await r.text();
    const slides = (html.match(/class="pslide[ "]/g) || []).length;
    if (slides >= 2 && /class="ws-doc"/.test(html)) {
      plan = id;
      break;
    }
  }
  test.skip(!plan, 'no plan with ≥2 slides AND a worksheet in the dev DB');

  // The force-live launcher (also under test) lists guaranteed-valid lesson + "today" date pairs. Walk
  // them and open each live cockpit until one yields a REAL occurrence-course (a form/empty period has
  // none → oc 0). Read that section's oc id + a CSRF token from the rendered cockpit.
  const fl = await page.request.get('/dev/force-live');
  expect(fl.ok()).toBeTruthy();
  const flHtml = await fl.text();
  const links = [...flHtml.matchAll(/\/lesson\?lesson=(\d+)&(?:amp;)?date=(\d{4}-\d{2}-\d{2})/g)];
  test.skip(links.length === 0, 'no timetabled teaching lesson in the dev DB');

  let lesson = '';
  let date = '';
  let oc = '';
  let csrf = '';
  for (const m of links) {
    const res = await page.request.get(`/lesson?lesson=${m[1]}&date=${m[2]}`);
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
  test.skip(!oc || !csrf, 'no lesson yielded a real occurrence-course in the dev DB');

  // Bind the slides+worksheet plan to that occurrence-course (so both the cockpit and /me get a deck).
  const bind = await page.request.post(`/occurrence-course/${oc}/plan`, {
    headers: { 'x-csrf-token': csrf!, 'content-type': 'application/x-www-form-urlencoded' },
    data: `lesson_plan_id=${plan}`,
  });
  expect(bind.ok(), `bind plan ${plan}→oc ${oc} failed (${bind.status()})`).toBeTruthy();

  // Teacher page: cockpit now shows the slides card with the live controls.
  const teacher = page;
  await teacher.goto(`/lesson?lesson=${lesson}&date=${date}&oc=${oc}`, { waitUntil: 'domcontentloaded' });
  const slidesCard = teacher.locator(`.slides-card[data-oc="${oc}"]`);
  await expect(slidesCard).toBeVisible();
  // need ≥2 slides in the cockpit deck for "Next" to advance
  expect(await teacher.locator('.slide-preview .pslide').count()).toBeGreaterThanOrEqual(2);

  // Pupil page (same context → same session): set the test-pupil overlay, then open /me.
  const open = await page.request.post('/test-pupil/open', {
    headers: { 'x-csrf-token': csrf!, 'content-type': 'application/x-www-form-urlencoded' },
    data: `lesson=${lesson}&date=${date}&level=core`,
    maxRedirects: 0,
  });
  expect([200, 302]).toContain(open.status());

  const pupil = await context.newPage();
  const sseReady = pupil.waitForResponse((r) => r.url().includes('/me/slide-stream'), { timeout: 20_000 });
  await pupil.goto('/me', { waitUntil: 'domcontentloaded' });
  const deck = pupil.locator(`.pupil-slides[data-deck="${oc}"]`);
  await expect(deck).toBeVisible();
  await sseReady; // EventSource connected (200 headers received) — live events will now arrive

  // The slide deck persists current_slide per occurrence, so on connect the pupil lands on whatever slide
  // was last set (possibly non-zero from an earlier test). Normalise to slide 0 over SSE first — the
  // teacher's cockpit always starts its own deck at 0, so "Previous" publishes index 0 — then prove
  // "Next" advances the pupil deck to slide 1.
  const slideOf = async () => deck.locator('.pslide.on').getAttribute('data-slide');
  await teacher.locator('#slide-prev-btn').click();
  await expect.poll(slideOf, { timeout: 15_000 }).toBe('0');
  await teacher.locator('#slide-next-btn').click();
  await expect.poll(slideOf, { timeout: 15_000 }).toBe('1');

  // Teacher LOCKS → pupil deck locks (can't roam): data-locked flips, own Next disabled. The cockpit lock
  // button starts unlocked, so the first click always locks regardless of any persisted lock state.
  await teacher.locator('#slide-lock-btn').click();
  await expect(deck).toHaveAttribute('data-locked', 'true', { timeout: 15_000 });
  await expect(deck.locator('.pslide-next')).toBeDisabled();

  // Teacher UNLOCKS → pupil can roam again.
  await teacher.locator('#slide-lock-btn').click();
  await expect(deck).toHaveAttribute('data-locked', 'false', { timeout: 15_000 });
});
