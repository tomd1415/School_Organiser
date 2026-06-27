-- Phase 16A.8 — assessments as STAGE evidence. The baseline (16A.7), per-unit (16A.8) and year-end (16A.5)
-- assessment moments all feed the SAME per-strand stage roll-up. This adds the three structural pieces the
-- Stages & strands feature needs on top of the existing assessment subsystem; the AI generation of
-- stage-anchored papers is the larger follow-on that POPULATES assessment_question_criteria.

-- 1) Tag each assessment with WHICH moment it is, so the right flow + length rules apply.
ALTER TABLE assessments
  ADD COLUMN purpose TEXT NOT NULL DEFAULT 'summative'
    CHECK (purpose IN ('summative','baseline','end_of_unit','year_end'));

-- 2) Map a question (or part) to the stage CRITERION it evidences, so a mark becomes stage evidence.
--    (Where a criterion already maps to a spec point, prog_spec_links covers it; this is the DIRECT tag for
--    questions written straight against a criterion, e.g. an "I can…" probe with no spec point.)
CREATE TABLE assessment_question_criteria (
  question_id  BIGINT NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  criterion_id BIGINT NOT NULL REFERENCES prog_criteria(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, criterion_id)
);
CREATE INDEX idx_aqc_criterion ON assessment_question_criteria (criterion_id);

-- 3) The per-pupil PLACEMENT an end-of-unit assessment produces: the stage that best reflects the pupil's
--    ability in each strand for that unit. PII — recorded for the unit dashboard + as a roll-up cross-check
--    (the authoritative evidence is still the per-criterion ticks written with source_kind='assessment').
CREATE TABLE pupil_unit_placement (
  id                BIGSERIAL PRIMARY KEY,
  pupil_id          BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,                -- PII
  unit_id           BIGINT NOT NULL REFERENCES prog_units(id) ON DELETE CASCADE,
  assessment_id     BIGINT REFERENCES assessments(id) ON DELETE SET NULL,
  individualised    BOOLEAN NOT NULL DEFAULT false,        -- was this a per-pupil paper (16A.8 opt-in)?
  placed_per_strand JSONB NOT NULL DEFAULT '{}'::jsonb,    -- {strandId: stageOrdinal} the unit assessment placed them at
  taken_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pupil_id, unit_id)
);
CREATE INDEX idx_pup_unit ON pupil_unit_placement (unit_id);
