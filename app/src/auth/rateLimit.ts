// A small in-memory sliding-window rate limiter for login attempts (single-instance app, so no
// shared store needed). Keys are caller-chosen strings like "login:1.2.3.4" or "pin:17".
// This guards the *attempt rate*; the durable per-pupil lockout lives in pupil_credentials.

const attempts = new Map<string, number[]>();

/** Record an attempt and return true if it is allowed (≤ max within windowMs). */
export function allowAttempt(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const cutoff = now - windowMs;
  const list = (attempts.get(key) ?? []).filter((t) => t > cutoff);
  if (list.length >= max) {
    attempts.set(key, list);
    return false;
  }
  list.push(now);
  attempts.set(key, list);
  // Opportunistic cleanup so the map cannot grow without bound.
  if (attempts.size > 5000) {
    for (const [k, v] of attempts) if (v.every((t) => t <= cutoff)) attempts.delete(k);
  }
  return true;
}

/** Clear one key (e.g. after a successful login). */
export function clearAttempts(key: string): void {
  attempts.delete(key);
}

/** Test hook. */
export function resetRateLimiter(): void {
  attempts.clear();
}
