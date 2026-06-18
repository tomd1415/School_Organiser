-- School Organiser — blank weekly period skeleton (timings only, no classes).
-- Generated from the 2025/26 day shape. Idempotent: re-running just updates the same rows.
-- PREREQ: the target must already have a CURRENT academic year
--         (Setup -> Academic years -> add the new year -> Make current), then load this file.
-- It creates NO classes: every teaching slot is left empty for you to assign.

-- Guard: fail with a clear message (not a cryptic NOT NULL error) if no current year exists yet.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM academic_years WHERE is_current) THEN
    RAISE EXCEPTION 'No current academic year. In the app: Setup -> Academic years -> add the new year -> Make current, then re-run this file.';
  END IF;
END $$;

INSERT INTO period_definitions
  (academic_year_id, weekday, slot_order, slot_type, label, lesson_index, start_time, end_time, teachable)
VALUES
  ((SELECT id FROM academic_years WHERE is_current), 1, 1, 'before_school', 'Coffee', NULL, '07:30'::time, '07:40'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 1, 2, 'before_school', 'Before school', NULL, '07:40'::time, '08:30'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 1, 3, 'briefing', 'Briefing', NULL, '08:30'::time, '08:50'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 1, 4, 'form_am', 'Morning form', NULL, '08:50'::time, '09:10'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 1, 5, 'lesson', 'Lesson 1', 1, '09:10'::time, '10:00'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 1, 6, 'lesson', 'Lesson 2', 2, '10:00'::time, '10:50'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 1, 7, 'break', 'Break', NULL, '10:50'::time, '11:05'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 1, 8, 'lesson', 'Lesson 3', 3, '11:05'::time, '11:55'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 1, 9, 'lesson', 'Lesson 4', 4, '11:55'::time, '12:45'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 1, 10, 'lunch', 'Lunch', NULL, '12:45'::time, '13:50'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 1, 11, 'lesson', 'Lesson 5', 5, '13:50'::time, '14:40'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 1, 12, 'lesson', 'Lesson 6', 6, '14:40'::time, '15:30'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 1, 13, 'after_school', 'After school', NULL, '15:30'::time, '17:00'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 2, 1, 'before_school', 'Coffee', NULL, '07:30'::time, '07:40'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 2, 2, 'before_school', 'Before school', NULL, '07:40'::time, '08:30'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 2, 3, 'before_school', 'Prep', NULL, '08:30'::time, '08:50'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 2, 4, 'form_am', 'Morning form', NULL, '08:50'::time, '09:10'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 2, 5, 'lesson', 'Lesson 1', 1, '09:10'::time, '10:00'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 2, 6, 'lesson', 'Lesson 2', 2, '10:00'::time, '10:50'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 2, 7, 'break', 'Break', NULL, '10:50'::time, '11:05'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 2, 8, 'lesson', 'Lesson 3', 3, '11:05'::time, '11:55'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 2, 9, 'lesson', 'Lesson 4', 4, '11:55'::time, '12:45'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 2, 10, 'lunch', 'Lunch', NULL, '12:45'::time, '13:50'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 2, 11, 'lesson', 'Lesson 5', 5, '13:50'::time, '14:40'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 2, 12, 'lesson', 'Lesson 6', 6, '14:40'::time, '15:30'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 2, 13, 'after_school', 'After school', NULL, '15:30'::time, '17:00'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 3, 1, 'before_school', 'Coffee', NULL, '07:30'::time, '07:40'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 3, 2, 'before_school', 'Before school', NULL, '07:40'::time, '08:30'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 3, 3, 'briefing', 'Briefing', NULL, '08:30'::time, '08:50'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 3, 4, 'form_am', 'Morning form', NULL, '08:50'::time, '09:10'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 3, 5, 'lesson', 'Lesson 1', 1, '09:10'::time, '10:00'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 3, 6, 'lesson', 'Lesson 2', 2, '10:00'::time, '10:50'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 3, 7, 'break', 'Break', NULL, '10:50'::time, '11:05'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 3, 8, 'lesson', 'Lesson 3', 3, '11:05'::time, '11:55'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 3, 9, 'lesson', 'Lesson 4', 4, '11:55'::time, '12:45'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 3, 10, 'lunch', 'Lunch', NULL, '12:45'::time, '13:50'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 3, 11, 'lesson', 'Lesson 5', 5, '13:50'::time, '14:40'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 3, 12, 'lesson', 'Lesson 6', 6, '14:40'::time, '15:30'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 3, 13, 'after_school', 'After school', NULL, '15:30'::time, '17:00'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 4, 1, 'before_school', 'Coffee', NULL, '07:30'::time, '07:40'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 4, 2, 'before_school', 'Before school', NULL, '07:40'::time, '08:30'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 4, 3, 'briefing', 'Briefing', NULL, '08:30'::time, '08:50'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 4, 4, 'form_am', 'Morning form', NULL, '08:50'::time, '09:10'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 4, 5, 'lesson', 'Lesson 1', 1, '09:10'::time, '10:00'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 4, 6, 'lesson', 'Lesson 2', 2, '10:00'::time, '10:50'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 4, 7, 'break', 'Break', NULL, '10:50'::time, '11:05'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 4, 8, 'lesson', 'Lesson 3', 3, '11:05'::time, '11:55'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 4, 9, 'lesson', 'Lesson 4', 4, '11:55'::time, '12:45'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 4, 10, 'lunch', 'Lunch', NULL, '12:45'::time, '13:50'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 4, 11, 'lesson', 'Lesson 5', 5, '13:50'::time, '14:40'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 4, 12, 'lesson', 'Lesson 6', 6, '14:40'::time, '15:30'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 4, 13, 'after_school', 'After school', NULL, '15:30'::time, '17:00'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 5, 1, 'before_school', 'Coffee', NULL, '07:30'::time, '07:40'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 5, 2, 'before_school', 'Before school', NULL, '07:40'::time, '08:30'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 5, 3, 'before_school', 'Prep', NULL, '08:30'::time, '08:50'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 5, 4, 'form_am', 'Morning form', NULL, '08:50'::time, '09:10'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 5, 5, 'lesson', 'Lesson 1', 1, '09:10'::time, '10:00'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 5, 6, 'lesson', 'Lesson 2', 2, '10:00'::time, '10:50'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 5, 7, 'break', 'Break', NULL, '10:50'::time, '11:05'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 5, 8, 'lesson', 'Lesson 3', 3, '11:05'::time, '11:55'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 5, 9, 'lesson', 'Lesson 4', 4, '11:55'::time, '12:45'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 5, 10, 'lunch', 'Lunch', NULL, '12:45'::time, '13:50'::time, false),
  ((SELECT id FROM academic_years WHERE is_current), 5, 11, 'lesson', 'Lesson 5', 5, '13:50'::time, '14:40'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 5, 12, 'lesson', 'Lesson 6', 6, '14:40'::time, '15:30'::time, true),
  ((SELECT id FROM academic_years WHERE is_current), 5, 13, 'after_school', 'After school', NULL, '15:30'::time, '17:00'::time, false)
ON CONFLICT (academic_year_id, weekday, slot_order) DO UPDATE SET
  slot_type=EXCLUDED.slot_type, label=EXCLUDED.label, lesson_index=EXCLUDED.lesson_index,
  start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time, teachable=EXCLUDED.teachable;

