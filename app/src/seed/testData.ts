// ─────────────────────────────────────────────────────────────────────────────────────────────
// TEST-DATA seed — populates an instance as if it were a live system part-way through the summer
// term. Adds, on top of the base timetable seed (run.ts): enrolled pupils with PINs + levels,
// authored & assigned schemes, lessons laid across every class's calendar, taught history with
// stopping points, pupil work (answers + marks + feedback + Done), and worksheet/slide resources.
//
//   DATABASE_URL=... RESOURCE_STORE_PATH=<instance>/data/resources npx tsx src/seed/testData.ts
//
// Re-runnable: it WIPES the data tables it owns (pupils, schemes, occurrences, resources) and keeps
// the base structure. NEVER calls AI. NOT for production — for manual testing only. The login
// password is printed at the end.
// ─────────────────────────────────────────────────────────────────────────────────────────────
import { pool } from '../db/pool';
import { createPupil } from '../repos/pupils';
import { enrolPupil } from '../repos/setup';
import { setPupilPin, setGroupLoginCode } from '../repos/pupilCredentials';
import { setPupilLevel, saveAnswer, setDone, upsertPupilFeedback, type Level } from '../repos/pupilWork';
import { materialiseScheme } from '../repos/schemes';
import { classSlots } from '../repos/delivery';
import { upcomingClassSlots } from '../services/delivery';
import { findOrCreateOccurrence, getOccurrenceCourses, setOccurrenceProgress } from '../repos/occurrence';
import { createResourceWithVersion, linkResourceToPlan } from '../repos/resources';
import { writeMark, upsertScheme, type NewPoint } from '../repos/marking';
import { renderWorksheet, type WorksheetField } from '../lib/worksheetForm';
import { checksum } from '../lib/resourceStore';
import { setSetting } from '../repos/settings';
import { hashPassword } from '../lib/passwords';
import { RESOURCE_STORE_PATH } from '../config/resources';
import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { TermDate } from '../services/clock';
import {
  SCHEMES, GROUP_SIZE, FIRST_NAMES, LAST_NAMES, worksheetMarkdown, slidesMarkdown,
  type LessonDef, type WorksheetDef,
} from './testData.content';

// ── anchors ────────────────────────────────────────────────────────────────────────────────────
const TODAY = '2026-06-20'; // matches the instance clock; "now" sits part-way through the summer term
const TERM_START = '2026-05-04'; // we extend the current summer term back to here so there is history
const TERM_END = '2026-07-17'; // don't lay lessons past the end of the summer term (no autumn spill-over)
const HALF_TERM = { start: '2026-05-25', end: '2026-05-29' }; // realistic mid-term gap
const LOGIN_PASSWORD = 'testpass1'; // the teacher login for THIS test instance (printed at the end)
const WORK_PUPILS = 16; // cap pupils-with-work per worksheet (a realistic "most, not all, submitted")

// ── deterministic RNG (so re-runs are identical) ────────────────────────────────────────────────
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260620);
const chance = (p: number): boolean => rng() < p;
const pick = <T>(xs: T[]): T => xs[Math.floor(rng() * xs.length)]!;

const log = (m: string): void => console.log(m);

// ── 0. calendar: give the summer term a real run-up so "now" is well into it ────────────────────
async function adjustCalendar(): Promise<void> {
  const yr = await pool.query<{ id: number }>(`SELECT id FROM academic_years WHERE is_current`);
  const yearId = yr.rows[0]!.id;
  // Pull the current summer term's start back (its end stays 2026-07-17).
  await pool.query(
    `UPDATE term_dates SET start_date = $2 WHERE academic_year_id = $1 AND kind = 'term' AND end_date >= $3`,
    [yearId, TERM_START, TODAY],
  );
  // Add the summer half-term gap (idempotent on the unique (year, name, start)).
  await pool.query(
    `INSERT INTO term_dates (academic_year_id, name, start_date, end_date, kind)
     VALUES ($1, 'Summer half term', $2, $3, 'half_term')
     ON CONFLICT (academic_year_id, name, start_date) DO NOTHING`,
    [yearId, HALF_TERM.start, HALF_TERM.end],
  );
  log(`  calendar: summer term now ${TERM_START} → 2026-07-17 (half-term ${HALF_TERM.start}–${HALF_TERM.end})`);
}

