-- Phase 8: pupils log in and do the work in the app.
-- Named TA accounts (8.1), pupil credentials + class login codes (8.2), answers as data with
-- per-pupil differentiation levels (8.4), the pupil lesson-feedback widget (8.5).
-- NOTE the DPIA gate: pupil_credentials rows are only created once the teacher has enabled
-- pupil access in Settings, which requires acknowledging DPO/SLT sign-off (PHASE_8_PLAN 8.0).

-- ── 8.1 Named TA logins (the shared ta_password_hash setting is being retired) ───────────────
CREATE TABLE ta_accounts (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  staff_id      BIGINT REFERENCES staff(id) ON DELETE SET NULL, -- links "my upcoming lessons"
  password_hash TEXT NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 8.2 Pupil credentials: class code → pick your name → PIN ─────────────────────────────────
CREATE TABLE pupil_credentials (
  pupil_id     BIGINT PRIMARY KEY REFERENCES pupils(id) ON DELETE CASCADE,
  pin_hash     TEXT NOT NULL,                 -- scrypt, same as every other credential
  enabled      BOOLEAN NOT NULL DEFAULT true,
  failed_count INT NOT NULL DEFAULT 0,        -- locked at 5 until the teacher unlocks
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The short rotatable class code a pupil types first (e.g. "8PFA-31"). NULL ⇒ no pupil login
-- for this group. Groups are year-scoped, so codes naturally retire with the year.
ALTER TABLE groups ADD COLUMN login_code TEXT;
CREATE UNIQUE INDEX groups_login_code_key ON groups (login_code) WHERE login_code IS NOT NULL;

-- ── 8.4 The work itself: one row per answered field, pinned to the version the pupil saw ─────
CREATE TABLE pupil_answers (
  id                   BIGSERIAL PRIMARY KEY,
  pupil_id             BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  occurrence_course_id BIGINT NOT NULL REFERENCES occurrence_courses(id) ON DELETE CASCADE,
  resource_id          BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  version_no           INT NOT NULL,
  field_key            TEXT NOT NULL,         -- deterministic: "t2.r3.c1" / "task.4" (full-document indexes)
  value                TEXT NOT NULL DEFAULT '',
  seen_by_teacher      BOOLEAN NOT NULL DEFAULT false,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pupil_id, occurrence_course_id, resource_id, field_key)
);
CREATE INDEX pupil_answers_oc_idx ON pupil_answers (occurrence_course_id);

-- Self-declared "Done ✓" (Q32) — the review grid shows the real field count beside it.
CREATE TABLE pupil_done (
  pupil_id             BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  occurrence_course_id BIGINT NOT NULL REFERENCES occurrence_courses(id) ON DELETE CASCADE,
  done_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (pupil_id, occurrence_course_id)
);

-- Which differentiation tier each pupil works at, per course. No row ⇒ core. Sits beside
-- group_courses.ability_midpoint (the tier anchor). The slice a pupil receives is unlabelled (Q30).
CREATE TABLE pupil_levels (
  pupil_id        BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  group_course_id BIGINT NOT NULL REFERENCES group_courses(id) ON DELETE CASCADE,
  level           TEXT NOT NULL CHECK (level IN ('support', 'core', 'challenge')),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (pupil_id, group_course_id)
);

-- ── 8.5 The pupil's voice on the lesson: one editable row per pupil per lesson ───────────────
CREATE TABLE pupil_lesson_feedback (
  id                   BIGSERIAL PRIMARY KEY,
  pupil_id             BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,
  occurrence_course_id BIGINT NOT NULL REFERENCES occurrence_courses(id) ON DELETE CASCADE,
  rating               INT CHECK (rating BETWEEN 1 AND 4),  -- 🙁😐🙂😀
  liked                TEXT NOT NULL DEFAULT '',            -- comma chips: "practical,cards"
  disliked             TEXT NOT NULL DEFAULT '',
  comment              TEXT NOT NULL DEFAULT '',
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pupil_id, occurrence_course_id)
);
