-- Phase 11 idea 7 — a small, optional per-class access questionnaire (VI→min font, short attention,
-- reading age, EAL, dyslexia-friendly, low typing). The raw answers live here as JSONB; a
-- deterministic builder derives cohort-level constraint lines that ride context[] into the
-- class-scoped generators (adapt_lesson / adapt_resources). Cohort-level only — never an individual
-- pupil. Lives on group_courses so it sits with the per-class teaching context the AI already reads;
-- the September rollover carries it forward like the other per-class fields.
ALTER TABLE group_courses ADD COLUMN guided_access JSONB;
