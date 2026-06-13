-- Phase 9: auto-marking & the results loop. (0019–0021 were Phase-8 fixes, so this is 0022.)
-- Everything here is keyed off pupils / occurrences / worksheet resources — never "the teacher" —
-- so the future multi-teacher model adds ownership/RBAC on top without re-keying (PHASE_9_PLAN §13).
-- Gated in code by the `pupil_marks_enabled` setting (the 9.0 DPIA-addendum gate): off until the
-- teacher acknowledges DPO/SLT sign-off, exactly like the pupil-access master switch.

-- ── Mark schemes: one per worksheet resource version ─────────────────────────────────────────
CREATE TABLE mark_schemes (
  id          BIGSERIAL PRIMARY KEY,
  resource_id BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  version_no  INT NOT NULL,
  source      TEXT NOT NULL CHECK (source IN ('generated', 'derived', 'teacher')),
  status      TEXT NOT NULL CHECK (status IN ('draft', 'ready')) DEFAULT 'draft',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (resource_id, version_no)
);

CREATE TABLE mark_scheme_points (
  id             BIGSERIAL PRIMARY KEY,
  mark_scheme_id BIGINT NOT NULL REFERENCES mark_schemes(id) ON DELETE CASCADE,
  field_key      TEXT NOT NULL,                 -- the SAME keys as pupil_answers ("t2.r3.c1", "task.4")
  kind           TEXT NOT NULL CHECK (kind IN ('tick', 'choice', 'exact', 'numeric', 'keyword', 'open')),
  expected       TEXT NOT NULL DEFAULT '',      -- the creditworthy answer / point
  alternatives   TEXT[] NOT NULL DEFAULT '{}',  -- accepted variants ("CPU", "processor", …)
  marks          INT NOT NULL DEFAULT 1,
  required       BOOLEAN NOT NULL DEFAULT false,
  display_order  INT NOT NULL DEFAULT 0
);
CREATE INDEX mark_scheme_points_scheme_idx ON mark_scheme_points (mark_scheme_id);

-- ── Marks: one per marked answer; a suggestion until the teacher confirms ─────────────────────
CREATE TABLE pupil_marks (
  id              BIGSERIAL PRIMARY KEY,
  pupil_answer_id BIGINT NOT NULL UNIQUE REFERENCES pupil_answers(id) ON DELETE CASCADE,
  marks_awarded   INT NOT NULL DEFAULT 0,
  marks_total     INT NOT NULL DEFAULT 0,
  points_hit      BIGINT[] NOT NULL DEFAULT '{}',
  evidence        TEXT[] NOT NULL DEFAULT '{}',  -- quotes; gate-verified substrings of the answer
  marker          TEXT NOT NULL CHECK (marker IN ('auto', 'ai', 'teacher')),
  confidence      NUMERIC(3, 2),                 -- 1.00 for auto; the model's own for ai
  status          TEXT NOT NULL CHECK (status IN ('suggested', 'confirmed')) DEFAULT 'suggested',
  needs_review    BOOLEAN NOT NULL DEFAULT false,-- set by the safety gate; reasons in history
  feedback        TEXT NOT NULL DEFAULT '',      -- pupil-facing line
  history         JSONB NOT NULL DEFAULT '[]',   -- audit: gate reasons, prior values on override
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The teacher's comment back to a pupil (mirrors pupil_lesson_feedback).
CREATE TABLE pupil_lesson_comments (
  pupil_id             BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  occurrence_course_id BIGINT NOT NULL REFERENCES occurrence_courses(id) ON DELETE CASCADE,
  comment              TEXT NOT NULL DEFAULT '',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pupil_id, occurrence_course_id)
);

-- ── "Stay signed in on this computer" (9.6) — pupil-bound, no class binding ──────────────────
CREATE TABLE pupil_devices (
  id           BIGSERIAL PRIMARY KEY,
  pupil_id     BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,          -- the cookie holds the secret; only its hash is stored
  label        TEXT NOT NULL DEFAULT '',      -- "Edge on ICT1-07" (user-agent hint)
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL,          -- end of term
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pupil_devices_pupil_idx ON pupil_devices (pupil_id);

-- ── "What works for me" profile (9.8) — pupil-keyed (the cross-subject bridge) ────────────────
CREATE TABLE pupil_profiles (
  pupil_id   BIGINT PRIMARY KEY REFERENCES pupils(id) ON DELETE CASCADE,
  digest     TEXT NOT NULL DEFAULT '',         -- two lines of prose; AI-written from tokenised history
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Per-lesson release + per-class marking behaviour (Q33/Q34/Q35) ───────────────────────────
ALTER TABLE occurrence_courses ADD COLUMN marks_released_at TIMESTAMPTZ;  -- the hold-mode release act

ALTER TABLE group_courses ADD COLUMN marking_trigger TEXT NOT NULL DEFAULT 'on_done'
  CHECK (marking_trigger IN ('on_done', 'manual'));   -- mark as pupils finish, or batch-on-button
ALTER TABLE group_courses ADD COLUMN results_mode TEXT NOT NULL DEFAULT 'instant'
  CHECK (results_mode IN ('instant', 'on_release'));  -- show on confirm, or hold until Release
ALTER TABLE group_courses ADD COLUMN show_scores BOOLEAN NOT NULL DEFAULT false;     -- ticks-only by default (Q33)
ALTER TABLE group_courses ADD COLUMN devices_enabled BOOLEAN NOT NULL DEFAULT false; -- remembered devices off by default (Q35)
