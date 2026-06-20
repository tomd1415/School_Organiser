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
  // BUG-045: behind a reverse proxy (production Caddy), the real client IP is in X-Forwarded-For; without
  // this every request looks like it comes from the proxy and the per-IP rate limits collapse to one
  // address. Empty/'false' (dev, no proxy) = trust the socket address; 'true' or a hop count / subnet =
  // read the forwarded IP. The Caddyfile OVERWRITES X-Forwarded-For with the real client, so 'true' is
  // safe (a client-supplied header can't survive). Stays empty for host dev (`npm run dev`, no proxy).
  TRUST_PROXY: z.string().default(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid app configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const appConfig = parsed.data;
