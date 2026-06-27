// Phase 16A.2 — seed the progression schemes (idempotent, re-runnable). Run once on the HOST (it reads the
// year-ladder source from docs/, which isn't inside the app container):
//
//   cd app && DATABASE_URL='postgres://organiser:organiser@localhost:5434/organiser' npx tsx src/seed/progressionSeed.ts
//
// Seeds THREE schemes:
//   1. The year ladder (Stages 6–14) — the full Teach Computing content parsed from
//      docs/LEVEL_SYSTEM_FULL_PROGRESSION.md (Stage → Strand → Unit → objective/lesson → "I can…").
//   2. GCSE grades (OCR J277) — STRUCTURE only: two strands (Programming / Paper 2, Theory / Paper 1) ×
//      grades 1–9 as stages. Grade descriptors are added by the teacher (their own source, not these docs).
//   3. A blank Post-16 qualification scheme (structure to be filled per qualification).
//
// Upserts on natural keys (UNIQUE (scheme,code) / (scheme,ordinal) / (scheme,stage,strand,title) /
// (unit,lesson_no,objective) / (lesson,descriptor)), so a re-run converges and never duplicates or wipes
// pupil evidence. No pupil data, no AI — pure curriculum content.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { PoolClient } from 'pg';
import { pool } from '../db/pool';
import { parseProgressionDoc, type ParsedStage } from '../services/progressionParse';

// The canonical strand set for the year ladder (the doc's strand key), with display order.
const LADDER_STRANDS: Array<{ code: string; name: string }> = [
  { code: 'CS', name: 'Computing systems' },
  { code: 'NW', name: 'Networks' },
  { code: 'PG', name: 'Programming' },
  { code: 'AL', name: 'Algorithms' },
  { code: 'DI', name: 'Data & information' },
  { code: 'CM', name: 'Creating media' },
  { code: 'DD', name: 'Design & development' },
  { code: 'ET', name: 'Effective use of tools' },
  { code: 'IT', name: 'Impact of technology' },
  { code: 'SS', name: 'Safety & security' },
];

type Client = PoolClient;

async function upsertScheme(c: Client, name: string, kind: string, examBoard: string | null, source: string | null): Promise<number> {
  const found = await c.query<{ id: number }>(`SELECT id FROM progression_schemes WHERE name = $1`, [name]);
  if (found.rows[0]) {
    await c.query(`UPDATE progression_schemes SET kind = $2, exam_board = $3, source = $4 WHERE id = $1`, [found.rows[0].id, kind, examBoard, source]);
    return found.rows[0].id;
  }
  const { rows } = await c.query<{ id: number }>(
    `INSERT INTO progression_schemes (name, kind, exam_board, source) VALUES ($1,$2,$3,$4) RETURNING id`,
    [name, kind, examBoard, source],
  );
  return rows[0]!.id;
}

async function upsertStrands(c: Client, schemeId: number, strands: Array<{ code: string; name: string }>): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (let i = 0; i < strands.length; i++) {
    const s = strands[i]!;
    const { rows } = await c.query<{ id: number }>(
      `INSERT INTO prog_strands (scheme_id, code, name, display_order) VALUES ($1,$2,$3,$4)
       ON CONFLICT (scheme_id, code) DO UPDATE SET name = EXCLUDED.name, display_order = EXCLUDED.display_order
       RETURNING id`,
      [schemeId, s.code, s.name, i],
    );
    map.set(s.code, rows[0]!.id);
  }
  return map;
}

async function upsertStage(
  c: Client,
  schemeId: number,
  s: { ordinal: number; label: string; yearGroup: number | null; ageLow: number | null; ageHigh: number | null; keyStage: string | null },
): Promise<number> {
  const { rows } = await c.query<{ id: number }>(
    `INSERT INTO prog_stages (scheme_id, ordinal, label, year_group, age_low, age_high, key_stage)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (scheme_id, ordinal)
       DO UPDATE SET label = EXCLUDED.label, year_group = EXCLUDED.year_group, age_low = EXCLUDED.age_low,
                     age_high = EXCLUDED.age_high, key_stage = EXCLUDED.key_stage
     RETURNING id`,
    [schemeId, s.ordinal, s.label, s.yearGroup, s.ageLow, s.ageHigh, s.keyStage],
  );
  return rows[0]!.id;
}

