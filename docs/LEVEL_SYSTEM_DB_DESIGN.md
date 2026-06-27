# Stages & strands — database design (curriculum content + pupil progression)

> **Scope.** A schema to hold the progression data in
> [LEVEL_SYSTEM_FULL_PROGRESSION.md](LEVEL_SYSTEM_FULL_PROGRESSION.md) /
> [LEVEL_SYSTEM_PLANNING_LEVELS.md](LEVEL_SYSTEM_PLANNING_LEVELS.md) — the **three planning grains**
> (course → unit → lesson), the **strands**, and the per-pupil **evidence** — in a way that's cheap to
> query for both planning and tracking. It **extends the Phase 16 sketch**
> ([PHASE_16_PLAN.md](PHASE_16_PLAN.md) §16A) rather than replacing it: the `progression_schemes →
> strands → stages → stage_criteria` spine stays, and a content tree (`prog_units → prog_lessons →
> stage_criteria`) hangs off it so a criterion can be reached either as "a stage's tickable descriptor"
> **or** as "an *I can…* under a lesson under a unit."
>
> **Conventions** (per [CLAUDE.md](../CLAUDE.md)): PostgreSQL 16; `BIGSERIAL`/`BIGINT`; FKs
> `ON DELETE CASCADE` (content) or `SET NULL`/`RESTRICT` (references); `TEXT … CHECK (… IN (…))` enums;
> `TIMESTAMPTZ DEFAULT now()`; denormalised FK columns where they speed lookups; `idx_<table>_<cols>`
> indexes; `routes → services (pure) → repos`. Pupil-identifying tables are called out — they carry the
> same privacy obligations as the rest of the app (no pupil name to AI, erasure must clear them).

---

## 1. The shape, in one picture

```
progression_schemes            -- "year ladder", "GCSE grades", a Post-16 qualification…
 ├─ prog_strands               -- per-scheme strand set (Programming, Computing systems, …)
 ├─ prog_stages                -- ordered rungs (Year 1…Year 9, or Grade 1…9)  ← "course planning" grain
 │   └─ prog_units             -- a unit sits at a (stage, strand)              ← "unit planning" grain
 │       └─ prog_lessons       -- a lesson/learning-objective in a unit         ← "lesson planning" grain
 │           └─ prog_criteria  -- the "I can…" / descriptor (the tickable atom)
 └─ group_course_scheme        -- binds a class (group_course) to a scheme

prog_criteria  ──(evidence)──  pupil_criteria_evidence   -- PII: a pupil ticked a criterion
prog_spec_links                -- optional: criterion ↔ course_spec_point (for auto-suggest from marks)
pupil_year_assessment          -- PII: the year-end overall anchor per (pupil, stage)
```

**Where each planning level lives:** course = `prog_stages` (× `prog_strands`); unit = `prog_units`;
lesson = `prog_lessons`; the tickable detail = `prog_criteria`. One table per grain, so a query at any
level is a single indexed lookup.

---

## 2. Curriculum content (no pupil data — safe to seed, safe to send cohort-level to AI)

