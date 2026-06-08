import { defineConfig } from 'vitest/config';

// Phase 0 smoke tests run without a database (they only exercise auth-redirect
// and the login page). Env here satisfies config.ts validation at import time.
export default defineConfig({
  test: {
    environment: 'node',
    // Unit suite only; DB-backed tests live in tests/integration and run via
    // `npm run test:integration` (see vitest.integration.config.ts).
    include: ['tests/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      SESSION_KEY: '0'.repeat(64),
      APP_PASSWORD_HASH: 'scrypt$00$00',
      DATABASE_URL: 'postgres://localhost:5999/none',
      COOKIE_SECURE: 'false',
    },
  },
});
