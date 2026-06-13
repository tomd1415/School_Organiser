import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../../src/db/pool';
import { setSetting, getSetting } from '../../src/repos/settings';
import { createResource, addVersion, linkResourceToPlan } from '../../src/repos/resources';
import { storeBuffer, checksum, relPathFor } from '../../src/lib/resourceStore';
import { saveAnswer } from '../../src/repos/pupilWork';
import {
  upsertScheme, markSummaries, confirmAllConfident, getMarkingSettings, setMarkingSetting,
  releaseMarks, overrideMark, marksForPupil, answersForMarking, getScheme, confirmMarksForPupil,
  enqueueOpenMark, claimDueMarkJobs, dequeueOpenMark,
} from '../../src/repos/marking';
import { markObjective, markOpen, pupilLessonResults } from '../../src/services/marking';
import { classAnswers } from '../../src/repos/pupilWork';
import { guardMatch } from '../../src/lib/markSafetyGate';
import { invalidateMarksGate } from '../../src/auth/marksGate';
import { rememberDevice, resumeDevice, revokeAllDevices, newDeviceSecret, deviceCount } from '../../src/repos/pupilDevices';

// Phase 9 marking pipeline against the dev DB. AI-free: deterministic marking, confirm, release,
// visibility, override and devices all work without a key (the integration env forces it empty),
// so they're exercised here; the AI passes degrade gracefully and are covered elsewhere.
let gc = 0, oc = 0, pupil = 0, resourceId = 0, lessonPlanId = 0;
let savedAccess: string | null = null, savedMarks: string | null = null;
const WS_MD = `# Lists\n\n## 🟢 Support\n| Q | Type your answer here |\n|---|---|\n| What is a list? | |\n\n### 🟢 Success checklist\n- [ ] I answered\n`;

async function purge(): Promise<void> {
  await pool.query(`DELETE FROM pupil_marks m USING pupil_answers a WHERE m.pupil_answer_id=a.id AND a.pupil_id IN (SELECT id FROM pupils WHERE display_name LIKE 'ZZM %')`);
  await pool.query(`DELETE FROM pupil_answers WHERE pupil_id IN (SELECT id FROM pupils WHERE display_name LIKE 'ZZM %')`);
  await pool.query(`DELETE FROM pupil_devices WHERE pupil_id IN (SELECT id FROM pupils WHERE display_name LIKE 'ZZM %')`);
  await pool.query(`DELETE FROM mark_schemes WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE 'ZZM%')`);
  await pool.query(`DELETE FROM occurrence_courses WHERE group_course_id IN (SELECT gc.id FROM group_courses gc JOIN courses c ON c.id=gc.course_id WHERE c.name LIKE 'ZZM%')`);
  await pool.query(`DELETE FROM lesson_occurrences WHERE date='2001-05-05'`);
  await pool.query(`DELETE FROM resource_links WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE 'ZZM%')`);
  await pool.query(`UPDATE resources SET current_version_id=NULL WHERE title LIKE 'ZZM%'`);
  await pool.query(`DELETE FROM resource_versions WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE 'ZZM%')`);
  await pool.query(`DELETE FROM resources WHERE title LIKE 'ZZM%'`);
  await pool.query(`DELETE FROM lesson_plans WHERE title LIKE 'ZZM%'`);
  await pool.query(`DELETE FROM units WHERE title LIKE 'ZZM%'`);
  await pool.query(`DELETE FROM schemes_of_work WHERE title LIKE 'ZZM%'`);
  await pool.query(`DELETE FROM enrolments WHERE group_id IN (SELECT id FROM groups WHERE name LIKE 'ZZM%')`);
  await pool.query(`DELETE FROM group_courses WHERE course_id IN (SELECT id FROM courses WHERE name LIKE 'ZZM%')`);
  await pool.query(`DELETE FROM pupils WHERE display_name LIKE 'ZZM %'`);
  await pool.query(`DELETE FROM groups WHERE name LIKE 'ZZM%'`);
  await pool.query(`DELETE FROM courses WHERE name LIKE 'ZZM%'`);
}

