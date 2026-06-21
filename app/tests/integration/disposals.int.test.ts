import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { absPath, storeBuffer } from '../../src/lib/resourceStore';
import { createPupil, disposePupil, exportPupilRecord, exportPupilArchive, listDisposals, listRoster } from '../../src/repos/pupils';
import AdmZip from 'adm-zip';

// Phase 10.2 — pupil erasure / anonymisation + SAR export against the dev DB. The critical property:
// a naive DELETE FROM pupils throws on the Phase-2 RESTRICT FKs (enrolments/notes/tasks/events/
// mentions), so erase MUST clear/detach those first. Anonymise keeps cohort data, nameless.
let groupId = 0;
let eraseId = 0, anonId = 0;
let eraseToken = '', anonToken = '';
let noteEraseId = 0, taskEraseId = 0, eventEraseId = 0;
let eraseSharedNoteId = 0, eraseMarker = '', anonSharedNoteId = 0, anonMarker = '';
let ocId = 0;                       // an existing occurrence_course to hang a screenshot answer on
let eraseShot = '', anonShot = '';  // the relative paths of each pupil's seeded screenshot file

const SHOT_KEY = 't9.r9.c9';
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]); // PNG sig + filler

// Worksheets v2: a pasted screenshot is a file on the resource volume + an `img:` pointer row. Seed
// both so the disposal tests can prove the FILE is removed (erasure can't orphan pupil work on disk).
async function seedScreenshot(pupilId: number): Promise<string> {
  if (!ocId) return '';
  const rel = `pupil-work/${ocId}/${pupilId}/erasetest.png`;
  await storeBuffer(rel, PNG);
  await pool.query(
    `INSERT INTO pupil_answers (pupil_id, occurrence_course_id, resource_id, version_no, field_key, value)
     VALUES ($1, $2, NULL, NULL, $3, $4)`,
    [pupilId, ocId, SHOT_KEY, `img:${rel}`],
  );
  return rel;
}

async function seedPupilData(pupilId: number): Promise<{ noteId: number; taskId: number; eventId: number; sharedNoteId: number; marker: string }> {
  await pool.query(`INSERT INTO enrolments (pupil_id, group_id, active) VALUES ($1, $2, true)`, [pupilId, groupId]);
  const noteId = Number((await pool.query<{ id: number }>(`INSERT INTO notes (kind, body, pupil_id) VALUES ('general', 'ZZD note about the pupil', $1) RETURNING id`, [pupilId])).rows[0]!.id);
  await pool.query(`INSERT INTO note_pupil_mentions (note_id, pupil_id, text) VALUES ($1, $2, 'ZZD mention')`, [noteId, pupilId]);
  const taskId = Number((await pool.query<{ id: number }>(`INSERT INTO tasks (title, pupil_id) VALUES ('ZZD task', $1) RETURNING id`, [pupilId])).rows[0]!.id);
  const eventId = Number((await pool.query<{ id: number }>(`INSERT INTO events (kind, title, pupil_id) VALUES ('other', 'ZZD event', $1) RETURNING id`, [pupilId])).rows[0]!.id);
  // A SHARED note (owned by no-one) that MENTIONS this pupil by a unique marker — disposal must redact
  // that marker from the body while keeping the (otherwise about-others) note. (BUG-039)
  const marker = `ZZDM${pupilId}`;
  const sharedNoteId = Number((await pool.query<{ id: number }>(`INSERT INTO notes (kind, body, pupil_id) VALUES ('general', $1, NULL) RETURNING id`, [`ZZD shared note naming ${marker} here`])).rows[0]!.id);
  await pool.query(`INSERT INTO note_pupil_mentions (note_id, pupil_id, text) VALUES ($1, $2, $3)`, [sharedNoteId, pupilId, marker]);
  // Cheap CASCADE dependents (no occurrence/resource needed): credential, device, profile.
  const { setPupilPin } = await import('../../src/repos/pupilCredentials');
  await setPupilPin(pupilId, '1234');
  const { rememberDevice, newDeviceSecret } = await import('../../src/repos/pupilDevices');
  await rememberDevice(pupilId, newDeviceSecret(), 'ZZD device');
  await pool.query(`INSERT INTO pupil_profiles (pupil_id, digest) VALUES ($1, 'ZZD profile prose')`, [pupilId]);
  return { noteId, taskId, eventId, sharedNoteId, marker };
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
  ocId = Number((await pool.query<{ id: number }>(`SELECT id FROM occurrence_courses ORDER BY id LIMIT 1`)).rows[0]?.id ?? 0);
  const a = await createPupil('ZZD Erase'); eraseId = a.id; eraseToken = a.aiToken;
  const b = await createPupil('ZZD Anon'); anonId = b.id; anonToken = b.aiToken;
  const seeded = await seedPupilData(eraseId);
  noteEraseId = seeded.noteId; taskEraseId = seeded.taskId; eventEraseId = seeded.eventId;
  eraseSharedNoteId = seeded.sharedNoteId; eraseMarker = seeded.marker;
  eraseShot = await seedScreenshot(eraseId);
  const seededAnon = await seedPupilData(anonId);
  anonSharedNoteId = seededAnon.sharedNoteId; anonMarker = seededAnon.marker;
  anonShot = await seedScreenshot(anonId);
});

