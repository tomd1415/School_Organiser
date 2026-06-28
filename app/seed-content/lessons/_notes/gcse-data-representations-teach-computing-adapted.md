# Conversion notes — GCSE Data representations (Teach Computing → adapted), part 1

Bundle: `gcse-data-representations-teach-computing-adapted__pt1`
Course: OCR J277 GCSE Computer Science · KS4. Source: TCC GCSE **unit_8** lessons **L1–L9** (this is "part 1";
L10–L18 — bitmaps, sound, storage, compression, RLE, Huffman, summative — are part 2). 9 lessons converted:
what is representation, number bases, binary addition, binary subtraction, binary shifts, signed integers,
hexadecimal, representing text (ASCII), Unicode + file size.

Self-verify (no DB; renderers run directly on the bundle markdown): **PASS (0 failures)**. Every activity
worksheet renders a `kind==='image'` screenshot field + a ✅ checklist; level slicing differs support↔challenge
on every sheet; all decks parse (7–8 slides each) with teacher notes; all slide resource titles end `.md`;
every `{{res:…}}` placeholder resolves to a manifest `file`; no orphan files; all 7 PNGs are valid.
Question-type variety used: **fill-in-the-blank** (L1, L2, L3, L4, L5, L7, L8, L9 — the conversion/calc
gaps, as prose blocks so they render as real blanks, not table text), **label-a-diagram** (L2 place-value
grid), **order/sequence** (L3 column-add steps, L4 borrowing steps, L6 two's-complement steps, L7 nibble
method), **card-sort** (L1 data/instruction, L2 digits-by-base, L5 overflow/underflow, L7 facts-by-base),
**matching** (L1 key words, L6 the two methods), **single-choice** (correct option authored FIRST throughout),
short-text/code-free working, screenshot + ✅ checklist on every activity. Multi-select not needed; no new
unbuilt type surfaced (interactive trace-table §2.7 is not relevant to this arithmetic unit). **No source
videos exist** in any of the L1–L9 zips (checked — docx/pptx/jpg only; the L5 Ariane-5 clip is an external
link, so it is told as a teacher story, not embedded — keeps the room low-arousal).

## Numbers double-checked by hand
Binary↔decimal: 101=5, 110=6, 1001=9, 1010=10, 1111=15; 10110100=180; 68=01000100; 10110=22.
Add: 100+1=101, 110+11=1001, 1010+1111=11001, 10+11+1=110, 111+111+111=10101.
Subtract: 110-10=100, 111-100=11, 1111-101=1010, 1110-1101=1, 1100-1001=11, 10000-1=1111.
Shifts: 101×100=10100 (5×4=20), 1101×100=110100 (13×4=52), 11000÷100=110 (24÷4=6), 1010÷10=101, 101÷100=1 (trunc).
Signed: sign&mag 1010=-2, 10110000=-48; two's-comp 1010=-6, 10110000=-80; -4→1100, -5→1011.
Hex: A1=161, B3=179, 9D=157; 11→B, 255→FF; A2=1010 0010=162. 2^n: 7→128, 8→256, 12→4096.
File size (20 chars): ASCII 20 B, 16-bit 40 B, 32-bit 80 B.

## §7a alignment tables (objective → slide(s) → worksheet Q/level)

### L1 What is representation?
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| give an example of a representation | "Starter — one thing standing for another" | starter (why writing mattered); Support tick |
| computers represent all data/instructions in binary | "Data and instructions", "Two states" | activity key-words match + card-sort recipe |
| binary relates to two-state on/off | "Two states: on and off" | activity Support (1=on, 0=off) |
| how many things a group of switches can represent | "More switches, more things" | activity fill-blank (1→2, 2→4, 3→8); Core 4 combos; Challenge 2^10 |

### L2 Number bases
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| difference between base-2 and base-10 | "Base-10 and base-2" | starter Support (digits each base uses); card-sort digits |
| read the place values | "The place-value grid" | activity **label-a-diagram** (drag 128…1) |
| convert binary to decimal | "Binary → decimal" | activity fill-blank (110, 1001, 1111); Support 101=5 |
| convert decimal to binary | "Decimal → binary" | Core convert 10; Challenge 10110100→180, 68→01000100 |

### L3 Binary addition
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| count up in binary | "Starter — decimal to binary" | starter (count 0–5); Support 5=101 |
| the four golden rules | "The four golden rules" | activity fill-blank the 4 rules; Support 1+1=10 |
| add two binary numbers | "Add a column at a time" | activity **order** the column steps; Core 100+1, 110+11, 1010+1111 |
| add three binary numbers | "Your turn" | Challenge 10+11+1, 111+111+111 |

