# Conversion notes — Y9 Representations: going audiovisual (Teach Computing — adapted)

Slug: `y9-representations-audiovisual-teach-computing-adapted` · Course: Computing Curriculum (KS3) · 6 lessons.
Source: `TeachComputing/KS3/year_9/unit_4` (L1–L6 zips + Unit guide v1.2 + Summative + answers).

Self-verify: PASS — every worksheet renders with a screenshot (image) field + checklist; Support/Core/Challenge
content differs at every level; all 12 decks parse (≥7 slides each) with teacher notes; all `{{res:}}`
placeholders resolve to manifest `file`s; all slides resource titles end `.md`. Only supported question types
used; no single-radio multi-correct (the L4 "words about sound" multi-correct uses multi-select `[ ]`).

Question-type variety used: multiple-choice, multi-select, matching, fill-in-the-blank `[[ ]]`, **order**
(L3/L4/L5), **card-sort** (L3/L4/L6), **label-a-diagram** (L1 mosaic), **slider/scale** (L6 plenary),
calculation-practice tables (L1/L2/L5/L6), screenshot + checklist on every activity. Numeric answers are
text/`[[ ]]` cells (engine has no dedicated numeric-input widget — standard practice, not a gap).

## §7a alignment — objective → slide(s) → worksheet Q/level

### L1 Binary mosaic
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| image made of pixels | S3 mosaic, S4 zoom | starter label (pixel/row/column); starter Support choice; activity Predict |
| resolution = no. of pixels | S5 concept map | activity matching (resolution); Support choice |
| colour depth = bits per pixel | S5 | activity matching (colour depth) |
| count bits in a small image | S6 worked (9×10×3=270) | activity Core blanks (4×3=12 px, 12 bits), Challenge 9×10×3, calc-practice table |

### L2 A splash of colour
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| colour from R+G+B light | S2 mixing light | activity Predict (red+green=yellow); Support RGB choice |
| RGB = 8+8+8 = 24 bits | S3 | activity Support (24 bits), Core blank (8+8+8) |
| calculate image size | S4 worked (800×600×24) | activity calc-practice table (px, bits, ÷8) |
| trade-off size vs quality | S5 kingfisher | activity Challenge (fast website) |

### L3 Collage
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| edit a picture with software | S4 steps | activity order (edit steps); Support save/export; Show-your-work screenshot |
| editing = arithmetic on numbers | S3 GIMP | starter choice; activity Challenge |
| creative benefit | S5 | activity card-sort (Creative benefit) |
| ethical drawback | S5 | activity card-sort (Ethical drawback) |

### L4 Good vibrations
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| sound is a wave | S2 waveform + tone | starter multi-select (wave/vibration/loud); Support choice |
| microphone vs speaker | S3 speaker | activity card-sort (mic captures / speaker plays); Support choice |
| sample/sampling rate/sample size | S4–S5 concept map | activity matching (3 terms); Core blank (sample) |
| sound stored as bits | S5, S6 explore | activity order (digitisation steps); Core/Challenge |

### L5 Sonic playground
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| calculate sound size | S2 formula, S3 worked | activity order (build formula) + calc-practice table |
| sampling rate → size/quality | S4 trade-off | Support choice; Core (higher rate → quality) |
| sample size → size/quality | S4 | Core blank (longer = bigger); Challenge (stereo channels) |
| edit a sound (Audacity) | S5 your turn | Show-your-work screenshot; checklist |

### L6 Always another way
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| pixels/samples not the only way | S2 quiz, S3 another language | starter recap choices; activity card-sort |
| vector & MIDI = instructions | S3 (MIDI hook) | activity card-sort (instructions); Predict |
| define compression | S4 kingfisher | activity blank (compression) |
| why compression is needed | S4 | activity numeric (~20× smaller), Core/Challenge; plenary slider |

## Image gaps (logged — source had no clean raster)
| Lesson / where | Image wanted | Source had one? |
|---|---|---|
| L4 activity — a label-a-diagram of sampling | a clean diagram with discrete **sample points/bars** on a wave (to drag-label sample / interval) | ⚠️ source had only a continuous waveform + the PCM concept map; used **order + card-sort** instead and embedded the waveform + speaker + concept map |
| L2 slides — RGB mixing | a clean **additive red/green/blue light Venn** (overlaps → yellow/cyan/magenta/white) | ⚠️ deck had the coloured-pencils "rows×cols×colour depth" diagram (used) + a paint photo; no clean additive-light Venn |
| L6 slides — vector vs bitmap | a still showing **SVG text ↔ rendered emoji** side by side | ⚠️ source shows it as live PPT text; embedded the kingfisher (compression) + chopin MIDI clip instead |

No wanted-but-unbuilt question types — the four newer types (order, card-sort, label, slider) plus
matching/multi-select/fill-in covered all demand. WORKSHEET_QUESTION_TYPES.md §2 backlog unchanged.

## Media embedded (all OGL v3.0, © Raspberry Pi Foundation)
L1: colourful bird (hook), binary-mosaic street art (label target), pixel-zoom photo, bitmap concept map.
L2: resolution/colour-depth diagram, kingfisher. L3: 4-way manipulation comparison, GIMP logo.
L4: waveform, speaker, PCM concept map, **pure-tone .wav** (teacher-played hook). L5: Audacity logo, waveform.
L6: kingfisher, **chopin MIDI .mp4** (teacher-played MIDI-vs-sampled hook). No instructional videos existed in
the source (unit uses external vimeo/youtube links); the .wav and MIDI .mp4 are the only playable source media.
