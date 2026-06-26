-- Per-unit summative assessments (Phase 0 of docs plan): the assessment + exam-style question model.
--
-- An assessment is ONE summative paper authored against a unit (of a specific scheme version). It is
-- AI-generated from the spec points the class has been taught (+ a few not-yet-taught), reviewed by the
-- teacher, then assignable to classes. The question model mirrors the sibling exam_questions project:
-- assessment -> questions -> parts -> mark_points (+ misconceptions), with command-word/archetype codes
-- and discrete markable atoms. Mark-point `kind` reuses deterministicMarker.MarkKind so objective points
-- auto-mark with the existing pure marker. NO pupil identity lives in these tables (cohort curriculum
-- content) — generation is therefore safe to send (cohort-level) to AI via the one wrapper.

-- One summative paper per (unit, scheme version). schemeId/courseId denormalised from units for fast lookup.
CREATE TABLE assessments (
  id              BIGSERIAL PRIMARY KEY,
  unit_id         BIGINT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  scheme_id       BIGINT NOT NULL REFERENCES schemes_of_work(id) ON DELETE CASCADE,
  course_id       BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  style           TEXT NOT NULL DEFAULT 'ks3' CHECK (style IN ('ks3', 'gcse')),       -- exam-style vs KS3-style
  exam_board      TEXT,                                                                -- e.g. 'OCR J277' when gcse
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'archived')),
  marks_total     INTEGER NOT NULL DEFAULT 0,                                          -- Σ parts' marks (maintained)
  blueprint       JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {coveredSpecPointIds, uncoveredSpecPointIds, weights, groupCourseId, generatedAt}
  source_type     TEXT NOT NULL DEFAULT 'ai_generated' CHECK (source_type IN ('ai_generated', 'teacher', 'imported')),
  prompt_version  TEXT,                                                                -- audit: which gen prompt produced it
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assessments_unit ON assessments (unit_id);
CREATE INDEX idx_assessments_scheme ON assessments (scheme_id);

-- A question targets a primary spec point; is_uncovered flags the "few from areas not taught in lessons".
CREATE TABLE assessment_questions (
  id                 BIGSERIAL PRIMARY KEY,
  assessment_id      BIGINT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  display_order      INTEGER NOT NULL DEFAULT 0,
  command_word_code  TEXT,                 -- 'state','describe','explain','analyse'… (free-text code; nullable for KS3)
  archetype_code     TEXT,                 -- question archetype (free-text code)
  stem               TEXT NOT NULL,
  spec_point_id      BIGINT REFERENCES course_spec_points(id) ON DELETE SET NULL,      -- the PRIMARY spec point tested
  is_uncovered       BOOLEAN NOT NULL DEFAULT false,
  difficulty_band    SMALLINT,             -- 1..9 (exam_questions parity)
  difficulty_step    SMALLINT,             -- 1..3
  marks_total        INTEGER NOT NULL DEFAULT 0,
  model_answer       TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_aq_assessment ON assessment_questions (assessment_id, display_order);

-- A question has one or more lettered parts, each its own response widget + tariff.
CREATE TABLE assessment_question_parts (
  id                      BIGSERIAL PRIMARY KEY,
  question_id             BIGINT NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  part_label              TEXT NOT NULL,               -- 'a','b','i'…
  display_order           INTEGER NOT NULL DEFAULT 0,
  prompt                  TEXT NOT NULL,
  marks                   INTEGER NOT NULL DEFAULT 1,
  expected_response_type  TEXT NOT NULL,               -- widget: short_text|medium_text|extended_response|multiple_choice|tick_box|code
  part_config             JSONB,                       -- widget config (options[]…); NULL when none
  model_answer            TEXT,
  UNIQUE (question_id, part_label)
);
CREATE INDEX idx_aqp_question ON assessment_question_parts (question_id, display_order);

-- The discrete, markable atoms (exam_questions parity). `kind` = deterministicMarker.MarkKind so objective
-- points auto-mark; 'open' points are AI-marked.
CREATE TABLE assessment_mark_points (
  id                     BIGSERIAL PRIMARY KEY,
  part_id                BIGINT NOT NULL REFERENCES assessment_question_parts(id) ON DELETE CASCADE,
  display_order          INTEGER NOT NULL DEFAULT 0,
  text                   TEXT NOT NULL,
  marks                  INTEGER NOT NULL DEFAULT 1,
  is_required            BOOLEAN NOT NULL DEFAULT false,
  accepted_alternatives  TEXT[] NOT NULL DEFAULT '{}',
  kind                   TEXT NOT NULL DEFAULT 'open' CHECK (kind IN ('tick', 'choice', 'exact', 'numeric', 'keyword', 'open'))
);
CREATE INDEX idx_amp_part ON assessment_mark_points (part_id, display_order);

-- Common misconceptions (exam_questions parity) — teacher reference + fed to the marking prompt.
CREATE TABLE assessment_misconceptions (
  id           BIGSERIAL PRIMARY KEY,
  part_id      BIGINT NOT NULL REFERENCES assessment_question_parts(id) ON DELETE CASCADE,
  label        TEXT NOT NULL,
  description  TEXT NOT NULL
);
CREATE INDEX idx_amisc_part ON assessment_misconceptions (part_id);