beforeAll(async () => {
  savedAccess = await getSetting('pupil_access_enabled');
  savedMarks = await getSetting('pupil_marks_enabled');
  await setSetting('pupil_access_enabled', 'true');
  await setSetting('pupil_marks_enabled', 'true');
  await purge();
  const yearId = Number((await pool.query<{ id: number }>(`SELECT id FROM academic_years WHERE is_current`)).rows[0]!.id);
  const courseId = Number((await pool.query<{ id: number }>(`INSERT INTO courses (name) VALUES ('ZZM course') RETURNING id`)).rows[0]!.id);
  const groupId = Number((await pool.query<{ id: number }>(`INSERT INTO groups (name, academic_year_id, active) VALUES ('ZZMGRP', $1, true) RETURNING id`, [yearId])).rows[0]!.id);
  gc = Number((await pool.query<{ id: number }>(`INSERT INTO group_courses (group_id, course_id) VALUES ($1,$2) RETURNING id`, [groupId, courseId])).rows[0]!.id);
  const schemeId = Number((await pool.query<{ id: number }>(`INSERT INTO schemes_of_work (course_id, title, version, active) VALUES ($1,'ZZM scheme',99,false) RETURNING id`, [courseId])).rows[0]!.id);
  const unitId = Number((await pool.query<{ id: number }>(`INSERT INTO units (scheme_id, title, display_order) VALUES ($1,'ZZM unit',1) RETURNING id`, [schemeId])).rows[0]!.id);
  lessonPlanId = Number((await pool.query<{ id: number }>(`INSERT INTO lesson_plans (unit_id, course_id, title, display_order, objectives, outline) VALUES ($1,$2,'ZZM lesson',1,'o','s') RETURNING id`, [unitId, courseId])).rows[0]!.id);
  resourceId = await createResource('ZZM worksheet', 'worksheet', 'text/markdown', 'ai_generated');
  const buf = Buffer.from(WS_MD, 'utf8');
  const rel = relPathFor(resourceId, 1, 'worksheet.md');
  await storeBuffer(rel, buf);
  await addVersion(resourceId, rel, buf.byteLength, checksum(buf), 'ai', 'test');
  await linkResourceToPlan(resourceId, lessonPlanId);
  pupil = Number((await pool.query<{ id: number }>(`INSERT INTO pupils (display_name, ai_token) VALUES ('ZZM Ada','PUPIL_ZM1') RETURNING id`)).rows[0]!.id);
  await pool.query(`INSERT INTO enrolments (pupil_id, group_id, active) VALUES ($1,$2,true)`, [pupil, groupId]);
  const { setPupilPin } = await import('../../src/repos/pupilCredentials');
  await setPupilPin(pupil, '1234'); // an enabled credential — device resume requires one
  const occId = Number((await pool.query<{ id: number }>(`INSERT INTO lesson_occurrences (timetabled_lesson_id, date) SELECT id,'2001-05-05' FROM timetabled_lessons ORDER BY id LIMIT 1 RETURNING id`)).rows[0]!.id);
  oc = Number((await pool.query<{ id: number }>(`INSERT INTO occurrence_courses (occurrence_id, group_course_id, lesson_plan_id) VALUES ($1,$2,$3) RETURNING id`, [occId, gc, lessonPlanId])).rows[0]!.id);
  // pupil answers: a keyword-matchable answer + a ticked checklist
  await saveAnswer({ pupilId: pupil, occurrenceCourseId: oc, resourceId, versionNo: 1, fieldKey: 't1.r1.c2', value: 'a sequence of items' });
  await saveAnswer({ pupilId: pupil, occurrenceCourseId: oc, resourceId, versionNo: 1, fieldKey: 'task.1', value: 'x' });
  // a ready scheme (as the teacher/derive would produce)
  await upsertScheme(resourceId, 1, 'teacher', 'ready', [
    { fieldKey: 't1.r1.c2', kind: 'keyword', expected: 'sequence', alternatives: ['list', 'items'], marks: 2, required: false },
    { fieldKey: 'task.1', kind: 'tick', expected: 'done', alternatives: [], marks: 1, required: false },
  ]);
});