async function loadTerms(): Promise<TermDate[]> {
  const { rows } = await pool.query<TermDate>(
    `SELECT to_char(start_date,'YYYY-MM-DD') AS "startDate", to_char(end_date,'YYYY-MM-DD') AS "endDate",
            kind, name FROM term_dates`,
  );
  return rows;
}

// ── 1. wipe the data tables this seed owns (keep the base timetable) ────────────────────────────
async function wipe(): Promise<void> {
  await pool.query(`TRUNCATE pupils, schemes_of_work, lesson_occurrences, resources RESTART IDENTITY CASCADE`);
  // Also clear the resource store so re-runs don't leave orphaned worksheet/slide files behind (the
  // DB truncate frees the rows; the files are keyed by a random token, so a re-run would otherwise
  // accumulate). Remove CONTENTS only — keep the directory itself (it's a bind-mount source).
  try {
    for (const e of await readdir(RESOURCE_STORE_PATH)) await rm(join(RESOURCE_STORE_PATH, e), { recursive: true, force: true });
  } catch { /* store dir may not exist yet — fine */ }
  log('  wiped: pupils / schemes / occurrences / resources + resource store (base timetable kept)');
}

// ── 2. pupils, enrolments, PINs, per-course levels ──────────────────────────────────────────────
interface GroupRow { id: number; name: string; yearGroup: string }
interface GcRow { id: number; groupId: number; courseId: number; groupName: string; courseName: string }

function levelFor(): Level {
  const r = rng();
  return r < 0.2 ? 'support' : r < 0.8 ? 'core' : 'challenge';
}

async function makePupils(groups: GroupRow[], gcs: GcRow[]): Promise<{
  pupilsByGroup: Map<number, number[]>;
  levelByPupilGc: Map<string, Level>;
  total: number;
}> {
  const pupilsByGroup = new Map<number, number[]>();
  const levelByPupilGc = new Map<string, Level>();
  const gcsByGroup = new Map<number, GcRow[]>();
  for (const gc of gcs) (gcsByGroup.get(gc.groupId) ?? gcsByGroup.set(gc.groupId, []).get(gc.groupId)!).push(gc);

  let total = 0;
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi]!;
    const size = GROUP_SIZE[g.name] ?? 20;
    const ids: number[] = [];
    // Deterministic, non-repeating names within a class: rotate the pools by the group index.
    for (let i = 0; i < size; i++) {
      const first = FIRST_NAMES[(gi * 7 + i) % FIRST_NAMES.length]!;
      const last = LAST_NAMES[(gi * 5 + i * 3) % LAST_NAMES.length]!;
      const p = await createPupil(`${first} ${last}`);
      await enrolPupil(p.id, g.id);
      await setPupilPin(p.id, String(1001 + p.id)); // unique 4-digit; teacher can read it on the roster
      ids.push(p.id);
      for (const gc of gcsByGroup.get(g.id) ?? []) {
        const lvl = levelFor();
        await setPupilLevel(p.id, gc.id, lvl);
        levelByPupilGc.set(`${p.id}:${gc.id}`, lvl);
      }
      total++;
    }
    pupilsByGroup.set(g.id, ids);
    await setGroupLoginCode(g.id, `G${g.id}`); // simple per-class login code for pupil-login testing
  }
  log(`  pupils: ${total} across ${groups.length} groups (enrolled, PIN set, levels assigned)`);
  return { pupilsByGroup, levelByPupilGc, total };
}

// ── 3. schemes: author, enrich plans, attach worksheet/slide resources ──────────────────────────
interface WsEntry { resId: number; fields: WorksheetField[]; keyPrefix: string; def: WorksheetDef }
interface PlanInfo { planId: number; lesson: LessonDef; worksheets: WsEntry[] }

