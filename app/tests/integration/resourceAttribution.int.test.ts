import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { createResourceWithVersion, getResource } from '../../src/repos/resources';
import { checksum } from '../../src/lib/resourceStore';
import { TEACH_COMPUTING_ATTRIBUTION } from '../../src/services/resourceImport';

// Quick-win: imported resources can carry a licence/attribution line (e.g. the Teach Computing OGL
// credit). Proves it's stored + read back, and that own work defaults to no attribution.
describe('resource attribution (integration — needs the dev DB up)', () => {
  const ids: number[] = [];
  afterAll(async () => {
    if (ids.length) await pool.query(`DELETE FROM resources WHERE id = ANY($1::bigint[])`, [ids]);
    await pool.end();
  });

  it('stores + reads back the Teach Computing OGL attribution', async () => {
    const buf = Buffer.from('ZZATTR imported worksheet', 'utf8');
    const id = await createResourceWithVersion(
      { title: 'ZZATTR sheet', kind: 'worksheet', mimeType: 'text/markdown', source: 'imported', sourceAttribution: TEACH_COMPUTING_ATTRIBUTION },
      { filename: 'w.md', buf, checksum: checksum(buf), author: 'teacher', changeNote: 'test' },
    );
    ids.push(id);
    const got = await getResource(id);
    expect(got?.sourceAttribution).toBe(TEACH_COMPUTING_ATTRIBUTION);
    expect(got?.sourceAttribution).toMatch(/Open Government Licence v3\.0/);
  });

  it('defaults to empty attribution for own/uploaded work', async () => {
    const buf = Buffer.from('ZZATTR own work', 'utf8');
    const id = await createResourceWithVersion(
      { title: 'ZZATTR own', kind: 'worksheet', mimeType: 'text/markdown', source: 'uploaded' },
      { filename: 'o.md', buf, checksum: checksum(buf), author: 'teacher', changeNote: 'test' },
    );
    ids.push(id);
    expect((await getResource(id))?.sourceAttribution).toBe('');
  });
});
