import { describe, expect, it, beforeEach } from 'vitest';
import { allowAttempt, clearAttempts, resetRateLimiter } from '../src/auth/rateLimit';

describe('rateLimit — login attempt throttle', () => {
  beforeEach(() => resetRateLimiter());

  it('allows up to max attempts within the window, then blocks', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) expect(allowAttempt('k', 5, 60_000, t0)).toBe(true);
    expect(allowAttempt('k', 5, 60_000, t0)).toBe(false);
  });

  it('forgets attempts once the window passes', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) allowAttempt('k', 5, 60_000, t0);
    expect(allowAttempt('k', 5, 60_000, t0)).toBe(false);
    expect(allowAttempt('k', 5, 60_000, t0 + 60_001)).toBe(true);
  });

  it('clearAttempts resets a key (used after a successful login)', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) allowAttempt('k', 5, 60_000, t0);
    clearAttempts('k');
    expect(allowAttempt('k', 5, 60_000, t0)).toBe(true);
  });

  it('keys are independent', () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) allowAttempt('a', 5, 60_000, t0);
    expect(allowAttempt('a', 5, 60_000, t0)).toBe(false);
    expect(allowAttempt('b', 5, 60_000, t0)).toBe(true);
  });
});
