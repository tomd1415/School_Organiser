import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { applyClassIntake } from '../../src/services/classIntake';
import { getGroupTeachingContext, getGroupAbility, getGuidedAccess, getCoveredSummary } from '../../src/repos/adaptations';

// Phase 11 — class-intake. applyClassIntake fills the per-class fields; the intake route degrades to
// "AI is off"; the covered-summary route saves. Mutates one real class row, snapshotted + restored.
let app: FastifyInstance;
let cookie = '';
let token = '';
let gc = 0;
let snap: { tc: string | null; ab: string | null; ga: unknown; cov: string | null } = { tc: null, ab: null, ga: null, cov: null };

function firstCookie(setCookie: string | string[] | undefined): string {
  const v = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return (v ?? '').split(';')[0] ?? '';
}
const post = (url: string, payload: string) =>
  app.inject({ method: 'POST', url, headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' }, payload });

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  const page = await app.inject({ method: 'GET', url: '/login' });
  token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
  const pre = firstCookie(page.headers['set-cookie']);
  const res = await app.inject({ method: 'POST', url: '/login', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre }, payload: `_csrf=${encodeURIComponent(token)}&password=test` });
  cookie = firstCookie(res.headers['set-cookie']) || pre;
  const r = await pool.query<{ id: number; tc: string | null; ab: string | null; ga: unknown; cov: string | null }>(
    `SELECT id, teaching_context AS tc, ability_midpoint AS ab, guided_access AS ga, covered_summary AS cov FROM group_courses ORDER BY id LIMIT 1`,
  );
  if (r.rows[0]) {
    gc = r.rows[0].id;
    snap = { tc: r.rows[0].tc, ab: r.rows[0].ab, ga: r.rows[0].ga, cov: r.rows[0].cov };
  }
});

afterAll(async () => {
  if (gc) {
    await pool.query(`UPDATE group_courses SET teaching_context=$2, ability_midpoint=$3, guided_access=$4::jsonb, covered_summary=$5 WHERE id=$1`, [
      gc, snap.tc, snap.ab, snap.ga == null ? null : JSON.stringify(snap.ga), snap.cov,
    ]);
  }
  await app.close();
  await pool.end();
});

describe('class-intake (integration)', () => {
  it('the class-context panel offers the intake box + covered-so-far field', async () => {
    if (!gc) return;
    const res = await app.inject({ method: 'GET', url: `/lesson/group-context/${gc}`, headers: { cookie } });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Set up this class from a description');
    expect(res.body).toContain(`id="group-ctx-frag-${gc}"`);
    expect(res.body).toContain('/lesson/group-covered/'); // the covered-so-far autosave field
  });

  it('applyClassIntake fills teaching context, covered, ability and access', async () => {
    if (!gc) return;
    await applyClassIntake(gc, {
      teachingContext: 'ZZINTAKE short chunked tasks',
      coveredSummary: 'ZZINTAKE binary and the CPU',
      abilityMidpoint: 'Entry Level 3',
      guidedAccess: { viFont: 18, shortAttention: true, readingAge: '8', eal: false, dyslexiaFriendly: true, lowTyping: false },
    });
    expect(await getGroupTeachingContext(gc)).toBe('ZZINTAKE short chunked tasks');
    expect(await getCoveredSummary(gc)).toBe('ZZINTAKE binary and the CPU');
    expect(await getGroupAbility(gc)).toBe('Entry Level 3');
    expect(await getGuidedAccess(gc)).toMatchObject({ viFont: 18, shortAttention: true, readingAge: '8', dyslexiaFriendly: true });
  });

  it('the covered-so-far field saves on its own', async () => {
    if (!gc) return;
    expect((await post(`/lesson/group-covered/${gc}`, `text=${encodeURIComponent('ZZINTAKE just hexadecimal')}`)).statusCode).toBe(200);
    expect(await getCoveredSummary(gc)).toBe('ZZINTAKE just hexadecimal');
  });

  it('the intake route degrades cleanly when AI is off (no fields changed)', async () => {
    if (!gc) return;
    const before = await getGroupTeachingContext(gc);
    const res = await post(`/lesson/group-context/${gc}/intake`, `text=${encodeURIComponent('Year 9 set 3, covered binary, mostly Entry Level 3')}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('AI is off');
    expect(res.body).toContain('Set up this class from a description'); // re-rendered panel
    expect(await getGroupTeachingContext(gc)).toBe(before); // AI off → nothing applied
  });
});
