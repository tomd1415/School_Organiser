-- Per-unit summative assessments (Phase 0): assignment, attempts, answers, awarded marks, per-spec-point
-- results, and a durable marking queue. Pupil PII (free-text answers) lives in assessment_answers; it never
-- reaches AI un-redacted (marking sends anonymous slot-lettered answers via the wrapper's context[]).
-- assessment_attempts.is_test partitions Test Lab attempts (the fictitious test pupil), matching 0062.

-- assessment <-> class assignment with an availability window (mirrors computing_check assessment_classes).
CREATE TABLE assessment_classes (
  id               BIGSERIAL PRIMARY KEY,
  assessment_id    BIGINT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  group_course_id  BIGINT NOT NULL REFERENCES group_courses(id) ON DELETE CASCADE,
  available_from   TIMESTAMPTZ,                 -- null = available immediately on assign
  available_until  TIMESTAMPTZ,                 -- null = no closing date
  results_mode     TEXT NOT NULL DEFAULT 'on_release' CHECK (results_mode IN ('instant', 'on_release')),
  released_at      TIMESTAMPTZ,                 -- when the teacher released results to pupils
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, group_course_id)
);
CREATE INDEX idx_aclass_gc ON assessment_classes (group_course_id);

-- ONE summative attempt per (assessment, pupil). is_test partitions Test Lab runs (the fictitious pupil).
CREATE TABLE assessment_attempts (
  id               BIGSERIAL PRIMARY KEY,
  assessment_id    BIGINT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  pupil_id         BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  group_course_id  BIGINT NOT NULL REFERENCES group_courses(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted')),
  is_test          BOOLEAN NOT NULL DEFAULT false,                                  -- TEST-LAB-GUARD
  started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at     TIMESTAMPTZ,
  score_awarded    INTEGER NOT NULL DEFAULT 0,                                       -- denormalised cache
  score_total      INTEGER NOT NULL DEFAULT 0
);
-- one REAL attempt per (assessment, pupil); test attempts may repeat (teacher previews) so they're excluded.
CREATE UNIQUE INDEX uq_attempt_real ON assessment_attempts (assessment_id, pupil_id) WHERE NOT is_test;
CREATE INDEX idx_attempt_pupil ON assessment_attempts (pupil_id);
CREATE INDEX idx_attempt_assessment ON assessment_attempts (assessment_id) WHERE NOT is_test; -- cohort reads

-- One row per (attempt, part). answer_text holds the pupil's free text (PII) OR a structured value (JSON string).
CREATE TABLE assessment_answers (
  id            BIGSERIAL PRIMARY KEY,
  attempt_id    BIGINT NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  part_id       BIGINT NOT NULL REFERENCES assessment_question_parts(id) ON DELETE CASCADE,
  answer_text   TEXT NOT NULL DEFAULT '',
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, part_id)
);

-- Awarded marks: one row per answer (mirrors pupil_marks). marker auto|ai|teacher; status suggested|confirmed.
CREATE TABLE assessment_awarded_marks (
  answer_id      BIGINT PRIMARY KEY REFERENCES assessment_answers(id) ON DELETE CASCADE,
  marks_awarded  INTEGER NOT NULL DEFAULT 0,
  marks_total    INTEGER NOT NULL DEFAULT 0,
  points_hit     BIGINT[] NOT NULL DEFAULT '{}',      -- assessment_mark_points.id hit (objective)
  evidence       TEXT[] NOT NULL DEFAULT '{}',        -- verbatim quote(s) from the answer
  marker         TEXT NOT NULL CHECK (marker IN ('auto', 'ai', 'teacher')),
  confidence     REAL,
  status         TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'confirmed')),
  needs_review   BOOLEAN NOT NULL DEFAULT false,
  disclosure     BOOLEAN NOT NULL DEFAULT false,      -- safeguarding-matched: withheld from AI, surfaced in register
  feedback       TEXT NOT NULL DEFAULT '',            -- pupil-facing feedback line
  history        JSONB NOT NULL DEFAULT '[]'::jsonb,  -- append-only audit (ai reasons / override prev value)
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-spec-point results, computed from OBJECTIVE marks at mark time (cache for analytics).
CREATE TABLE assessment_spec_point_results (
  id              BIGSERIAL PRIMARY KEY,
  attempt_id      BIGINT NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  spec_point_id   BIGINT NOT NULL REFERENCES course_spec_points(id) ON DELETE CASCADE,
  marks_awarded   INTEGER NOT NULL DEFAULT 0,
  marks_total     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (attempt_id, spec_point_id)
);
CREATE INDEX idx_aspr_spec ON assessment_spec_point_results (spec_point_id);

-- Durable AI-marking queue (mirrors marking_queue) — survives reboot.
CREATE TABLE assessment_mark_queue (
  attempt_id  BIGINT PRIMARY KEY REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  due_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
