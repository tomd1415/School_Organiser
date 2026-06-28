# Conversion notes — GCSE Databases and SQL (Teach Computing — adapted)

- **Slug:** `gcse-databases-sql-teach-computing-adapted`
- **Course / key stage:** OCR J277 GCSE Computer Science · **KS4**
- **Source:** TeachComputing GCSE unit_14 (Databases and SQL, KS4 v1.2), Lessons 1–5 + the unit guide and
  the end-of-unit summative assessment. © Raspberry Pi Foundation, OGL v3.0.
- **Lessons authored:** 5 (each: starter worksheet + activity/quiz worksheet + slide deck + media).
- **Self-verify:** PASS (renders, screenshot fields on every activity/quiz, level slicing differs, slides
  parse with teacher notes, all `{{res:}}` placeholders map to declared files).
- **Question types used:** text, multiple-choice, multi-select, matching, fill-in-the-blank, code, Parsons,
  order, card-sort, label-a-diagram, screenshot, checklist (11 interactive kinds — high variety).
- **Adaptation:** show-your-work uses "paste your SQL" + a DB Browser screenshot (this unit uses DB Browser
  for SQLite, not MakeCode). SEND defaults applied throughout (low-arousal slides, I-do/we-do/you-do, S/C/C
  on the same task, TA fix-words on every activity).

