import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { addEvidence, bindClassToScheme } from '../../src/repos/progression';

// 16A.3 — the class heat-map + per-pupil ladder, end-to-end through the route + pure roll-up. Builds a tiny
// one-strand/one-stage/one-criterion scheme, binds a REAL class that has enrolled pupils, evidences one
// pupil, and asserts the rendered stage. All scratch is torn down in finally.
let app: FastifyInstance;
let cookie = '';
let schemeId = 0;
let gcId = 0;
let pupilId = 0;
let criterionId = 0;

function firstCookie(s: string | string[] | undefined): string {
  const v = Array.isArray(s) ? s[0] : s;
  return (v ?? '').split(';')[0] ?? '';
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  const page = await app.inject({ method: 'GET', url: '/login' });
  const token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
  const pre = firstCookie(page.headers['set-cookie']);
  const res = await app.inject({ method: 'POST', url: '/login', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre }, payload: `_csrf=${encodeURIComponent(token)}&password=test` });
  cookie = firstCookie(res.headers['set-cookie']) || pre;

  // a real class that has at least one active enrolled pupil
  const cls = await pool.query<{ gc: number; pid: number }>(
    `SELECT gc.id AS gc, en.pupil_id AS pid
     FROM group_courses gc JOIN enrolments en ON en.group_id = gc.group_id AND en.active
     WHERE gc.active ORDER BY gc.id LIMIT 1`,
  );
  gcId = Number(cls.rows[0]!.gc);
  pupilId = Number(cls.rows[0]!.pid);

  schemeId = Number((await pool.query<{ id: number }>(`INSERT INTO progression_schemes (name, kind) VALUES ('ZZHEAT scheme','year_ladder') RETURNING id`)).rows[0]!.id);
  const strandId = Number((await pool.query<{ id: number }>(`INSERT INTO prog_strands (scheme_id, code, name) VALUES ($1,'PG','Programming') RETURNING id`, [schemeId])).rows[0]!.id);
  const stageId = Number((await pool.query<{ id: number }>(`INSERT INTO prog_stages (scheme_id, ordinal, label, year_group) VALUES ($1,12,'Year 7 (ZZ)',7) RETURNING id`, [schemeId])).rows[0]!.id);
  const unitId = Number((await pool.query<{ id: number }>(`INSERT INTO prog_units (scheme_id, stage_id, strand_id, title) VALUES ($1,$2,$3,'ZZ unit') RETURNING id`, [schemeId, stageId, strandId])).rows[0]!.id);
  const lessonId = Number((await pool.query<{ id: number }>(`INSERT INTO prog_lessons (unit_id, objective) VALUES ($1,'obj') RETURNING id`, [unitId])).rows[0]!.id);
  criterionId = Number((await pool.query<{ id: number }>(`INSERT INTO prog_criteria (lesson_id, stage_id, strand_id, descriptor) VALUES ($1,$2,$3,'I can ZZ') RETURNING id`, [lessonId, stageId, strandId])).rows[0]!.id);

  await bindClassToScheme(gcId, schemeId);
  await addEvidence({ pupilId, criterionId, sourceKind: 'manual' }); // the single criterion → reaches Year 7
});

afterAll(async () => {
  await pool.query(`DELETE FROM pupil_criteria_evidence WHERE criterion_id = $1`, [criterionId]).catch(() => {});
  await pool.query(`DELETE FROM group_course_scheme WHERE group_course_id = $1 AND scheme_id = $2`, [gcId, schemeId]).catch(() => {});
  await pool.query(`DELETE FROM progression_schemes WHERE id = $1`, [schemeId]).catch(() => {});
  await app.close();
  await pool.end();
});

describe('progression heat-map + pupil ladder (integration)', () => {
  it('class heat-map shows the evidenced pupil at the reached stage', async () => {
    const r = await app.inject({ method: 'GET', url: `/progression/class/${gcId}`, headers: { cookie } });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('heat-map');
    expect(r.body).toContain('Year 7 (ZZ)'); // the pupil reached the stage (all its criteria evidenced)
    expect(r.body).toContain('teacher only'); // the PII privacy banner
  });

  it('per-pupil ladder shows the scheme + the reached stage', async () => {
    const r = await app.inject({ method: 'GET', url: `/progression/pupil/${pupilId}`, headers: { cookie } });
    expect(r.statusCode).toBe(200);
    expect(r.body).toContain('ZZHEAT scheme');
    expect(r.body).toContain('Year 7 (ZZ)');
  });
});
