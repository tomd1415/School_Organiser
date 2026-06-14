-- Phase 11 idea 10 slice 2 — a per-course exam date. Lets AI scheme authoring reserve revision time
-- before it on exam courses (slice 2b), and lets the coverage page show how long is left. Nullable;
-- non-exam courses leave it blank.
ALTER TABLE courses ADD COLUMN exam_date DATE;
