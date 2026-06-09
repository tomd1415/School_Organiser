-- Phase 3: schemes of work, lesson plans, and the hosted resource store.
-- The P3 subset of docs/DATA_MODEL.md §C. See docs/PHASE_3_PLAN.md §2.
-- The resources ⇄ resource_versions cycle is closed with an ALTER after both exist.

-- ── C. Planning content ──────────────────────────────────────────────────────

CREATE TABLE schemes_of_work (
  id         BIGSERIAL PRIMARY KEY,
  course_id  BIGINT NOT NULL REFERENCES courses(id),
  title      TEXT NOT NULL,
  version    INT NOT NULL DEFAULT 1,            -- keep last year's SoW while drafting a new one
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE units (
  id            BIGSERIAL PRIMARY KEY,
  scheme_id     BIGINT NOT NULL REFERENCES schemes_of_work(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE lesson_plans (
  id            BIGSERIAL PRIMARY KEY,
  unit_id       BIGINT REFERENCES units(id) ON DELETE SET NULL,
  course_id     BIGINT NOT NULL REFERENCES courses(id),
  title         TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  objectives    TEXT,
  outline       TEXT,
  duration_min  INT,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Hosted resource store ────────────────────────────────────────────────────

CREATE TABLE resources (
  id                 BIGSERIAL PRIMARY KEY,
  title              TEXT NOT NULL,
  kind               TEXT NOT NULL DEFAULT 'document'
                       CHECK (kind IN ('document','slides','worksheet','quiz','image','link','note')),
  mime_type          TEXT,
  source             TEXT NOT NULL DEFAULT 'uploaded' CHECK (source IN ('uploaded','imported','ai_generated')),
  ai_editable        BOOLEAN NOT NULL DEFAULT false,
  current_version_id BIGINT,                    -- FK added after resource_versions exists
  external_url       TEXT,                      -- for kind='link'
  active             BOOLEAN NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resource_versions (
  id           BIGSERIAL PRIMARY KEY,
  resource_id  BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  version_no   INT NOT NULL,
  storage_path TEXT NOT NULL,                   -- relative to RESOURCE_STORE_PATH
  byte_size    BIGINT,
  checksum     TEXT,                            -- sha256, powers duplicate detection
  author       TEXT NOT NULL DEFAULT 'teacher' CHECK (author IN ('teacher','ai')),
  change_note  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (resource_id, version_no)
);

ALTER TABLE resources
  ADD CONSTRAINT resources_current_version_fk FOREIGN KEY (current_version_id) REFERENCES resource_versions(id);

CREATE TABLE resource_links (
  id             BIGSERIAL PRIMARY KEY,
  resource_id    BIGINT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  course_id      BIGINT REFERENCES courses(id),
  unit_id        BIGINT REFERENCES units(id) ON DELETE CASCADE,
  lesson_plan_id BIGINT REFERENCES lesson_plans(id) ON DELETE CASCADE,
  occurrence_id  BIGINT REFERENCES lesson_occurrences(id) ON DELETE CASCADE,
  group_id       BIGINT REFERENCES groups(id),
  -- exactly one target
  CHECK (
    (course_id IS NOT NULL)::int + (unit_id IS NOT NULL)::int + (lesson_plan_id IS NOT NULL)::int +
    (occurrence_id IS NOT NULL)::int + (group_id IS NOT NULL)::int = 1
  )
);

-- ── Wire the Phase-1 placeholder column now that lesson_plans exists ──────────

ALTER TABLE occurrence_courses
  ADD CONSTRAINT occurrence_courses_lesson_plan_fk FOREIGN KEY (lesson_plan_id) REFERENCES lesson_plans(id);

-- ── Settings + indexes ───────────────────────────────────────────────────────

INSERT INTO settings (key, value) VALUES ('resource_store_path', '/data/resources') ON CONFLICT (key) DO NOTHING;

CREATE INDEX idx_units_scheme              ON units (scheme_id);
CREATE INDEX idx_lesson_plans_course       ON lesson_plans (course_id);
CREATE INDEX idx_resource_versions_resource ON resource_versions (resource_id);
CREATE INDEX idx_resource_versions_checksum ON resource_versions (checksum) WHERE checksum IS NOT NULL;
CREATE INDEX idx_resource_links_resource   ON resource_links (resource_id);

UPDATE settings SET value = '3', updated_at = now() WHERE key = 'schema_phase';