async function makeSchemes(courseByName: Map<string, number>): Promise<{
  plansByCourse: Map<number, PlanInfo[]>;
  worksheetCount: number;
  planCount: number;
}> {
  const plansByCourse = new Map<number, PlanInfo[]>();
  let worksheetCount = 0;
  let planCount = 0;

  for (const scheme of SCHEMES) {
    const courseId = courseByName.get(scheme.course);
    if (!courseId) { log(`  ! course not found: ${scheme.course}`); continue; }
    const flat: LessonDef[] = scheme.units.flatMap((u) => u.lessons);
    const schemeId = await materialiseScheme(
      courseId,
      scheme.title,
      scheme.units.map((u) => ({ title: u.title, lessons: u.lessons.map((l) => l.title) })),
    );
    if (!schemeId) { log(`  ! materialiseScheme failed for ${scheme.course}`); continue; }

    // Plans come back in unit/display order — zip them with the flat lesson list.
    const { rows: planRows } = await pool.query<{ id: number }>(
      `SELECT lp.id FROM lesson_plans lp JOIN units u ON u.id = lp.unit_id
       WHERE u.scheme_id = $1 ORDER BY u.display_order, lp.display_order, lp.id`,
      [schemeId],
    );
    const infos: PlanInfo[] = [];
    for (let i = 0; i < planRows.length; i++) {
      const planId = planRows[i]!.id;
      const lesson = flat[i]!;
      await pool.query(
        `UPDATE lesson_plans SET objectives = $2, outline = $3, duration_min = $4, kit_needed = $5, updated_at = now() WHERE id = $1`,
        [planId, lesson.objectives, lesson.outline, lesson.duration ?? 50, lesson.kit ?? null],
      );
      const info: PlanInfo = { planId, lesson, worksheets: [] };
      // A lesson can carry several worksheets (main + extensions); slot 0 is unprefixed, later slots
      // get a `w{n}.` key prefix so their fields never collide.
      const wsList = [lesson.worksheet, ...(lesson.extraWorksheets ?? [])].filter(Boolean) as WorksheetDef[];
      for (let wi = 0; wi < wsList.length; wi += 1) {
        const res = await attachWorksheet(planId, wsList[wi]!);
        info.worksheets.push({ resId: res.resId, fields: res.fields, keyPrefix: wi === 0 ? '' : `w${wi}.`, def: wsList[wi]! });
        worksheetCount++;
      }
      if (lesson.slides) await attachSlides(planId, lesson.title, lesson.slides);
      infos.push(info);
      planCount++;
    }
    plansByCourse.set(courseId, infos);
  }
  log(`  schemes: ${SCHEMES.length} courses, ${planCount} lesson plans, ${worksheetCount} worksheets`);
  return { plansByCourse, worksheetCount, planCount };
}

async function attachWorksheet(planId: number, ws: WorksheetDef): Promise<{ resId: number; fields: WorksheetField[] }> {
  const md = worksheetMarkdown(ws);
  const buf = Buffer.from(md, 'utf8');
  const resId = await createResourceWithVersion(
    { title: `${ws.title} — worksheet.md`, kind: 'worksheet', mimeType: 'text/markdown', source: 'uploaded' },
    { filename: 'worksheet.md', buf, checksum: checksum(buf), author: 'teacher', changeNote: 'seed' },
  );
  await linkResourceToPlan(resId, planId);
  const fields = renderWorksheet(md, { mode: 'review' }).fields;

  // Seed a mark scheme so the marking modal has MODEL ANSWERS (mark_scheme_points.expected) to show
  // next to each question. Text questions → keyword/open/numeric points (2 marks); the fill-in blank
  // → 1 mark. (Checklist ticks are self-assessment, not credited here.)
  const textFields = fields.filter((f) => f.kind === 'text');
  const blankFields = fields.filter((f) => f.kind === 'blank');
  const points: NewPoint[] = textFields.map((f, i) => {
    const a = (ws.questions[i]?.a ?? '').trim();
    const kind = /^\d+$/.test(a) ? 'numeric' : a.length > 30 ? 'open' : 'keyword';
    return { fieldKey: f.key, kind, expected: a, alternatives: [], marks: 2, required: false };
  });
  if (blankFields[0] && ws.blank) {
    points.push({ fieldKey: blankFields[0].key, kind: 'keyword', expected: ws.blank.answer, alternatives: [], marks: 1, required: false });
  }
  // Code-writing answers are open marks; Parson's carry their own correct order, so they get no point.
  fields.filter((f) => f.kind === 'code').forEach((f, i) => {
    const a = (ws.codeQuestions?.[i]?.a ?? '').trim();
    if (a) points.push({ fieldKey: f.key, kind: 'open', expected: a, alternatives: [], marks: 2, required: false });
  });
  await upsertScheme(resId, 1, 'teacher', 'ready', points);
  return { resId, fields };
}

