import { afterAll, describe, expect, it } from 'vitest';
import AdmZip from 'adm-zip';
import { rm } from 'node:fs/promises';
import { pool } from '../../src/db/pool';
import { extractArchive, commitImport } from '../../src/services/resourceImport';
import { checksum } from '../../src/lib/resourceStore';
import { findResourceByChecksum } from '../../src/repos/resources';
import { RESOURCE_STORE_PATH } from '../../src/config/resources';

// A minimal .docx is just a zip with word/document.xml — same shape the real Word descriptions take.
function makeDocx(text: string): Buffer {
  const z = new AdmZip();
  z.addFile('word/document.xml', Buffer.from(`<w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body>`));
  return z.toBuffer();
}

const F1 = Buffer.from('PDF-FILE-1-content-unique-9f3a2');
const F2 = Buffer.from('PPTX-FILE-2-content-unique-9f3a2');

// The shape the teacher uploads: a zip of a folder, holding a per-topic zip that bundles its own
// Word description alongside its (cryptically-named) files, plus a loose top-level file.
function buildArchive(): Buffer {
  const topic = new AdmZip();
  topic.addFile('description.docx', makeDocx('Photosynthesis pack. aaaa is the intro worksheet, bbbb the plenary quiz.'));
  topic.addFile('aaaa.pdf', F1);
  topic.addFile('bbbb.pptx', F2);
  const outer = new AdmZip();
  outer.addFile('topic-A/topic-A.zip', topic.toBuffer());
  outer.addFile('readme.txt', Buffer.from('top-level loose note'));
  return outer.toBuffer();
}

const createdIds: number[] = [];

describe('resource bulk import (integration — needs the dev DB up)', () => {
  afterAll(async () => {
    if (createdIds.length) {
      await pool.query(`UPDATE resources SET current_version_id = NULL WHERE id = ANY($1)`, [createdIds]);
      await pool.query(`DELETE FROM resource_versions WHERE resource_id = ANY($1)`, [createdIds]);
      await pool.query(`DELETE FROM resources WHERE id = ANY($1)`, [createdIds]);
    }
    await rm(RESOURCE_STORE_PATH, { recursive: true, force: true });
    await pool.end();
  });

  it('extracts nested zips, reads the Word description, and stages every file for review', async () => {
    const r = await extractArchive(buildArchive());
    expect(r.fileCount).toBe(4); // description.docx + aaaa.pdf + bbbb.pptx + readme.txt
    expect(r.truncated).toBe(false);

    const topic = r.groups.find((g) => g.source.includes('topic-A.zip'));
    expect(topic).toBeTruthy();
    expect(topic!.description).toContain('Photosynthesis');
    expect(topic!.files.map((f) => f.name).sort()).toEqual(['aaaa.pdf', 'bbbb.pptx', 'description.docx']);
    expect(topic!.files.every((f) => f.duplicate === false)).toBe(true);

    // Commit just the two real resources — one with a default (filename) title, one with a chosen title.
    const pdf = topic!.files.find((f) => f.name === 'aaaa.pdf')!;
    const pptx = topic!.files.find((f) => f.name === 'bbbb.pptx')!;
    const c = await commitImport(r.batchId, [
      { path: pdf.path, title: '' },
      { path: pptx.path, title: 'Plenary quiz' },
    ]);
    expect(c).toEqual({ imported: 2, skipped: 0, failed: 0 });

    const id1 = await findResourceByChecksum(checksum(F1));
    const id2 = await findResourceByChecksum(checksum(F2));
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    createdIds.push(id1!, id2!);
  });

  it('flags and skips duplicates by checksum on a second import of the same content', async () => {
    const r = await extractArchive(buildArchive());
    const topic = r.groups.find((g) => g.source.includes('topic-A.zip'))!;
    // The two real files are already in the store, so they come back pre-flagged as duplicates...
    expect(topic.files.find((f) => f.name === 'aaaa.pdf')!.duplicate).toBe(true);
    expect(topic.files.find((f) => f.name === 'bbbb.pptx')!.duplicate).toBe(true);
    // ...and committing them imports nothing new.
    const reals = topic.files.filter((f) => f.name.endsWith('.pdf') || f.name.endsWith('.pptx'));
    const c = await commitImport(r.batchId, reals.map((f) => ({ path: f.path, title: '' })));
    expect(c.imported).toBe(0);
    expect(c.skipped).toBe(2);
  });

  it('refuses a commit path that tries to escape the batch dir', async () => {
    const r = await extractArchive(buildArchive());
    const c = await commitImport(r.batchId, [{ path: '../../../etc/passwd', title: 'x' }]);
    expect(c.imported).toBe(0);
    expect(c.failed).toBe(1);
  });
});
