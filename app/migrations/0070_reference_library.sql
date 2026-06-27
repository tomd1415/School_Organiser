-- Phase 17 — reference-lesson library. Extends the existing resource store (resources/resource_versions)
-- and the Phase 16 prog_* tables. No rebuild: a "reference lesson" is a resource tagged is_reference, placed
-- in the Teach Computing structure and linked to the prog_criteria it teaches. Files stay on disk
-- (RESOURCE_STORE_PATH); only metadata + links live here.

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS is_reference   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tcc_unit_key   TEXT,        -- normalised unit key (e.g. 'KS3:Y7:unit_1')
  ADD COLUMN IF NOT EXISTS tcc_lesson_no  INTEGER,     -- lesson number within the unit, where known
  ADD COLUMN IF NOT EXISTS activity_type  TEXT;        -- catalogued activity type (17.3), nullable
CREATE INDEX IF NOT EXISTS idx_resources_reference ON resources (is_reference) WHERE is_reference;
CREATE INDEX IF NOT EXISTS idx_resources_tcc_unit  ON resources (tcc_unit_key);

-- A reference lesson ↔ the progression UNIT it belongs to (structured, vs the free-text resources.unit).
CREATE TABLE resource_prog_unit (
  resource_id  BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  prog_unit_id BIGINT NOT NULL REFERENCES prog_units(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, prog_unit_id)
);
CREATE INDEX idx_rpu_unit ON resource_prog_unit (prog_unit_id);

-- A resource ↔ the "I can…" CRITERIA it addresses. `origin` = how the link was made; `verify_*` = the AI
-- overview pass's advisory verdict (17.2). THE table that answers "a reference lesson that teaches criterion X".
CREATE TABLE resource_criteria (
  resource_id    BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  criterion_id   BIGINT NOT NULL REFERENCES prog_criteria(id) ON DELETE CASCADE,
  origin         TEXT NOT NULL DEFAULT 'structure'
                   CHECK (origin IN ('structure','ai_suggested','manual')),
  verify_state   TEXT NOT NULL DEFAULT 'unverified'
                   CHECK (verify_state IN ('unverified','confirmed','needs_review','mismatch')),
  verify_note    TEXT,
  confirmed_by   TEXT,
  PRIMARY KEY (resource_id, criterion_id)
);
CREATE INDEX idx_rc_criterion ON resource_criteria (criterion_id);
CREATE INDEX idx_rc_review ON resource_criteria (verify_state) WHERE verify_state IN ('needs_review','mismatch');

-- The activity-type catalogue (17.3). Small reference table.
CREATE TABLE activity_types (
  id            BIGSERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,                 -- 'parsons','code_trace','unplugged',…
  name          TEXT NOT NULL,
  description   TEXT,
  display_order INTEGER NOT NULL DEFAULT 0
);

-- A pupil's saved edit of an editable (worksheet/doc) file = PII (cleared on pupil erasure). The master
-- resource is untouched; this is the pupil's own copy.
CREATE TABLE pupil_resource_edits (
  id             BIGSERIAL PRIMARY KEY,
  pupil_id       BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,                    -- PII
  resource_id    BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  lesson_plan_id BIGINT,                              -- the lesson context (soft ref), nullable
  body           TEXT,                                -- the pupil's edited content
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (pupil_id, resource_id, lesson_plan_id)  -- one edit per (pupil, resource, lesson); NULL lesson = the lesson-less copy
);
CREATE INDEX idx_pre_pupil ON pupil_resource_edits (pupil_id);