afterAll(async () => {
  await purge();
  await pool.query(`DELETE FROM pupil_disposals WHERE ai_token = ANY($1)`, [[eraseToken, anonToken]]);
  for (const s of [eraseShot, anonShot]) if (s) await rm(absPath(s), { force: true }).catch(() => {}); // fallback if a test bailed
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
    // BUG-043: the previously-omitted pupil-linked data is now included…
    expect(rec.linkedTasks.some((t: any) => t.title === 'ZZD task')).toBe(true);
    expect(rec.linkedEvents.some((e: any) => e.title === 'ZZD event')).toBe(true);
    expect(rec.devices.some((d: any) => d.label === 'ZZD device')).toBe(true);
    expect(rec.credential?.pinSet).toBe(true); // a PIN exists…
    expect(typeof rec.safeguardingNote).toBe('string'); // documented safeguarding exclusion
    // …but NO secret is ever exported — not the PIN hash, not the device token hash.
    const blob = JSON.stringify(rec);
    expect(blob).not.toMatch(/scrypt:/); // no credential / device hash
    expect(blob).not.toContain('pin_hash');
    expect(blob).not.toContain('token_hash');
  });

  it('SAR export ZIP bundles the JSON record + the pupil\'s screenshot files + a manifest (BUG-043)', async () => {
    const archive = await exportPupilArchive(eraseId);
    expect(archive).not.toBeNull();
    const zip = new AdmZip(archive!.zip);
    const names = zip.getEntries().map((e) => e.entryName);
    expect(names).toContain('pupil-record.json'); // the full JSON record…
    expect(names).toContain('manifest.json');
    expect(archive!.screenshots).toBeGreaterThanOrEqual(1); // …and the seeded screenshot file(s)
    const shot = zip.getEntries().find((e) => e.entryName.startsWith('screenshots/'));
    expect(shot?.getData().length).toBeGreaterThan(0); // the actual image bytes are in the archive
    const manifest = JSON.parse(zip.getEntry('manifest.json')!.getData().toString('utf8'));
    expect(manifest.screenshotsIncluded).toBe(archive!.screenshots);
    expect(manifest.screenshotsMissing).toEqual([]); // nothing missing — the seeded file was readable
  });

  it('erase removes the pupil + all CASCADE data, deletes RESTRICT rows, DELETES & redacts narrative, and audits', async () => {
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
    // BUG-039: the pupil's OWN note/task/event are DELETED (not detached — their text named the pupil).
    expect((await pool.query(`SELECT 1 FROM notes WHERE id = $1`, [noteEraseId])).rowCount).toBe(0);
    expect((await pool.query(`SELECT 1 FROM tasks WHERE id = $1`, [taskEraseId])).rowCount).toBe(0);
    expect((await pool.query(`SELECT 1 FROM events WHERE id = $1`, [eventEraseId])).rowCount).toBe(0);
    // …and a SHARED note that merely mentioned them survives, with the name redacted out of its body.
    const shared = (await pool.query<{ body: string }>(`SELECT body FROM notes WHERE id = $1`, [eraseSharedNoteId])).rows[0]!;
    expect(shared.body).not.toContain(eraseMarker); // the matched name is gone…
    expect(shared.body).toContain('[removed]'); // …replaced by a marker
    // The name is gone from the redaction roster, and a disposal audit row records it.
    expect((await listRoster()).some((p) => p.id === eraseId)).toBe(false);
    expect((await listDisposals()).some((d) => d.aiToken === eraseToken && d.action === 'erase')).toBe(true);
    // Worksheets v2: the pasted screenshot FILE is gone from disk (not just its DB row), and counted.
    if (eraseShot) {
      expect(r!.counts.screenshots).toBe(1);
      expect(existsSync(absPath(eraseShot))).toBe(false);
      // BUG-044: the deletion tombstone was enqueued in the txn and cleared once the unlink succeeded.
      expect((await pool.query(`SELECT 1 FROM pending_file_deletions WHERE storage_path = $1`, [eraseShot])).rowCount).toBe(0);
    }
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
    // BUG-039: the individual narrative naming the pupil is gone — otherwise "anonymisation" would leave
    // records that still identify them. Owned notes/tasks/events + their mentions are deleted…
    expect((await pool.query(`SELECT 1 FROM notes WHERE pupil_id = $1`, [anonId])).rowCount).toBe(0);
    expect((await pool.query(`SELECT 1 FROM tasks WHERE pupil_id = $1`, [anonId])).rowCount).toBe(0);
    expect((await pool.query(`SELECT 1 FROM events WHERE pupil_id = $1`, [anonId])).rowCount).toBe(0);
    expect((await pool.query(`SELECT 1 FROM note_pupil_mentions WHERE pupil_id = $1`, [anonId])).rowCount).toBe(0);
    // …and a shared note that mentioned them keeps the note but redacts the name.
    const shared = (await pool.query<{ body: string }>(`SELECT body FROM notes WHERE id = $1`, [anonSharedNoteId])).rows[0]!;
    expect(shared.body).not.toContain(anonMarker);
    expect(shared.body).toContain('[removed]');
    expect((await listDisposals()).some((d) => d.aiToken === anonToken && d.action === 'anonymise')).toBe(true);
    // Worksheets v2: a raw screenshot is re-identifying, so anonymise removes the FILE and blanks the
    // pointer, while the (now-nameless) text-attainment row itself is kept.
    if (anonShot) {
      expect(r!.counts.screenshots).toBe(1);
      expect(existsSync(absPath(anonShot))).toBe(false);
      const ans = await pool.query<{ value: string }>(`SELECT value FROM pupil_answers WHERE pupil_id = $1 AND field_key = $2`, [anonId, SHOT_KEY]);
      expect(ans.rows[0]!.value).toBe('');
    }
  });
});
