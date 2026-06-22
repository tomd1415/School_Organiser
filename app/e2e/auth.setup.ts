import { test as setup, expect } from '@playwright/test';

// Log in once as the teacher (password "test" via APP_PASSWORD_HASH) and save the session, so the smoke
// specs start authed. Runs as a Playwright "setup" project the chromium project depends on.
const AUTH_FILE = 'e2e/.auth/teacher.json';

setup('authenticate as teacher', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="password"]', 'test');
  await page.locator('input[name="password"]').press('Enter'); // submit the plain login form
  // The server redirects to the Now screen on success — wait until we've left /login.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
  // Sanity: an authed page renders the navigation rail.
  await expect(page.locator('.scaffolded-ribbon')).toBeVisible();
  await page.context().storageState({ path: AUTH_FILE });
});