```sql
-- A self-contained progression scheme. A class is bound to exactly one (see group_course_scheme).
CREATE TABLE progression_schemes (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,                                                  -- 'Computing year ladder (Y1–Y9)'
  kind          TEXT NOT NULL CHECK (kind IN ('year_ladder', 'gcse_grades', 'qualification')),
  exam_board    TEXT,                                                           -- e.g. 'OCR J277' for gcse_grades
  source        TEXT,                                                           -- 'Teach Computing / NCCE', 'OCR', …
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The strand set is PER SCHEME (the year ladder's strands differ from GCSE's two papers).
CREATE TABLE prog_strands (
  id            BIGSERIAL PRIMARY KEY,
  scheme_id     BIGINT NOT NULL REFERENCES progression_schemes(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,                          -- short tag: 'PG','CS','THEORY','PAPER2' …
  name          TEXT NOT NULL,                          -- 'Programming', 'Theory (Paper 1)'
  display_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (scheme_id, code)
);

-- The ordered rungs of the ladder = the COURSE-PLANNING grain. ordinal drives progression / roll-up order.
CREATE TABLE prog_stages (
  id            BIGSERIAL PRIMARY KEY,
  scheme_id     BIGINT NOT NULL REFERENCES progression_schemes(id) ON DELETE CASCADE,
  ordinal       INTEGER NOT NULL,                       -- 6 = 'Stage 6', etc. (or 1..9 for grades)
  label         TEXT NOT NULL,                          -- 'Stage 6 (Year 1)', 'Grade 4'
  year_group    SMALLINT,                               -- 1..11 where it maps to a NC year (nullable for grades)
  age_low       SMALLINT,                               -- optional age band, for "Stage ≈ age expectation"
  age_high      SMALLINT,
  key_stage     TEXT CHECK (key_stage IN ('EYFS','KS1','KS2','KS3','KS4')),    -- nullable
  UNIQUE (scheme_id, ordinal)
);

-- A UNIT sits at a (stage, strand) = the UNIT-PLANNING grain. scheme_id denormalised for fast filtering.
CREATE TABLE prog_units (
  id            BIGSERIAL PRIMARY KEY,
  scheme_id     BIGINT NOT NULL REFERENCES progression_schemes(id) ON DELETE CASCADE,   -- denormalised
  stage_id      BIGINT NOT NULL REFERENCES prog_stages(id) ON DELETE CASCADE,
  strand_id     BIGINT NOT NULL REFERENCES prog_strands(id) ON DELETE CASCADE,          -- the PRIMARY strand
  title         TEXT NOT NULL,                          -- 'Programming A – Moving a robot'
  display_order INTEGER NOT NULL DEFAULT 0,
  nc_refs       TEXT[],                                 -- e.g. ARRAY['1.4','1.5'] (NC statement numbers)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prog_units_stage   ON prog_units (stage_id, display_order);
CREATE INDEX idx_prog_units_strand  ON prog_units (strand_id);

-- A LESSON / learning objective in a unit = the LESSON-PLANNING grain.
CREATE TABLE prog_lessons (
  id            BIGSERIAL PRIMARY KEY,
  unit_id       BIGINT NOT NULL REFERENCES prog_units(id) ON DELETE CASCADE,
  lesson_no     INTEGER,                                -- the lesson's number within the unit (nullable)
  objective     TEXT,                                   -- 'To identify technology' (nullable: KS3 lists criteria directly)
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prog_lessons_unit ON prog_lessons (unit_id, display_order);

-- The tickable atom: an "I can…" success criterion (or a bare descriptor). Linked to BOTH a lesson
-- (content tree) AND its stage+strand (so the Stages-&-strands roll-up can read it without walking up).
-- stage_id/strand_id are denormalised from the lesson's unit for fast per-stage / per-strand reads.
CREATE TABLE prog_criteria (
  id            BIGSERIAL PRIMARY KEY,
  lesson_id     BIGINT NOT NULL REFERENCES prog_lessons(id) ON DELETE CASCADE,
  stage_id      BIGINT NOT NULL REFERENCES prog_stages(id) ON DELETE CASCADE,           -- denormalised
  strand_id     BIGINT NOT NULL REFERENCES prog_strands(id) ON DELETE CASCADE,          -- denormalised (primary)
  descriptor    TEXT NOT NULL,                          -- 'I can name the main parts of a computer'
  display_order INTEGER NOT NULL DEFAULT 0,
  also_strands  TEXT[],                                 -- secondary strand codes ('also: ET, SS')
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_prog_criteria_lesson ON prog_criteria (lesson_id, display_order);
CREATE INDEX idx_prog_criteria_stage  ON prog_criteria (stage_id);
CREATE INDEX idx_prog_criteria_strand ON prog_criteria (strand_id);
```

> **Why denormalise `stage_id`/`strand_id` onto `prog_criteria`?** The two hottest reads are "all criteria
> for a stage" (planning) and "a pupil's progress per strand" (tracking). Carrying the stage+strand on the
> criterion makes both a single indexed scan instead of a 3-table join up through lessons→units. The unit
> remains the source of truth; a trigger or the seeding repo keeps the denormalised columns in step (the
> project already parses BIGINT globally and favours this pattern — cf. `assessments.scheme_id/course_id`).

---

## 3. Binding a class, and the optional spec-point bridge

