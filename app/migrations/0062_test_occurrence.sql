-- Test Lab (isolation core): partition lesson occurrences into REAL vs TEST runs.
--
-- A Test Lab run uses the SAME real timetabled_lesson + date the teacher picks (so worksheets, slides,
-- clock and period times resolve identically) but lives on a SEPARATE lesson_occurrences row with
-- is_test=true -> a separate occurrence_courses.id that no real read can reach BY ID. Real pupils and the
-- real cockpit always resolve the is_test=false row (findOrCreateOccurrence/findOccurrence default), so a
-- test write can never converge onto a real occurrence_course. See docs/TEST_LAB_PLAN.md.

ALTER TABLE lesson_occurrences ADD COLUMN is_test BOOLEAN NOT NULL DEFAULT false;

-- Re-partition slot uniqueness so the SAME (timetabled_lesson_id, date) can hold BOTH a real and a test
-- occurrence at once. (Old 2-col key auto-named by Postgres in 0002.)
ALTER TABLE lesson_occurrences DROP CONSTRAINT lesson_occurrences_timetabled_lesson_id_date_key;
ALTER TABLE lesson_occurrences ADD CONSTRAINT lesson_occurrences_slot_test_uk
  UNIQUE (timetabled_lesson_id, date, is_test);

-- Cheap lookup + teardown of the (normally tiny) set of test runs.
CREATE INDEX idx_lesson_occurrences_is_test ON lesson_occurrences (is_test) WHERE is_test;

COMMENT ON COLUMN lesson_occurrences.is_test IS
  'TEST-LAB-GUARD: a sandboxed Test Lab run on a real slot+date. Excluded from taught-count and from every occurrence-keyed read that SCANS by group_course/slot/date (those must add "AND NOT o.is_test"); reads keyed by a single occurrence_course_id are already safe. Bulk-removable via wipeTestOccurrences(). Mirrors pupils.is_test (0038).';
