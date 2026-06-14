-- Phase 11 Wave 5 (idea 8, lean cut) — the advisory AI reviewer's store. A review critiques a
-- not-yet-taught MASTER lesson against the spec / official documents and proposes an improved version
-- the teacher Applies (or Dismisses) — the master is NEVER mutated automatically. group_course_id is
-- reserved for a future per-class scope; v1 always writes NULL (master scope). Cohort-level only — no
-- pupil identity is ever attached. Findings are advisory: only 'open' rows are surfaced/badged.
CREATE TABLE lesson_reviews (
  id                   BIGSERIAL PRIMARY KEY,
  lesson_plan_id       BIGINT NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  group_course_id      BIGINT REFERENCES group_courses(id) ON DELETE CASCADE, -- NULL = master scope (v1)
  verdict              TEXT NOT NULL CHECK (verdict IN ('keep', 'tweak', 'rework')),
  findings             JSONB NOT NULL DEFAULT '[]',  -- [{issue, fix}], worst first, max 3
  suggested_objectives TEXT,
  suggested_outline    TEXT,
  rationale            TEXT,
  model                TEXT,
  prompt_version       TEXT,
  status               TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'applied', 'dismissed')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The cost guard ("skip a lesson that already has an open review") and the inline surfacing both
-- query open reviews by plan, so index exactly that path.
CREATE INDEX lesson_reviews_open_idx ON lesson_reviews (lesson_plan_id) WHERE status = 'open';
