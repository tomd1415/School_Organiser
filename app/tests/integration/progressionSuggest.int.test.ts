import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/server';
import { pool } from '../../src/db/pool';
import { addSpecLink, evidencedCriterionIds, masteredSpecPointsForPupil, specLinksForScheme } from '../../src/repos/progression';
import { suggestEvidence } from '../../src/services/progression';

// 16A.4 — auto-suggest evidence from marking + teacher confirm (no AI). Maps a criterion to a course spec
// point, marks a pupil mastering that point, asserts the suggestion, then confirms it via the route.
let app: FastifyInstance;
let cookie = '';
let token = '';
let schemeId = 0, criterionId = 0, specPointId = 0, pupilId = 0, assessmentId = 0;

function firstCookie(s: string | string[] | undefined): string {
  const v = Array.isArray(s) ? s[0] : s;
  return (v ?? '').split(';')[0] ?? '';
}

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  const page = await app.inject({ method: 'GET', url: '/login' });
  token = /name="_csrf" value="([^"]+)"/.exec(page.body)?.[1] ?? '';
  const pre = firstCookie(page.headers['set-cookie']);
  const res = await app.inject({ method: 'POST', url: '/login', headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: pre }, payload: `_csrf=${encodeURIComponent(token)}&password=test` });
  cookie = firstCookie(res.headers['set-cookie']) || pre;

  // a real (unit, scheme, course, class) from the test-data fixture
  const u = await pool.query<{ unit: number; scheme: number; course: number }>(
    `SELECT u.id AS unit, s.id AS scheme, s.course_id AS course FROM units u JOIN schemes_of_work s ON s.id = u.scheme_id WHERE s.active LIMIT 1`,
  );
  const unitId = Number(u.rows[0]!.unit), sowId = Number(u.rows[0]!.scheme), courseId = Number(u.rows[0]!.course);
  const gc = await pool.query<{ id: number }>(`SELECT id FROM group_courses WHERE course_id = $1 AND active LIMIT 1`, [courseId]);
  const gcId = Number(gc.rows[0]!.id);

  specPointId = Number((await pool.query<{ id: number }>(`INSERT INTO course_spec_points (course_id, code, title) VALUES ($1,'ZZSUG.1','ZZ spec point') RETURNING id`, [courseId])).rows[0]!.id);

  // a throwaway progression scheme with one criterion, linked to that spec point
  schemeId = Number((await pool.query<{ id: number }>(`INSERT INTO progression_schemes (name, kind) VALUES ('ZZSUG scheme','year_ladder') RETURNING id`)).rows[0]!.id);
  const strandId = Number((await pool.query<{ id: number }>(`INSERT INTO prog_strands (scheme_id, code, name) VALUES ($1,'PG','Programming') RETURNING id`, [schemeId])).rows[0]!.id);
  const stageId = Number((await pool.query<{ id: number }>(`INSERT INTO prog_stages (scheme_id, ordinal, label) VALUES ($1,12,'Year 7') RETURNING id`, [schemeId])).rows[0]!.id);
  const pUnitId = Number((await pool.query<{ id: number }>(`INSERT INTO prog_units (scheme_id, stage_id, strand_id, title) VALUES ($1,$2,$3,'ZZ unit') RETURNING id`, [schemeId, stageId, strandId])).rows[0]!.id);
  const lessonId = Number((await pool.query<{ id: number }>(`INSERT INTO prog_lessons (unit_id, objective) VALUES ($1,'obj') RETURNING id`, [pUnitId])).rows[0]!.id);
  criterionId = Number((await pool.query<{ id: number }>(`INSERT INTO prog_criteria (lesson_id, stage_id, strand_id, descriptor) VALUES ($1,$2,$3,'I can ZZ') RETURNING id`, [lessonId, stageId, strandId])).rows[0]!.id);
  await addSpecLink(criterionId, specPointId);

  pupilId = Number((await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token) VALUES ('ZZSUG Pupil','PUPIL_ZZSUG') RETURNING id`)).rows[0]!.id);

  // a marked attempt where the pupil aced the spec point (mastery)
  assessmentId = Number((await pool.query<{ id: number }>(`INSERT INTO assessments (unit_id, scheme_id, course_id, title, status) VALUES ($1,$2,$3,'ZZSUG paper','ready') RETURNING id`, [unitId, sowId, courseId])).rows[0]!.id);
  const attemptId = Number((await pool.query<{ id: number }>(`INSERT INTO assessment_attempts (assessment_id, pupil_id, group_course_id, status) VALUES ($1,$2,$3,'submitted') RETURNING id`, [assessmentId, pupilId, gcId])).rows[0]!.id);
  await pool.query(`INSERT INTO assessment_spec_point_results (attempt_id, spec_point_id, marks_awarded, marks_total) VALUES ($1,$2,10,10)`, [attemptId, specPointId]);
});

afterAll(async () => {
  await pool.query(`DELETE FROM pupil_criteria_evidence WHERE pupil_id = $1`, [pupilId]).catch(() => {});
  await pool.query(`DELETE FROM pupils WHERE id = $1`, [pupilId]).catch(() => {}); // cascades attempt + spec results
  await pool.query(`DELETE FROM assessments WHERE id = $1`, [assessmentId]).catch(() => {});
  await pool.query(`DELETE FROM progression_schemes WHERE id = $1`, [schemeId]).catch(() => {});
  await pool.query(`DELETE FROM course_spec_points WHERE id = $1`, [specPointId]).catch(() => {});
  await app.close();
  await pool.end();
});

describe('16A.4 — auto-suggest evidence from marking', () => {
  it('the pupil has mastered the linked spec point, so the criterion is suggested', async () => {
    const mastered = await masteredSpecPointsForPupil(pupilId);
    expect(mastered.has(specPointId)).toBe(true);
    const links = await specLinksForScheme(schemeId);
    const suggested = suggestEvidence(mastered, links, await evidencedCriterionIds(pupilId));
    expect(suggested).toContain(criterionId);
  });

  it('confirming the suggestion writes evidence (and it then drops out of the suggestions)', async () => {
    const r = await app.inject({
      method: 'POST',
      url: '/progression/evidence/confirm',
      headers: { cookie, 'x-csrf-token': token, 'content-type': 'application/x-www-form-urlencoded' },
      payload: `pupil=${pupilId}&criterion=${criterionId}`,
    });
    expect([200, 302]).toContain(r.statusCode);
    const ev = await evidencedCriterionIds(pupilId);
    expect(ev.has(criterionId)).toBe(true);
    // now excluded from suggestions
    const suggested = suggestEvidence(await masteredSpecPointsForPupil(pupilId), await specLinksForScheme(schemeId), ev);
    expect(suggested).not.toContain(criterionId);
  });

  it('the evidence row carries source_kind=assessment (audit of where it came from)', async () => {
    const { rows } = await pool.query<{ source_kind: string }>(`SELECT source_kind FROM pupil_criteria_evidence WHERE pupil_id = $1 AND criterion_id = $2`, [pupilId, criterionId]);
    expect(rows[0]!.source_kind).toBe('assessment');
  });
});
