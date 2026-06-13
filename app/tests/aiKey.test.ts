import { describe, expect, it } from 'vitest';
import { resolveApiKey, aiKeyConfigured, AI_KEY_ENV_MANAGED } from '../src/llm/client';

// The teacher can store their own API key in Settings (it overrides nothing in test). The
// load-bearing guarantee: in test mode the resolver returns NO key and NEVER reads the settings
// table — so the unit suite is DB-free and the integration suite (which shares the real dev DB,
// where a real key may be stored) can never trigger a live provider call. This test runs under
// NODE_ENV=test with no ANTHROPIC_API_KEY env var, exactly like both suites.
describe('AI key resolution (the no-real-calls-in-tests safety net)', () => {
  it('resolves to an empty key in test mode without touching the settings DB', async () => {
    // If resolveApiKey consulted getSetting here it would hit the (absent) DB and hang/throw;
    // returning '' promptly proves it short-circuits before any DB read in test mode.
    await expect(resolveApiKey()).resolves.toBe('');
  });

  it('reports no key configured in test mode', async () => {
    expect(await aiKeyConfigured()).toBe(false);
  });

  it('is not env-managed when ANTHROPIC_API_KEY is unset', () => {
    expect(AI_KEY_ENV_MANAGED).toBe(false);
  });
});
