# Computing progression — descriptors MISSING from the school's cut-down stages

> **⚠️ Read [LEVEL_SYSTEM_FULL_PROGRESSION.md](LEVEL_SYSTEM_FULL_PROGRESSION.md) first.** This document only
> diffs the **high-level National Curriculum statements** (≈25 of them) and so finds just a handful of
> gaps — it understates how cut-down the school version is. The full **Teach Computing** curriculum has
> ~36 learning objectives and ~108 "I can…" success criteria **per year**, all laid out by stage and
> strand in that companion document. Use this one only for the NC-statement-level view; use the full
> progression doc for the real fine detail. (Note the two use a **different stage→year mapping** — see
> each doc's table.)

> **Purpose.** The school marking system's *ICT Stages 1–14* are a **cut-down** version of the original
> National Curriculum Computing programmes of study (the version you found hard to keep track of). This
> document lists, **per stage**, the descriptors that were dropped — so they can be added back into the
> [Stages & strands](PHASE_16_PLAN.md) level system, where they should be easier to track.
>
> **Sources** (all in `docs/TeachComputing_docs/`): the **National Curriculum Computing programmes of
> study** (`National curriculum comp.pdf`, © Crown copyright, OGL v3.0) as surfaced in the **Teach
> Computing Curriculum Maps** (KS1/KS2/KS3/KS4 `.xlsx`, Raspberry Pi Foundation / NCCE). Compared against
> [LEVEL_SYSTEM_STAGE_DESCRIPTORS.md](LEVEL_SYSTEM_STAGE_DESCRIPTORS.md) (the cleaned school set, 120
> descriptors). No pupil data involved.

## How "Stage" lines up with age (the mapping used here)

You asked for **Stage ≈ age expectation**. The school's 14 stages line up with the NC key stages like this:

| School stages | Key stage | Years | Ages | NC statements |
|---|---|---|---|---|
| Stages 1–5 | (EYFS / early years) | Nursery–Reception | 0–5 | *none — below the NC computing PoS* |
| **Stages 6–8** | **Key Stage 1** | Years 1–2 | 5–7 | NC 1.1–1.6 |
| **Stages 9–11** | **Key Stage 2** | Years 3–6 | 7–11 | NC 2.1–2.7 |
| **Stages 12–14** | **Key Stage 3** | Years 7–9 | 11–14 | NC 3.1–3.9 |
| *(no stages yet)* | **Key Stage 4 / GCSE** | Years 10–11 | 14–16 | NC 4.1–4.3 |

The NC defines its statements at the **key-stage** grain; the school already spreads each key stage's
statements across its three stages (e.g. KS1's six statements sit across Stages 6, 7, 8). So "missing for a
stage" means a NC clause that is absent from that stage **and** from the school set as a whole, placed at
the stage where it best fits the year-by-year progression (the NCCE strands advance one step per year).

---

## The headline

The cut-down was lighter than expected — most NC clauses survive (reworded). The **genuine gaps** are:

- **KS2:** decomposition is missing entirely.
- **KS3:** four detail clauses are missing (the *sorting/searching* algorithm examples, the explicit
  *two-or-more programming languages*, *binary addition*, and *binary↔decimal conversion*).
- **KS4 / GCSE:** the whole band has **no stages** — three NC statements unrepresented. (Your GCSE group is
  handled by the separate OCR-J277 grade scheme — see the note at the end — so this may be intentional.)

Per band: **KS1 0 missing · KS2 1 missing · KS3 4 missing · KS4 3 (whole band absent).**

---

## Missing descriptors, by stage

### Key Stage 1 — Stages 6, 7, 8  *(ages 5–7)*
**Nothing missing.** Every clause of NC 1.1–1.6 is already covered across Stages 6–8 (algorithms, create &
debug simple programs, predict program behaviour, create/organise/store/manipulate/retrieve content,
common uses of IT beyond school, using technology safely & respectfully, keeping information private,
where to get help).

### Key Stage 2 — Stages 9, 10, 11  *(ages 7–11)*

| Add to | Missing descriptor (pupil-facing) | From | Why it's missing |
|---|---|---|---|
| **Stage 10** | *Solve a problem by breaking it down (decomposing it) into smaller parts.* | NC 2.1 | **Decomposition is absent from the entire school set.** Stage 10 is the KS2 program-design stage (design/debug programs, control physical systems), so the problem-solving/decomposition skill belongs there. |

*(Everything else in NC 2.2–2.7 — sequence/selection/repetition, variables, input/output, logical
reasoning on algorithms & programs, computer networks/WWW/communication/collaboration, search
effectiveness/ranking/discernment, select-use-combine software across devices, collect/analyse/evaluate/
present data — is already covered across Stages 9–11.)*

### Key Stage 3 — Stages 12, 13, 14  *(ages 11–14)*

| Add to | Missing descriptor (pupil-facing) | From | Why it's missing |
|---|---|---|---|
| **Stage 12** | *Convert numbers between binary and decimal.* | NC 3.4 | Binary↔decimal conversion (a named NC example) is absent. Stage 12 owns *"Understand how numbers can be represented in binary,"* so conversion fits the representation stage and underpins the Stage 13 binary operations. |
| **Stage 13** | *Describe several key algorithms that reflect computational thinking, including **sorting and searching** algorithms.* | NC 3.2 | The school has the parent statement (Stage 13) but omits the NC's named exemplars; *sorting & searching* are the canonical examples and appear nowhere. |
| **Stage 13** | *Use **two or more** programming languages, at least one of which is textual, to solve computational problems.* | NC 3.3 | The school has *"Use a programming language…"* (Stage 12) and *"use at least one additional programming language (textual)"* (Stage 13), but not the explicit NC framing of using **two or more** languages (one textual). |
| **Stage 13** | *Carry out **binary addition**.* | NC 3.4 | The school has *"Be able to carry out simple operations on binary numbers"* (Stage 13) but the NC's named example, **binary addition**, is not stated. |

*(All of NC 3.1, 3.5, 3.6, 3.7, 3.8, 3.9 and the remainder of 3.2–3.4 are covered across Stages 12–14:
computational abstractions modelling state & behaviour of real-world problems and physical systems; Boolean
logic & its uses in circuits and programming; binary representation; hardware/software components and how
they communicate; how instructions are stored & executed; representing & manipulating text/sounds/pictures
as binary; creative projects combining multiple applications across devices, collecting & analysing data,
meeting known users' needs; create/re-use/revise/re-purpose artefacts with attention to trustworthiness,
design & usability; using technology safely/respectfully/responsibly/securely, protecting online identity
& privacy, recognising inappropriate content/contact/conduct, reporting concerns.)*

### Key Stage 4 / GCSE — *no school stages currently*  *(ages 14–16)*

The whole KS4 band is unrepresented in the 14 stages. The three NC KS4 statements:

| Missing descriptor | From |
|---|---|
| *Develop capability, creativity and knowledge in computer science, digital media and information technology.* | NC 4.1 |
| *Develop and apply analytic, problem-solving, design, and computational-thinking skills.* | NC 4.2 |
| *Understand how changes in technology affect safety, including new ways to protect online privacy and identity, and how to identify and report a range of concerns.* | NC 4.3 |

> **Likely intentional:** KS4 statutory content is deliberately broad ("study aspects … at sufficient
> depth"), and your **GCSE group is tracked by the separate OCR-J277 grade scheme** (two strands —
> Programming/Paper 2 and Theory/Paper 1; see [PHASE_16_PLAN.md](PHASE_16_PLAN.md)). So you probably do
> **not** want these three as year-ladder stages — they're recorded here only for completeness.

---

## Appendix — NC "[for example, …]" exemplars (optional finer-grain criteria)

The NC wraps several skills with bracketed examples. The school version dropped them, and your *Stages &
strands* model can track at this finer grain if you want (this is the "easier to keep track of" win). These
are **not** extra requirements — they're concrete examples of skills already in the stages — so add them as
**optional sub-criteria** only if you want that detail:

- **Stage 12 — Boolean logic** *(NC 3.4)*: e.g. **AND, OR and NOT**. *(parent: "Understand simple Boolean logic" — already present)*
- **Stage 13 — data structures** *(NC 3.3)*: e.g. **lists, tables or arrays**. *(parent: "Make use of appropriate data structures" — already present)*
- **Stage 13 — key algorithms** *(NC 3.2)*: e.g. **sorting and searching** *(promoted to a full missing descriptor above, as it was wholly absent)*.
- **Stage 13 — binary operations** *(NC 3.4)*: e.g. **binary addition** and **binary↔decimal conversion** *(both promoted to full missing descriptors above)*.

---

## Suggested net change to the level system

Adding the above to the year-ladder scheme:

- **Stage 10:** +1 (decomposition) → 18 descriptors
- **Stage 12:** +1 (binary↔decimal conversion) → 21 descriptors
- **Stage 13:** +3 (sorting/searching, two-or-more languages, binary addition) → 24 descriptors
- **(KS4/GCSE: leave to the OCR scheme — no change to the ladder.)**

Total: **+5 descriptors** across the year-ladder (120 → 125), plus up to **2 optional exemplar sub-criteria**
(Boolean AND/OR/NOT; data-structure lists/tables/arrays) if you choose to track that grain.