async function attachSlides(planId: number, title: string, bullets: string[]): Promise<void> {
  const md = slidesMarkdown(title, bullets);
  const buf = Buffer.from(md, 'utf8');
  const resId = await createResourceWithVersion(
    { title: `${title} — slides.md`, kind: 'slides', mimeType: 'text/markdown', source: 'ai_generated' },
    { filename: 'slides.md', buf, checksum: checksum(buf), author: 'ai', changeNote: 'seed' },
  );
  await linkResourceToPlan(resId, planId);
}

// ── 4. lay each scheme across each class, mark past lessons taught, generate work ────────────────
const STOP_TEMPLATES = [
  (t: string) => `Covered "${t}" — most of the class finished the questions; recap misconceptions next lesson.`,
  (t: string) => `Reached the plenary of "${t}". A few need to finish the extension.`,
  (t: string) => `Worked through "${t}". Stopped at the last task — pick up there next time.`,
  (t: string) => `Taught "${t}". Good progress; mark the books before the next lesson.`,
];

interface Counts { occurrences: number; taught: number; answers: number; marks: number; done: number; feedback: number }

async function deliverAndWork(
  gcs: GcRow[],
  plansByCourse: Map<number, PlanInfo[]>,
  pupilsByGroup: Map<number, number[]>,
  levelByPupilGc: Map<string, Level>,
  terms: TermDate[],
): Promise<Counts> {
  const c: Counts = { occurrences: 0, taught: 0, answers: 0, marks: 0, done: 0, feedback: 0 };
  const taughtOccurrenceIds = new Set<number>();

  for (const gc of gcs) {
    const plans = plansByCourse.get(gc.courseId);
    if (!plans || plans.length === 0) continue;
    const slots = await classSlots(gc.id);
    if (slots.length === 0) continue;
    // Lay across this term only — cap at the term end so a long scheme doesn't spill into autumn.
    const stream = upcomingClassSlots(slots, TERM_START, plans.length, terms).filter((s) => s.date <= TERM_END);

    // newest-first list of this class's taught worksheet OCs, so feedback lands on the latest one.
    const taughtWorksheetOcs: Array<{ ocId: number; plan: PlanInfo }> = [];

    const n = Math.min(plans.length, stream.length);
    for (let i = 0; i < n; i++) {
      const { date, timetabledLessonId } = stream[i]!;
      const plan = plans[i]!;
      const occId = await findOrCreateOccurrence(timetabledLessonId, date);
      const oc = (await getOccurrenceCourses(occId)).find((o) => Number(o.groupCourseId) === gc.id);
      if (!oc) continue;
      await pool.query(`UPDATE occurrence_courses SET lesson_plan_id = $2 WHERE id = $1`, [oc.occurrenceCourseId, plan.planId]);
      c.occurrences++;

      if (date < TODAY) {
        // taught: set a stopping point (counts as taught) + mark the occurrence taught
        await setOccurrenceProgress(oc.occurrenceCourseId, 5, pick(STOP_TEMPLATES)(plan.lesson.title));
        taughtOccurrenceIds.add(occId);
        c.taught++;
        if (plan.worksheets.length) {
          for (const w of plan.worksheets) {
            const r = await generateWork(oc.occurrenceCourseId, w, gc, pupilsByGroup, levelByPupilGc);
            c.answers += r.answers; c.marks += r.marks;
          }
          c.done += await generateDone(oc.occurrenceCourseId, gc, pupilsByGroup); // Done ✓ once per lesson, not per worksheet
          taughtWorksheetOcs.unshift({ ocId: oc.occurrenceCourseId, plan });
        }
      }
    }

    // lesson feedback on the most recent taught worksheet lesson for this class
    if (taughtWorksheetOcs.length) {
      c.feedback += await generateFeedback(taughtWorksheetOcs[0]!.ocId, gc, pupilsByGroup);
    }
  }

  if (taughtOccurrenceIds.size) {
    await pool.query(`UPDATE lesson_occurrences SET status = 'taught' WHERE id = ANY($1::bigint[])`, [[...taughtOccurrenceIds]]);
  }
  log(`  delivery: ${c.occurrences} occurrences bound, ${c.taught} taught; ${c.answers} answers, ${c.marks} marks, ${c.done} done, ${c.feedback} feedback`);
  return c;
}

