# Conversion notes — GCSE Object-oriented programming (Teach Computing — adapted)

Slug: `gcse-oop-teach-computing-adapted` · Course: OCR J277 GCSE Computer Science · keyStage **KS4**.
Source: `TeachComputing/GCSE/unit_16` (L1–L5 zips + Unit guide + Summative assessment docx/answers + rubric).
5 lessons converted (L5 is the unit's assessment; the summative questions are folded into the L5 quiz worksheet).

Question-type variety used: text, single-choice, **multi-select** (`[ ]`), **matching** (term↔meaning),
**card-sort** (`sort`), **fill-blank** (`[[ ]]`), **order/sequence** (`order`), **Parsons** (`parsons` — write/order a class),
screenshot-upload, checklist. Code is transcribed as fenced blocks / Parsons (selectable + high-contrast for SEND)
plus two genuine source code screenshots embedded (L1, L5).

## §7a Alignment tables

### L1 — Programming paradigms
| Objective ("I can…") | Slide(s) | Worksheet Q / level |
|---|---|---|
| say why conventions / clear names matter | S2 Starter | starter: better-name choices (×2) + "conventions make a program easier to…" |
| explain what a programming paradigm is | S3 | activity Support: "a paradigm is a…"; activity Core (procedural) |
| describe procedural programming (functions) | S4 (book-sorter image) | activity Predict (text) + Order block (one insertion); Core "what is procedural" + reader benefit |
| say what OOP uses (classes/objects) | S5 (class image) | activity Support "OOP uses classes and…"; matching class↔blueprint / object↔made-from-it; Challenge "what OOP uses that procedural does not" |

### L2 — Classes and objects
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| how a class and an object relate | S2 starter, S3–S4 (car/house), S5 (cat) | starter card-sort all/some animals; activity matching (class/object/attribute/method) |
| tell an attribute from a method | S2, S6 | activity card-sort **attribute vs method**; Support "attribute is…"/"method is…" |
| use a constructor to make an object | S5 (constructor), S4 video | activity fill-blank constructor (`self.name = [[ ]]`); Core "what does a constructor do" |
| get and set an attribute | S6 | activity Challenge Parsons (get_name method) + "why a getter not direct access"; Show-your-work |

### L3 — Creating a class (Monster Quest)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| create a class and constructor | S3 (Pet worked example), S4 | starter card-sort attr/method + data-type choices; activity Parsons (Monster class + constructor) |
| explain what `self` does | S5 | activity fill-blank (`self.health = [[ ]]`); Support "keyword that means this object"; Core "what self lets an object do" |
| add getters and setters | S6 | activity Support "getter for health called…"; Core getter vs setter |
| create a method on a class | S6 | activity Challenge Parsons (take_damage method); Show-your-work (Monster running) |

### L4 — Inheritance
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| explain inheritance | S3, S4 (two-instances image) | starter card-sort code parts; activity matching superclass/subclass/inheritance; Core "what is inheritance" |
| use superclass / subclass correctly | S3 | activity Support "parent class is the…"; matching; plenary which-is-which |
| choose where an attribute belongs | S4 | activity card-sort Animal vs Pet (species/breed…) |
| create a subclass | S5 (live coding), S6 | activity Parsons (Friend subclass) + fill-blank `super().[[ ]]`; Challenge why super(); Show-your-work (Enemy subclass) |

### L5 — Assessment
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| explore an OOP program (library tracker) | S2–S3 (shelf + explore-sheet img) | explore worksheet card-sort Book/User/Library + note a book/user |
| identify classes/objects/attributes/methods/inheritance | S4 (quiz), S6 recap | quiz Q1–Q11 (see mark scheme); Part-2 subclass task (Show-your-work) |

## Quiz mark scheme (L5 — `l5-assessment-quiz-worksheet.md`)
Auto-mark these objective questions (the bundle has no stored scheme — apply on import or mark by hand):
- Q1 (multi-select, classes): **User, Library**
- Q2 (multi-select, objects): **jane, hunger_games**
- Q3 method in Book: **rent_out** · Q4 attribute in Library: **books**
- Q5: **an attribute in the User class** · Q6: **book_object = Book()**
- Q7 (getter): **school_library.get_user()** · Q8 (setter): **twilight.set_author("Stephanie Meyer")**
- Q9 association: **current_holder** · Q10 interacts with another class: **receive_book()**
- Q11 principle: **inheritance**; roles → Book = **superclass (parent)**, NonFictionBook = **subclass (child)**
- Part 2 (add a Book subclass) is open/code — mark with the unit's rubric (`Rubric - Adding to the library …docx`).

Wording note: Q7/Q8 were reworded from the source to ask specifically for the *getter/setter method* line, so each
has exactly ONE correct option (the source's direct `obj.attr` form is also valid Python, which would have made the
single-radio question multi-correct — avoided).

## Image gaps
| Lesson | Where | Image wanted | Source had one? |
|---|---|---|---|
| L2 | activity — attribute-vs-method sort | a clean Pet-class code screenshot (annotated attributes vs methods) | ⚠️ deck code is PPT vector text, not a raster — transcribed as fenced code / sort instead |
| L3 | activity — build the Monster class | a Monster-class / UML class-diagram screenshot | ⚠️ none rasterisable in source (PPT shapes) — used Parsons + monster clipart |
| L4 | starter — spot the OOP parts | a labelled code screenshot for a **label-a-diagram** widget | ⚠️ no clean code raster in source — used card-sort over the identifiers (see type-gap note) |
| L4 | activity — inheritance hierarchy | Animal→Pet→Cat/Dog inheritance diagram (arrows up) | ⚠️ source diagram is PPT shapes — described on slide + card-sort |

Embedded OK: L1 book-sorter code screenshot + Course/OnlineCourse class illustration; L2 car/house/cat + "knowledge of
objects" video (2.6 MB); L3 two monster illustrations; L4 one-object + two-instances (Dave/Brian) illustrations; L5
bookshelf photo + library-tracker worksheet screenshot.

## Video note (deliberate omission)
L4 source video **"Activity 2 — Live coding.mp4" is 64 MB** — too large for plain git per
`seed-content/lessons/README.md` (no git-LFS on this box; a few hundred KB/unit is the norm). **Omitted** to keep the
bundle git-transferable. The L4 slide describes the live-coding demo instead; re-attach the clip via git-LFS if wanted
(source: `unit_16/L4_ Inheritance_v1.1.zip`). The L2 video (2.6 MB) is included.

## Wanted-but-unbuilt question types
**None.** All four formerly-backlog types were available and used (order, card-sort, multi-select; matching pre-existing).
- **Label-a-diagram** *was* available, but I had **no suitable code raster** for L4's "spot the OOP parts" (deck code is
  vector text), so I used **card-sort** over the identifiers and logged the image gap above. If a clean labelled-code
  screenshot is produced, L4 starter could become a `label` task (ref WORKSHEET_QUESTION_TYPES.md §4 / former §2.4).
- No `slider` used (no confidence-rating step fitted the calm exam-style plenaries) — not a gap.

## Self-verify
PASS. Every worksheet renders with a screenshot field (activity + quiz); level sections slice (Support-only vs
Challenge-only field labels confirmed distinct); all 6 decks parse with ≥7 slides and non-empty teacher notes; every
slides resource title ends `.md`; all `{{res:…}}` placeholders map to manifest `file`s that exist on disk; manifest is
valid JSON. No single-radio multi-correct (the two multi-correct quiz items use multi-select `[ ]`).
