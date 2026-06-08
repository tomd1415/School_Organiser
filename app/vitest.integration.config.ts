import { defineConfig } from 'vitest/config';

// Integration tests run against the real dev database (docker compose, port 5434).
// Kept separate from `npm test` so the unit suite stays DB-free and always green.
// Run with the stack up:  ./start.sh  then  cd app && npm run test:integration
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      SESSION_KEY: '0'.repeat(64),
      APP_PASSWORD_HASH: 'scrypt:00:00',
      DATABASE_URL: 'postgres://organiser:organiser@localhost:5434/organiser',
      COOKIE_SECURE: 'false',
    },
  },
});
