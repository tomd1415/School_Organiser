-- Phase 1: timetable, the dated record, and notes.
-- The P1 subset of docs/DATA_MODEL.md. See docs/PHASE_1_PLAN.md §2.
-- Conventions: BIGSERIAL PKs, created_at everywhere, closed sets as TEXT CHECK,
-- ON DELETE RESTRICT by default (joins/children that are owned use CASCADE).

-- ── A. Time structure ────────────────────────────────────────────────────────

CREATE TABLE academic_years (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,                 -- "2025/26"
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Exactly one current year.
CREATE UNIQUE INDEX one_current_academic_year ON academic_years ((1)) WHERE is_current;

CREATE TABLE term_dates (
  id               BIGSERIAL PRIMARY KEY,
  academic_year_id BIGINT NOT NULL REFERENCES academic_years(id),
  name             TEXT NOT NULL,                  -- "Autumn term", "October half term"
  start_date       DATE NOT NULL,                  -- inclusive
  end_date         DATE NOT NULL,                  -- inclusive
  kind             TEXT NOT NULL CHECK (kind IN ('term','half_term','holiday','inset')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (academic_year_id, name)
);

CREATE TABLE period_definitions (
  id           BIGSERIAL PRIMARY KEY,
  weekday      INT  NOT NULL CHECK (weekday BETWEEN 1 AND 7),   -- 1=Mon … 7=Sun
  slot_order   INT  NOT NULL,                                   -- ordering within the day
  slot_type    TEXT NOT NULL CHECK (slot_type IN
                 ('before_school','briefing','form_am','lesson','break','lunch','form_pm','after_school')),
  label        TEXT NOT NULL,                                   -- "Lesson 1", "Break", "Briefing"
  lesson_index INT,                                             -- 1..6 for lessons, else NULL
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  teachable    BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (weekday, slot_order)
);

-- ── B. Teaching structure ────────────────────────────────────────────────────

CREATE TABLE staff (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  role       TEXT NOT NULL CHECK (role IN ('self','ta','teacher','cover')),
  is_self    BOOLEAN NOT NULL DEFAULT false,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Exactly one "me".
CREATE UNIQUE INDEX one_self_staff ON staff ((1)) WHERE is_self;

CREATE TABLE rooms (
  id     BIGSERIAL PRIMARY KEY,
  name   TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE courses (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  key_stage     TEXT,                              -- "KS3", "KS4", "KS5"
  qualification TEXT,                              -- "GCSE", "custom", …
  exam_board    TEXT,                              -- "OCR"
  colour        TEXT,                              -- timetable rendering
  active        BOOLEAN NOT NULL DEFAULT true,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE groups (
  id               BIGSERIAL PRIMARY KEY,
  name             TEXT NOT NULL,                  -- "8PFA"
  year_group       TEXT,                           -- "Y8", "Post-16"
  academic_year_id BIGINT NOT NULL REFERENCES academic_years(id),
  default_room_id  BIGINT REFERENCES rooms(id),
  teams_url        TEXT,
  size             INT,
  active           BOOLEAN NOT NULL DEFAULT true,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (academic_year_id, name)
);

CREATE TABLE group_courses (
  id               BIGSERIAL PRIMARY KEY,
  group_id         BIGINT NOT NULL REFERENCES groups(id),
  course_id        BIGINT NOT NULL REFERENCES courses(id),
  lessons_per_week INT,
  active           BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (group_id, course_id)
);

CREATE TABLE timetabled_lessons (
  id                   BIGSERIAL PRIMARY KEY,
  period_definition_id BIGINT NOT NULL REFERENCES period_definitions(id),
  purpose              TEXT NOT NULL CHECK (purpose IN
                         ('teaching','free','duty','meeting','club','open_room','form')),
  group_id             BIGINT REFERENCES groups(id),   -- NULL for free/duty/club/open_room
  room_id              BIGINT REFERENCES rooms(id),
  staff_id             BIGINT NOT NULL REFERENCES staff(id),
  week                 TEXT NOT NULL DEFAULT 'every' CHECK (week IN ('every','A','B')),
  active               BOOLEAN NOT NULL DEFAULT true,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One lesson per (period, staff): self has one per slot; overseen teachers get their own row.
  UNIQUE (period_definition_id, staff_id)
);

CREATE TABLE timetabled_lesson_courses (
  id                   BIGSERIAL PRIMARY KEY,
  timetabled_lesson_id BIGINT NOT NULL REFERENCES timetabled_lessons(id) ON DELETE CASCADE,
  group_course_id      BIGINT NOT NULL REFERENCES group_courses(id),
  UNIQUE (timetabled_lesson_id, group_course_id)
);

-- ── D. Delivery & the record ─────────────────────────────────────────────────

CREATE TABLE lesson_occurrences (
  id                   BIGSERIAL PRIMARY KEY,
  timetabled_lesson_id BIGINT NOT NULL REFERENCES timetabled_lessons(id),
  date                 DATE NOT NULL,
  status               TEXT NOT NULL DEFAULT 'planned'
                         CHECK (status IN ('planned','taught','cancelled','cover')),
  taught_by_staff_id   BIGINT REFERENCES staff(id),
  week                 TEXT NOT NULL DEFAULT 'every',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (timetabled_lesson_id, date)
);

CREATE TABLE occurrence_courses (
  id              BIGSERIAL PRIMARY KEY,
  occurrence_id   BIGINT NOT NULL REFERENCES lesson_occurrences(id) ON DELETE CASCADE,
  group_course_id BIGINT NOT NULL REFERENCES group_courses(id),
  lesson_plan_id  BIGINT,            -- FK to lesson_plans added in Phase 3
  stopping_point  TEXT,
  UNIQUE (occurrence_id, group_course_id)
);

CREATE TABLE notes (
  id             BIGSERIAL PRIMARY KEY,
  kind           TEXT NOT NULL CHECK (kind IN ('lesson','general','oversight','plan_change','captured')),
  body           TEXT NOT NULL DEFAULT '',
  stopping_point TEXT,
  occurrence_id  BIGINT REFERENCES lesson_occurrences(id),
  group_id       BIGINT REFERENCES groups(id),
  course_id      BIGINT REFERENCES courses(id),
  pupil_id       BIGINT,            -- FK to pupils added in Phase 2
  task_id        BIGINT,            -- FK to tasks  added in Phase 2
  event_id       BIGINT,            -- FK to events added in Phase 2
  category       TEXT,              -- captured-info filing (Phase 2 UI)
  surface_on     DATE,
  archived       BOOLEAN NOT NULL DEFAULT false,
  safeguarding   BOOLEAN NOT NULL DEFAULT false,   -- withheld from all AI (Phase 4)
  interest       BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE note_followups (
  id              BIGSERIAL PRIMARY KEY,
  note_id         BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  text            TEXT NOT NULL,
  done            BOOLEAN NOT NULL DEFAULT false,
  becomes_task_id BIGINT,           -- FK to tasks added in Phase 2
  due_hint        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful indexes for the common Phase-1 queries.
CREATE INDEX idx_timetabled_lessons_period ON timetabled_lessons (period_definition_id);
CREATE INDEX idx_period_definitions_weekday ON period_definitions (weekday);
CREATE INDEX idx_lesson_occurrences_date   ON lesson_occurrences (date);
CREATE INDEX idx_notes_occurrence          ON notes (occurrence_id) WHERE occurrence_id IS NOT NULL;
CREATE INDEX idx_notes_group               ON notes (group_id)      WHERE group_id IS NOT NULL;
CREATE INDEX idx_notes_course              ON notes (course_id)     WHERE course_id IS NOT NULL;

UPDATE settings SET value = '1', updated_at = now() WHERE key = 'schema_phase';
