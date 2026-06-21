// Phase 10.4 — the safeguarding register. Read-only aggregate of every flagged item across the
// three streams that can carry a disclosure, with a lazily-created status overlay. NONE of this is
// ever sent to an AI (the answers were withheld by the content guard; captured/TA items carry the
// safeguarding flag that withholds them). Teacher-only surface.
import { pool } from '../db/pool';

export type SgSource = 'answer' | 'captured' | 'ta_feedback';
export type SgStatus = 'new' | 'recorded' | 'actioned' | 'referred';

export interface SafeguardingItem {
  sourceType: SgSource;
  sourceId: number;
  text: string;
  who: string | null; // the pupil's name for a disclosure answer; null for captured/TA items
  at: string;
  status: SgStatus;
  actionNote: string;
}

// The three flagged streams, unioned, with the review-status overlay (no row ⇒ 'new'/unreviewed).
// The 'captured' note stream covers EVERY safeguarding-flagged note regardless of kind — the mind-inbox
// ('captured'), live-lesson Fast Capture ('lesson') and general notes all set the same flag, and a
// flagged note of any kind is a concern to track (BUG-051: lesson Fast Capture notes were silently
// excluded). Note ids are unique across kinds, so the (source_type, source_id) review overlay is safe.
const SOURCES = `
  SELECT 'answer'::text AS source_type, a.id AS source_id, a.value AS body, p.display_name AS who, m.updated_at AS at
    FROM pupil_marks m JOIN pupil_answers a ON a.id = m.pupil_answer_id JOIN pupils p ON p.id = a.pupil_id
   WHERE m.disclosure
  UNION ALL
  SELECT 'captured', n.id, n.body, NULL, n.created_at
    FROM notes n WHERE n.safeguarding
  UNION ALL
  SELECT 'ta_feedback', t.id, NULLIF(btrim(t.pupils_text || E'\\n' || t.lesson_text, E'\\n'), ''), NULL, t.created_at
    FROM ta_feedback t WHERE t.safeguarding`;

export async function listSafeguardingItems(): Promise<SafeguardingItem[]> {
  const { rows } = await pool.query<SafeguardingItem>(
    `SELECT x.source_type AS "sourceType", x.source_id AS "sourceId", COALESCE(x.body, '') AS text, x.who,
            to_char(x.at, 'YYYY-MM-DD HH24:MI') AS at,
            COALESCE(r.status, 'new') AS status, COALESCE(r.action_note, '') AS "actionNote"
     FROM (${SOURCES}) x
     LEFT JOIN safeguarding_review r ON r.source_type = x.source_type AND r.source_id = x.source_id
     ORDER BY x.at DESC`,
  );
  return rows;
}

/** Count of still-unreviewed flagged items — for a heads-up badge. */
export async function safeguardingOpenCount(): Promise<number> {
  const { rows } = await pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM (${SOURCES}) x
     LEFT JOIN safeguarding_review r ON r.source_type = x.source_type AND r.source_id = x.source_id
     WHERE COALESCE(r.status, 'new') = 'new'`,
  );
  return rows[0]?.n ?? 0;
}

/** Record what was done about a flagged item (lazily creates the overlay row). */
export async function setSafeguardingStatus(sourceType: SgSource, sourceId: number, status: Exclude<SgStatus, 'new'>, note: string): Promise<void> {
  await pool.query(
    `INSERT INTO safeguarding_review (source_type, source_id, status, action_note, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (source_type, source_id) DO UPDATE SET status = EXCLUDED.status, action_note = EXCLUDED.action_note, updated_at = now()`,
    [sourceType, sourceId, status, note],
  );
}

/** One item (after a status change) so the route can re-render just that row. */
export async function getSafeguardingItem(sourceType: SgSource, sourceId: number): Promise<SafeguardingItem | null> {
  const { rows } = await pool.query<SafeguardingItem>(
    `SELECT x.source_type AS "sourceType", x.source_id AS "sourceId", COALESCE(x.body, '') AS text, x.who,
            to_char(x.at, 'YYYY-MM-DD HH24:MI') AS at,
            COALESCE(r.status, 'new') AS status, COALESCE(r.action_note, '') AS "actionNote"
     FROM (${SOURCES}) x
     LEFT JOIN safeguarding_review r ON r.source_type = x.source_type AND r.source_id = x.source_id
     WHERE x.source_type = $1 AND x.source_id = $2`,
    [sourceType, sourceId],
  );
  return rows[0] ?? null;
}
