# Conversion notes — KS2 Y3 Connecting computers (Teach Computing — adapted)

- **Slug:** `ks2-y3-connecting-computers-teach-computing-adapted`
- **Course:** KS2 Computing · **keyStage:** KS2
- **Source:** TeachComputing/KS2/Year_3/Unit 1 connecting computers (Unit guide + L1–L6 zips)
- **Lessons:** 6 (every source lesson converted). Each = starter worksheet + activity worksheet + slides.md + embedded OGL images.
- **Cohort:** primary-level content, SEND secondary pupils — concrete, very low reading load, age-respectful (no infant tone). Heavy use of label / sort / order / multi-select / matching / screenshot.

## Self-verify — PASS
- manifest valid JSON; every `{{res:…}}` resolves to a declared file; no missing files; no unused images.
- every slides resource title ends `.md`; every deck ≥8 slides with non-empty `> 🧑‍🏫` notes.
- every activity worksheet has a screenshot (kind=image) field; support slice ≠ challenge slice.
- drag types parse: L2 starter `label`×4 zones; L2 + L6 `sort`; L4 + L5 `order`; L5 matching grid.

## §7a Alignment — objective → slide → worksheet question

### L1 How does a digital device work?
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| device takes an input | S4 input→process→output | starter (digital-device choices); activity Support "what goes IN" |
| device gives an output | S4 | activity Support "what comes OUT"; Core smart-speaker output |
| follow input → process → output | S3–S5 | activity `order` (input→process→output) |
| what makes a password strong | S6 passwords | activity Challenge multi-select (strong-password traits) |

### L2 What parts make up a digital device?
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| sort input/output devices | S3 input/output | activity `sort` (input vs output); Support input/output choices |
| name the parts of a computer | S2 parts | starter `label` (screen/base/keyboard/mouse) |
| describe a simple process | S5 process | activity Core process question |
| design my own digital device | S6 design | activity show-your-work (name/input/output + screenshot) |

### L3 How do digital devices help us?
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| name jobs on a device | S2 jobs | starter multi-select (real jobs) |
| make art (brush/fill/undo) | S4 tools, S5 make | activity show-your-work (screenshot of picture) |
| same as paper | S6 same/different | activity Core "one thing the same"; Challenge multi-select |
| different from paper | S6 | activity Support undo; Core undo meaning; Challenge multi-select |

### L4 How am I connected?
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| what a connection is | S2 connection | starter (connection meaning + connected pairs) |
| what a network is | S3 network | starter Challenge; activity Support "network" |
| message between computers | S4 switch, S5 order | activity `order` (c1→switch→c2) + show-your-work |
| why a switch helps | S4 | activity Core "why a switch"; Challenge multi-select |

### L5 How are computers connected?
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| name switch/server/WAP | S2–S4 devices | activity matching grid (device→job) |
| what a switch does | S2 | starter (switch job); matching row 1 |
| what a server does | S3 | activity Support + Core (why store on server); matching row 2 |
| what a WAP does | S4 | activity Support (join with no cable); matching row 3; Challenge `order` (file→server) |

### L6 What does our school network look like?
| Objective | Slide(s) | Worksheet Q |
|---|---|---|
| name school-network parts | S2 recap, S3 cables, S4 printer | starter matching (picture→name) |
| how parts are joined | S3 cables/sockets | activity Support (cable→socket); `sort` wired/wireless |
| find networked devices | S6 tour | activity show-your-work (photo on tour) |
| why a network is useful | S7 benefits | activity Core + Challenge multi-select (benefits) |

## Type sanity
- All single-radio `choice` cells are single-correct; multi-correct questions use multi-select `[ ]` or `sort`/`order`. No multi-correct on a radio.

## Images embedded (all OGL — Teach Computing © Raspberry Pi Foundation)
Extracted as rasters from the source `.pptx` decks (clean clipart/photos):
- L1: desktop computer, sat-nav (GPS)
- L2: desktop computer (label target), screen (output), button (input)
- L3: oil painting (non-digital art), paper + pencil
- L4: two people connected, network-of-dots diagram, network switch
- L5: switch, server, wireless access point (the three core device images — strong for match/label/sort)
- L6: switch, server, WAP (recap), network cable (RJ45), networked printer

## Image-gap log (per-unit; roll up into docs/WORKSHEET_QUESTION_TYPES.md §4 later — shared doc left untouched to avoid clashing with parallel agents)
| Lesson | Where | Wanted image | Source had one? |
|---|---|---|---|
| L1 | S5 IPO machine | a clean input→process→output "machine" diagram | ⚠️ source uses PPT animations/shapes, not rasterisable — taught via `order` block instead |
| L5/L6 | activity | a single labelled school-network MAP (switch+server+WAP+computers wired together) to unlock one `label` drag task | ⚠️ source network maps are PPT vector shapes, not rasters; used separate device clipart + matching/sort instead |
| L6 | S3 sockets | a clean network SOCKET (wall port) still | ⚠️ source had cable (RJ45) only; embedded the cable |

## Type-gap log
- None. All questions map to live engine types (text, choice, multi-select, matching, fill-blank not needed, `order`, `sort`, `label`, screenshot, checklist). The newly-built drag types covered all demand; no backlog item needed.