afterAll(async () => {
  await purge();
  if (savedAccess === null) await pool.query(`DELETE FROM settings WHERE key='pupil_access_enabled'`); else await setSetting('pupil_access_enabled', savedAccess);
  if (savedMarks === null) await pool.query(`DELETE FROM settings WHERE key='pupil_marks_enabled'`); else await setSetting('pupil_marks_enabled', savedMarks);
  await pool.end();
});

describe('Phase 9 marking pipeline (integration)', () => {
  it('deterministic marking awards objective marks (keyword + tick), no AI', async () => {
    const r = await markObjective(oc);
    expect(r.marked).toBe(2);
    const s = (await markSummaries(oc)).get(pupil)!;
    expect(s.awarded).toBe(3); // 2 (keyword 'sequence' + 'items' → but single point worth 2) + 1 (tick)
    expect(s.total).toBe(3);
    expect(s.suggested).toBe(2); // both unconfirmed
  });

  it('marks are suggestions until confirmed; results hidden from the pupil until then', async () => {
    expect(await pupilLessonResults(pupil, oc)).toBeNull(); // nothing confirmed yet
    const n = await confirmAllConfident(oc);
    expect(n).toBe(2);
    const res = await pupilLessonResults(pupil, oc); // instant mode (default) → visible once confirmed
    expect(res).not.toBeNull();
    expect(res!.awarded).toBe(3);
    expect(res!.showScores).toBe(false); // ticks-only default
  });

  it('hold-until-release mode hides confirmed marks until the teacher releases', async () => {
    await setMarkingSetting(gc, 'resultsMode', 'on_release');
    expect(await pupilLessonResults(pupil, oc)).toBeNull(); // held back
    await releaseMarks(oc, true);
    expect(await pupilLessonResults(pupil, oc)).not.toBeNull();
    await releaseMarks(oc, false);
    expect(await pupilLessonResults(pupil, oc)).toBeNull(); // un-released again
    await setMarkingSetting(gc, 'resultsMode', 'instant');
  });

  it('teacher override sets the mark and confirms it', async () => {
    const before = await marksForPupil(pupil, oc);
    const tickMark = before.find((m) => m.fieldKey === 'task.1')!;
    await overrideMark(tickMark.pupilAnswerId, pupil, oc, 0, 'have another go at ticking off each step');
    const after = (await marksForPupil(pupil, oc)).find((m) => m.fieldKey === 'task.1')!;
    expect(after.marksAwarded).toBe(0);
    expect(after.marker).toBe('teacher');
    expect(after.status).toBe('confirmed');
  });

  it('a remembered device round-trips and is revoked on the security cascade', async () => {
    const secret = newDeviceSecret();
    await rememberDevice(pupil, secret, 'Edge on ICT1');
    expect(await resumeDevice(secret)).toBe(pupil);
    expect(await deviceCount(pupil)).toBe(1);
    await revokeAllDevices(pupil); // e.g. PIN reset / disable
    expect(await resumeDevice(secret)).toBeNull();
    expect(await deviceCount(pupil)).toBe(0);
  });

  it('the scheme is keyed to the worksheet resource version and readable back', async () => {
    const s = await getScheme(resourceId, 1);
    expect(s).not.toBeNull();
    expect(s!.scheme.status).toBe('ready');
    expect(s!.points).toHaveLength(2);
    expect(await answersForMarking(oc)).toHaveLength(2);
  });
});