### L4 Binary subtraction
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| the rules of binary subtraction | "The rules" | activity fill-blank the 4 rules; Support 1-0 |
| subtract without borrowing | "Borrowing" intro / Core | Core 110-10, 111-100, 1111-101 |
| borrow from the next column | "Borrowing" (we do) | activity **order** the borrow steps; worked 1110-1101 |
| borrow from further away | "Your turn" | Challenge 1110-1101, 1100-1001, 10000-1 |

### L5 Binary shifts
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| shift left to multiply | "Left shift = multiply" | activity fill-blank (×2, ×4); Core 1101×100 |
| shift right to divide | "Right shift = divide" | Core 11000÷100, 1010÷10; Challenge 101÷100=1 (trunc) |
| how an overflow error happens | "Overflow and underflow" | **card-sort** overflow/underflow; Support tick overflow |
| how underflow happens | "Overflow and underflow" | Challenge explain underflow (truncation) |

### L6 Signed binary integers
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| signed vs unsigned | "Signed and unsigned" | starter (unsigned=positive); Support |
| find MSB and LSB | "Signed and unsigned" | starter Support (MSB left, LSB right) |
| use sign and magnitude | "Sign and magnitude" | activity **match** the methods; Core 10110000=-48 |
| use two's complement | "Two's complement" | activity **order** the 3 steps; Core 10110000=-80; Challenge -4, -5 |

### L7 Hexadecimal
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| why and where hex is used | "Where you see it" (MAC + dump images) | activity **card-sort** facts-by-base; Support base-16 |
| convert hex ↔ decimal | "What is hexadecimal?" | fill-blank A/C/F; Core A1=161, B3=179, 11→B |
| convert hex ↔ binary (nibbles) | "The nibble method" | **order** the nibble steps; worked A2=162 |
| use the nibble method (fast) | "The nibble method" | Challenge 9D=157, 255→FF |

### L8 Representing text
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| how many things n bits represent | "Counting combinations" | activity fill-blank (1,3,7,8 bits); Support 2^n |
| character set + how ASCII works | "What is a character set?" (ASCII image) | starter; Core find D's code |
| a limitation of ASCII | "7 bits then 8 bits" | Challenge (English only) |
| encode/decode with ASCII | "Your turn" | activity decode 01000011 01000001 01010100 = CAT |

### L9 Unicode and file size
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| why Unicode is needed | "Why Unicode?" (emoji image) | starter; Support more bits per char |
| Unicode matches ASCII for first 128 | "Why Unicode?" | starter Challenge (backwards compatibility) |
| calculate file size in ASCII | "Calculating file size" | fill-blank bytes/char; Core 20 chars = 20 B |
| calculate file size in Unicode | "Calculating file size" | Core 16-bit 40 B, 32-bit 80 B; Challenge trade-off |

## Embedded images (7)
All from the source decks/handouts except the place-value grid, which I **drew** clean (8 empty header boxes
to label + the binary number 10110100) with `@napi-rs/canvas` because the source place-value tables are PPT
shapes/tables, not rasterisable. Files: L1 calculator (data/instructions); L2 place-value grid (drawn, for the
label task) + transistor-on-a-hair (scale hook); L7 MAC-address + hex-dump (real-world hex); L8 ASCII
character-set table (essential for the decode task); L9 emoji (why Unicode). Attribution in the manifest:
"Teach Computing Curriculum © Raspberry Pi Foundation, OGL v3.0." (the drawn grid notes it is adapted).

## Image gaps (lesson / where / wanted / source had one?)
| Lesson | Where | Image wanted | Source had one? |
|---|---|---|---|
| L2/L3/L4/L5/L6/L7 | place-value working slides | clean place-value grids for each worked example | ⚠️ source grids are PPT shapes (not rasterisable); **drew one clean grid** for L2's label, reused conceptually |
| L9 escape room | the "you do" | the LunarFlights server-room scene images (laptop, chessboard, telephone, server racks) | ⚠️ exist as separate jpgs but the activity needs the live Unicode Code Charts website + group play; **reframed** L9's core to file-size calc + Unicode concept; the escape room is an optional teacher extension |

## Activities deliberately reframed
- **L9 escape room** → kept as an optional teacher extension (needs the Unicode website and is a 30-min group
  puzzle); the converted lesson's measured tasks are the Unicode rationale + file-size calculations, which carry
  the three lesson objectives. The four-digit answer (9934) is in the source solutions if the teacher runs it.
- **L1 cake-recipe data/instructions** → a card-sort (Data / Instruction) instead of free annotation.