// answer quality by level → text the pupil "wrote"
function answerFor(expected: string, level: Level): { value: string; quality: 'full' | 'partial' } | null {
  const r = rng();
  const fullP = level === 'challenge' ? 0.85 : level === 'core' ? 0.7 : 0.5;
  const partialP = level === 'challenge' ? 0.98 : level === 'core' ? 0.92 : 0.8;
  if (r < fullP) {
    const lead = level === 'challenge' && chance(0.4) ? pick(['', '', 'Because ', 'I think ']) : '';
    return { value: lead + expected, quality: 'full' };
  }
  if (r < partialP) {
    const words = expected.split(' ');
    const part = words.slice(0, Math.max(1, Math.ceil(words.length / 2))).join(' ');
    return { value: pick(['', 'I think ', 'Maybe ']) + part, quality: 'partial' };
  }
  return null; // left blank (no submission for this field)
}

const FB_FULL = ['Correct — clear use of the right terms.', 'Well explained, exactly right.', 'Spot on.'];
const FB_PART = ['On the right track — add the key term.', 'Partly there; give a bit more detail.', 'Good start — explain why.'];

async function generateWork(
  ocId: number,
  ws: WsEntry,
  gc: GcRow,
  pupilsByGroup: Map<number, number[]>,
  levelByPupilGc: Map<string, Level>,
): Promise<{ answers: number; marks: number }> {
  const K = (k: string): string => ws.keyPrefix + k; // the STORED (prefixed) key for this worksheet
  const textFields = ws.fields.filter((f) => f.kind === 'text');
  const codeFields = ws.fields.filter((f) => f.kind === 'code');
  const blankFields = ws.fields.filter((f) => f.kind === 'blank');
  const checkFields = ws.fields.filter((f) => f.kind === 'check');
  const parsonsFields = ws.fields.filter((f) => f.kind === 'parsons');
  const pupils = (pupilsByGroup.get(gc.groupId) ?? []).slice(0, WORK_PUPILS);

  let answers = 0;
  const band = new Map<string, 'full' | 'partial' | 'zero'>(); // pupilId:STOREDkey → mark band (for marking)
  const outOf = new Map<string, number>(); // STOREDkey → marks available
  const save = async (pid: number, storedKey: string, value: string): Promise<void> => {
    await saveAnswer({ pupilId: pid, occurrenceCourseId: ocId, resourceId: ws.resId, versionNo: 1, fieldKey: storedKey, value });
    answers += 1;
  };

  for (const pid of pupils) {
    const level = levelByPupilGc.get(`${pid}:${gc.id}`) ?? 'core';
    for (let i = 0; i < textFields.length; i += 1) {
      const a = answerFor(ws.def.questions[i]?.a ?? textFields[i]!.label, level);
      if (!a) continue;
      const sk = K(textFields[i]!.key); await save(pid, sk, a.value); band.set(`${pid}:${sk}`, a.quality); outOf.set(sk, 2);
    }
    for (let i = 0; i < codeFields.length; i += 1) {
      const a = answerFor(ws.def.codeQuestions?.[i]?.a ?? '', level);
      if (!a) continue;
      const sk = K(codeFields[i]!.key); await save(pid, sk, a.value); band.set(`${pid}:${sk}`, a.quality); outOf.set(sk, 2);
    }
    if (blankFields[0] && ws.def.blank && chance(level === 'support' ? 0.7 : 0.9)) {
      const sk = K(blankFields[0].key); await save(pid, sk, ws.def.blank.answer); band.set(`${pid}:${sk}`, 'full'); outOf.set(sk, 1);
    }
    for (const cf of checkFields) if (chance(0.8)) await save(pid, K(cf.key), 'x');
    for (const pf of parsonsFields) {
      const sol = pf.solution ?? [];
      if (!sol.length) continue;
      const correct = chance(level === 'support' ? 0.55 : 0.8); // most order it right; some reverse it
      const sk = K(pf.key); await save(pid, sk, (correct ? sol : [...sol].reverse()).join('\n'));
      band.set(`${pid}:${sk}`, correct ? 'full' : 'zero'); outOf.set(sk, 1);
    }
  }

  // marks for the open answers (text/code/blank/parsons) — one fetch; only THIS worksheet's keys are in `band`.
  const { rows } = await pool.query<{ id: number; pupil_id: number; field_key: string; value: string }>(
    `SELECT id, pupil_id, field_key, value FROM pupil_answers WHERE occurrence_course_id = $1`,
    [ocId],
  );
  let marks = 0;
  for (const row of rows) {
    const q = band.get(`${row.pupil_id}:${row.field_key}`);
    if (!q) continue; // not this worksheet's, or a checkbox tick — skip
    const tot = outOf.get(row.field_key) ?? 2;
    const awarded = q === 'full' ? tot : q === 'partial' ? Math.max(1, Math.floor(tot / 2)) : 0;
    const r = rng();
    const marker = r < 0.55 ? 'ai' : r < 0.9 ? 'teacher' : 'ai';
    const status = marker === 'teacher' || r >= 0.8 ? 'confirmed' : 'suggested';
    await writeMark({
      pupilAnswerId: row.id, marksAwarded: awarded, marksTotal: tot, pointsHit: [], evidence: [row.value.slice(0, 60)],
      marker: marker as 'ai' | 'teacher', confidence: marker === 'ai' ? Number((0.7 + rng() * 0.25).toFixed(2)) : null,
      status: status as 'suggested' | 'confirmed', needsReview: marker === 'ai' && status === 'suggested' && chance(0.12),
      feedback: q === 'zero' ? pick(FB_PART) : q === 'full' ? pick(FB_FULL) : pick(FB_PART),
    });
    marks += 1;
  }
  return { answers, marks };
}

