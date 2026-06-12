import 'dotenv/config';
import { z } from 'zod';

// Everything the web server needs. Validated when the server (or auth routes) load,
// not when the standalone migrate script runs.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(44360),
  HOST: z.string().min(1).default('0.0.0.0'),
  // 32 bytes as 64 hex chars — used to encrypt the session cookie.
  SESSION_KEY: z.string().regex(/^[0-9a-fA-F]{64}$/, 'SESSION_KEY must be 64 hex chars (32 bytes)'),
  APP_PASSWORD_HASH: z.string().default(''), // optional: a fresh instance sets its password in the onboarding wizard (settings)
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid app configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const appConfig = parsed.data;
