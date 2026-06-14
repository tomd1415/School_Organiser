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
  // NFC-normalise so the stored name matches the redaction boundary (which compares in NFC) — a
  // decomposed (NFD) paste otherwise stores a form that later redaction/egress checks can't match.
  const name = displayName.normalize('NFC').trim();
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

// The roster the redactor matches against — EVERY pupil, not just active ones, longest name
// first so "Samantha" is tokenised before "Sam". Inactive (left) pupils keep their real name in
// the DB until a deliberate anonymisation action, so they must still be redacted: a current pupil
// could type a leaver's name into an answer, and the egress assert must still catch it.
export async function listRoster(): Promise<RosterEntry[]> {
  const { rows } = await pool.query<RosterEntry>(
    `SELECT ${ROW} FROM pupils ORDER BY length(display_name) DESC, id`,
  );
  return rows;
}

export async function setPupilActive(id: number, active: boolean): Promise<void> {
  await pool.query(`UPDATE pupils SET active = $2 WHERE id = $1`, [id, active]);
}

// ── 10.2: erasure / anonymisation — "a deliberate, audited retention action" (DATA_MODEL, DPIA §7).
// Two modes, both transactional and audited into pupil_disposals (which records the kept ai_token +
// counts, never the removed name):
//   anonymise — a LEAVER kept for cohort history: scrub the identity + login + individual narrative,
//               KEEP attainment (answers/marks/feedback) attached to the now-nameless pupil.
//   erase     — a full right-to-erasure (SAR): remove the pupil and ALL dependent personal data.
// The Phase-2 tables (enrolments/notes/tasks/events/note_pupil_mentions) reference pupils with the
// default RESTRICT, so a naive DELETE throws; we clear/detach those first, then DELETE lets the
// Phase 8/9 CASCADE tables (answers→marks, credentials, devices, profiles, …) clear themselves.

export type DisposalMode = 'anonymise' | 'erase';

/** A short non-identifying summary of what a disposal removed (for the confirm screen + audit). */
export interface DisposalResult {
  aiToken: string;
  mode: DisposalMode;
  counts: Record<string, number>;
}

async function rowsAffected(client: import('pg').PoolClient, sql: string, params: unknown[]): Promise<number> {
  const r = await client.query(sql, params);
  return r.rowCount ?? 0;
}

export async function disposePupil(id: number, mode: DisposalMode): Promise<DisposalResult | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const who = (await client.query<{ aiToken: string }>(`SELECT ai_token AS "aiToken" FROM pupils WHERE id = $1 FOR UPDATE`, [id])).rows[0];
    if (!who) { await client.query('ROLLBACK'); return null; }
    const counts: Record<string, number> = {};

    if (mode === 'anonymise') {
      // Identity + login + individual narrative go; cohort/attainment data stays, now nameless.
      counts.credentials = await rowsAffected(client, `DELETE FROM pupil_credentials WHERE pupil_id = $1`, [id]);
      counts.devices = await rowsAffected(client, `DELETE FROM pupil_devices WHERE pupil_id = $1`, [id]);
      counts.profile = await rowsAffected(client, `DELETE FROM pupil_profiles WHERE pupil_id = $1`, [id]);
      counts.comments = await rowsAffected(client, `DELETE FROM pupil_lesson_comments WHERE pupil_id = $1`, [id]);
      // Name → the stable token, archived. The token stays so the redaction roster + aggregates hold.
      await client.query(`UPDATE pupils SET display_name = ai_token, active = false WHERE id = $1`, [id]);
    } else {
      // Full erasure: clear the RESTRICT blockers, detach the nullable links, then DELETE cascades.
      counts.enrolments = await rowsAffected(client, `DELETE FROM enrolments WHERE pupil_id = $1`, [id]);
      counts.mentions = await rowsAffected(client, `DELETE FROM note_pupil_mentions WHERE pupil_id = $1`, [id]);
      counts.notes_detached = await rowsAffected(client, `UPDATE notes SET pupil_id = NULL WHERE pupil_id = $1`, [id]);
      counts.tasks_detached = await rowsAffected(client, `UPDATE tasks SET pupil_id = NULL WHERE pupil_id = $1`, [id]);
      counts.events_detached = await rowsAffected(client, `UPDATE events SET pupil_id = NULL WHERE pupil_id = $1`, [id]);
      counts.answers = (await client.query<{ n: number }>(`SELECT count(*)::int n FROM pupil_answers WHERE pupil_id = $1`, [id])).rows[0]!.n;
      // safeguarding_review has a polymorphic (FK-less) source_id, so the answer cascade won't clear
      // its 'answer' rows — do it explicitly here, while the answers still exist to resolve the ids.
      counts.sgReviews = await rowsAffected(client, `DELETE FROM safeguarding_review WHERE source_type = 'answer' AND source_id IN (SELECT id FROM pupil_answers WHERE pupil_id = $1)`, [id]);
      counts.deleted = await rowsAffected(client, `DELETE FROM pupils WHERE id = $1`, [id]); // CASCADE clears the rest
    }

    await client.query(`INSERT INTO pupil_disposals (ai_token, action, detail) VALUES ($1, $2, $3::jsonb)`, [who.aiToken, mode, JSON.stringify(counts)]);
    await client.query('COMMIT');
    return { aiToken: who.aiToken, mode, counts };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** The disposal audit, newest first — shown on the Pupils page as the retention evidence. */
