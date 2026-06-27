# Phase 16 — The next feature wave: a progression model (Stages & strands) + the homework loop

> **Status (2026-06-27): planned; core design confirmed by the teacher.** With [Phase 15](PHASE_15_PLAN.md)
> settling the existing surface, Phase 16 builds the two highest-value requested features. **16A — Stages &
> strands** is a new per-pupil progression model the teacher explicitly asked for (captured in
> [NEXT_STEPS.md](NEXT_STEPS.md)); the three schema-deciding questions are now **answered** (see *Confirmed
> design* below). **16B — Homework as data** closes the "set → chase → mark" loop from pieces already built
> (Wave 9.1 in [FUTURE_WAVES.md](FUTURE_WAVES.md)). 16B is the lower-risk half and can ship first.

**Standing constraints** (unchanged): single-teacher; **no pupil name to any AI service**; safeguarding
content withheld from AI; per-class context cohort-level prose; inputs in `context[]` not `system`;
`routes → services (pure) → repos`; server-rendered HTML + vendored HTMX; **tests never call the real AI**.
Both features hold **per-pupil** data, so each gets a DPIA delta and (where pupil-facing) sits behind the
existing pupil-access gate. Each slice ends with the suite green.

---

## 16A — Stages & strands (a progression model)

### The teacher's words

> "*Stages* are descriptions of skills and knowledge that the pupils are working towards. They need to be
> ticked off when I have evidence that the pupils meet **all** the criteria for that stage. Each stage has
> the same several **strands** as well."

### Confirmed design (teacher answers, 2026-06-27)

- **Multiple coexisting progression *schemes*, selected per group/course — not one whole-school ladder.**
  Three shapes in play:
  - A **primary→Y11 ladder** (Year 1 … Year 11) — the long spine, used by the non-GCSE classes that follow it.
  - A **GCSE scheme** that re-expresses the OCR J277 specification as **GCSE-grade equivalents**, in **two
    strands — Programming (Paper 2) and Theory (Paper 1)**.
  - **Post-16 / other KS4** courses each follow **their own course + qualification** scheme.
  So a *scheme* owns its own **strand set** and its own **stage labels** (year numbers, or grades, or
  qualification units), and a **group_course is assigned a scheme**. The strand set is fixed *within a
  scheme*, not globally.
- **Strands advance independently, with an overall roll-up.** A pupil has a **current stage per strand**;
  an **overall** figure is an average/roll-up across strands. The roll-up is intended to be anchored by an
  **end-of-academic-year overall assessment** (so "overall stage" can be both *computed from strands* and
  *confirmed by a year-end paper*).
- **Evidence is auto-suggested from marks (teacher-confirmed).** Marking a worksheet/assessment **suggests**
  "this is evidence for *Stage/Grade · Strand*" from the spec-point results already produced; the teacher
  confirms. Manual ticks remain available as the fallback. (Confirm-before-commit, never auto-applied.)

### Schema implication

`progression_schemes` (id, name, kind = `year_ladder` | `gcse_grades` | `qualification`) → `strands`
(scheme_id, name, e.g. *Programming(Paper 2)*, *Theory(Paper 1)*) → `stages` (scheme_id, ordinal, label,
e.g. *Year 7* / *Grade 4*) → `stage_criteria` (stage_id, strand_id, descriptor). `group_course_scheme`
binds a class to a scheme. `pupil_criteria_evidence` (pupil_id, criterion_id, ticked_at, **source** →
nullable pointer to the mark/attempt that suggested it; PII). A pupil's per-strand current stage and the
overall roll-up are **computed** (pure), with an optional `pupil_year_assessment` to anchor the year-end
overall.

### Build order (each tested)

- **16A.1 — Schema + pure roll-up *(M)*.** The migrations above. A **pure** `services/progression.ts`:
  `currentStagePerStrand(evidence, criteria)` (a stage is reached for a strand when its criteria for that
  stage are all ticked) **and** `overallRollUp(perStrand, yearAssessment?)` (average across strands,
  year-end paper can override/confirm). Fully unit-tested, including the GCSE two-strand scheme and the
  long year-ladder. No AI.
