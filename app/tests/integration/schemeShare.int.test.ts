import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { exportScheme, importScheme, type SchemeExport } from '../../src/repos/schemes';

// Phase 10.27 — file-based scheme sharing. A scheme exported to JSON and re-imported keeps its full
// content (units + lessons with objectives/outline). ZZE-prefixed test data, cleaned up.
let courseId = 0;

async function purge(): Promise<void> {
  await pool.query(`DELETE FROM lesson_plans WHERE course_id IN (SELECT id FROM courses WHERE name = 'ZZE course')`);
  await pool.query(`DELETE FROM units WHERE scheme_id IN (SELECT s.id FROM schemes_of_work s JOIN courses c ON c.id = s.course_id WHERE c.name = 'ZZE course')`);
  await pool.query(`DELETE FROM schemes_of_work WHERE course_id IN (SELECT id FROM courses WHERE name = 'ZZE course')`);
  await pool.query(`DELETE FROM courses WHERE name = 'ZZE course'`);
}

beforeAll(async () => {
  await purge();
  courseId = Number((await pool.query<{ id: number }>(`INSERT INTO courses (name) VALUES ('ZZE course') RETURNING id`)).rows[0]!.id);
});
afterAll(async () => {
  await purge();
  await pool.end();
});

describe('scheme export/import round-trip (integration)', () => {
  const data: SchemeExport = {
    version: 1,
    schemeTitle: 'ZZE Scheme',
    courseName: 'ZZE course',
    units: [{ title: 'Unit 1', lessons: [{ title: 'L1', objectives: 'know lists', outline: 'do a list task' }, { title: 'L2', objectives: null, outline: null }] }],
  };

  it('imports a shared scheme with full content, then exports it identically', async () => {
    const id1 = await importScheme(courseId, data);
    expect(id1).not.toBeNull();
    const exported = await exportScheme(id1!);
    expect(exported!.schemeTitle).toBe('ZZE Scheme');
    expect(exported!.units).toEqual(data.units); // units + lessons + objectives/outline preserved

    // Re-import the exported JSON → a second scheme that round-trips to the same content.
    const id2 = await importScheme(courseId, exported!);
    const exported2 = await exportScheme(id2!);
    expect(exported2!.units).toEqual(exported!.units);
  });
});
