# Conversion notes — KS2 Y3 Branching databases (Teach Computing — adapted)

Slug: `ks2-y3-branching-databases-teach-computing-adapted`
Course: KS2 Computing · keyStage KS2 · 6 lessons.
Source: TeachComputing KS2 Year 3 Unit 4 "Branching Databases" (L1–L6 zips + unit guide).

Primary-content / SEND-secondary cohort: content kept simple and concrete, framing age-respectful
(no "boys and girls"), reading load low, heavy use of drag/visual types (sort, order, label, choice,
multi-select, screenshot/photo). j2data Branch (ncce.io/branchingdb) is the online tool from L3 on.

## Question-type variety used
sort (card-sort), order (sequence), label (image hotspot — the minibeast branching tree), choice
(single-select incl. a matching grid in L4 starter), multichoice (multi-select), text, screenshot
(📷, on every activity worksheet), checklist. No single-radio multi-correct traps.

## Images embedded (all OGL — Teach Computing © Raspberry Pi Foundation)
- Vehicles (car, motorbike, bicycle, hot-air balloon) — L1 (yes/no + group by "can it fly?").
- Bare tree shape + the **minibeast branching database** diagram — L2 (the "why a tree" idea; label task).
- Minibeast branching database + a bee — L3 (identify; order the path to the bee).
- Minibeast branching database — L4 (compare even vs one-at-a-time; order questions).
- Dinosaur picture-cards (6) — L5 + L6 (plan + build the dinosaur identifier).

The `L3_07` minibeast branching database is the standout asset: a real, fully-structured tree with
pink question nodes, green yes/no branches and blue object leaves — used for the L2 **label** task
(zones hand-set against the 1112×596 image) and the L3 **order** (path to the bee).

## §7a alignment — objective ↔ slide ↔ worksheet
### L1 Yes or no questions
| Objective | Slide | Worksheet Q |
|---|---|---|
| tell a yes/no from an open question | S2 "Two kinds of question" | starter: sort yes/no vs open; Support choice; Challenge turn open→yes/no |
| make up a yes/no question | S3 "Guess the object" | starter Core "write a yes/no question"; activity Core |
| split objects into two groups by one attribute | S4 "An attribute splits a group" | activity: sort vehicles by "Can it fly?"; Support choice; show-your-work photo |

### L2 Making groups
| Objective | Slide | Worksheet Q |
|---|---|---|
| choose an attribute to split into two groups | S2 "Split, then split again" | starter multi-select yes/no Qs + choose attribute |
| split a group again | S2 | activity Core "split the no-group again" |
| arrange into a tree | S3/S4 (tree, finished db) | activity: **label** the tree parts + **order** the build steps; photo |

### L3 Creating a branching database
| Objective | Slide | Worksheet Q |
|---|---|---|
| use a branching db to identify | S2 "Identify a minibeast" | starter: **order** the path to the bee; Support yes/no choices |
| build online with own questions | S3 "Build your own" | activity: **order** build steps; Core write questions; screenshot |
| test it works | S4 "Test it" | activity: choice "did it reach the right object" |

### L4 Structuring a branching database
| Objective | Slide | Worksheet Q |
|---|---|---|
| write a yes/no question for an attribute | S2 "Questions come from attributes" | starter: **matching** attribute↔question; Core write |
| compare two databases | S3 "Two trees" | activity: choice which is shorter/faster; Core count questions |
| explain why order matters | S4 "Order matters" | activity: **order** questions best-first; Challenge explain |

### L5 Planning a branching database
| Objective | Slide | Worksheet Q |
|---|---|---|
| write own yes/no questions for dinosaurs | S3 "Write yes/no questions" | starter Core; activity 3× question cells |
| questions that uniquely identify | S2 attributes | activity Challenge "does every dinosaur end on its own" |
| lay out a plan on paper | S4 "Lay out your plan" | activity: **order** plan steps; show-your-work photo |

### L6 Making a dinosaur identifier
| Objective | Slide | Worksheet Q |
|---|---|---|
| build online from the plan | S2/S3 build | starter: **order** build steps; activity question cells; screenshot |
| test a partner's identifier | S5 "Test it" | activity choice "did it find the dinosaur" |
| suggest real-world uses | S6 "Real-world uses" | activity: **sort** real jobs vs not; Core/Challenge |

Levels are coherent throughout: Support = recognition (choice/sort into given groups), Core =
recall/write a question, Challenge = reason/apply (even splits, unique identification, analogy).

## Videos
- L4 `AP Resource - Minibeast database.mp4` (22 MB) — NOT embedded (>6 MB). Referenced as a
  teacher-played hook on the L6 slides ("Watch — the j2data demo"), flagged for motion/sound.

## Image-gap log (for docs/WORKSHEET_QUESTION_TYPES.md §4 — left here to avoid editing the shared doc while parallel conversions run)
| Lesson | Where | Wanted | Source had one? |
|---|---|---|---|
| L4 | "two trees" compare slide/worksheet | a clean side-by-side EVEN-tree vs ONE-AT-A-TIME tall-tree still | ⚠️ source compare slides are PPT shapes (not rasterisable); described the tall tree in prose + reused the minibeast even tree |
| L2/L5 | label/sort of individual objects | individual cut-out dinosaur PNGs (only the 6-card montage is one raster) | ⚠️ used the montage; a labelled per-dino set would unlock a per-dinosaur label task |

## Self-verify
`_bd_verify.ts` (throwaway, deleted): all 12 worksheets render; every activity worksheet has a 📷
image field; support slice ≠ challenge slice; level labels hidden; every `{{res:}}` resolves to a
manifest file; all 6 decks ≥6 slides with non-empty teacher notes. Result: ALL PASS.
