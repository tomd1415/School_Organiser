-- BUG-019 (Wave A6 — transactional invariants): DB-enforce the two scheme-of-work invariants that
-- activateSchemeVersion / cloneSchemeNewVersion currently maintain only by convention, so no code path
-- (or race) can leave a course with two live schemes, and so the double-clone bug (two drafts both
-- numbered head.version+1) can't silently produce duplicate versions. schemes_of_work.version is a
-- display/order value only — marking provenance uses resource_versions.version_no, a different column —
-- so the defensive re-sequencing below is safe.

-- 1. Defensive: if any course has >1 active scheme, keep the highest-version one active and demote the
--    rest, so the partial unique index can be built. No-op on healthy data.
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY course_id ORDER BY version DESC, id DESC) AS rn
  FROM schemes_of_work WHERE active
)
UPDATE schemes_of_work s SET active = false
FROM ranked WHERE s.id = ranked.id AND ranked.rn > 1;

-- 2. Defensive: only within courses that actually have a duplicate (course_id, version), re-sequence
--    versions to a dense 1..N ordered by existing version then id. Healthy courses are left untouched.
WITH dup_courses AS (
  SELECT course_id FROM schemes_of_work GROUP BY course_id, version HAVING count(*) > 1
),
renum AS (
  SELECT id, row_number() OVER (PARTITION BY course_id ORDER BY version, id) AS newv
  FROM schemes_of_work WHERE course_id IN (SELECT course_id FROM dup_courses)
)
UPDATE schemes_of_work s SET version = renum.newv
FROM renum WHERE s.id = renum.id AND s.version <> renum.newv;

-- At most one active scheme per course.
CREATE UNIQUE INDEX IF NOT EXISTS schemes_one_active_per_course
  ON schemes_of_work (course_id) WHERE active;

-- Version numbers are unique within a course (catches the double-clone bug going forward).
CREATE UNIQUE INDEX IF NOT EXISTS schemes_course_version_uniq
  ON schemes_of_work (course_id, version);
