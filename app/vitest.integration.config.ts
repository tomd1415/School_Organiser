import { defineConfig } from 'vitest/config';

// Integration tests run against the real dev database (docker compose, port 5434).
// Kept separate from `npm test` so the unit suite stays DB-free and always green.
// Run with the stack up:  ./start.sh  then  cd app && npm run test:integration
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    // All integration files hit the ONE shared dev DB, and some assert on global row counts
    // (e.g. "converting without a key materialises nothing"). Run files serially so concurrent
    // scratch-data churn in another file can't race those assertions.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      SESSION_KEY: '0'.repeat(64),
      // hash of the password "test" (used by the authenticated screens test)
      APP_PASSWORD_HASH:
        'scrypt:d58f21eb0ab257d6e0822766bb763c9a:9e2bec377d007afe7c2bea05ad2cb80970c9c3c7af7d126b6e7d82b7cd597a0d791a2b9aa5831c5cbe4820ffa9384ca4f023ff3df7e2d9b675bbbfa3ec612cbc',
      DATABASE_URL: 'postgres://organiser:organiser@localhost:5434/organiser',
      COOKIE_SECURE: 'false',
      RESOURCE_STORE_PATH: '/tmp/so-test-resources',
      // Force the AI off in tests — no real provider call, no spend, ever.
      ANTHROPIC_API_KEY: '',
    },
  },
});
