-- Phase 11 Wave 5 — enforce "at most one OPEN master review per lesson" at the DB level. The service
-- does a check-then-insert (skip if an open review exists), but that is not atomic across a long AI
-- call, so two concurrent triggers (a unit sweep overlapping a manual click, or two tabs) could both
-- insert. This partial unique index makes the guard race-proof; createReview uses ON CONFLICT DO
-- NOTHING so the loser of the race is a harmless no-op (treated as a skip). Replaces the plain index
-- from 0035 (the unique one serves the same lookups).
DROP INDEX IF EXISTS lesson_reviews_open_idx;
CREATE UNIQUE INDEX lesson_reviews_one_open_idx
  ON lesson_reviews (lesson_plan_id)
  WHERE status = 'open' AND group_course_id IS NULL;
