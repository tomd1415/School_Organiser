// Phase 12 D2 — the raw "current interest" items (tasks + captured notes) with WHEN each was marked,
// for the time-decaying Now-screen profile. Pure SQL, no AI.
import { pool } from '../db/pool';

export interface InterestRow {
  kind: 'task' | 'captured';
  id: number;
  label: string;
  interestAt: string | null; // UTC ISO, null when never stamped (pre-migration / just-toggled-off races)
}

export async function listInterestItems(): Promise<InterestRow[]> {
  const { rows } = await pool.query<InterestRow>(
    `SELECT 'task' AS kind, id, title AS label,
            to_char(interest_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "interestAt"
       FROM tasks WHERE interest AND status NOT IN ('done', 'dropped')
     UNION ALL
     SELECT 'captured' AS kind, id, left(regexp_replace(body, '\\s+', ' ', 'g'), 80) AS label,
            to_char(interest_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "interestAt"
       FROM notes WHERE kind = 'captured' AND interest AND NOT archived
     ORDER BY "interestAt" DESC NULLS LAST`,
  );
  return rows;
}
