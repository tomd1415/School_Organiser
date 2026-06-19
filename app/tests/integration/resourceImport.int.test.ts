import { afterAll, describe, expect, it } from 'vitest';
import AdmZip from 'adm-zip';
import { rm } from 'node:fs/promises';
import { pool } from '../../src/db/pool';
import { extractArchive, commitImport, buildStorePath, type CommitItem } from '../../src/services/resourceImport';
import { checksum } from '../../src/lib/resourceStore';
import { findResourceByChecksum, getImportedPaths } from '../../src/repos/resources';
import { unitCandidates } from '../../src/services/convertUnit';
import { RESOURCE_STORE_PATH } from '../../src/config/resources';

function makeDocx(text: string): Buffer {
  const z = new AdmZip();
  z.addFile('word/document.xml', Buffer.from(`<w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body>`));
  return z.toBuffer();
}

const SLIDES = Buffer.from('ZZIMP-slides-content-a1');
const QUIZ = Buffer.from('ZZIMP-quiz-content-a1');

// The teacher's shape: a unit folder named only by its number ("8"), holding the Word description and
// one zip per lesson. The unit name + year group must come from the description, not the folder.
function buildUnitArchive(): Buffer {
  const l1 = new AdmZip();
  l1.addFile('slides.pptx', SLIDES);
  l1.addFile('intro.docx', makeDocx('lesson one intro')); // a lesson-level doc, NOT the unit description
  const l2 = new AdmZip();
  l2.addFile('quiz.pdf', QUIZ);
  const outer = new AdmZip();
  outer.addFile('8/overview.docx', makeDocx('This is Unit 11: Computer Networks, taught in Year 8.'));
  outer.addFile('8/Lesson 1.zip', l1.toBuffer());
  outer.addFile('8/Lesson 2.zip', l2.toBuffer());
  return outer.toBuffer();
}

const createdIds: number[] = [];

describe('resource bulk import — units (integration — needs the dev DB up)', () => {
  afterAll(async () => {
    if (createdIds.length) {
      await pool.query(`UPDATE resources SET current_version_id = NULL WHERE id = ANY($1)`, [createdIds]);
      await pool.query(`DELETE FROM resource_versions WHERE resource_id = ANY($1)`, [createdIds]);
      await pool.query(`DELETE FROM resources WHERE id = ANY($1)`, [createdIds]);
    }
    await rm(RESOURCE_STORE_PATH, { recursive: true, force: true });
    await pool.end();
  });

  it('groups the upload into one unit (the number folder), with the unit doc as its description', async () => {
    const r = await extractArchive(buildUnitArchive());
    expect(r.fileCount).toBe(4); // overview.docx + slides.pptx + intro.docx + quiz.pdf
    const unit = r.groups.find((g) => g.isUnit && g.folder === '8');
    expect(unit).toBeTruthy();
    expect(unit!.description).toContain('Computer Networks'); // the unit doc, not the lesson doc
    // the lesson zips were unzipped transparently into "8/Lesson N/..." (no ".zip" in the path)
    expect(unit!.files.map((f) => f.path).sort()).toEqual([
      '8/Lesson 1/intro.docx',
      '8/Lesson 1/slides.pptx',
      '8/Lesson 2/quiz.pdf',
      '8/overview.docx',
    ]);
  });

  it('stamps the unit + year group on every file and records a normalised, discoverable path', async () => {
    const r = await extractArchive(buildUnitArchive());
    const unit = r.groups.find((g) => g.folder === '8')!;
    // What the route does: the (edited) unit fields cascade to each file in the unit.
    const items: CommitItem[] = unit.files
      .filter((f) => f.name === 'slides.pptx' || f.name === 'quiz.pdf')
      .map((f) => ({
        path: f.path,
        title: `lesson file ${f.name}`,
        unit: 'Unit 11: Computer Networks',
        yearGroup: 'Year 8',
        storePath: buildStorePath('Year 8', 'Unit 11: Computer Networks', '8', f.path),
      }));
    const c = await commitImport(r.batchId, items);
    expect(c.imported).toBe(2);

    const id = await findResourceByChecksum(checksum(SLIDES));
    expect(id).toBeTruthy();
    createdIds.push(id!, (await findResourceByChecksum(checksum(QUIZ)))!);

    const row = await pool.query<{ unit: string; year_group: string; change_note: string }>(
      `SELECT r.unit, r.year_group, v.change_note
         FROM resources r JOIN resource_versions v ON v.resource_id = r.id
        WHERE r.id = $1`,
      [id],
    );
    expect(row.rows[0]!.unit).toBe('Unit 11: Computer Networks');
    expect(row.rows[0]!.year_group).toBe('Year 8');
    // change_note carries the normalised path (Year / Unit / Lesson / file), not "imported from archive"
    expect(row.rows[0]!.change_note).toBe('imported from Year 8/Unit 11: Computer Networks/Lesson 1/slides.pptx');

    // #4: the scheme-author "convert a downloaded unit" tool finds it, because the path now describes
    // a real unit folder with lesson sub-folders.
    const found = unitCandidates(await getImportedPaths()).some((u) => u.folder === 'Year 8/Unit 11: Computer Networks');
    expect(found).toBe(true);
  });
});
