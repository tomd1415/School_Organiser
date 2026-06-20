import { pool } from '../db/pool';
import { removeStored } from '../lib/resourceStore';
import { clearFileDeletion, enqueueFileDeletion } from './fileDeletions';

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
  // Derive ai_token from the row's OWN serial id (monotonic, never reused) — not max(id)+1, which
  // (a) collides if two pupils are created concurrently and (b) re-issues a deleted pupil's token to a
  // new pupil. Insert with a unique placeholder (so a UNIQUE token index can't trip under concurrency),
  // then set the token from the assigned id — two statements in one transaction.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ins = await client.query<{ id: number }>(
      `INSERT INTO pupils (display_name, ai_token) VALUES ($1, gen_random_uuid()::text) RETURNING id`,
      [name],
    );
    const id = ins.rows[0]!.id;
    const { rows } = await client.query<RosterEntry>(
      `UPDATE pupils SET ai_token = 'PUPIL_' || id WHERE id = $1 RETURNING ${ROW}`,
      [id],
    );
    await client.query('COMMIT');
    return rows[0]!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listPupils(): Promise<RosterEntry[]> {
  const { rows } = await pool.query<RosterEntry>(`SELECT ${ROW} FROM pupils WHERE NOT is_test ORDER BY display_name`);
  return rows;
}