No shared docs edited (WORKSHEET_QUESTION_TYPES.md §1–4, LESSON_CONVERSION_GUIDE.md) — image gaps and the
"no new type gap" finding are logged here per the recent batch convention. **No DB touched** — bundle files only.
# Conversion notes — GCSE Data representations (Teach Computing — adapted) · PART 2

Bundle: `app/seed-content/lessons/gcse-data-representations-teach-computing-adapted__pt2/`
Source: `TeachComputing/TeachComputing/GCSE/unit_8` (Unit guide v1.2 + lesson zips L10–L18).
Target course: **OCR J277 GCSE Computer Science** · **KS4**. Unit title: *GCSE Data representations (Teach Computing — adapted)*.

This is **part 2 of 2** — lessons **L10–L18** (file size, media, storage, compression). Part 1 (L1–L9:
number bases, binary arithmetic, text) is a separate bundle. L18 (the unit summative) is folded into an
**end-of-unit quiz** covering the part-2 topics only. 9 manifest lessons, in source order. File names keep the
original lesson numbers (l10…l18).

SEND-adapted to the school default: identical routine, plain literal language, no flashing/sound, chunked
I-do/we-do/you-do, minimal writing (choose/drag/tick/short answer), genuine Support/Core/Challenge on the
**same** task, TA-usable, no individual pupil named. Differentiation lives in the per-lesson **activity**
worksheets; starters are short shared warm-ups (no show-your-work). The quiz is shared (one paper for all).

## Question-type coverage (all engine-supported)
- **label-a-diagram** — L12 activity (the sound-sampling graph: amplitude axis / time axis / wave / sample point).
- **card-sort** — L10 (colour depth → colours), L12 (analogue vs digital), L15 (lossy vs lossless — the strong fit).
- **order/sequence** — L11 (file-size steps), L13 (sound file-size steps), L14 starter (units smallest→largest),
  L16 (RLE steps), L17 (Huffman steps).
- **fill-in-the-blank** `[[ ]]` — across L10/L11/L13/L14/L15/L16/L17 (file-size & conversion facts).
- **matching / single-correct choice** — every lesson (single-radio, one correct option each).
- **multi-select** `[ ]` + **slider** `[scale 1-5]` — L18 quiz (Q16 true statements; confidence).
- **screenshot show-your-work** `📷` — every activity worksheet + the quiz.

Verified through the real render path (`renderWorksheet` at support/core/challenge, `sliceSlidesForLevel`,
`splitTeacherNotes`): all worksheets resolve fields, every activity sheet + quiz has a screenshot field,
every deck has a `#` title, multiple `## ` slides and `> 🧑‍🏫` teacher notes, levels slice. No type gaps —
all demand met by built types.

## §7a Alignment (objective → slide → worksheet question)

**L10 Representing bitmap images**
| Objective | Slide | Worksheet |
|---|---|---|
| what a pixel is | "What is a pixel?" | activity word↔meaning match (Support) |
| colour depth & resolution | "Colour depth", "Image resolution" | colour-depth sort; Core bits→colours fill-in; Challenge ppi calc |
| what metadata is + example | "Metadata" | Core define-metadata; starter recap |

**L11 Bitmap file size** — formula slide → order steps (Support); 8×8×4=32B, 16×16×2=64B (Core); 80×80×1=800B + why-bigger metadata (Challenge); fill-in pixels/depth → size.

**L12 Representing sound** — sampling slide → **label the sampling graph**; analogue/digital sort (Support); term-match + Hz/bits fill-in (Core); why convert + redraw inaccuracy (Challenge).

**L13 Sound file size** — formula slide → order steps (Support); 480,000 / 720,000 bits (Core); 960,000 bits + metadata (Challenge); fill-in rate/resolution/duration → size.

**L14 Measurements of storage** — units slide → starter order + unit↔size match (Support); MB-in-GB / GB-in-TB fill-in + 2GB→MB (Core); A/B/C/D ordering + 1024-vs-1000 (Challenge).

**L15 Lossy & lossless** — two-types slide → **lossy/lossless card-sort**; yes-no facts (Support); fill-in (Core); 2 advantages + why-not-text (Challenge).

**L16 RLE** — how-RLE slide → order steps; RLE multiple-choice (Support); compress 2 rows + binary-bits fill-in (Core); compression ratio 5:1 + compressed size (Challenge).

**L17 Huffman** — read-the-tree slide (MISSISSIPPI: S=0, I=10, M=110, P=111) → read patterns (Support); M-I-S + 88-bit original (Core); 21-bit compressed + 67 saved (Challenge); lossless fill-in.

