import { defineConfig, devices } from '@playwright/test';

// Real-browser smoke suite. This is the layer app.inject + jsdom can't cover: it boots the actual server,
// runs the real client JS in Chromium, and clicks through the flows that have repeatedly broken (the
// app.js load-crash, cockpit slide Now/Next, "preview as pupil" showing the worksheet). Deliberately
// SMALL + high-value — not blanket coverage (browsers are slower/flakier than the unit run).
//
// Prereq: the dev DB must be up (./start.sh, or `docker compose -f docker-compose.yml up -d db`). The
// webServer below boots a throwaway app instance on :44361 against that DB, with a known login (password
// "test") via APP_PASSWORD_HASH so auth is deterministic. No AI calls are ever made (empty key).
const PORT = 44361;
const BASE = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  outputDir: './test-results',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false, // shares one app instance + one dev DB
  workers: 1,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/teacher.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npx tsx src/server.ts',
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      NODE_ENV: 'test',
      PORT: String(PORT),
      HOST: '127.0.0.1',
      DATABASE_URL: 'postgres://organiser:organiser@localhost:5434/organiser',
      SESSION_KEY: '0'.repeat(64),
      // scrypt hash of the password "test" (same as the integration config) — env wins over the DB setting.
      APP_PASSWORD_HASH:
        'scrypt:d58f21eb0ab257d6e0822766bb763c9a:9e2bec377d007afe7c2bea05ad2cb80970c9c3c7af7d126b6e7d82b7cd597a0d791a2b9aa5831c5cbe4820ffa9384ca4f023ff3df7e2d9b675bbbfa3ec612cbc',
      COOKIE_SECURE: 'false',
      // Point at the REAL dev resource store so worksheet/slide content (stored as files) actually
      // resolves — an empty dir makes every worksheet/deck render empty. Read-only in these previews.
      RESOURCE_STORE_PATH: '/home/duguid/projects/School_Organiser/data/resources',
      ANTHROPIC_API_KEY: '',
    },
  },
});