async function seedYearLadder(c: Client, stages: ParsedStage[]): Promise<{ stages: number; units: number; lessons: number; criteria: number }> {
  const schemeId = await upsertScheme(c, 'Computing year ladder (Stages 6–14)', 'year_ladder', null, 'Teach Computing / NCCE');
  // strand set = the canonical 10 (union across stages); name overrides from the parse where present.
  const nameByCode = new Map(LADDER_STRANDS.map((s) => [s.code, s.name]));
  for (const st of stages) for (const sg of st.strands) if (!nameByCode.has(sg.strandCode)) nameByCode.set(sg.strandCode, sg.strandName);
  const strandList = LADDER_STRANDS.filter((s) => nameByCode.has(s.code));
  for (const [code, name] of nameByCode) if (!strandList.some((s) => s.code === code)) strandList.push({ code, name });
  const strandId = await upsertStrands(c, schemeId, strandList);

  const counts = { stages: 0, units: 0, lessons: 0, criteria: 0 };
  for (const st of stages) {
    const stageId = await upsertStage(c, schemeId, st);
    counts.stages++;
    let unitOrder = 0;
    for (const sg of st.strands) {
      const sid = strandId.get(sg.strandCode);
      if (sid == null) continue;
      for (const u of sg.units) {
        const { rows: ur } = await c.query<{ id: number }>(
          `INSERT INTO prog_units (scheme_id, stage_id, strand_id, title, display_order)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (scheme_id, stage_id, strand_id, title) DO UPDATE SET display_order = EXCLUDED.display_order
           RETURNING id`,
          [schemeId, stageId, sid, u.title, unitOrder++],
        );
        const unitId = ur[0]!.id;
        counts.units++;
        let lessonOrder = 0;
        for (const l of u.lessons) {
          const { rows: lr } = await c.query<{ id: number }>(
            `INSERT INTO prog_lessons (unit_id, lesson_no, objective, display_order)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (unit_id, lesson_no, objective) DO UPDATE SET display_order = EXCLUDED.display_order
             RETURNING id`,
            [unitId, l.lessonNo, l.objective, lessonOrder++],
          );
          const lessonId = lr[0]!.id;
          counts.lessons++;
          let critOrder = 0;
          for (const cr of l.criteria) {
            await c.query(
              `INSERT INTO prog_criteria (lesson_id, stage_id, strand_id, descriptor, display_order, also_strands)
               VALUES ($1,$2,$3,$4,$5,$6)
               ON CONFLICT (lesson_id, descriptor)
                 DO UPDATE SET display_order = EXCLUDED.display_order, also_strands = EXCLUDED.also_strands,
                               stage_id = EXCLUDED.stage_id, strand_id = EXCLUDED.strand_id`,
              [lessonId, stageId, sid, cr.descriptor, critOrder++, cr.alsoStrands.length ? cr.alsoStrands : null],
            );
            counts.criteria++;
          }
        }
      }
    }
  }
  return counts;
}

async function seedGcse(c: Client): Promise<void> {
  const schemeId = await upsertScheme(c, 'GCSE Computer Science (OCR J277)', 'gcse_grades', 'OCR J277', 'OCR');
  await upsertStrands(c, schemeId, [
    { code: 'PG2', name: 'Programming (Paper 2)' },
    { code: 'TH1', name: 'Theory (Paper 1)' },
  ]);
  for (let g = 1; g <= 9; g++) {
    await upsertStage(c, schemeId, { ordinal: g, label: `Grade ${g}`, yearGroup: null, ageLow: null, ageHigh: null, keyStage: 'KS4' });
  }
}

async function seedPost16(c: Client): Promise<void> {
  // A blank qualification scheme — strands/stages added per qualification by the teacher.
  await upsertScheme(c, 'Post-16 (blank — fill per qualification)', 'qualification', null, null);
}

async function main(): Promise<void> {
  const docPath = join(__dirname, '..', '..', '..', 'docs', 'LEVEL_SYSTEM_FULL_PROGRESSION.md');
  const stages = parseProgressionDoc(readFileSync(docPath, 'utf8'));
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const counts = await seedYearLadder(c, stages);
    await seedGcse(c);
    await seedPost16(c);
    await c.query('COMMIT');
    console.log(`✓ progression seed: year ladder — ${counts.stages} stages, ${counts.units} units, ${counts.lessons} lessons, ${counts.criteria} criteria`);
    console.log('  + GCSE OCR J277 (2 strands × grades 1–9, structure) + blank Post-16 scheme');
  } catch (err) {
    await c.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    c.release();
  }
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    pool.end().finally(() => process.exit(1));
  });