export async function listDisposals(limit = 50): Promise<Array<{ aiToken: string; action: string; detail: unknown; createdAt: string }>> {
  const { rows } = await pool.query(
    `SELECT ai_token AS "aiToken", action, detail, to_char(created_at, 'YYYY-MM-DD HH24:MI') AS "createdAt"
     FROM pupil_disposals ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
  return rows as Array<{ aiToken: string; action: string; detail: unknown; createdAt: string }>;
}

/** 10.2 (SAR) — assemble one pupil's full record for a subject-access request. Names are shown:
 * it is the data subject's own data. Read-only over the existing tables. */
export async function exportPupilRecord(id: number): Promise<Record<string, unknown> | null> {
  const pupil = (await pool.query(`SELECT ${ROW}, created_at AS "createdAt" FROM pupils WHERE id = $1`, [id])).rows[0];
  if (!pupil) return null;
  const q = async (sql: string): Promise<unknown[]> => (await pool.query(sql, [id])).rows;
  return {
    exportedAt: new Date().toISOString(),
    pupil,
    enrolments: await q(`SELECT g.name AS "group", e.active FROM enrolments e JOIN groups g ON g.id = e.group_id WHERE e.pupil_id = $1 ORDER BY g.name`),
    linkedNotes: await q(`SELECT id, kind, body, created_at AS "createdAt" FROM notes WHERE pupil_id = $1 ORDER BY created_at`),
    mentions: await q(`SELECT note_id AS "noteId", text FROM note_pupil_mentions WHERE pupil_id = $1`),
    answers: await q(`SELECT occurrence_course_id AS "occurrenceCourseId", field_key AS "fieldKey", value, version_no AS "versionNo", updated_at AS "updatedAt" FROM pupil_answers WHERE pupil_id = $1 ORDER BY occurrence_course_id, field_key`),
    marks: await q(`SELECT a.occurrence_course_id AS "occurrenceCourseId", a.field_key AS "fieldKey", m.marks_awarded AS "awarded", m.marks_total AS "total", m.marker, m.status, m.feedback
                    FROM pupil_marks m JOIN pupil_answers a ON a.id = m.pupil_answer_id WHERE a.pupil_id = $1 ORDER BY a.occurrence_course_id, a.field_key`),
    feedback: await q(`SELECT occurrence_course_id AS "occurrenceCourseId", rating, liked, disliked, comment FROM pupil_lesson_feedback WHERE pupil_id = $1`),
    teacherComments: await q(`SELECT occurrence_course_id AS "occurrenceCourseId", comment FROM pupil_lesson_comments WHERE pupil_id = $1`),
    profile: (await q(`SELECT digest, updated_at AS "updatedAt" FROM pupil_profiles WHERE pupil_id = $1`))[0] ?? null,
  };
}
