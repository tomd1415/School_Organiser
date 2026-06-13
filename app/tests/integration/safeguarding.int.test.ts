import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { setSetting, getSetting } from '../../src/repos/settings';
import { createResource, addVersion, linkResourceToPlan } from '../../src/repos/resources';
import { storeBuffer, checksum, relPathFor } from '../../src/lib/resourceStore';
import { saveAnswer } from '../../src/repos/pupilWork';
import { upsertScheme } from '../../src/repos/marking';
import { markObjective, markOpen } from '../../src/services/marking';
import { listSafeguardingItems, safeguardingOpenCount, setSafeguardingStatus, getSafeguardingItem } from '../../src/repos/safeguarding';

// Phase 10.4 — the disclosure lane + register. Proves end-to-end that a guard-matched (safeguarding)
// pupil answer is withheld from the AI AND flagged distinctly (pupil_marks.disclosure), surfaces in
// the register beside a flagged captured note, and carries a record-of-handling. AI-free.
let gc = 0, oc = 0, pupil = 0, resourceId = 0, lessonPlanId = 0, capturedNoteId = 0;
let savedAccess: string | null = null, savedMarks: string | null = null;
const WS_MD = `# Feelings\n\n## 🟢 Support\n| Q | Type your answer here |\n|---|---|\n| How are you today? | |\n`;

async function purge(): Promise<void> {
  await pool.query(`DELETE FROM pupil_marks m USING pupil_answers a WHERE m.pupil_answer_id=a.id AND a.pupil_id IN (SELECT id FROM pupils WHERE display_name LIKE 'ZZS %')`);
  await pool.query(`DELETE FROM pupil_answers WHERE pupil_id IN (SELECT id FROM pupils WHERE display_name LIKE 'ZZS %')`);
  await pool.query(`DELETE FROM safeguarding_review WHERE source_type='captured' AND source_id IN (SELECT id FROM notes WHERE body LIKE 'ZZS %')`);
  await pool.query(`DELETE FROM notes WHERE body LIKE 'ZZS %'`);
  await pool.query(`DELETE FROM mark_schemes WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE 'ZZS%')`);
  await pool.query(`DELETE FROM occurrence_courses WHERE group_course_id IN (SELECT gc.id FROM group_courses gc JOIN courses c ON c.id=gc.course_id WHERE c.name LIKE 'ZZS%')`);
  await pool.query(`DELETE FROM lesson_occurrences WHERE date='2001-06-06'`);
  await pool.query(`DELETE FROM resource_links WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE 'ZZS%')`);
  await pool.query(`UPDATE resources SET current_version_id=NULL WHERE title LIKE 'ZZS%'`);
  await pool.query(`DELETE FROM resource_versions WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE 'ZZS%')`);
  await pool.query(`DELETE FROM resources WHERE title LIKE 'ZZS%'`);
  await pool.query(`DELETE FROM lesson_plans WHERE title LIKE 'ZZS%'`);
  await pool.query(`DELETE FROM units WHERE title LIKE 'ZZS%'`);
  await pool.query(`DELETE FROM schemes_of_work WHERE title LIKE 'ZZS%'`);
  await pool.query(`DELETE FROM enrolments WHERE group_id IN (SELECT id FROM groups WHERE name LIKE 'ZZS%')`);
  await pool.query(`DELETE FROM group_courses WHERE course_id IN (SELECT id FROM courses WHERE name LIKE 'ZZS%')`);
  await pool.query(`DELETE FROM pupils WHERE display_name LIKE 'ZZS %'`);
  await pool.query(`DELETE FROM groups WHERE name LIKE 'ZZS%'`);
  await pool.query(`DELETE FROM courses WHERE name LIKE 'ZZS%'`);
}

