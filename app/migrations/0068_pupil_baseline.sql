-- Phase 16A.7 — start-of-year BASELINE: one short placement per (pupil, class, year) that ESTABLISHES the
-- pupil's starting stage per strand, seeding the year's planning. The passed items also write into
-- pupil_criteria_evidence (source_kind='baseline'). `mode` distinguishes the Year-7 cold start (no history)
-- from the guided warm start. `confidence` is lowered when responses look like random clicking (too fast /
-- patterned) — a low-confidence baseline is held for teacher review, NOT auto-trusted as the placement.
CREATE TABLE pupil_baseline (
  id                BIGSERIAL PRIMARY KEY,
  pupil_id          BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,                 -- PII
  group_course_id   BIGINT NOT NULL REFERENCES group_courses(id) ON DELETE CASCADE,
  academic_year_id  BIGINT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  assessment_id     BIGINT REFERENCES assessments(id) ON DELETE SET NULL,                    -- the baseline paper used
  mode              TEXT NOT NULL CHECK (mode IN ('cold_start','warm_start')),
  placed_stage_id   BIGINT REFERENCES prog_stages(id) ON DELETE SET NULL,                    -- overall starting stage
  placed_per_strand JSONB NOT NULL DEFAULT '{}'::jsonb,    -- {strandId: stageOrdinal} — starting stage per strand
  confidence        TEXT NOT NULL DEFAULT 'ok' CHECK (confidence IN ('ok','low','flagged')),
  reviewed_by       TEXT,                                  -- teacher confirmed/adjusted the placement
  taken_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pupil_id, group_course_id, academic_year_id)     -- one baseline per pupil per class per year
);
CREATE INDEX idx_pbaseline_class ON pupil_baseline (group_course_id, academic_year_id);