```sql
-- Which scheme a class follows. A GCSE class → the gcse_grades scheme; others → the year ladder, etc.
CREATE TABLE group_course_scheme (
  group_course_id BIGINT NOT NULL REFERENCES group_courses(id) ON DELETE CASCADE,
  scheme_id       BIGINT NOT NULL REFERENCES progression_schemes(id) ON DELETE RESTRICT,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_course_id)            -- one scheme per class
);

-- Optional: map a criterion to a course spec point, so marking an assessment/worksheet can AUTO-SUGGEST
-- "this is evidence for criterion X" (Phase 16A.4). Teacher-confirmed; many-to-many.
CREATE TABLE prog_spec_links (
  criterion_id   BIGINT NOT NULL REFERENCES prog_criteria(id) ON DELETE CASCADE,
  spec_point_id  BIGINT NOT NULL REFERENCES course_spec_points(id) ON DELETE CASCADE,
  PRIMARY KEY (criterion_id, spec_point_id)
);
CREATE INDEX idx_prog_spec_links_spec ON prog_spec_links (spec_point_id);
```

---

## 4. Per-pupil progression (PII — privacy-sensitive)

```sql
-- A pupil has evidenced a criterion. The tick. `source_*` records WHAT suggested/justified it (a mark,
-- an attempt) for the auto-suggest flow; NULL source = a manual tick. One row per (pupil, criterion).
CREATE TABLE pupil_criteria_evidence (
  id               BIGSERIAL PRIMARY KEY,
  pupil_id         BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,                 -- PII
  criterion_id     BIGINT NOT NULL REFERENCES prog_criteria(id) ON DELETE CASCADE,
  ticked_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ticked_by        TEXT,                                  -- teacher id/initials (audit)
  source_kind      TEXT CHECK (source_kind IN ('manual','assessment','worksheet','observation','baseline')),
  source_ref_id    BIGINT,                                -- nullable pointer (e.g. assessment_attempt / pupil_baseline id) — soft ref
  note             TEXT,
  UNIQUE (pupil_id, criterion_id)
);
CREATE INDEX idx_pce_pupil ON pupil_criteria_evidence (pupil_id);
CREATE INDEX idx_pce_criterion ON pupil_criteria_evidence (criterion_id);

-- The year-end overall assessment that ANCHORS a pupil's overall roll-up for a stage (Phase 16: strands
-- advance independently but an overall average is needed, confirmed by a year-end paper).
CREATE TABLE pupil_year_assessment (
  id               BIGSERIAL PRIMARY KEY,
  pupil_id         BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,                 -- PII
  stage_id         BIGINT NOT NULL REFERENCES prog_stages(id) ON DELETE CASCADE,
  assessment_id    BIGINT REFERENCES assessments(id) ON DELETE SET NULL,                    -- the paper, if any
  overall_label    TEXT,                                  -- e.g. confirmed stage/grade for the year
  recorded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pupil_id, stage_id)
);
CREATE INDEX idx_pya_pupil ON pupil_year_assessment (pupil_id);

-- START-OF-YEAR BASELINE (Phase 16A.7): one short placement per (pupil, class, year) that ESTABLISHES the
-- pupil's starting stage. The passed items also write into pupil_criteria_evidence (source_kind='baseline',
-- source_ref_id = this row). `mode` distinguishes the Year-7 cold start (no history) from the guided warm
-- start. `confidence` is lowered when responses look like random clicking (too fast / patterned) — a
-- low-confidence baseline is held for teacher review, NOT auto-trusted as the placement.
CREATE TABLE pupil_baseline (
  id                BIGSERIAL PRIMARY KEY,
  pupil_id          BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,                -- PII
  group_course_id   BIGINT NOT NULL REFERENCES group_courses(id) ON DELETE CASCADE,
  academic_year_id  BIGINT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  assessment_id     BIGINT REFERENCES assessments(id) ON DELETE SET NULL,                   -- the baseline paper used
  mode              TEXT NOT NULL CHECK (mode IN ('cold_start','warm_start')),
  placed_stage_id   BIGINT REFERENCES prog_stages(id) ON DELETE SET NULL,                   -- overall starting stage (nullable per-strand below)
  placed_per_strand JSONB NOT NULL DEFAULT '{}'::jsonb,    -- {strandId: stageOrdinal} — starting stage per strand
  confidence        TEXT NOT NULL DEFAULT 'ok' CHECK (confidence IN ('ok','low','flagged')),
  reviewed_by       TEXT,                                  -- teacher confirmed/adjusted the placement
  taken_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pupil_id, group_course_id, academic_year_id)     -- one baseline per pupil per class per year
);
CREATE INDEX idx_pbaseline_class ON pupil_baseline (group_course_id, academic_year_id);
```

