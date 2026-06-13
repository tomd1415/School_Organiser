import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { createPupil, disposePupil, exportPupilRecord, listDisposals, listRoster } from '../../src/repos/pupils';

// Phase 10.2 — pupil erasure / anonymisation + SAR export against the dev DB. The critical property:
// a naive DELETE FROM pupils throws on the Phase-2 RESTRICT FKs (enrolments/notes/tasks/events/
// mentions), so erase MUST clear/detach those first. Anonymise keeps cohort data, nameless.
let groupId = 0;
let eraseId = 0, anonId = 0;
let eraseToken = '', anonToken = '';
let noteEraseId = 0, taskEraseId = 0, eventEraseId = 0;

async function seedPupilData(pupilId: number): Promise<{ noteId: number; taskId: number; eventId: number }> {
  await pool.query(`INSERT INTO enrolments (pupil_id, group_id, active) VALUES ($1, $2, true)`, [pupilId, groupId]);
  const noteId = Number((await pool.query<{ id: number }>(`INSERT INTO notes (kind, body, pupil_id) VALUES ('general', 'ZZD note about the pupil', $1) RETURNING id`, [pupilId])).rows[0]!.id);
  await pool.query(`INSERT INTO note_pupil_mentions (note_id, pupil_id, text) VALUES ($1, $2, 'ZZD mention')`, [noteId, pupilId]);
  const taskId = Number((await pool.query<{ id: number }>(`INSERT INTO tasks (title, pupil_id) VALUES ('ZZD task', $1) RETURNING id`, [pupilId])).rows[0]!.id);
  const eventId = Number((await pool.query<{ id: number }>(`INSERT INTO events (kind, title, pupil_id) VALUES ('other', 'ZZD event', $1) RETURNING id`, [pupilId])).rows[0]!.id);
  // Cheap CASCADE dependents (no occurrence/resource needed): credential, device, profile.
  const { setPupilPin } = await import('../../src/repos/pupilCredentials');
  await setPupilPin(pupilId, '1234');
  const { rememberDevice, newDeviceSecret } = await import('../../src/repos/pupilDevices');
  await rememberDevice(pupilId, newDeviceSecret(), 'ZZD device');
  await pool.query(`INSERT INTO pupil_profiles (pupil_id, digest) VALUES ($1, 'ZZD profile prose')`, [pupilId]);
  return { noteId, taskId, eventId };
}

// Idempotent cleanup, RESTRICT-order-correct. Scoped to the 'ZZD' labels + the 'ZZDGRP' group, so it
// never touches real data. Captures test pupils BEFORE deleting their enrolments (an anonymised
// leaver's name becomes its token, so it's only findable via the test group's enrolment).
async function purge(): Promise<void> {
  const ids = [
    ...(await pool.query<{ id: number }>(`SELECT id FROM pupils WHERE display_name LIKE 'ZZD %'`)).rows.map((r) => r.id),
    ...(await pool.query<{ pupil_id: number }>(`SELECT DISTINCT pupil_id FROM enrolments WHERE group_id IN (SELECT id FROM groups WHERE name='ZZDGRP')`)).rows.map((r) => r.pupil_id),
  ];
  const all = [...new Set(ids)];
  await pool.query(`DELETE FROM note_pupil_mentions WHERE pupil_id = ANY($1) OR text = 'ZZD mention'`, [all]);
  await pool.query(`DELETE FROM notes WHERE pupil_id = ANY($1) OR body LIKE 'ZZD %'`, [all]);
  await pool.query(`DELETE FROM tasks WHERE pupil_id = ANY($1) OR title = 'ZZD task'`, [all]);
  await pool.query(`DELETE FROM events WHERE pupil_id = ANY($1) OR title = 'ZZD event'`, [all]);
  await pool.query(`DELETE FROM enrolments WHERE pupil_id = ANY($1)`, [all]);
  await pool.query(`DELETE FROM pupils WHERE id = ANY($1)`, [all]); // credentials/devices/profiles CASCADE
  await pool.query(`DELETE FROM groups WHERE name = 'ZZDGRP'`);
}

beforeAll(async () => {
  await purge();
  const yearId = Number((await pool.query<{ id: number }>(`SELECT id FROM academic_years WHERE is_current`)).rows[0]!.id);
  groupId = Number((await pool.query<{ id: number }>(`INSERT INTO groups (name, academic_year_id, active) VALUES ('ZZDGRP', $1, true) RETURNING id`, [yearId])).rows[0]!.id);
  const a = await createPupil('ZZD Erase'); eraseId = a.id; eraseToken = a.aiToken;
  const b = await createPupil('ZZD Anon'); anonId = b.id; anonToken = b.aiToken;
  const seeded = await seedPupilData(eraseId);
  noteEraseId = seeded.noteId; taskEraseId = seeded.taskId; eventEraseId = seeded.eventId;
  await seedPupilData(anonId);
});

