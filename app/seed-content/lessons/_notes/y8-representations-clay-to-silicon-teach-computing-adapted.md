# Conversion notes — Y8 Representations: from clay to silicon (Teach Computing — adapted)

Bundle: `app/seed-content/lessons/y8-representations-clay-to-silicon-teach-computing-adapted/`
Source: `TeachComputing/KS3/year_8/unit_4` (6 lesson zips + Unit guide v1.2 + L6 summative assessment Q&A).
Course: Computing Curriculum (KS3). 6 lessons, each: starter worksheet + activity worksheet + slides (+ embedded images).
Self-verify: PASS — every worksheet renders; activity worksheets have a `📷` screenshot field; support/core/challenge slices differ; every deck parses to ≥4 slides with teacher notes; all `{{res:…}}` placeholders resolve to a manifest `file`; all slides resource titles end `.md`.

Question-type variety used (the teacher's explicit steer): single-choice, multi-select, matching, fill-in-the-blank, **order/sequence**, **card-sort**, **slider/scale**, text, screenshot, checklist. No single-radio multi-correct anywhere (the "tick all that apply" items use multi-select `[ ]`).

## §7a Alignment tables

### L1 — Across time and space
| Objective ("I can…") | Slide(s) | Worksheet Q / level |
|---|---|---|
| give examples of representations | S3 (concept map) | starter: "a representation is…" (Support choice); activity Predict |
| store / communicate / process | S4 museum visit | activity: card-sort store/communicate/process (Support); fill-blank "store, communicate, process" (Core) |
| choose the right representation | S5 choosing, S6 meaning | activity: "who decides meaning" (Core), "map vs directions / same symbols, different meaning" (Challenge) |

### L2 — Lights and drums
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| name coding schemes | S2 starter (lake), S3 task | starter: multi-select "which are coding schemes" (Support); "name a scheme" (Core) |
| measure length by counting symbols | S5 length | activity: "how many letters in HELLO" (Core); "why encoding is longer" (Challenge) |
| symbols on physical media | S3 drums, S4 symbol-vs-medium | activity: card-sort Light/Sound/Touch (Core); order encode→transmit→decode (Support) |

### L3 — Binary digits
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| what a bit is (2 symbols) | S3 sets of symbols | starter: "how many symbols" / "tick both bits"; activity fill-blank 26/10/2 (Support) |
| measure a bit sequence | S4 length | starter/activity: "length of 1011" (Support choice) |
| how many sequences (doubling) | S5 doubling | activity: matching bits→sequences (Core), "write all eight 3-bit", "4 instructions / 7-bit ASCII" (Challenge); slider plenary |

### L4 — Numbers in binary
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| place values represent a number | S2 boins, S4 binary place value | starter: multi-select "coins that make 12"; activity fill-blank place values (Support) |
| binary → decimal | S5 | activity: fill-blank 100/110/1011/10010 (Core); birthday-bits (Challenge) |
| decimal → binary | S6 | activity: order the conversion method + "convert 19", "she has 10010 candles" (Challenge) |

### L5 — Large quantities
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| convert bits ↔ bytes | S3 bytes | starter "8 bits in a byte"; activity fill-blank "1 byte = 8 bits" (Support), "12 bytes = 96 bits" (Core) |
| use prefixes kilo/mega/giga/tera | S4 prefixes, S5 convert | starter (Support); activity order units smallest→largest + conversions (Core); "4 MB photos on 16 GB" (Challenge) |
| how bits are physically stored | S6 physical media | activity: card-sort Electricity/Magnetism/Light (Challenge) |

### L6 — Turing's mug (summative quiz + puzzle)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| recall key facts | S2 quiz | quiz: bit/binary-digit/length (Support); store-communicate-process fill-blank + prefix matching (Core); "binary" + "8000 bits" multi-select, "7-bit code" (Challenge) |
| convert binary ↔ decimal | S6 puzzle | quiz: decimal 4 / binary 110 (Core); activity: decode patterns → decimal (Support/Core) |
| apply skills to crack the code | S3–S6 Turing/Bombe + puzzle | activity: patterns→word (Core), lock numbers 9/3/20 → binary (Challenge) + `📷` working |

Model answers for reference (not encoded as auto-mark schemes — same as the Y7 pilot bundles): L4 core 100=4, 110=6, 1011=11, 10010=18, 19=10011; birthday 11001=25th, 1100=December, 10010=18. L5: 12 bytes=96 bits, 1 KB=1000 bytes, 16 GB=16000 MB, 16 GB/4 MB=4000. L6 puzzle: 11001=25 → (Support uses it as worked); 00011=3=C, 00001=1=A, 10100=20=T → CAT; 9=01001, 3=00011, 20=10100.

## Images embedded (all OGL v3.0, © Raspberry Pi Foundation)
- L1: binary-representations concept map (the unit's own concept map — slides + starter).
- L2: "across a lake" photo (starter) + talking drums (activity/slide).
- L3: silicon chip die (the "clay → silicon" why-binary slide).
- L4: boins place-value coins (starter + place-value teaching) + Voyager golden record (optional hook).
- L5: large-quantities image (intro/scale framing).
- L6: Alan Turing portrait + the Bombe (story slides + activity header).

## Image-gap log (for WORKSHEET_QUESTION_TYPES.md §4 — not edited here per the no-shared-file rule)
| Lesson | Where | Image wanted | Source had one? |
|---|---|---|---|
| L4 Numbers in binary | activity place-value section | a **blank** 16-8-4-2-1 binary grid for a **label-a-diagram** (drag the place-value labels onto empty columns) | ⚠️ source only has the boins coins with values already printed on them, so labelling would give the answer away — used fill-in-the-blank place values instead; a clean blank grid would unlock a label-a-diagram question |
| L3 Binary digits | "doubling" slide | a simple side-by-side "1 bit → 2, 2 bits → 4, 3 bits → 8" tree/visual | ⚠️ none clean in source deck; taught via matching question + worked build |
| L6 Turing's mug | puzzle | the 3-bit/5-bit circle patterns and the 7-segment "display" art from the original handout | ⚠️ source art is PowerPoint shapes (not extractable); rewrote patterns inline as ◯/⬤ + binary so the puzzle is self-contained |

## Wanted-but-unbuilt question types
None blocking. All four formerly-backlog types are now BUILT and were used (order, card-sort, slider; label-a-diagram was *applicable* in L4 but skipped only for lack of a suitable blank-grid image — logged above, not a type gap). No question needed a type the engine can't do.

## Other notes
- **No videos** in this unit's source zips (checked every top-level entry and inside every `.pptx` — no mp4/webm/mov/audio), so none attached. (The Y7 pilot's "include source videos" step is N/A here.)
- "Show your work" is adapted for a mostly-unplugged unit: the MakeCode-link field (micro:bit-specific) is dropped; each activity worksheet keeps the required `📷` screenshot cell ("take a photo of your working / sticky note") + a short answer field.
- The L6 quiz worksheet deliberately has **no** screenshot field (it's a recall quiz); the screenshot requirement is met on the L6 **activity** (puzzle) worksheet.
