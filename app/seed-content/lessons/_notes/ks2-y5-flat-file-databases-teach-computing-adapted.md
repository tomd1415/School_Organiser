# KS2 Y5 Flat-file databases (Teach Computing — adapted) — conversion notes

- **Slug:** `ks2-y5-flat-file-databases-teach-computing-adapted`
- **Course / key stage:** KS2 Computing / KS2
- **Lessons:** 6 (all converted)
- **Source:** TeachComputing KS2 Year 5 Unit 4 "Flat-file databases" (J2e data platform).
- **Self-verify:** PASS — every lesson has ≥8 slides, non-empty teacher notes, a screenshot field,
  support slice ≠ challenge slice; every `{{res:}}` resolves to a manifest file; slides titles end `.md`.

## SEND framing
Content kept primary-level (records/fields, sort/group, search AND/OR, charts, real-world database)
but framed age-respectfully for SEND secondary pupils: very low reading load, one idea per slide,
heavy use of drag types (label, sort, order), single-choice and fill-blank, every activity ends in a
screenshot. No flashing/sound; the three source videos are referenced as teacher-played hooks only
(not embedded — each >6 MB and has motion/sound).

## Alignment (§7a) — objective → slide → worksheet question

### L1 Creating a paper-based database
| Objective | Slide(s) | Worksheet question |
|---|---|---|
| say what data/record/field are | What is data?, A record card | starter: choose database / record vs field; Core fill-blank |
| fill in a record card with fields | A record card, Make your cards | activity: name a field on the card; make 8 cards |
| sort cards into order | Sort your cards | activity: `order` block (A–Z steps); Support choose sort key |
| group cards to answer a question | Group to answer a question | activity: Challenge "how to group to find fliers"; show-your-work count |

### L2 Computer databases
| Objective | Slide(s) | Worksheet question |
|---|---|---|
| name a field and a record | The same words, The parts of a table | starter choose field/record; activity `label` (field/record/value) |
| find data in form & table view | Form view and table view | activity matching (form=one record, table=all rows) |
| sort by clicking a field | Sort by clicking a field | activity Core "most legs / first A–Z" + screenshot |

### L3 Using a database
| Objective | Slide(s) | Worksheet question |
|---|---|---|
| group records that share a value | Grouping on the computer | starter choose grouping; activity name a field |
| sort a group into order | Group, THEN sort | activity `order` block; Core sorted-population questions |
| use group-then-sort | Group, THEN sort | activity Challenge (>100m population, largest area) + screenshot |

### L4 Using search tools (AND/OR)
| Objective | Slide(s) | Worksheet question |
|---|---|---|
| choose a field and a value | A simple search | starter choose a search rule / fill-blank field+value |
| use AND to narrow | AND makes it narrower | activity `sort` AND/OR; Core AND questions; Challenge multi-select why fewer |
| use OR to widen | OR makes it wider | activity `order` build-an-OR-search; Support AND=fewer/OR=more |

### L5 Comparing data visually
| Objective | Slide(s) | Worksheet question |
|---|---|---|
| choose a chart that answers a question | Is the chart useful?, Choose the right chart | activity choose clearer chart + matching question→chart type |
| make a chart from a database | Make a chart | activity `order` chart-making steps; Core male/female + boarded |
| say why a computer is good at charts | I can… plenary | activity Challenge "two reasons"; `[scale 1-5]` confidence |

### L6 Databases in real life
| Objective | Slide(s) | Worksheet question |
|---|---|---|
| name fields in a real-world database | Fields on a flight | starter field vs record; activity `label` flight result (time/how long/price) |
| search and filter to answer a question | Search the flight database | activity `order` search steps; Support sort-by-price / Stops filter |
| sort results to find the best | Sort and filter the results | activity Core cheapest price / quickest airline |
| present findings to others | Present your flight | activity Challenge multi-select reasons + show-your-work recommendation |

## Question-type coverage
label (L2, L6), sort/card-sort (L1, L4), order/sequence (L1, L3, L4, L5, L6), matching (L2, L5),
fill-blank (all starters), single-choice (all), multi-select (L1, L4, L6), slider/scale (L5),
screenshot (every activity). **No new type-gaps** — all demand met by built types.

## Images embedded (13, all OGL — Raspberry Pi Foundation / STEM Learning)
Genuine J2e database screenshots pulled from the source decks: minibeast record (form) and table
views, Countries form/table/sorted, Titanic table + record + an OR-search builder, a chart-comparison
and a bar chart, plus an airport departure board, the Expedia search page and a flight-results list.
Decorative source clip-art (NCCE logo, question mark, thumbs-up, padlock/thief, whistle, video icon)
and the animated GIFs were deliberately skipped.

## Image-gap log (for docs/WORKSHEET_QUESTION_TYPES.md §4)
| Lesson | Where | What image is wanted | Source had one? |
|---|---|---|---|
| L1 | record-card activity | a clean blank/animal RECORD CARD raster (the source card template is a Word table, not an image) | ⚠️ reused the L2 minibeast form view as the "a record" visual |
| L3 | paper-card grouping slide | a photo of the corner-cut "shake to group" cards | ⚠️ source slides build this as animation/shapes — none extractable |
| L5 | "useless chart" example | a labelled before/after of a useful vs useless chart | ✅ embedded the two-chart comparison (`l5-which-chart.png`) |
| L6 | present-your-findings | a simple presentation-template still | ⚠️ source is an editable PPTX, no clean still |