> **Roll-up is computed, not stored.** A pupil's *current stage per strand* and *overall* are derived
> (pure service `services/progression.ts`, per Phase 16): a strand reaches a stage when **all** that
> stage's criteria for that strand are evidenced; overall = average across strands, optionally overridden
> by `pupil_year_assessment`. The **start-of-year baseline** (`pupil_baseline.placed_per_strand`, written
> as `source_kind='baseline'` evidence) provides the **starting floor** the roll-up builds up from — so a
> pupil isn't "Stage 0 in everything" on day one. Keeping the roll-up computed avoids a stale-cache class
> of bug. If a class heat-map ever needs it precomputed, add a `pupil_strand_progress` materialised view —
> don't hand-maintain a column.

---

## 4b. Assessments as stage evidence (baseline · per-unit · year-end)

All three assessment moments — the **start-of-year baseline** (16A.7), the **end-of-unit** assessment
(16A.8) and the **year-end overall** (16A.5) — feed the *same* per-strand stage roll-up. They reuse the
existing `assessments` subsystem (the `assessments`/`assessment_questions`/… tables already in the
codebase); the Stages & strands feature adds just two things:

```sql
-- 1) Tag each assessment with WHICH moment it is, so the right flow + length rules apply.
ALTER TABLE assessments
  ADD COLUMN purpose TEXT NOT NULL DEFAULT 'summative'
    CHECK (purpose IN ('summative','baseline','end_of_unit','year_end'));

-- 2) Map a question (or part) to the stage CRITERION it evidences, so a mark becomes stage evidence.
--    (Where a criterion already maps to a course spec point, prog_spec_links covers it; this is the direct
--    tag for questions written straight against a criterion, e.g. an "I can…" probe with no spec point.)
CREATE TABLE assessment_question_criteria (
  question_id   BIGINT NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  criterion_id  BIGINT NOT NULL REFERENCES prog_criteria(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, criterion_id)
);
CREATE INDEX idx_aqc_criterion ON assessment_question_criteria (criterion_id);

-- 3) The per-pupil PLACEMENT an end-of-unit assessment produces: the stage that best reflects the pupil's
--    ability in each strand for that unit. Recorded for the unit dashboard + as a roll-up cross-check
--    (the authoritative evidence is still the per-criterion ticks written with source_kind='assessment').
CREATE TABLE pupil_unit_placement (
  id                BIGSERIAL PRIMARY KEY,
  pupil_id          BIGINT NOT NULL REFERENCES pupils(id) ON DELETE CASCADE,                 -- PII
  unit_id           BIGINT NOT NULL REFERENCES prog_units(id) ON DELETE CASCADE,
  assessment_id     BIGINT REFERENCES assessments(id) ON DELETE SET NULL,
  individualised    BOOLEAN NOT NULL DEFAULT false,        -- was this a per-pupil paper (16A.8 opt-in)?
  placed_per_strand JSONB NOT NULL DEFAULT '{}'::jsonb,    -- {strandId: stageOrdinal} the unit assessment placed them at
  taken_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pupil_id, unit_id)
);
CREATE INDEX idx_pup_unit ON pupil_unit_placement (unit_id);
```