afterAll(async () => {
  await purge();
  await pool.query(`DELETE FROM pupil_disposals WHERE ai_token = ANY($1)`, [[eraseToken, anonToken]]);
  await pool.end();
});

describe('Phase 10.2 — pupil erasure / anonymisation + SAR (integration)', () => {
  it('SAR export gathers one pupil\'s full record (names shown — their own data)', async () => {
    const rec = await exportPupilRecord(eraseId) as Record<string, any>;
    expect(rec).not.toBeNull();
    expect(rec.pupil.displayName).toBe('ZZD Erase');
    expect(rec.enrolments.length).toBeGreaterThanOrEqual(1);
    expect(rec.linkedNotes.length).toBeGreaterThanOrEqual(1);
    expect(rec.mentions.length).toBeGreaterThanOrEqual(1);
  });

  it('erase removes the pupil + all CASCADE data, deletes RESTRICT rows, DETACHES notes/tasks/events, and audits', async () => {
    const r = await disposePupil(eraseId, 'erase');
    expect(r).not.toBeNull();
    expect(r!.mode).toBe('erase');
    // The pupil and every CASCADE dependent are gone.
    expect((await pool.query(`SELECT 1 FROM pupils WHERE id = $1`, [eraseId])).rowCount).toBe(0);
    expect((await pool.query(`SELECT 1 FROM pupil_credentials WHERE pupil_id = $1`, [eraseId])).rowCount).toBe(0);
    expect((await pool.query(`SELECT 1 FROM pupil_devices WHERE pupil_id = $1`, [eraseId])).rowCount).toBe(0);
    expect((await pool.query(`SELECT 1 FROM pupil_profiles WHERE pupil_id = $1`, [eraseId])).rowCount).toBe(0);
    // The RESTRICT blockers were cleared (would have thrown otherwise).
    expect((await pool.query(`SELECT 1 FROM enrolments WHERE pupil_id = $1`, [eraseId])).rowCount).toBe(0);
    expect((await pool.query(`SELECT 1 FROM note_pupil_mentions WHERE pupil_id = $1`, [eraseId])).rowCount).toBe(0);
    // The teacher's own note/task/event SURVIVE, just detached from the (now erased) pupil.
    expect((await pool.query(`SELECT pupil_id FROM notes WHERE id = $1`, [noteEraseId])).rows[0]!.pupil_id).toBeNull();
    expect((await pool.query(`SELECT pupil_id FROM tasks WHERE id = $1`, [taskEraseId])).rows[0]!.pupil_id).toBeNull();
    expect((await pool.query(`SELECT pupil_id FROM events WHERE id = $1`, [eventEraseId])).rows[0]!.pupil_id).toBeNull();
    // The name is gone from the redaction roster, and a disposal audit row records it.
    expect((await listRoster()).some((p) => p.id === eraseId)).toBe(false);
    expect((await listDisposals()).some((d) => d.aiToken === eraseToken && d.action === 'erase')).toBe(true);
  });

  it('anonymise scrubs identity + login but KEEPS cohort data, and audits', async () => {
    const r = await disposePupil(anonId, 'anonymise');
    expect(r!.mode).toBe('anonymise');
    const row = (await pool.query<{ display_name: string; active: boolean }>(`SELECT display_name, active FROM pupils WHERE id = $1`, [anonId])).rows[0]!;
    expect(row.display_name).toBe(anonToken); // name → the stable token
    expect(row.active).toBe(false);
    // login + individual narrative gone…
    expect((await pool.query(`SELECT 1 FROM pupil_credentials WHERE pupil_id = $1`, [anonId])).rowCount).toBe(0);
    expect((await pool.query(`SELECT 1 FROM pupil_profiles WHERE pupil_id = $1`, [anonId])).rowCount).toBe(0);
    // …but cohort membership stays (now nameless), and the pupil is still in the redaction roster.
    expect((await pool.query(`SELECT 1 FROM enrolments WHERE pupil_id = $1`, [anonId])).rowCount).toBe(1);
    expect((await listRoster()).some((p) => p.id === anonId)).toBe(true);
    expect((await listDisposals()).some((d) => d.aiToken === anonToken && d.action === 'anonymise')).toBe(true);
  });
});