beforeAll(async () => {
  savedAccess = await getSetting('pupil_access_enabled');
  savedMarks = await getSetting('pupil_marks_enabled');
  await setSetting('pupil_access_enabled', 'true');
  await setSetting('pupil_marks_enabled', 'true');
  await purge();
  const yearId = Number((await pool.query<{ id: number }>(`SELECT id FROM academic_years WHERE is_current`)).rows[0]!.id);
  const courseId = Number((await pool.query<{ id: number }>(`INSERT INTO courses (name) VALUES ('ZZS course') RETURNING id`)).rows[0]!.id);
  const groupId = Number((await pool.query<{ id: number }>(`INSERT INTO groups (name, academic_year_id, active) VALUES ('ZZSGRP', $1, true) RETURNING id`, [yearId])).rows[0]!.id);
  gc = Number((await pool.query<{ id: number }>(`INSERT INTO group_courses (group_id, course_id) VALUES ($1,$2) RETURNING id`, [groupId, courseId])).rows[0]!.id);
  const schemeId = Number((await pool.query<{ id: number }>(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1,'ZZS scheme',99,false) RETURNING id`, [courseId])).rows[0]!.id);
  const unitId = Number((await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1,'ZZS unit',1) RETURNING id`, [schemeId])).rows[0]!.id);
  lessonPlanId = Number((await pool.query<{ id: number }>(`INSERT INTO lesson_plans (unit_id, course_id, title, display_order, objectives, outline) VALUES ($1,$2,'ZZS lesson',1,'o','s') RETURNING id`, [unitId, courseId])).rows[0]!.id);
  resourceId = await createResource('ZZS worksheet', 'worksheet', 'text/markdown', 'ai_generated');
  const buf = Buffer.from(WS_MD, 'utf8');
  const rel = relPathFor(resourceId, 1, 'worksheet.md');
  await storeBuffer(rel, buf);
  await addVersion(resourceId, rel, buf.byteLength, checksum(buf), 'ai', 'test');
  await linkResourceToPlan(resourceId, lessonPlanId);
  pupil = Number((await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token) VALUES ('ZZS Bea','PUPIL_ZS1') RETURNING id`)).rows[0]!.id);
  await pool.query(`INSERT INTO enrolments (pupil_id, group_id, active) VALUES ($1,$2,true)`, [pupil, groupId]);
  const occId = Number((await pool.query<{ id: number }>(`INSERT INTO lesson_occurrences (timetabled_lesson_id, date) SELECT id,'2001-06-06' FROM timetabled_lessons ORDER BY id LIMIT 1 RETURNING id`)).rows[0]!.id);
  oc = Number((await pool.query<{ id: number }>(`INSERT INTO occurrence_courses (occurrence_id, group_course_id, lesson_plan_id) VALUES ($1,$2,$3) RETURNING id`, [occId, gc, lessonPlanId])).rows[0]!.id);
  // A pupil types a disclosure into the open answer; an OPEN scheme point makes it go through markOpen.
  await saveAnswer({ pupilId: pupil, occurrenceCourseId: oc, resourceId, versionNo: 1, fieldKey: 't1.r1.c2', value: 'sometimes I want to hurt myself' });
  await upsertScheme(resourceId, 1, 'teacher', 'ready', [
    { fieldKey: 't1.r1.c2', kind: 'open', expected: 'a feeling', alternatives: [], marks: 2, required: false },
  ]);
  // A separately-flagged captured note (the same stream email-intake screening files into — 10.5).
  capturedNoteId = Number((await pool.query<{ id: number }>(`INSERT INTO notes (kind, body, safeguarding) VALUES ('captured','ZZS overheard concern','t') RETURNING id`)).rows[0]!.id);
});

afterAll(async () => {
  await purge();
  if (savedAccess === null) await pool.query(`DELETE FROM settings WHERE key='pupil_access_enabled'`); else await setSetting('pupil_access_enabled', savedAccess);
  if (savedMarks === null) await pool.query(`DELETE FROM settings WHERE key='pupil_marks_enabled'`); else await setSetting('pupil_marks_enabled', savedMarks);
  await pool.end();
});

describe('Phase 10.4 — disclosure lane + safeguarding register (integration)', () => {
  it('a guard-matched open answer is withheld from AI AND flagged disclosure (never a plain mark)', async () => {
    await markObjective(oc); // no objective points here; the open pass does the guard screen
    const r = await markOpen(oc);
    // The clean path needs AI (off in tests) but the guard branch runs first and writes the flag.
    const mark = (await pool.query<{ disclosure: boolean; needs_review: boolean }>(
      `SELECT m.disclosure, m.needs_review FROM pupil_marks m JOIN pupil_answers a ON a.id=m.pupil_answer_id WHERE a.pupil_id=$1`,
      [pupil],
    )).rows[0];
    expect(mark).toBeDefined();
    expect(mark!.disclosure).toBe(true);
    expect(mark!.needs_review).toBe(true);
    expect(r.flagged).toBeGreaterThanOrEqual(1);
  });

  it('the register gathers the disclosure answer AND the flagged captured note, both "new"', async () => {
    const items = await listSafeguardingItems();
    const answer = items.find((i) => i.sourceType === 'answer' && i.who === 'ZZS Bea');
    const captured = items.find((i) => i.sourceType === 'captured' && i.sourceId === capturedNoteId);
    expect(answer).toBeDefined();
    expect(answer!.text).toContain('hurt myself'); // the verbatim disclosure, teacher-only
    expect(answer!.status).toBe('new');
    expect(captured).toBeDefined();
    expect(captured!.status).toBe('new');
  });

  it('recording an action updates the status + note and drops it out of the "new" count', async () => {
    const before = await safeguardingOpenCount();
    await setSafeguardingStatus('answer', (await listSafeguardingItems()).find((i) => i.sourceType === 'answer')!.sourceId, 'referred', 'logged on CPOMS, told DSL');
    const item = await getSafeguardingItem('answer', (await listSafeguardingItems()).find((i) => i.sourceType === 'answer' && i.status === 'referred')!.sourceId);
    expect(item!.status).toBe('referred');
    expect(item!.actionNote).toContain('CPOMS');
    expect(await safeguardingOpenCount()).toBe(before - 1);
  });
});
