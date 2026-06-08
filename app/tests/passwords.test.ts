import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../src/lib/passwords';

// Guards the scrypt format: ':' separators (not '$', which docker-compose
// interpolates and would corrupt), while still verifying legacy '$' hashes.

describe('passwords', () => {
  const pw = 'correct horse battery staple';

  it('round-trips and uses a $-free format safe for .env / compose', () => {
    const hash = hashPassword(pw);
    expect(hash.startsWith('scrypt:')).toBe(true);
    expect(hash).not.toContain('$');
    expect(verifyPassword(pw, hash)).toBe(true);
    expect(verifyPassword('wrong', hash)).toBe(false);
  });

  it('still verifies a legacy $-separated hash (same salt + key)', () => {
    const legacy = hashPassword(pw).replace(/:/g, '$');
    expect(legacy).toContain('$');
    expect(verifyPassword(pw, legacy)).toBe(true);
    expect(verifyPassword('nope', legacy)).toBe(false);
  });

  it('rejects malformed hashes without throwing', () => {
    expect(verifyPassword(pw, 'not-a-hash')).toBe(false);
    expect(verifyPassword(pw, 'scrypt:onlytwo')).toBe(false);
    expect(verifyPassword(pw, '')).toBe(false);
    expect(verifyPassword(pw, 'bcrypt:aa:bb')).toBe(false);
  });
});