> **Heading gotcha hit & fixed:** the word *"challenge"* (also *support*/*core*) in a `#`/`##` heading is read
> by the slicer as a `# Challenge` level divider. The unit's "Swim challenge" titles silently blanked the
> Core/Support slices (and the decks) until the H1s were renamed to "Swim database…". Kept the literal
> "Swim challenge" wording only in prose and in the manifest lesson titles (those aren't sliced).

---

## §7a alignment — Lesson 1: Database essentials

| Objective ("I can…") | Taught on slide(s) | Asked on worksheet (Q / level) |
|---|---|---|
| describe what a database is | S2 starter, S3 parts | starter: "how is the DVLA storing data?" choice (shared) |
| name the parts (table/record/field/primary key) | S3 parts, S4 primary key | starter: **label-a-diagram** of a table (shared) · **matching** term↔meaning (Support) · "what is a primary key" (Core) · **multi-select** key properties (Challenge) |
| describe a flat file database | S5 flat vs relational | activity: **card-sort** flat/relational (shared) · flat-file choice (Support) |
| describe a relational database | S5, S7 explore DBMS | activity: **fill-blank** primary→foreign key (Core) · redundancy/inconsistency (Challenge) · explore dbMusic.db + screenshot |

Media: DVLA details, the music-table key-terms image (used by the label task), DB Browser structure
screenshot, and the **DB Browser demo video** (teacher hook on S6).

## §7a alignment — Lesson 2: SQL searches

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| describe what SQL is for | S3 what is SQL | starter recap fill-blank (shared) |
| retrieve data with SELECT/FROM/WHERE | S4 first query, S5 demo | activity: **Parsons** build the query (shared) · operator **matching** (Support) · complete + write a query, **fill-blank** `*` (Core) |
| sort with ORDER BY | S6 ORDER BY | activity: the Parsons query includes the `ORDER BY` line (shared) |
| retrieve from more than one table | S7 book-shop, S8 demo | activity: multi-table query as **code**, worked-example image (Challenge) |

Extra: **card-sort** comparison-vs-logical operators (shared). Media: operators table, book-shop relational
DB, multi-table worked query, and **two live-coding demo videos** (hooks on S5 & S8).

## §7a alignment — Lesson 3: Insert, update, delete

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| describe a data type + name common ones | S3 data types | starter: **card-sort** fields→INTEGER/TEXT/REAL (shared) · INTEGER/TEXT choice (Support) · **matching** type↔meaning (Core) |
| choose a suitable data type | S3 | starter: card-sort (shared) · why DOB is TEXT (Challenge) |
| write INSERT/UPDATE/DELETE | S4/S5/S6 | activity: **Parsons** INSERT (shared) · which-query choice (Support) · UPDATE **code** + **fill-blank** `SET` (Core) · DELETE **code** (Challenge) |
| prove a query worked using SELECT | S7 prove-with-SELECT | activity: Challenge "…then a SELECT to prove"; show-your-work screenshot |

Media: music-database schema image. (The original Parsons "distractor" line was dropped — the engine's
Parsons marks order only, no unused-line distractor.)

## §7a alignment — Lesson 4: Swim challenge (part 1)

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| identify primary & foreign keys | S3 swim database | starter: **card-sort** fields→primary/foreign key (shared) · PK/FK choice (Support) · one-to-many (Core) · PK vs FK reasoning (Challenge) |
| complete a CREATE script with data types | S4 build the table | activity: **order** the plan steps (shared) · **fill-blank** the key data type (Support) |
| write SELECT to interrogate | S5 interrogate | activity: **Parsons** the 3-table SELECT (shared) · SELECT >6 sessions as **code** (Core) |
| write UPDATE/DELETE to maintain | S6 maintain | activity: UPDATE Ducklings→Dippers + SELECT proof as **code** (Challenge) |

Media: swim-database schema, tblCourses screenshot, swimmer photo (starter hook).

## §7a alignment — Lesson 5: Swim challenge (part 2) + end-of-unit assessment

| Objective | Slide(s) | Worksheet (Q / level) |
|---|---|---|
| read an SQL query and predict what it changes | S2 read-the-query | starter: predict a DELETE (shared) · **matching** query-word↔action (Support) · predict an UPDATE (Core) · DELETE…BETWEEN reasoning (Challenge) |
| finish and test the swim database | S3 finish | quiz: show-your-work screenshot of a tested query |
| answer exam-style questions on databases and SQL | S4 assessment | **end-of-unit quiz** (the folded summative): Q1 PK **choice**, Q2 justify (text), Q3/Q4 data-type **choice**, Q5 flat-file problem (text), Q6 query output (text), Q7–Q10 SELECT/INSERT/UPDATE/DELETE as **code** |

The quiz is a **shared** assessment (no S/C/C — everyone sits the same exam), per "fold the summative into a
final quiz". The L5 **starter** carries the S/C/C differentiation for the lesson.

---

## Image-gap log (also relevant to docs/WORKSHEET_QUESTION_TYPES.md §4)

| Lesson | Where | What image is wanted | Source had one? |
|---|---|---|---|
| L4/L5 swim | starter (key identification) | a CLEAN single ER diagram with PK/FK clearly marked and well-spaced rows, suitable for a **label-a-diagram** widget | ⚠️ source schema has 3 tables with tightly-packed rows — not clean enough for reliable label zones, so used **card-sort** for PK/FK instead. A purpose-drawn key diagram would unlock a label task. |
| L3 insert/update/delete | starter / S3 | a data-types reference visual (INTEGER/TEXT/REAL with examples) | ⚠️ source A0 is a text table — rendered the types as slide bullets + a card-sort; a small graphic would help |
| L2 SQL searches | S6 ORDER BY | a small ASC-vs-DESC before/after visual | ⚠️ none in source — taught with bullets |

**Embedded media count:** 11 images + 3 videos. Strong image coverage overall (real DB Browser screenshots,
relational schemas, an operators table, a key-terms table for the label task). The three lesson videos
(DB Browser demo, two live-coding demos) are large `.webm` files (~50 MB total) — flagged for git-LFS per
`app/seed-content/lessons/README.md` when LFS lands.

## Wanted-but-unbuilt question types

**None.** Every question type a lesson wanted is live in the engine: order, card-sort, label-a-diagram,
Parsons, code, fill-in-the-blank, multi-select, matching, multiple-choice, screenshot. No backlog additions
needed (WORKSHEET_QUESTION_TYPES.md §2 remains empty).