// The invariants that, if broken, would either send a child's words to the AI or mis-attribute a
// mark. Deliberately AI-free (the env key is empty) — each asserts the GATE/scope, not the model.
describe('Phase 9 marking — safety invariants (integration)', () => {
  it('markOpen sends NOTHING to the AI when the marks gate is off (returns "nothing", not "unavailable")', async () => {
    await setSetting('pupil_marks_enabled', 'false');
    invalidateMarksGate();
    const r = await markOpen(oc);
    // "nothing" means the gate short-circuited BEFORE any prepare/AI path (which would say
    // "unavailable" for the empty key) — so the gate, not the missing key, is what stopped it.
    expect(r.status).toBe('nothing');
    expect(r.marked).toBe(0);
    await setSetting('pupil_marks_enabled', 'true');
    invalidateMarksGate();
  });

  it('confirmMarksForPupil confirms confident marks but never the ones flagged needs_review', async () => {
    // Reset this pupil's two marks to suggested, and flag the tick as needing the teacher's eyes.
    await pool.query(
      `UPDATE pupil_marks m SET status='suggested', needs_review = (a.field_key = 'task.1')
       FROM pupil_answers a WHERE m.pupil_answer_id = a.id AND a.pupil_id = $1 AND a.occurrence_course_id = $2`,
      [pupil, oc],
    );
    const n = await confirmMarksForPupil(pupil, oc);
    expect(n).toBe(1); // only the confident keyword mark flips
    const marks = await marksForPupil(pupil, oc);
    expect(marks.find((m) => m.fieldKey === 't1.r1.c2')!.status).toBe('confirmed');
    expect(marks.find((m) => m.fieldKey === 'task.1')!.status).toBe('suggested'); // held back for review
  });

  it('overrideMark refuses a forged answer id (wrong pupil / non-existent) — 0 rows, no change', async () => {
    const realId = (await marksForPupil(pupil, oc))[0]!.pupilAnswerId;
    expect(await overrideMark(realId, pupil + 9_000_000, oc, 99, 'forged')).toBe(0); // right answer, wrong pupil
    expect(await overrideMark(2_100_000_000, pupil, oc, 99, 'forged')).toBe(0); // answer id that isn't this pupil's
    const after = (await marksForPupil(pupil, oc)).find((m) => m.pupilAnswerId === realId)!;
    expect(after.feedback).not.toBe('forged'); // the real mark is untouched
  });

  it('the durable open-marking queue (10.9) persists a job and claims it once when due — survives a restart', async () => {
    await dequeueOpenMark(oc);
    await enqueueOpenMark(oc, -5_000); // due 5s ago (as if queued before a reboot)
    const first = await claimDueMarkJobs();
    expect(first).toContain(oc); // a fresh process would pick it up on its boot sweep
    expect(await claimDueMarkJobs()).not.toContain(oc); // claimed exactly once (atomic DELETE…RETURNING)
    await enqueueOpenMark(oc, 600_000); // re-armed far in the future by a later "Done" tap
    expect(await claimDueMarkJobs()).not.toContain(oc); // not yet due → left alone
    await dequeueOpenMark(oc);
  });

  it('class-work summary withholds a guard-matched pupil answer from the AI (stored raw, screened at egress)', async () => {
    // A pupil isn't blocked from typing a disclosure/injection — but the egress screen must drop it.
    await saveAnswer({ pupilId: pupil, occurrenceCourseId: oc, resourceId, versionNo: 1, fieldKey: 't1.r1.c2', value: 'I want to hurt myself' });
    const raw = await classAnswers(oc);
    expect(raw.flatMap((a) => a.answers).join(' | ')).toContain('hurt myself'); // stored, not censored from the teacher
    // the exact screen the /summarise route applies before building the AI context:
    const screened = raw.map((a) => ({ ...a, answers: a.answers.filter((v) => !guardMatch(v)) })).filter((a) => a.answers.length > 0);
    expect(screened.flatMap((a) => a.answers).join(' | ')).not.toContain('hurt myself');
  });
});
