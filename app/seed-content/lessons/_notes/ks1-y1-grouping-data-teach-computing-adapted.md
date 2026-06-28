# Conversion notes — KS1 Y1 Grouping data (Teach Computing — adapted)

- **Slug:** `ks1-y1-grouping-data-teach-computing-adapted`
- **Course / key stage:** KS1 Computing · KS1
- **Source:** TeachComputing KS1 Year 1 Unit 4 "Grouping data" (6 lessons + unit guide).
- **Cohort:** SEND secondary working at a primary level — content kept simple/concrete, framing
  age-respectful (objects: cars, animals, balls; no "boys and girls" tone). Reading load very low;
  leans on card-sort / order / matching / single-choice / multi-select; writing kept to a few words.

## Question-type strategy
Per the brief, **card-sort is the perfect fit** for this unit (it literally teaches grouping) and is
used in every lesson. Mix per lesson: `sort` (group objects), `order` (steps to count / to answer a
question), matching (object↔label, word↔property, comparing-word↔meaning), single-choice (`(  )`),
multi-select (`[  ]`), and fill-blank (`[[ ]]`, always in prose, never a table cell). Every activity
worksheet ends with a `📷` show-your-work cell (a PHOTO of the pupil's real groups — fits the physical,
hands-on KS1 tasks) and a `## ✅ I can…` checklist. No single-radio used for a multi-correct question.

**Label-a-diagram (`label`) was deliberately NOT used** — see image gaps: the source has no clean
multi-object raster to place zones on (every TCC image is a single isolated object; the "groups" are
built by arranging clip-art on the slide canvas). Card-sort covers the same drag-to-group skill without
guessing coordinates.

## Alignment (§7a) — objective ↔ slide ↔ worksheet
**L1 Label and match**
| Objective | Slide | Worksheet Q |
|---|---|---|
| describe an object using a label | S2 "a name is a label" | starter: choose the car's label; Support matching object→label |
| match objects to a group | S6 "match objects to a group" | activity: card sort Cars/Cats/Frogs |
| find the label for a group | S7 "label the group" | activity Support: best group label; Core: why we group |

**L2 Group and count**
| count objects | S2 starter | starter: choose the total |
| group objects | S4 "put them in groups" | activity: card sort + `order` steps |
| count a group of objects | S5 "count each group" | activity Support: count a group; Core: biggest group |

**L3 Describe an object**
| describe an object | S2–S3 colour/shape | starter: choose colour |
| describe a property | S3–S4 (colour, shape) | starter Support matching word→property; activity `sort` Colour/Shape/Size |
| find objects with similar properties | S7 "find similar properties" | activity Challenge + show-your-work colour hunt (photo) |

**L4 Making different groups**
| group similar objects | S3 "group by colour" | activity sort #1 (Green / Not green) |
| group objects in more than one way | S4 "re-group the same objects" | activity sort #2 (Animals / Cars) on the SAME items |
| count how many share a property | S5 "count how many share a property" | activity Support count; Challenge compare two counts |

**L5 Comparing groups**
| choose how to group | S5 "choose how to group" | activity: card sort (pupil chooses colour) |
| describe groups of objects | S2–S3 comparing words | starter matching word→meaning; Core comparing sentence |
| record how many in a group | S6 "record how many" | activity: "Record how many" table |

**L6 Answering questions**
| decide how to group to answer a question | S3–S4 "group to answer" | activity `order` plan + sort Cat/Not cat |
| compare groups of objects | S5 "count and compare" | activity Core: which group has more |
| record and share what I found | S6 "record and share" | activity: record answer + show-your-work photo + share with partner |

No orphan objectives; no worksheet question about anything not taught. Levels are coherent
(Support = recognise/choose, Core = recall/short answer, Challenge = reason/apply) on the same task.

## Self-verify
PASS. 6 lessons. Each: 3 objectives; starter + activity worksheet + slides(.md). Every activity
worksheet has a `kind:'image'` screenshot field and support-slice ≠ challenge-slice. Every deck ≥ 8
slides with non-empty teacher notes; all `{{res:}}` placeholders resolve to manifest files on disk.

## Images
Embedded 15 OGL object images pulled from the source decks (`extractOfficeImages`), chosen for being
clean and age-respectful: red car, blue car, cat, green frog, tennis ball, parrot photo. Reused across
lessons (per-lesson copies, lN- prefixed). The big visual lesson (L3) carries the ball (round) and the
parrot (many colours) to anchor colour/shape/size.

### Image gaps (for sourcing/creating later)
| Lesson | Where | What image is wanted | Source had one? |
|---|---|---|---|
| L1/L2/L4/L5/L6 | "a group of objects" slides | a single raster showing several objects ARRANGED in a labelled group circle | ⚠️ no — TCC builds groups by arranging individual clip-art on the slide canvas; only isolated single-object PNGs are extractable |
| L3 | property slides + a future `label` task | a CLEAN set of 2D coloured shapes (red circle, blue square, etc.) on one image | ⚠️ no — source shapes are slide vector shapes, not a raster; a clean shapes raster would unlock a label-a-diagram "drag the colour/shape name" task |
| L6 | true/false starter | a "grouped by size vs by colour" comparison still | ⚠️ no clean still in source (animated reveals) |

### Type gaps
None. All demand met by existing types (sort / order / matching / single-choice / multi-select /
fill-blank / screenshot / checklist). `label` was wanted in spirit (L1 "label objects", L3 properties)
but is blocked only by the lack of a clean multi-object raster (above), not by an engine gap.

## Source videos (referenced, not embedded — motion+sound, teacher's choice)
L1 "Finding images — labels around us", L5 "Creating groups", L6 "Answering questions" — each linked on
a slide as a teacher-played hook in a `> 🧑‍🏫` note.