> **How a unit assessment becomes a stage.** The blueprint (`assembleBlueprint`, extended in 16A.8) covers
> the unit's criteria **plus a few from the stage above/below**; each question is tagged to its criterion
> via `assessment_question_criteria`; marking writes a `pupil_criteria_evidence` row (`source_kind=
> 'assessment'`) per criterion the pupil evidenced; the pure roll-up then yields the per-strand stage,
> mirrored into `pupil_unit_placement` for the unit view. **Individualised papers** change only *which*
> criteria the blueprint pulls (that pupil's boundary, from query (h)) — the schema is identical.

---

## 5. Worked queries (the common requests)

```sql
-- (a) COURSE PLANNING — the whole of a stage, grouped by strand, with unit + lesson + criterion counts.
SELECT st.label AS stage, sd.name AS strand, u.title AS unit,
       count(DISTINCT l.id) AS lessons, count(c.id) AS criteria
FROM prog_stages st
JOIN prog_units  u  ON u.stage_id = st.id
JOIN prog_strands sd ON sd.id = u.strand_id
JOIN prog_lessons l ON l.unit_id = u.id
LEFT JOIN prog_criteria c ON c.lesson_id = l.id
WHERE st.scheme_id = $1 AND st.ordinal = $2          -- a scheme + a stage number
GROUP BY st.label, sd.display_order, sd.name, u.display_order, u.title
ORDER BY sd.display_order, u.display_order;

-- (b) UNIT PLANNING — every lesson + its "I can…" criteria for one unit.
SELECT l.lesson_no, l.objective, c.descriptor, c.display_order
FROM prog_lessons l
JOIN prog_criteria c ON c.lesson_id = l.id
WHERE l.unit_id = $1
ORDER BY l.display_order, c.display_order;

-- (c) LESSON PLANNING — the criteria for a single lesson (the success criteria to assess).
SELECT descriptor FROM prog_criteria WHERE lesson_id = $1 ORDER BY display_order;

-- (d) ALL CRITERIA FOR A STAGE (the per-stage tickable set) — single indexed scan thanks to the denorm.
SELECT sd.name AS strand, c.descriptor
FROM prog_criteria c JOIN prog_strands sd ON sd.id = c.strand_id
WHERE c.stage_id = $1
ORDER BY sd.display_order, c.display_order;

-- (e) A PUPIL'S PROGRESS PER STRAND at a stage — how many of each strand's criteria are evidenced.
SELECT sd.name AS strand,
       count(*) FILTER (WHERE e.id IS NOT NULL) AS evidenced,
       count(*)                                  AS total
FROM prog_criteria c
JOIN prog_strands sd ON sd.id = c.strand_id
LEFT JOIN pupil_criteria_evidence e ON e.criterion_id = c.id AND e.pupil_id = $2
WHERE c.stage_id = $1
GROUP BY sd.display_order, sd.name
ORDER BY sd.display_order;
-- → a strand is "achieved" for the pupil when evidenced = total. Overall = avg across strands.

-- (f) CLASS HEAT-MAP — per pupil × strand evidenced/total at the class's bound stage.
-- NB the enrolment path: a pupil enrols in a GROUP (enrolments.group_id → groups), and a group_course is
-- a (group × course); so join enrolments to the class via group_courses.group_id, not directly.
SELECT p.id AS pupil_id, sd.name AS strand,
       count(*) FILTER (WHERE e.id IS NOT NULL) AS evidenced, count(*) AS total
FROM group_course_scheme gcs
JOIN group_courses gc ON gc.id = gcs.group_course_id
JOIN prog_stages  st ON st.scheme_id = gcs.scheme_id AND st.ordinal = $2
JOIN prog_criteria c ON c.stage_id = st.id
JOIN prog_strands sd ON sd.id = c.strand_id
JOIN enrolments   en ON en.group_id = gc.group_id AND en.active
JOIN pupils       p  ON p.id = en.pupil_id
LEFT JOIN pupil_criteria_evidence e ON e.criterion_id = c.id AND e.pupil_id = p.id
WHERE gcs.group_course_id = $1
GROUP BY p.id, sd.display_order, sd.name
ORDER BY p.id, sd.display_order;

-- (g) AUTO-SUGGEST from marking — criteria linked to the spec points a pupil just scored on.
SELECT DISTINCT c.id, c.descriptor
FROM prog_spec_links sl
JOIN prog_criteria c ON c.id = sl.criterion_id
WHERE sl.spec_point_id = ANY($1)                     -- spec points the pupil evidenced in an attempt
  AND c.stage_id = $2;                               -- restricted to the class's stage

-- (h) NEXT CRITERIA FOR THIS PUPIL — the un-achieved "I can…" at the pupil's NEXT stage, per strand.
-- THIS is what lesson generation reads to set each pupil's individual targets: every generated lesson aims
-- to push the pupil up a stage by getting them to evidence their next un-ticked criteria (see the ⭐
-- planning principle in LEVEL_SYSTEM_PLANNING_LEVELS.md). "Next stage" = one ordinal above the pupil's
-- current per-strand stage; here parameterised as a target stage ordinal for simplicity.
SELECT sd.name AS strand, c.id AS criterion_id, c.descriptor, u.title AS unit, l.objective
FROM prog_stages st
JOIN prog_criteria c ON c.stage_id = st.id
JOIN prog_strands sd ON sd.id = c.strand_id
JOIN prog_lessons l  ON l.id = c.lesson_id
JOIN prog_units   u  ON u.id = l.unit_id
WHERE st.scheme_id = $1
  AND st.ordinal   = $2                              -- the pupil's NEXT stage (current per-strand + 1)
  AND NOT EXISTS (                                    -- exclude what this pupil has already evidenced
        SELECT 1 FROM pupil_criteria_evidence e
        WHERE e.criterion_id = c.id AND e.pupil_id = $3)
ORDER BY sd.display_order, u.display_order, l.display_order, c.display_order;
-- Lesson generation: feed each pupil's rows in as their Support/Core/Challenge targets for the lesson;
-- a UNIT's worth of these clears the strand's next-stage criteria; a YEAR's worth = +1 stage overall.
-- (Per-strand "next stage" varies — run per strand using each strand's computed current ordinal + 1 when
-- strands have advanced unevenly; the single-ordinal form above is the common all-strands-together case.)

-- (i) BASELINE STATUS for a class — who has done their start-of-year baseline, and is any flagged for
-- review (random-clicking guard)? Drives the "set baselines for this class" screen at the start of a year.
SELECT p.id AS pupil_id,
       b.mode, b.confidence, b.placed_stage_id, b.taken_at,
       (b.id IS NULL) AS baseline_missing
FROM group_courses gc
JOIN enrolments en ON en.group_id = gc.group_id AND en.active
JOIN pupils     p  ON p.id = en.pupil_id
LEFT JOIN pupil_baseline b
       ON b.pupil_id = p.id AND b.group_course_id = gc.id AND b.academic_year_id = $2
WHERE gc.id = $1
ORDER BY baseline_missing DESC, (b.confidence <> 'ok') DESC, p.id;
-- → surfaces who still needs a baseline, then low-confidence ones to review, then the settled ones.
```

---

## 6. Seeding & layering notes

- **Seed source** is the three planning docs. A one-off seed script walks Stage → Strand → Unit → Lesson →
  criterion and inserts in that order (parents first), setting `display_order` from file order and filling
  `prog_criteria.stage_id/strand_id` from the unit. Idempotent (upsert on natural keys:
  `(scheme, ordinal)`, `(stage, strand, title)`, `(unit, lesson_no, objective)`,
  `(lesson, descriptor)`).
- **Two schemes at launch:** the **year ladder** (Stages 6–14 from these docs) and **GCSE grades** (the
  OCR-J277 two-strand grade scheme — seeded from its own source, not these). Post-16 schemes added per
  qualification later.
- **Layering** ([CLAUDE.md](../CLAUDE.md)): `repos/progression.ts` (thin SQL for the queries above) →
  `services/progression.ts` (pure roll-up: criteria + evidence → per-strand stage + overall) →
  `routes/progression.ts`. Views are pure `data → HTML` and reference URLs via `paths.ts`.
- **Privacy.** `pupil_criteria_evidence` and `pupil_year_assessment` are PII → covered by the Phase-10
  erasure path (delete on pupil erasure/anonymisation) and never sent to AI. The auto-suggest in §5(g)
  reads only **already-computed, in-app** spec-point results — it sends nothing new to any AI service.

## 7. How this maps back to the Phase 16 sketch

| Phase 16 sketch | This design |
|---|---|
| `progression_schemes (kind)` | unchanged |
| `strands (scheme_id, name)` | `prog_strands` (+ `code`, `display_order`) |
| `stages (scheme_id, ordinal, label)` | `prog_stages` (+ `year_group`, `age_*`, `key_stage`) |
| `stage_criteria (stage_id, strand_id, descriptor)` | **split into the content tree** `prog_units → prog_lessons → prog_criteria`; `prog_criteria` keeps the `stage_id`+`strand_id` the sketch had, so the roll-up is unchanged |
| `group_course_scheme` | unchanged |
| `pupil_criteria_evidence (… source)` | `pupil_criteria_evidence` (+ `source_kind`/`source_ref_id`) |
| `pupil_year_assessment` | unchanged |

The only addition is the **units/lessons layer** that gives you the three planning grains; the
Stages-&-strands roll-up tables and logic are exactly as Phase 16 planned.