// The fictitious test pupil (Phase: pupil-testing). Find-or-create — one per instance. Bypasses the
// usual "no credential before DPIA sign-off" rule because it stores NO real child's data; it exists
// only so the teacher can drive the real pupil surface. Token derived from the id like any pupil.
export async function ensureTestPupil(): Promise<RosterEntry> {
  const found = await pool.query<RosterEntry>(`SELECT ${ROW} FROM pupils WHERE is_test ORDER BY id LIMIT 1`);
  if (found.rows[0]) return found.rows[0];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ins = await client.query<{ id: number }>(
      `INSERT INTO pupils (display_name, ai_token, active, is_test) VALUES ('Test Pupil', gen_random_uuid()::text, true, true) RETURNING id`,
    );
    const id = ins.rows[0]!.id;
    const { rows } = await client.query<RosterEntry>(`UPDATE pupils SET ai_token = 'PUPIL_' || id WHERE id = $1 RETURNING ${ROW}`, [id]);
    await client.query('COMMIT');
    return rows[0]!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// The roster the redactor matches against — EVERY pupil, not just active ones, longest name
// first so "Samantha" is tokenised before "Sam". Inactive (left) pupils keep their real name in
// the DB until a deliberate anonymisation action, so they must still be redacted: a current pupil
// could type a leaver's name into an answer, and the egress assert must still catch it.
export async function listRoster(): Promise<RosterEntry[]> {
  const { rows } = await pool.query<RosterEntry>(
    `SELECT ${ROW} FROM pupils WHERE NOT is_test ORDER BY length(display_name) DESC, id`,
  );
  return rows;
}

export async function setPupilActive(id: number, active: boolean): Promise<void> {
  // Archiving (active=false) must also revoke any live session for the pupil (BUG-017).
  await pool.query(`UPDATE pupils SET active = $2, session_epoch = session_epoch + (CASE WHEN $2 THEN 0 ELSE 1 END) WHERE id = $1`, [id, active]);
}

/** Live-session validity inputs for the request hook: is the pupil still active, and at what epoch?
 *  Returns null if the pupil no longer exists (erased) → the hook treats that as revoked. */
export async function getPupilSessionState(id: number): Promise<{ active: boolean; epoch: number } | null> {
  const { rows } = await pool.query<{ active: boolean; epoch: number }>(
    `SELECT active, session_epoch AS epoch FROM pupils WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/** Invalidate every live session for a pupil (a PIN reset / disable bumps it). */
export async function bumpPupilEpoch(id: number): Promise<void> {
  await pool.query(`UPDATE pupils SET session_epoch = session_epoch + 1 WHERE id = $1`, [id]);
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

/**
 * BUG-039: remove this pupil's identifying NARRATIVE — the free text that names them. Their OWN
 * notes/tasks/events are personal data about them and are deleted; in notes about OTHER pupils that
 * merely mention them, the exact matched name (recorded on the mention row) is redacted from the body
 * and the mention removed. Shared by both disposal modes — so an anonymisation can no longer leave a
 * note that still names the supposedly-anonymised pupil, and an erasure DELETES the narrative rather
 * than merely detaching it (which left the identifying text behind).
 */
async function scrubPupilNarrative(client: import('pg').PoolClient, id: number): Promise<Record<string, number>> {
  const c: Record<string, number> = {};
  // notes ABOUT OTHERS that mention this pupil: redact the exact matched name from the body, keep the note.
  await client.query(
    `UPDATE notes n SET body = replace(n.body, m.text, '[removed]')
     FROM note_pupil_mentions m
     WHERE m.note_id = n.id AND m.pupil_id = $1 AND n.body IS NOT NULL AND coalesce(m.text, '') <> ''`,
    [id],
  );
  c.mentionsRedacted = await rowsAffected(client, `DELETE FROM note_pupil_mentions WHERE pupil_id = $1`, [id]);
  // the pupil's OWN narrative records are deleted (mentions on those cascade away). Detach any child
  // tasks first so a sub-tasked parent doesn't hit the parent_task_id RESTRICT.
  await client.query(`UPDATE tasks SET parent_task_id = NULL WHERE parent_task_id IN (SELECT id FROM tasks WHERE pupil_id = $1)`, [id]);
  c.notes = await rowsAffected(client, `DELETE FROM notes WHERE pupil_id = $1`, [id]);
  c.tasks = await rowsAffected(client, `DELETE FROM tasks WHERE pupil_id = $1`, [id]);
  c.events = await rowsAffected(client, `DELETE FROM events WHERE pupil_id = $1`, [id]);
  return c;
}

export async function disposePupil(id: number, mode: DisposalMode): Promise<DisposalResult | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const who = (await client.query<{ aiToken: string }>(`SELECT ai_token AS "aiToken" FROM pupils WHERE id = $1 FOR UPDATE`, [id])).rows[0];
    if (!who) { await client.query('ROLLBACK'); return null; }
    const counts: Record<string, number> = {};

    // Pupil-pasted screenshots live on the resource volume; the DB only holds an `img:` pointer
    // (DATA_MODEL §O). Capture them now, while the rows exist, to delete the files after COMMIT — a
    // raw screenshot can carry direct identifiers the app can't redact, so it survives NEITHER an
    // erasure NOR an anonymisation (text answers/marks stay as nameless attainment; images don't).
    const imgPaths = (await client.query<{ value: string }>(
      `SELECT value FROM pupil_answers WHERE pupil_id = $1 AND value LIKE 'img:%'`, [id],
    )).rows.map((r) => r.value.slice(4)).filter((p) => p.startsWith('pupil-work/') && !p.includes('..'));
    counts.screenshots = imgPaths.length;

    if (mode === 'anonymise') {
      // Identity + login + individual narrative go; cohort/attainment data stays, now nameless.
      counts.credentials = await rowsAffected(client, `DELETE FROM pupil_credentials WHERE pupil_id = $1`, [id]);
      counts.devices = await rowsAffected(client, `DELETE FROM pupil_devices WHERE pupil_id = $1`, [id]);
      counts.profile = await rowsAffected(client, `DELETE FROM pupil_profiles WHERE pupil_id = $1`, [id]);
      counts.comments = await rowsAffected(client, `DELETE FROM pupil_lesson_comments WHERE pupil_id = $1`, [id]);
      // BUG-039: the individual narrative (notes/tasks/events about them + mentions) names the pupil, so
      // it must go too — otherwise "anonymisation" leaves records that still identify them. Attainment
      // (answers/marks/feedback/levels) stays, now nameless under the token.
      Object.assign(counts, await scrubPupilNarrative(client, id));
      // Text answers/marks stay as nameless attainment, but raw screenshots are re-identifying — drop
      // their pointers (the files themselves are removed after COMMIT, below) so nothing dangles.
      if (imgPaths.length) await client.query(`UPDATE pupil_answers SET value = '' WHERE pupil_id = $1 AND value LIKE 'img:%'`, [id]);
      // Name → the stable token, archived. The token stays so the redaction roster + aggregates hold.
      await client.query(`UPDATE pupils SET display_name = ai_token, active = false WHERE id = $1`, [id]);
    } else {
      // Full erasure: clear the RESTRICT blockers, DELETE the narrative (not just detach — BUG-039: a
      // detached note/task/event keeps the pupil's name in its free text), then DELETE cascades the rest.
      counts.enrolments = await rowsAffected(client, `DELETE FROM enrolments WHERE pupil_id = $1`, [id]);
      Object.assign(counts, await scrubPupilNarrative(client, id));
      counts.answers = (await client.query<{ n: number }>(`SELECT count(*)::int n FROM pupil_answers WHERE pupil_id = $1`, [id])).rows[0]!.n;
      // safeguarding_review has a polymorphic (FK-less) source_id, so the answer cascade won't clear
      // its 'answer' rows — do it explicitly here, while the answers still exist to resolve the ids.
      counts.sgReviews = await rowsAffected(client, `DELETE FROM safeguarding_review WHERE source_type = 'answer' AND source_id IN (SELECT id FROM pupil_answers WHERE pupil_id = $1)`, [id]);
      counts.deleted = await rowsAffected(client, `DELETE FROM pupils WHERE id = $1`, [id]); // CASCADE clears the rest
    }

    // BUG-044: the screenshot files can't join the DB transaction, so enqueue a durable deletion
    // tombstone for each IN the transaction. If the post-commit unlink fails (fs error) or the process
    // crashes before it runs, the tombstone survives and the periodic sweep retries it — so a pupil's
    // screenshot can never silently outlive an erasure.
    const tombstones: Array<{ id: number; rel: string }> = [];
    for (const rel of imgPaths) tombstones.push({ id: await enqueueFileDeletion(client, rel, `disposal-${mode}`), rel });
    await client.query(`INSERT INTO pupil_disposals (ai_token, action, detail) VALUES ($1, $2, $3::jsonb)`, [who.aiToken, mode, JSON.stringify(counts)]);
    await client.query('COMMIT');
    // Delete now; a failure leaves the tombstone for the sweep rather than orphaning the file silently.
    for (const t of tombstones) {
      try { await removeStored(t.rel); await clearFileDeletion(t.id); }
      catch (err) { console.warn(`disposePupil: deferred unlink of ${t.rel} to the sweep:`, err); }
    }
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
    // BUG-043: the SAR must be the WHOLE record, not four queries. Add every other pupil-linked table.
    linkedTasks: await q(`SELECT id, title, detail, status, due_at AS "dueAt", created_at AS "createdAt" FROM tasks WHERE pupil_id = $1 ORDER BY created_at`),
    linkedEvents: await q(`SELECT id, kind, title, detail, date, status FROM events WHERE pupil_id = $1 ORDER BY date NULLS LAST, id`),
    levels: await q(`SELECT c.name AS course, gr.name AS "group", pl.level, pl.updated_at AS "updatedAt"
                     FROM pupil_levels pl JOIN group_courses gc ON gc.id = pl.group_course_id
                     JOIN courses c ON c.id = gc.course_id LEFT JOIN groups gr ON gr.id = gc.group_id WHERE pl.pupil_id = $1`),
    unitSignal: await q(`SELECT u.title AS unit, s.signal, s.updated_at AS "updatedAt" FROM pupil_unit_signal s JOIN units u ON u.id = s.unit_id WHERE s.pupil_id = $1`),
    completed: await q(`SELECT occurrence_course_id AS "occurrenceCourseId", done_at AS "doneAt" FROM pupil_done WHERE pupil_id = $1 ORDER BY done_at`),
    // Devices: the cookie SECRET (token_hash) is never exported — only the non-secret metadata.
    devices: await q(`SELECT label, last_used_at AS "lastUsedAt", expires_at AS "expiresAt", created_at AS "createdAt" FROM pupil_devices WHERE pupil_id = $1 ORDER BY created_at`),
    // Login credential: existence + state only — the PIN hash is a secret and is never disclosed.
    credential: (await q(`SELECT enabled, (pin_hash IS NOT NULL) AS "pinSet", failed_count AS "failedCount", (failed_count >= 5) AS locked, updated_at AS "updatedAt" FROM pupil_credentials WHERE pupil_id = $1`))[0] ?? null,
    // Safeguarding records are deliberately EXCLUDED from this automated export: they may name third
    // parties and are subject to the DPA 2018 safeguarding exemption — release is handled by the DSL
    // case-by-case, not dumped here. (Documented exclusion, per the SAR completeness review.)
    safeguardingNote: 'Safeguarding records (if any) are held separately and are not included in this automated export — request via the Designated Safeguarding Lead; release is assessed under the DPA 2018 safeguarding exemption.',
  };
}
