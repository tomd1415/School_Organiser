import { Pool } from 'pg';
import { mkdirSync, writeFileSync } from 'node:fs';

// Provide the candidate lesson-plan ids; the preview specs probe them against the live test server (the
// same instance they assert on) to find one with slides / a worksheet — self-consistent, unlike probing
// a separate app instance here.
export default async function globalSetup(): Promise<void> {
  const pool = new Pool({ connectionString: 'postgres://organiser:organiser@localhost:5434/organiser' });
  try {
    const { rows } = await pool.query<{ id: number }>('SELECT id FROM lesson_plans ORDER BY id LIMIT 120');
    mkdirSync('e2e/.auth', { recursive: true });
    writeFileSync('e2e/.auth/plan-ids.json', JSON.stringify(rows.map((r) => Number(r.id))));
  } finally {
    await pool.end();
  }
}
