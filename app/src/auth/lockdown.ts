// Deny-by-default surfaces for the limited roles. A session whose role appears here may only
// touch URLs matching its allowlist — everything else bounces to that role's home. The teacher
// role has no entry: teachers see everything. (Proven with the TA role; pupils get the same
// treatment at pupil strength — note pupils get NO /resources/* access: worksheet content is
// rendered server-side into /me, never served as files.)

export type LimitedRole = 'ta' | 'pupil';

export const ROLE_ALLOWED: Record<LimitedRole, RegExp[]> = {
  ta: [
    /^\/ta($|\/|\?)/,
    /^\/login/,
    /^\/logout/,
    /^\/static\//,
    /^\/healthz/,
    /^\/resources\/\d+\/(view|download|present|download\.docx)$/,
  ],
  pupil: [/^\/me($|\/|\?)/, /^\/pupil($|\/|\?)/, /^\/logout/, /^\/static\//, /^\/healthz/],
};

export const ROLE_HOME: Record<LimitedRole, string> = { ta: '/ta', pupil: '/me' };

export function isLimitedRole(role: unknown): role is LimitedRole {
  return role === 'ta' || role === 'pupil';
}

/** True when this role may request this URL. */
export function roleAllows(role: LimitedRole, url: string): boolean {
  return ROLE_ALLOWED[role].some((re) => re.test(url));
}
