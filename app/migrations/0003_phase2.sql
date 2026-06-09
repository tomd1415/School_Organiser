-- Phase 2: tasks, time, events, prep, pupils & captured-info plumbing.
-- The P2 subset of docs/DATA_MODEL.md. See docs/PHASE_2_PLAN.md §2.
-- Created in FK-dependency order; the tasks ⇄ email_intake cycle is closed with
-- an ALTER after both exist.

-- ── E. Pupils ────────────────────────────────────────────────────────────────

CREATE TABLE pupils (
  id           BIGSERIAL PRIMARY KEY,
  display_name TEXT NOT NULL,                       -- stored locally only
  ai_token     TEXT NOT NULL UNIQUE,                -- "PUPIL_7" — what the AI sees instead
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE enrolments (
  id        BIGSERIAL PRIMARY KEY,
  pupil_id  BIGINT NOT NULL REFERENCES pupils(id),
  group_id  BIGINT NOT NULL REFERENCES groups(id),
  active    BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (pupil_id, group_id)
);

-- ── H. Events & deadlines ────────────────────────────────────────────────────

CREATE TABLE events (
  id                   BIGSERIAL PRIMARY KEY,
  kind                 TEXT NOT NULL CHECK (kind IN
                         ('parents_evening','ehcp_review','report_deadline','exam','data_drop',
                          'inset','trip','open_evening','meeting','parent_contact','other')),
  title                TEXT NOT NULL,
  detail               TEXT,
  date                 DATE,
  start_at             TIMESTAMPTZ,
  end_at               TIMESTAMPTZ,
  all_day              BOOLEAN NOT NULL DEFAULT false,
  affects_availability BOOLEAN NOT NULL DEFAULT false,  -- true → removes the overlapping work window
  due_at               TIMESTAMPTZ,
  lead_days            INT,
  pupil_id             BIGINT REFERENCES pupils(id),
  group_id             BIGINT REFERENCES groups(id),
  course_id            BIGINT REFERENCES courses(id),
  status               TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','done','cancelled')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── F. Tasks & time ──────────────────────────────────────────────────────────

CREATE TABLE tasks (
  id              BIGSERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  detail          TEXT,
  source          TEXT NOT NULL DEFAULT 'manual'
                    CHECK (source IN ('manual','email','note','event','recurring')),
  email_intake_id BIGINT,                            -- FK added after email_intake exists
  due_at          TIMESTAMPTZ,
  due_rule        TEXT,                              -- e.g. before_next_lesson:<group_id>
  urgency         TEXT NOT NULL DEFAULT 'this_week'
                    CHECK (urgency IN ('urgent_today','by_next_lesson','this_week','someday')),
  estimate_min    INT,
  status          TEXT NOT NULL DEFAULT 'inbox'
                    CHECK (status IN ('inbox','triaged','scheduled','in_progress','done','dropped')),
  group_id        BIGINT REFERENCES groups(id),
  course_id       BIGINT REFERENCES courses(id),
  occurrence_id   BIGINT REFERENCES lesson_occurrences(id),
  pupil_id        BIGINT REFERENCES pupils(id),
  event_id        BIGINT REFERENCES events(id),
  parent_task_id  BIGINT REFERENCES tasks(id),       -- a sub-step of a broken-down task
  cognitive_load  TEXT CHECK (cognitive_load IN ('low','medium','high')),
  context         TEXT,                              -- needs_computer, quick_win, can_do_tired
  recurrence      TEXT,                              -- weekly:fri, per_lesson:<group_course_id>
  task_type       TEXT,                              -- marking, email, resource_prep, admin …
  actual_seconds  INT,                               -- cached from time_entries
  interest        BOOLEAN NOT NULL DEFAULT false,    -- "current interest" (§5.18)
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE email_intake (
  id              BIGSERIAL PRIMARY KEY,
  received_at     TIMESTAMPTZ,
  from_addr       TEXT,
  subject         TEXT,
  body            TEXT NOT NULL DEFAULT '',
  raw_path        TEXT,
  processed       BOOLEAN NOT NULL DEFAULT false,
  created_task_id BIGINT REFERENCES tasks(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tasks
  ADD CONSTRAINT tasks_email_intake_fk FOREIGN KEY (email_intake_id) REFERENCES email_intake(id);

CREATE TABLE work_blocks (
  id                   BIGSERIAL PRIMARY KEY,
  date                 DATE NOT NULL,
  start_at             TIMESTAMPTZ,
  end_at               TIMESTAMPTZ,
  period_definition_id BIGINT REFERENCES period_definitions(id),  -- the free period it lines up with
  planned_task_id      BIGINT REFERENCES tasks(id),
  planned_note         TEXT,
  actual_task_id       BIGINT REFERENCES tasks(id),               -- what I actually did (may differ)
  actual_note          TEXT,
  status               TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','done','diverted')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE time_entries (
  id            BIGSERIAL PRIMARY KEY,
  kind          TEXT NOT NULL CHECK (kind IN ('task','lesson','activity','other')),
  task_id       BIGINT REFERENCES tasks(id),
  occurrence_id BIGINT REFERENCES lesson_occurrences(id),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at      TIMESTAMPTZ,                         -- NULL while running
  seconds       INT,                                 -- filled on stop
  source        TEXT NOT NULL DEFAULT 'timer' CHECK (source IN ('timer','manual')),
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- At most one running timer.
CREATE UNIQUE INDEX one_running_timer ON time_entries ((1)) WHERE ended_at IS NULL;

-- ── H. Prep checklists ───────────────────────────────────────────────────────

CREATE TABLE prep_templates (
  id            BIGSERIAL PRIMARY KEY,
  scope         TEXT NOT NULL CHECK (scope IN ('global','group_course','timetabled_lesson')),
  ref_id        BIGINT,                              -- group_course / timetabled_lesson when scoped
  text          TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE occurrence_prep (
  id            BIGSERIAL PRIMARY KEY,
  occurrence_id BIGINT NOT NULL REFERENCES lesson_occurrences(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  done          BOOLEAN NOT NULL DEFAULT false,
  source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('template','manual')),
  template_id   BIGINT REFERENCES prep_templates(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── D/E. Pupil mentions & tags on notes ──────────────────────────────────────

CREATE TABLE note_pupil_mentions (
  id        BIGSERIAL PRIMARY KEY,
  note_id   BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  pupil_id  BIGINT NOT NULL REFERENCES pupils(id),
  text      TEXT,
  resolved  BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE tags (
  id   BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE note_tags (
  note_id BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id  BIGINT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (note_id, tag_id)
);

-- ── A. Schedule exceptions (deferred from Phase 1) ───────────────────────────

CREATE TABLE schedule_exceptions (
  id                   BIGSERIAL PRIMARY KEY,
  date                 DATE NOT NULL,
  scope                TEXT NOT NULL CHECK (scope IN ('whole_day','period','lesson')),
  period_definition_id BIGINT REFERENCES period_definitions(id),
  timetabled_lesson_id BIGINT REFERENCES timetabled_lessons(id),
  kind                 TEXT NOT NULL CHECK (kind IN ('cancelled','room_change','cover','off_timetable','event')),
  new_room_id          BIGINT REFERENCES rooms(id),
  cover_staff_id       BIGINT REFERENCES staff(id),
  detail               TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Wire up the Phase-1 placeholder columns now that their targets exist ─────

ALTER TABLE notes ADD CONSTRAINT notes_pupil_fk FOREIGN KEY (pupil_id) REFERENCES pupils(id);
ALTER TABLE notes ADD CONSTRAINT notes_task_fk  FOREIGN KEY (task_id)  REFERENCES tasks(id);
ALTER TABLE notes ADD CONSTRAINT notes_event_fk FOREIGN KEY (event_id) REFERENCES events(id);
ALTER TABLE note_followups
  ADD CONSTRAINT note_followups_becomes_task_fk FOREIGN KEY (becomes_task_id) REFERENCES tasks(id);

-- ── Indexes for the common Phase-2 queries ───────────────────────────────────

CREATE INDEX idx_tasks_status        ON tasks (status);
CREATE INDEX idx_tasks_due_at        ON tasks (due_at) WHERE due_at IS NOT NULL;
CREATE INDEX idx_tasks_group         ON tasks (group_id) WHERE group_id IS NOT NULL;
CREATE INDEX idx_work_blocks_date    ON work_blocks (date);
CREATE INDEX idx_time_entries_task   ON time_entries (task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_events_date         ON events (date) WHERE date IS NOT NULL;
CREATE INDEX idx_occurrence_prep_occ ON occurrence_prep (occurrence_id);

UPDATE settings SET value = '2', updated_at = now() WHERE key = 'schema_phase';
