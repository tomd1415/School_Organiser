# Conversion notes — Y8 Layers of computing systems (Teach Computing — adapted)

Slug: `y8-layers-computing-systems-teach-computing-adapted` · Course: Computing Curriculum (KS3) · 6 lessons.
Source: `TeachComputing/KS3/year_8/unit_2/` (L1–L6 zips + unit guide + summative assessment).

Question-type variety used (the teacher's steer): **card-sort** (L1, L2, L5, L6×2), **label-a-diagram**
(L2 Google Glass), **order/sequence** (L3 fetch–execute, L5 gather→train→test), **matching** (L2, L4),
**fill-in-the-blank** (L2, L4 — with word banks), **multi-select** (L4, L6×2), **single-choice / truth-table
ticks** (all), **slider** (L5, L6 plenaries), **screenshot + checklist** (every activity worksheet).
All single-choice cells are genuinely single-correct (no multi-correct on a radio).

## §7a Alignment tables

### L1 — Get in gear
| Objective ("I can…") | Slide(s) | Worksheet Q / level |
|---|---|---|
| computer = device for running programs | S2 starter, S3 | starter shared choice (modern vs old machine); Support "a computer is a device for…" |
| program = list of instructions on data | S3 | activity Predict idea / Support choice "which is a program?" |
| general-purpose vs purpose-built | S2, S4 | starter Challenge (same/different); activity shared choice (laptop = general-purpose) |
| examples of programs (software) I use | S4, S5 | activity card-sort program vs data; Core "name a program for documents/web"; Challenge program vs data |

### L2 — Under the hood
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| name the main hardware parts | S3 | activity matching (4 parts); label-a-diagram (Google Glass parts) |
| describe what each part does | S3, S4 | activity matching; Support "which part runs instructions?"; Core fill-the-gap (D is for Digital); Challenge memory vs storage |
| all computers have the same parts | S2 starter, S6 | starter Challenge (rover/phone/laptop); card-sort input vs output |

### L3 — Orchestra conductor
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| processor/memory/storage work together | S3, S4 | activity order block; Core "why processor load goes up" |
| put the steps of running a program in order | S4 | activity **order** (storage→memory→fetch→execute→save) |
| what an operating system is / does | S6 | activity Support "an OS is…"; Challenge one-processor-many-programs |
| (system monitor evidence) | S5 | activity Predict (memory goes up) + Show your work (idle reading + screenshot) |

### L4 — It's only logical
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| describe NOT, AND, OR | S3 | activity matching (operator→meaning); starter Core fill-gap AND/OR rules |
| complete a truth table | S4 | activity Support/Core/Challenge true-false tick rows (auto-markable); starter Support "NOT true"; Challenge combined expr |
| hardware built from gates, 1s and 0s | S5 big picture, S6 Boole | activity multi-select (what's true about gates) + adder image; Show your work (CircuitVerse AND-gate) |

### L5 — Thinking machines
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| define AI and machine learning | S2 starter, S3 | starter choice ("artificial"); Support "AI stands for"; Challenge own definition |
| real-world examples of AI/ML | S3 | slides we-do (everyday AI); starter Core synonyms |
| steps to train: gather, train, test | S4 | activity **order** (choose→gather→train→test→retrain); Support "lots of examples" |
| ML different from programming | S5 | activity card-sort programming vs ML; Core "why model gets it wrong"; Challenge fairness; slider plenary |

### L6 — Sharing
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| recall key ideas (unit recap) | S2 | recap worksheet: card-sort hardware/software, multi-select "which are programs", multi-select "what CPU does", Support/Core/Challenge recall |
| share & "remix" code | S3 see-inside, S4 remix | activity choice ("See inside" does…); slides remix note |
| benefit & risk of open source | S5 | activity card-sort benefit vs risk; Support "open source means…"; Core name a program; Challenge see-inside & trust; slider plenary |

## Image gaps (for WORKSHEET_QUESTION_TYPES.md §4)
| Lesson | Where | Image wanted | Source had one? |
|---|---|---|---|
| L1 | starter | the **Antikythera mechanism** specifically (used the Analytical Engine + calculator + Minecraft general-purpose contrast instead) | ⚠️ Antikythera photo only inside the A0 worksheet docx, not the deck; embedded 3 alternative OGL images that make the same point |
| L3 | system-monitor activity | a **still of the system-monitor readout** (processor %, memory) to caption the videos | ⚠️ source has the 5 screen-recordings (videos), no clean annotated still; embedded the Idle + Planetarium videos |
| L4 | starter | a clean **logic-gate symbols** chart (NOT/AND/OR) | ⚠️ deck uses PowerPoint shapes; embedded the adder-circuit raster + Boole doodle instead |
| L5 | "can a machine think?" slide | an **AI/everyday-examples** icon strip | ⚠️ source had decorative photos only (duck, maps); used the Teachable Machine screenshot for the core activity |

## Media included (all OGL v3.0, Teach Computing © Raspberry Pi Foundation)
- Images: L1 analytical-engine, calculator, general-purpose-computer; L2 processor-chip, space-rover, google-glass;
  L3 planetarium-night-sky; L4 logic-circuit-adders, boole-google-doodle; L5 teachable-machine; L6 scratch-see-inside.
- Videos: L3 idle-system-monitor.mp4, planetarium-system-monitor.mp4 (teacher-played, paused on readings);
  L4 turing-tumble-gears.mp4 (teacher-played hook). All flagged in `> 🧑‍🏫` notes as teacher-played, low-arousal.
- **Videos available but omitted for bundle size** (log, not gaps): L3 Streaming.mp4 (9.6MB), Image-editing.mp4
  (8.5MB), Browsing.mp4 (4.1MB) — the Idle + Planetarium pair already demonstrates the system-monitor idea.

## Wanted-but-unbuilt question types
None. All four previously-missing types (order, card-sort, label-a-diagram, slider) are now built and were used
here. No lesson needed a type the engine cannot do.

## Self-verify
Rendered every worksheet (preview, all 3 levels) and every deck. PASS:
- each activity worksheet has a `kind==='image'` screenshot field + `## ✅ I can…` checklist;
- level sections slice correctly (support shows Support, hides Challenge, and vice-versa — confirmed by content,
  not just field counts);
- all slide titles end `.md`; every deck parses to ≥7 slides with non-empty teacher notes;
- every `{{res:…}}` placeholder resolves to a real file in the bundle; no unreferenced/missing media.
(The recap quiz worksheet intentionally has no screenshot — it is a recall quiz, like a starter; the L6 *activity*
worksheet carries the show-your-work + screenshot.)
