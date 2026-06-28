# Conversion notes — KS2 Y4 Data logging (Teach Computing — adapted)

- **Slug:** `ks2-y4-data-logging-teach-computing-adapted`
- **Course / key stage:** KS2 Computing · KS2
- **Source:** `TeachComputing/KS2/Year_4/Unit 4 Data Logging` (Unit guide + L1–L6 zips). Data Harvest Vu+ data logger + EasySense2 software.
- **Cohort:** SEND secondary working at primary level — content simple/concrete, framing age-respectful (no babyish clip-art tone). Very low reading load; visual/drag types favoured.

## Self-verify: PASS
6 lessons. Every activity worksheet has a `📷` screenshot field and support≠challenge slices. Every deck has 7–8 slides with non-empty teacher notes. All `{{res:}}` placeholders resolve to manifest files; every manifest file exists on disk; no orphan images. Field kinds confirmed rendering: text, choice (single + matching grid), multichoice (multi-select), blank (fill-blank), order, sort, label (5 zones), image (screenshot), check.

## Type variety used
single-choice, matching (choice grid), multi-select, fill-blank (`[[ ]]`), `order`, `sort`, `label` (data-logger diagram, 5 zones), screenshot, checklist. **No new type-gaps** — the label/order/sort/multi-select types built in the Y7/Y8 batch covered everything this unit wanted.

## §7a alignment — objective ↔ slide ↔ worksheet

**L1 Answering questions**
| Objective | Slide | Worksheet Q |
|---|---|---|
| say what data is | S2 "Data around us" | starter: "data is…" (Support choice) |
| choose the right table to answer a question | S3 "Three tables", S4 | activity: "which table?" A/B/C/X (×3) + Support/Core choices |
| think of a question a table could answer | S4 | activity Challenge: "write a question Table B could answer" |
| spot data collected over time | S2, S5, S6 (car tally) | starter: register "over time"; activity `sort` over-time vs one-off + car tally + 📷 |

**L2 Data collection**
| Objective | Slide | Worksheet Q |
|---|---|---|
| say what a sensor is | S2 "Senses and sensors" | starter: microphone senses…, sensor = input |
| name the sensors on a data logger | S3 "The data logger" | activity: `label` the logger (sound/light/temp/screen/buttons) |
| read the data logger display | S4 "Reading the display" | activity: sound/temp choice + light fill-blank |
| say sensors record automatically | S5 "Collecting on its own" | activity: `sort` sensors→jobs, Challenge "why leave it on its own"; 📷 |

**L3 Logging**
| Objective | Slide | Worksheet Q |
|---|---|---|
| say what a data point is | S2 "Be the data logger", S5 graph | starter: "each number is a…" (data point) |
| say what an interval is | S3 "Interval" | starter: "time between readings is the…"; activity: reading-every-0.1s choice |
| read a value from a data table | S4 "Reading a table" | activity: sound at 00.000 fill-blank |
| read a value from a line graph | S5 "Reading a line graph" | activity: when was light lowest (choice) + Challenge describe change; `order` logging steps |

**L4 Analysing data**
| Objective | Slide | Worksheet Q |
|---|---|---|
| open and view saved data | S2 "Using someone else's data" | starter: predict cooling |
| read a value from a graph and a table | S3 cooling graph, S4 table | activity: highest temp choice + 60-min fill-blank; graph-vs-table choice |
| sort data to find highest/lowest | S5 "Sorting data" | activity: "sort smallest→largest to find lowest" choice; Support lowest≈31°C |
| say there are different ways to view data | S4 | activity Challenge: graph or table — which easier & why |

**L5 Data for answers**
| Objective | Slide | Worksheet Q |
|---|---|---|
| write a question a logger could answer | S3 "Asking a question" | activity: "my question" text |
| choose the right sensor | S4 "Which sensor?" | starter: question→sensor (×3); activity: sensor choice |
| plan where/how long | S5 "Make a plan" | activity: `order` set-up steps + plan table (where / how long) |
| set up a logger to collect data | S5 | activity: "set it up and test it" + 📷 |

**L6 Answering my question**
| Objective | Slide | Worksheet Q |
|---|---|---|
| find and review my collected data | S2 "Reviewing your data" | activity: my question + sensor |
| use my data to answer my question | S3 read graph, S4 conclusion | starter: read the dips; activity Core: "answer your question" |
| write a conclusion from my data | S4 "Write your conclusion" | activity: report table + Challenge "did it match your prediction" + 📷 |
| say why a data logger is useful | S5 "Why use a data logger?" | activity: multi-select benefits (NOT "does your writing") |

All choices are single-correct (multi-correct → the L6 multi-select widget). No orphan objective; no question about a topic the lesson doesn't teach.

## Images embedded (all OGL — Teach Computing © Raspberry Pi Foundation)
- L1: `l1-vehicles.png` (road/cars still from the counting video) — car-tally starter.
- L2: `l2-data-logger.png` (Vu+ with sound/temp/light icons — the `label` target), `l2-microphone.png` (mic as sound sensor), `l2-easysense-live.png` (live readings on screen).
- L3: `l3-data-table.png` (time/temp/sound/light table), `l3-light-graph.png` (light line graph over seconds).
- L4: `l4-cooling-graph.png` (the 50→31°C cooling curve — read-the-graph), `l4-data-table.png` (same data as a table), `l4-sort-spreadsheet.png` (spreadsheet sort menu).
- L5: `l5-data-logger.png` (reuse of the Vu+ for setup).
- L6: `l6-light-graph.png` (two-dip light graph — conclusion), `l6-data-logger.png` (reuse for review step).

## Image-gap log (also add to docs/WORKSHEET_QUESTION_TYPES.md §4 next doc pass)
| Lesson | Where | What image is wanted | Source had one? |
|---|---|---|---|
| KS2 Y4 L1 Answering questions | activity "which table?" | a single clean A/B/C three-table comparison image | ⚠️ source A/B/C tables are **PowerPoint tables**, not rasters — recreated as small markdown tables in the worksheet so the questions work |
| KS2 Y4 L3 Logging | starter "be the data logger" | a clean sun-rise/sun-set temperature-over-a-day still | ⚠️ source is an animated GIF (excluded per no-animation); used the data table + light line-graph rasters instead |
| KS2 Y4 L5 Data for answers | "which sensor?" plenary | a simple question→sensor icon strip | ⚠️ source = decorative clip-art only; reused the data-logger photo |

## Notes / decisions
- Hardware-specific (Vu+/EasySense) but kept generic enough for any data logger or sensor app — the lesson plans say "if you have real loggers, let pupils handle one."
- Source videos (counting-vehicles.mp4, temperature sim, Data Harvest intro) are teacher-played hooks, **not** embedded (motion/sound; some >6 MB) — referenced in `> 🧑‍🏫` notes per the low-arousal default; teacher decides whether to play.
- Census/clip-art stills (writing figure, ear/tongue/thermometer cartoons, computer/laptop clip-art) deliberately **omitted** as babyish per the SEND age-respectful framing.