/** Done ✓ for ~85% of the worked pupils on a lesson (once per lesson, not per worksheet). */
async function generateDone(ocId: number, gc: GcRow, pupilsByGroup: Map<number, number[]>): Promise<number> {
  const pupils = (pupilsByGroup.get(gc.groupId) ?? []).slice(0, WORK_PUPILS);
  let n = 0;
  for (const pid of pupils) if (chance(0.85)) { await setDone(pid, ocId, true); n += 1; }
  return n;
}

const LIKED = ['the hands-on bit', 'working with a partner', 'the quiz at the end', 'the slides were clear', 'the practical task'];
const DISLIKED = ['it went a bit fast', 'I got stuck on the last question', 'not enough time', 'the room was warm', ''];

async function generateFeedback(ocId: number, gc: GcRow, pupilsByGroup: Map<number, number[]>): Promise<number> {
  const pupils = (pupilsByGroup.get(gc.groupId) ?? []).slice(0, WORK_PUPILS);
  let n = 0;
  for (const pid of pupils) {
    if (!chance(0.35)) continue;
    await upsertPupilFeedback({
      pupilId: pid,
      occurrenceCourseId: ocId,
      rating: 2 + Math.floor(rng() * 3), // 2–4 (😐🙂😀), skews positive on the 1–4 scale
      liked: pick(LIKED),
      disliked: pick(DISLIKED),
      comment: chance(0.25) ? 'Can we do more like this?' : '',
    });
    n++;
  }
  return n;
}

