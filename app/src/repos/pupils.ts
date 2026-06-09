import { pool } from '../db/pool';

export interface RosterEntry {
  id: number;
  displayName: string;
  aiToken: string;
  active: boolean;
}

const ROW = `id, display_name AS "displayName", ai_token AS "aiToken", active`;

// Create a pupil with an auto-assigned, stable ai_token ("PUPIL_<n>") — the ONLY thing the AI
// ever sees in place of the name (SECURITY_AND_PRIVACY §"The pupil-name rule"). Names-only
// roster: no enrolments, no DPIA-heavy fields (the minimal slice agreed for Phase 4).
export async function createPupil(displayName: string): Promise<RosterEntry> {
  const name = displayName.trim();
  if (!name) throw new Error('display name required');
  const { rows } = await pool.query<RosterEntry>(
    `INSERT INTO pupils (display_name, ai_token)
     VALUES ($1, 'PUPIL_' || (COALESCE((SELECT max(id) FROM pupils), 0) + 1))
     RETURNING ${ROW}`,
    [name],
  );
  return rows[0]!;
}

export async function listPupils(): Promise<RosterEntry[]> {
  const { rows } = await pool.query<RosterEntry>(`SELECT ${ROW} FROM pupils ORDER BY display_name`);
  return rows;
}

// The roster the redactor matches against — active pupils only, longest name first so that
// "Samantha" is tokenised before "Sam".
export async function listRoster(): Promise<RosterEntry[]> {
  const { rows } = await pool.query<RosterEntry>(
    `SELECT ${ROW} FROM pupils WHERE active ORDER BY length(display_name) DESC, id`,
  );
  return rows;
}

export async function setPupilActive(id: number, active: boolean): Promise<void> {
  await pool.query(`UPDATE pupils SET active = $2 WHERE id = $1`, [id, active]);
}
