-- Phase 12 C1 — kit-per-lesson. A free-text note of the equipment a lesson needs (e.g. "16× micro:bit,
-- batteries, USB leads"), shown on the lesson screen and the curriculum map and summarised across a
-- unit's laid-down weeks. Nullable; lessons that need nothing leave it blank. Kept on the MASTER lesson
-- plan (kit doesn't differ per class), so per-group adaptations inherit it.
ALTER TABLE lesson_plans ADD COLUMN kit_needed TEXT;