**L18 Summative → end-of-unit quiz** — 15 single-correct (one per part-2 topic), Q16 multi-select (true
statements about compression), Q17 careers text, confidence slider, show-your-work. Answer key in the manifest
outline.

## Verified numeric answers (for marking)
- Bitmap file size = w × h × depth (bits) ÷ 8 = bytes. 8×8×4=32B · 16×16×2=64B · 80×80×1=800B · 8×8×5=40B.
- Colours: n bits → 2^n. 1→2, 2→4, 3→8, 8→256. 32 colours → 5 bits; 68 colours → 7 bits.
- ppi physical size = pixels ÷ ppi. 300×300 @100 → 3×3 in; 400×400 @100 → 4×4 in.
- Sound file size = rate × resolution × duration(s) (bits). 2-min 1000Hz 4-bit=480,000 · 1-min 2000Hz 6-bit=720,000 · 2-min 2000Hz 4-bit=960,000 · 3-min 1000Hz 2-bit=360,000.
- Storage: 1 GB = 1,000 MB; 1 TB = 1,000 GB; 2 GB = 2,000 MB. Order D,A,C,B (3 nibbles=12b < 14b < 2 bytes=16b < 1 MB).
- RLE: `11 11 11 00 00 00 00 11 11` → decimal `3 11 4 00 2 11`; 3-bit binary `011 11 100 00 010 11`.
  Ratios: 50/5=10:1, 100/20=5:1, 300/50=6:1; compressed: 50@5:1=10MB, 200@5:1=40MB, 300@10:3=90MB.
- Huffman MISSISSIPPI: original 88 bits, compressed 21 bits (S0×4 + I10×4 + M110×1 + P111×2), saving 67.

## Images
Embedded (OGL v3.0, © Raspberry Pi Foundation):
- `l10-colour-depth-original.png` + `l10-colour-depth-1bit.png` — same two-puppies photo at full colour vs 1
  bit per pixel (colour-depth contrast), L10 activity + slides.
- `l12-sampling-wave.png` — clean amplitude(binary)/time graph, used for the **label** task, L12 activity + slides.
- `l12-sound-waveform.png` — audio waveform hook, L12 slides.

### Image-gap log (add to WORKSHEET_QUESTION_TYPES.md §4)
| Lesson | Where | What is wanted | Source had one? |
|---|---|---|---|
| L10 bitmap images | "What is a pixel?" slide / activity | a clean zoomed-in **pixel grid** raster (for a future label-the-pixels task) | ⚠️ source pixel-art / encoding grids are PowerPoint shapes, not extractable rasters |
| L16 RLE | activity | a clean **bitmap encoding grid** (black/white cells) to compress | ⚠️ only activity-sheet text screenshots in source; grids are PPT shapes |
| L17 Huffman | read-the-tree slide / activity | a clean **Huffman tree** diagram (MISSISSIPPI) | ⚠️ tree is a PPT vector shape — not rasterisable; rendered as a code table + order task instead |

Recurring theme (as in the Y7/Y8 batches): TCC diagrams (pixel/encoding grids, Huffman trees) are vector
shapes inside the `.pptx`, so `extractOfficeImages` (raster-only) can't pull them — these need re-drawing.

## Provenance / safety
Nothing from `TeachComputing/` committed except OGL-licensed images re-saved into the bundle (attributed in the
manifest). No DB writes — bundle files only. Throwaway extraction scripts under `app/src/_*.ts` were deleted
after use. Not yet seeded; seed with `npm run seed:lessons -- gcse-data-representations-teach-computing-adapted__pt2`.

---

## Resource-completeness sweep (2026-06-28)

- **Note 1 — L17 Huffman coding (acute gap, RESOLVED).** The lesson's objective is literally "**read a Huffman
  tree**" and references the MISSISSIPPI codes (S=0, I=10, M=110, P=111), but **no tree was shown** — pupils
  couldn't read a tree they couldn't see. Rasterised the complete MISSISSIPPI Huffman tree (source slide 36,
  with frequencies + 0/1 edge labels) and embedded it as `l17-huffman-tree.png` on the "Reading a Huffman tree"
  slide and the activity worksheet. Matches the lesson's codes exactly.
- **Audited, no change (discipline = don't pad):** L16 Run length encoding is taught with **binary text rows**
  (`11 11 11 00 00 00 00` → `3 11 4 00 2 11`), the GCSE exam style, and is self-contained — a pixel-grid image
  would be a nice-to-have but is not an acute gap. The binary calculation lessons (L3–L6, L11, L13–L17) are
  text/calculation based and don't need diagrams to be answerable.

Re-seeded (unit 1530) + verified (file + DB). Huffman tree resolves on slide + worksheet.
