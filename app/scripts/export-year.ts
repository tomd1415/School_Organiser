// Phase 6.9: export one academic year's record as JSON (personal record-keeping / leaving backup).
//   cd app && set -a; . ./.env; set +a; npx tsx scripts/export-year.ts "2025/26" > year-2025-26.json
// Includes the year's structure (terms, day shape, groups, timetable) and delivery record
// (occurrences, stopping points, notes, adaptations). Pupil names are included — treat the file
// as personal data (store it like a backup, never commit it).
import { pool } from '../src/db/pool';

async function main() {
  const yearName = process.argv[2];
  if (!yearName) {
    console.error('usage: npx tsx scripts/export-year.ts "<year name>"');
    process.exit(1);
  }
  const y = await pool.query(`SELECT * FROM academic_years WHERE name = $1`, [yearName]);
  if (!y.rows[0]) {
    console.error(`no academic year named ${yearName}`);
    process.exit(1);
  }
  const yearId = y.rows[0].id;
  const q = async (sql: string) => (await pool.query(sql.replaceAll('$YEAR', String(yearId)))).rows;

  const out = {
    exportedAt: new Date().toISOString(),
    year: y.rows[0],
    terms: await q(`SELECT * FROM term_dates WHERE academic_year_id = $YEAR ORDER BY start_date`),
    periods: await q(`SELECT * FROM period_definitions WHERE academic_year_id = $YEAR ORDER BY weekday, slot_order`),
    groups: await q(`SELECT * FROM groups WHERE academic_year_id = $YEAR ORDER BY name`),
    enrolments: await q(`SELECT e.*, p.display_name FROM enrolments e JOIN pupils p ON p.id = e.pupil_id
                         WHERE e.group_id IN (SELECT id FROM groups WHERE academic_year_id = $YEAR)`),
    groupCourses: await q(`SELECT gc.*, c.name AS course_name FROM group_courses gc JOIN courses c ON c.id = gc.course_id
                           WHERE gc.group_id IN (SELECT id FROM groups WHERE academic_year_id = $YEAR)`),
    timetabledLessons: await q(`SELECT tl.* FROM timetabled_lessons tl JOIN period_definitions p ON p.id = tl.period_definition_id
                                WHERE p.academic_year_id = $YEAR`),
    occurrences: await q(`SELECT o.*, oc.group_course_id, oc.lesson_plan_id, oc.stopping_point
                          FROM lesson_occurrences o
                          LEFT JOIN occurrence_courses oc ON oc.occurrence_id = o.id
                          WHERE o.timetabled_lesson_id IN (
                            SELECT tl.id FROM timetabled_lessons tl JOIN period_definitions p ON p.id = tl.period_definition_id
                            WHERE p.academic_year_id = $YEAR)
                          ORDER BY o.date`),
    notes: await q(`SELECT n.* FROM notes n
                    LEFT JOIN lesson_occurrences o ON o.id = n.occurrence_id
                    LEFT JOIN timetabled_lessons tl ON tl.id = o.timetabled_lesson_id
                    LEFT JOIN period_definitions p ON p.id = tl.period_definition_id
                    WHERE p.academic_year_id = $YEAR
                       OR n.group_id IN (SELECT id FROM groups WHERE academic_year_id = $YEAR)`),
    adaptations: await q(`SELECT a.* FROM lesson_adaptations a
                          WHERE a.group_course_id IN (
                            SELECT gc.id FROM group_courses gc
                            WHERE gc.group_id IN (SELECT id FROM groups WHERE academic_year_id = $YEAR))`),
  };
  process.stdout.write(JSON.stringify(out, null, 1));
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
