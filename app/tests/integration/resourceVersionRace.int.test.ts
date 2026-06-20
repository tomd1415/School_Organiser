import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { addVersion, createResource, createResourceWithVersion, getCurrentVersion, getResource, listVersions } from '../../src/repos/resources';
import { checksum, readStored, relPathFor, storeBuffer } from '../../src/lib/resourceStore';

// BUG-008: appending a resource version is atomic + serialised. Two concurrent appends — as two real
// requests would, both pre-computing the SAME next version number before either commits — must each end
// up with a DISTINCT version_no (no lost UNIQUE(resource_id, version_no) race → 500) AND a DISTINCT file
// on disk (no overwrite), with the current pointer left on the newest. Pre-fix they shared one path (the
// second clobbered the first) and collided on version_no.
let rid = 0;

afterAll(async () => {
  if (rid) await pool.query(`DELETE FROM resources WHERE id = $1`, [rid]); // cascades resource_versions
  await pool.end();
});

describe('resource version append (integration — BUG-008)', () => {
  it('two concurrent appends get distinct versions + distinct files, newest stays current', async () => {
    rid = await createResource('ZZRACE doc.md', 'document', 'text/markdown', 'ai_generated');
    // seed v1 so the concurrent appends both race to become "v2"
    const v1 = Buffer.from('V1', 'utf8');
    const rel1 = relPathFor(rid, 1, 'doc.md');
    await storeBuffer(rel1, v1);
    await addVersion(rid, rel1, v1.length, checksum(v1), 'teacher', 'v1');

    // both writers pre-read the same "next" number (2) and build their path from it, exactly as two
    // overlapping requests would. The random token in relPathFor keeps the paths distinct.
    const nextNo = ((await getResource(rid))?.versionNo ?? 0) + 1;
    const append = async (content: string, note: string): Promise<number> => {
      const buf = Buffer.from(content, 'utf8');
      const rel = relPathFor(rid, nextNo, 'doc.md');
      await storeBuffer(rel, buf);
      return addVersion(rid, rel, buf.length, checksum(buf), 'teacher', note);
    };
    const results = await Promise.allSettled([append('AAA', 'a'), append('BBB', 'b')]);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true); // neither lost a UNIQUE race → 500

    const versions = await listVersions(rid);
    expect(versions.map((v) => v.versionNo).sort((a, b) => a - b)).toEqual([1, 2, 3]); // distinct, no dup/gap

    const appended = versions.filter((v) => v.versionNo !== 1);
    expect(new Set(appended.map((v) => v.storagePath)).size).toBe(2); // two distinct files on disk

    // both files survive with their own content — neither overwrote the other
    const contents = (await Promise.all(appended.map((v) => readStored(v.storagePath)))).map((b) => b.toString('utf8'));
    expect(new Set(contents)).toEqual(new Set(['AAA', 'BBB']));

    expect((await getResource(rid))?.versionNo).toBe(3); // current pointer is on the newest version
  });

  it('createResourceWithVersion writes resource + v1 + pointer + metadata + file atomically (BUG-028)', async () => {
    const buf = Buffer.from('atomic-create-bytes');
    const id = await createResourceWithVersion(
      { title: 'ZZATOMIC.md', kind: 'document', mimeType: 'text/markdown', source: 'imported', unit: 'Unit Z', yearGroup: 'Year 7' },
      { filename: 'ZZATOMIC.md', buf, checksum: checksum(buf), author: 'teacher', changeNote: 'imported from test' },
    );
    try {
      const res = await getResource(id);
      expect(res?.versionNo).toBe(1); // current pointer set to the v1 created in the same txn
      expect(res?.unit).toBe('Unit Z'); // unit/year metadata written together — no separate follow-up UPDATE
      expect(res?.yearGroup).toBe('Year 7');
      const v = await getCurrentVersion(id);
      expect(v?.checksum).toBe(checksum(buf));
      expect((await readStored(v!.storagePath)).toString('utf8')).toBe('atomic-create-bytes'); // file present on disk
    } finally {
      await pool.query(`UPDATE resources SET current_version_id = NULL WHERE id = $1`, [id]);
      await pool.query(`DELETE FROM resource_versions WHERE resource_id = $1`, [id]);
      await pool.query(`DELETE FROM resources WHERE id = $1`, [id]);
    }
  });
});
