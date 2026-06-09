import { afterAll, describe, expect, it } from 'vitest';
import { rm } from 'node:fs/promises';
import { pool } from '../../src/db/pool';
import {
  addVersion,
  createResource,
  findResourceByChecksum,
  getCurrentVersion,
  getResource,
  linkResource,
  listResourcesForPlan,
  revertToVersion,
} from '../../src/repos/resources';
import { checksum, readStored, relPathFor, storeBuffer } from '../../src/lib/resourceStore';
import { RESOURCE_STORE_PATH } from '../../src/config/resources';

const resources: number[] = [];
let planId = 0;

describe('resources (integration — needs the dev DB up)', () => {
  afterAll(async () => {
    if (resources.length) {
      await pool.query(`DELETE FROM resource_links WHERE resource_id = ANY($1)`, [resources]);
      await pool.query(`UPDATE resources SET current_version_id = NULL WHERE id = ANY($1)`, [resources]);
      await pool.query(`DELETE FROM resource_versions WHERE resource_id = ANY($1)`, [resources]);
      await pool.query(`DELETE FROM resources WHERE id = ANY($1)`, [resources]);
    }
    if (planId) await pool.query(`DELETE FROM lesson_plans WHERE id = $1`, [planId]);
    await rm(RESOURCE_STORE_PATH, { recursive: true, force: true });
    await pool.end();
  });

  it('stores a file as v1, reads it back, and dedups by checksum', async () => {
    const buf = Buffer.from('hello world');
    const sum = checksum(buf);
    const id = await createResource('t.txt', 'document', 'text/plain', 'uploaded');
    resources.push(id);
    const rel = relPathFor(id, 1, 't.txt');
    await storeBuffer(rel, buf);
    await addVersion(id, rel, buf.length, sum, 'teacher', 'uploaded');
    expect((await readStored(rel)).toString()).toBe('hello world');
    expect((await getCurrentVersion(id))?.versionNo).toBe(1);
    expect(await findResourceByChecksum(sum)).toBe(id);
  });

  it('adds v2 then reverts to v1', async () => {
    const id = resources[0]!;
    const buf2 = Buffer.from('version two');
    const rel2 = relPathFor(id, 2, 't.txt');
    await storeBuffer(rel2, buf2);
    await addVersion(id, rel2, buf2.length, checksum(buf2), 'teacher', 'edit');
    expect((await getResource(id))?.versionNo).toBe(2);
    const v1 = await pool.query<{ id: number }>(
      `SELECT id FROM resource_versions WHERE resource_id = $1 ORDER BY version_no LIMIT 1`,
      [id],
    );
    await revertToVersion(id, v1.rows[0]!.id);
    expect((await getResource(id))?.versionNo).toBe(1);
  });

  it('links a resource to a lesson plan', async () => {
    const course = await pool.query<{ id: number }>(`SELECT id FROM courses ORDER BY id LIMIT 1`);
    const lp = await pool.query<{ id: number }>(
      `INSERT INTO lesson_plans (course_id, title) VALUES ($1, 'TEST plan') RETURNING id`,
      [course.rows[0]!.id],
    );
    planId = lp.rows[0]!.id;
    const id = resources[0]!;
    await linkResource(id, { lessonPlanId: planId });
    expect((await listResourcesForPlan(planId)).some((r) => r.resourceId === id)).toBe(true);
  });
});
