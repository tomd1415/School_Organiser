-- Phase 16A.1 — Stages & strands: the progression model's content tree + per-pupil evidence.
--
-- A self-contained progression SCHEME (a year ladder, a GCSE-grade scheme, a Post-16 qualification) owns
-- its own strand set and ordered stages; a content tree (units → lessons → criteria) hangs off it. A class
-- (group_course) is bound to exactly one scheme. The tickable atom is a `prog_criteria` "I can…" — denorm-
-- alised with its stage+strand so both the planning read ("all criteria for a stage") and the tracking read
-- ("a pupil's progress per strand") are single indexed scans. Per-pupil evidence + the year-end overall
-- anchor are PII (covered by the Phase-10 erasure path; NEVER sent to AI). Roll-up is COMPUTED, not stored
-- (pure services/progression.ts). Full design: docs/LEVEL_SYSTEM_DB_DESIGN.md.

-- ── content (no pupil data — safe to seed, safe to send cohort-level to AI) ──────────────────────────────
CREATE TABLE progression_schemes (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('year_ladder', 'gcse_grades', 'qualification')),
  exam_board  TEXT,
  source      TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The strand set is PER SCHEME (the year ladder's strands differ from GCSE's two papers).
CREATE TABLE prog_strands (
  id            BIGSERIAL PRIMARY KEY,
  scheme_id     BIGINT NOT NULL REFERENCES progression_schemes(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  name          TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (scheme_id, code)
);

-- The ordered rungs of the ladder = the COURSE-PLANNING grain. ordinal drives progression / roll-up order.
CREATE TABLE prog_stages (
  id          BIGSERIAL PRIMARY KEY,
  scheme_id   BIGINT NOT NULL REFERENCES progression_schemes(id) ON DELETE CASCADE,
  ordinal     INTEGER NOT NULL,
  label       TEXT NOT NULL,
  year_group  SMALLINT,
  age_low     SMALLINT,
  age_high    SMALLINT,
  key_stage   TEXT CHECK (key_stage IN ('EYFS','KS1','KS2','KS3','KS4')),
  UNIQUE (scheme_id, ordinal)
);

-- A UNIT sits at a (stage, strand) = the UNIT-PLANNING grain. scheme_id denormalised for fast filtering.
CREATE TABLE prog_units (
  id            BIGSERIAL PRIMARY KEY,
  scheme_id     BIGINT NOT NULL REFERENCES progression_schemes(id) ON DELETE CASCADE,
  stage_id      BIGINT NOT NULL REFERENCES prog_stages(id) ON DELETE CASCADE,
  strand_id     BIGINT NOT NULL REFERENCES prog_strands(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  nc_refs       TEXT[],
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scheme_id, stage_id, strand_id, title)        -- natural key for an idempotent seed
);
CREATE INDEX idx_prog_units_stage  ON prog_units (stage_id, display_order);
CREATE INDEX idx_prog_units_strand ON prog_units (strand_id);

-- A LESSON / learning objective in a unit = the LESSON-PLANNING grain.
CREATE TABLE prog_lessons (
  id            BIGSERIAL PRIMARY KEY,
  unit_id       BIGINT NOT NULL REFERENCES prog_units(id) ON DELETE CASCADE,
  lesson_no     INTEGER,
  objective     TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- natural key for an idempotent seed; NULLS NOT DISTINCT so a KS1/2 objective (lesson_no NULL) or a KS3
  -- "Lesson N" (objective NULL) can't duplicate on re-run (PostgreSQL 15+).
  UNIQUE NULLS NOT DISTINCT (unit_id, lesson_no, objective)
);
CREATE INDEX idx_prog_lessons_unit ON prog_lessons (unit_id, display_order);

-- The tickable atom: an "I can…" criterion. stage_id/strand_id denormalised from the unit for fast reads.
CREATE TABLE prog_criteria (
  id            BIGSERIAL PRIMARY KEY,
  lesson_id     BIGINT NOT NULL REFERENCES prog_lessons(id) ON DELETE CASCADE,
  stage_id      BIGINT NOT NULL REFERENCES prog_stages(id) ON DELETE CASCADE,
  strand_id     BIGINT NOT NULL REFERENCES prog_strands(id) ON DELETE CASCADE,
  descriptor    TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  also_strands  TEXT[],
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, descriptor)                        -- natural key for an idempotent seed
);
CREATE INDEX idx_prog_criteria_lesson ON prog_criteria (lesson_id, display_order);
CREATE INDEX idx_prog_criteria_stage  ON prog_criteria (stage_id);
CREATE INDEX idx_prog_criteria_strand ON prog_criteria (strand_id);

-- ── binding a class + the optional spec-point bridge ────────────────────────────────────────────────────
CREATE TABLE group_course_scheme (
  group_course_id BIGINT NOT NULL REFERENCES group_courses(id) ON DELETE CASCADE,
  scheme_id       BIGINT NOT NULL REFERENCES progression_schemes(id) ON DELETE RESTRICT,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_course_id)            -- one scheme per class
);

-- Map a criterion to a course spec point, so marking can AUTO-SUGGEST evidence (16A.4). Teacher-confirmed.
CREATE TABLE prog_spec_links (
  criterion_id  BIGINT NOT NULL REFERENCES prog_criteria(id) ON DELETE CASCADE,
  spec_point_id BIGINT NOT NULL REFERENCES course_spec_points(id) ON DELETE CASCADE,
  PRIMARY KEY (criterion_id, spec_point_id)
);
CREATE INDEX idx_prog_spec_links_spec ON prog_spec_links (spec_point_id);

-- ── per-pupil progression (PII — privacy-sensitive; never sent to AI; cleared on pupil erasure) ──────────
CREATE TABLE pupil_criteria_evidence (
  id            BIGSERIAL PRIMARY KEY,
  pupil_id      BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  criterion_id  BIGINT NOT NULL REFERENCES prog_criteria(id) ON DELETE CASCADE,
  ticked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ticked_by     TEXT,
  source_kind   TEXT CHECK (source_kind IN ('manual','assessment','worksheet','observation','baseline')),
  source_ref_id BIGINT,                                  -- soft ref (e.g. attempt / baseline id)
  note          TEXT,
  UNIQUE (pupil_id, criterion_id)
);
CREATE INDEX idx_pce_pupil     ON pupil_criteria_evidence (pupil_id);
CREATE INDEX idx_pce_criterion ON pupil_criteria_evidence (criterion_id);

-- The year-end overall assessment that ANCHORS a pupil's overall roll-up for a stage.
CREATE TABLE pupil_year_assessment (
  id            BIGSERIAL PRIMARY KEY,
  pupil_id      BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  stage_id      BIGINT NOT NULL REFERENCES prog_stages(id) ON DELETE CASCADE,
  assessment_id BIGINT REFERENCES assessments(id) ON DELETE SET NULL,
  overall_label TEXT,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pupil_id, stage_id)
);
CREATE INDEX idx_pya_pupil ON pupil_year_assessment (pupil_id);
