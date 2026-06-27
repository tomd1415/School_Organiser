# Level system (Stages & strands) — document index

The working documents for the Computing **Stages & strands** progression / level system (the feature
planned in [PHASE_16_PLAN.md](PHASE_16_PLAN.md) §16A). Read in this order:

1. **[LEVEL_SYSTEM_STAGE_DESCRIPTORS.md](LEVEL_SYSTEM_STAGE_DESCRIPTORS.md)** — the **school marking
   system's current** ICT Stages 1–14 (the cut-down set, 120 descriptors), cleaned for import and grouped
   by a suggested strand split. *The "what we have now" baseline.*
2. **[LEVEL_SYSTEM_MISSING_DESCRIPTORS.md](LEVEL_SYSTEM_MISSING_DESCRIPTORS.md)** — a diff against the
   **high-level National Curriculum** statements: the handful of NC clauses the school version dropped.
   *Narrow view — superseded by the full progression below for real detail.*
3. **[LEVEL_SYSTEM_FULL_PROGRESSION.md](LEVEL_SYSTEM_FULL_PROGRESSION.md)** — the **full Teach Computing
   curriculum** (≈324 learning objectives + ≈939 "I can…" success criteria), by stage (one stage = one
   year) and strand. *The complete fine-grained content to seed from.*
4. **[LEVEL_SYSTEM_PLANNING_LEVELS.md](LEVEL_SYSTEM_PLANNING_LEVELS.md)** — the same content re-organised
   into the **three planning grains** (🗓 course = stage × strand · 📦 unit · 📝 lesson + criteria), strands
   preserved. *For planning at each level.*
5. **[LEVEL_SYSTEM_DB_DESIGN.md](LEVEL_SYSTEM_DB_DESIGN.md)** — the **database schema** (PostgreSQL DDL +
   relationships + worked queries) to hold all of the above and the per-pupil evidence, extending the
   Phase 16 sketch. *For building it.*

**Sources** live in [TeachComputing_docs/](TeachComputing_docs/) (Teach Computing Curriculum © Raspberry
Pi Foundation; National Curriculum © Crown copyright, OGL v3.0) and the school marking-system CSV export.
No pupil data is reproduced in any of these documents.

**Related build plans:** [PHASE_16_PLAN.md](PHASE_16_PLAN.md) builds the level system itself (schemes,
strands, stages, per-pupil evidence, baseline + stage-anchored assessments); [PHASE_17_PLAN.md](PHASE_17_PLAN.md)
builds the **reference-lesson library** that imports the Teach Computing lesson *files* and links them to the
**objectives / "I can…" criteria** defined here, so designing a lesson can start from real exemplars.

**Key decisions baked in** (from the teacher, 2026-06-27): one **stage = one year** (Stage 6 = Year 1 …
Stage 14 = Year 9; Stages 1–5 = EYFS); **strands advance independently** with a year-end-anchored overall
roll-up; **evidence is auto-suggested from marks** (teacher-confirmed); the **GCSE** group uses a separate
OCR-J277 grade scheme (two strands: Programming/Paper 2, Theory/Paper 1), not this year ladder. The
durable record of these decisions is in [PHASE_16_PLAN.md](PHASE_16_PLAN.md) §16A.