- **16A.2 — Schemes & stages editor *(M)*.** A teacher screen to create/select a **scheme**, define its
  **strands** and the per-stage, per-strand **descriptors** (a Stage × Strand grid). Seed the three known
  schemes (year-ladder, GCSE grades × 2 strands, plus a blank for Post-16). Assign a scheme to a
  group_course. `paths.ts` builders (+ oracle) and `/ui-gallery` fixtures.
- **16A.3 — Per-pupil progression view + class heat-map *(M)*.** A per-pupil ladder (per-strand current
  stage + overall) and a class **Stage × Strand heat-map**, scheme-aware (grades for GCSE classes, years
  for the ladder). Surfaces under the existing Pupils cohort screen; respects the pupil privacy banner.
- **16A.4 — Auto-suggested evidence from marking *(M; in scope)*.** On the **marking modal** and the
  **assessment results**, surface a "✓ evidence for *Stage/Grade · Strand*" suggestion derived from the
  spec-point results already computed, mapped to the class's scheme; the teacher confirms to write a
  `pupil_criteria_evidence` row with `source` set. Never auto-applied. The mapping (spec-point → criterion)
  is itself teacher-editable.
- **16A.5 — Year-end overall assessment hook *(S)*.** Let the end-of-year **overall assessment** (an
  existing assessment marked as the year-end overall for a group_course) feed `overallRollUp` as the anchor.
  Reuses the assessment subsystem — no new AI path.
- **16A.6 — DPIA delta + privacy tests *(S)*.** A new pupil-data category (progression evidence) → a DPIA
  update and retention/erasure coverage (the Phase-10 erasure path must clear evidence + year-assessment
  rows). The auto-suggest in 16A.4 reads **already-computed, in-app** spec-point results — it sends nothing
  new to AI; assert no pupil name reaches any AI call from the progression paths.

---

## 16B — Homework as data (set · chase · mark) *(M; can ship before 16A)*

Closes the loop "set + chase + mark homework" from pieces already built — the pupil worksheet surface
(`pupilWork`), tasks with `before_next_lesson` due-rules, and the auto-/AI-marking pipeline.

- **16B.1 — Assign a worksheet as homework *(M)*.** Extend the existing assignment shape with a `homework`
  flag + a **due date** (reuse the assessment availability-window / `validateWindow` pattern rather than a
  new mechanism). Pupils see it in their list behind the pupil gate; the answer key never reaches them
  (same projection discipline as the assessment take-flow).
- **16B.2 — Chase + mark on submit *(M)*.** Objective parts **auto-mark on submit** (instant, free);
  open answers flow to the **same** anonymous, redacted, slot-lettered AI-marking queue as assessments
  (no new AI path). A "not-yet-submitted" chase list surfaces on the teacher's Now/Tasks surface from the
  due-rule the clock already resolves.
- **16B.3 — Results feed the loops *(S)*.** Homework marks feed the existing adapt loop and (if 16A ships)
  can be a progression-evidence source. Pupil-facing results stay ticks-only by default, released by the
  teacher — identical to the assessment release control.

---

## Sequencing & risk

Either half can go first; the Stages design is now settled, so the choice is about appetite. **16B** is
lower-risk and reuses shipped machinery almost entirely (assignment window + the marking queue + release
control), so it lands fast — a good warm-up. **16A** is the bigger, more-requested build: do **16A.1
(schema + pure roll-up)** before any UI (the per-strand-with-roll-up and multi-scheme shape drive every
column), then the editor (16A.2) before the views (16A.3), then wire auto-suggested evidence (16A.4) once
there are marks to suggest from, and the year-end anchor (16A.5) last. Both features add a **per-pupil data
category**, so neither ships without its DPIA delta and erasure coverage (16A.6 / mirror for 16B).

## Out of scope (stays backlog / parked)

The class risk board (Wave 8.1), where-my-time-goes (8.2), parents'-evening prep (8.3 — needs its own
privacy design pass), richer worksheet block types (9.3), the swappable-themes stretch, the idea-4 reviewer
tail, and multi-provider LLM all remain in [FUTURE_WAVES.md](FUTURE_WAVES.md) / [MORE_IDEAS.md](MORE_IDEAS.md).
The multi-teacher v2 rearchitecture stays unnumbered and parked.