// ── main ────────────────────────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  log('▶ TEST-DATA seed (manual-testing instance)');
  await adjustCalendar();
  await wipe();
  const terms = await loadTerms();

  const groups = (await pool.query<GroupRow>(`SELECT id, name, year_group AS "yearGroup" FROM groups ORDER BY id`)).rows;
  const gcs = (await pool.query<GcRow>(
    `SELECT gc.id, gc.group_id AS "groupId", gc.course_id AS "courseId", g.name AS "groupName", c.name AS "courseName"
     FROM group_courses gc JOIN groups g ON g.id = gc.group_id JOIN courses c ON c.id = gc.course_id
     WHERE gc.active ORDER BY gc.id`,
  )).rows;
  const courseByName = new Map((await pool.query<{ id: number; name: string }>(`SELECT id, name FROM courses`)).rows.map((r) => [r.name, r.id]));

  const { pupilsByGroup, levelByPupilGc, total } = await makePupils(groups, gcs);
  const { plansByCourse } = await makeSchemes(courseByName);
  const counts = await deliverAndWork(gcs, plansByCourse, pupilsByGroup, levelByPupilGc, terms);

  // settings: turn on the pupil-facing features (with their DPIA acks) so the work/marks panels are
  // visible, and set the login + onboarding so the teacher logs straight in (no /welcome wizard).
  const ACK = '2026-05-01T08:00:00.000Z';
  await setSetting('pupil_access_enabled', 'true'); // pupil portal + the teacher's work-review grid
  await setSetting('pupil_dpia_ack', ACK);
  await setSetting('pupil_marks_enabled', 'true'); // show marks in the review grid
  await setSetting('pupil_marks_dpia_ack', ACK);
  await setSetting('auth_password_hash', hashPassword(LOGIN_PASSWORD));
  await setSetting('setup_complete', 'true');
  await setSetting('school_name', 'Test Academy (sandbox)');
  await setSetting('ui_shell', 'next'); // the sandbox previews the new UI shell — test the redesign on realistic data

  // a few sample pupil logins to print
  const samples = (await pool.query<{ name: string; pin: string; code: string }>(
    `SELECT p.display_name AS name, pc.pin, g.login_code AS code
     FROM pupils p JOIN pupil_credentials pc ON pc.pupil_id = p.id
     JOIN enrolments e ON e.pupil_id = p.id AND e.active JOIN groups g ON g.id = e.group_id
     ORDER BY p.id LIMIT 3`,
  )).rows;

  log('\n✓ TEST-DATA seed complete');
  log(`   pupils ${total} · groups ${groups.length} · classes ${gcs.length} · plans bound ${counts.occurrences} · taught ${counts.taught}`);
  log(`   pupil work: ${counts.answers} answers · ${counts.marks} marks · ${counts.done} done · ${counts.feedback} feedback`);
  log('\n   TEACHER LOGIN');
  log(`     open    http://<this-server>:44370/`);
  log(`     password ${LOGIN_PASSWORD}`);
  log('\n   SAMPLE PUPIL LOGINS (class code → pick name → PIN; teacher can read PINs on the roster)');
  for (const s of samples) log(`     ${s.code}  ${s.name}  PIN ${s.pin}`);
  log('');
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); pool.end().finally(() => process.exit(1)); });
