# Conversion notes — Y9 Data science (Teach Computing — adapted)

Slug: `y9-data-science-teach-computing-adapted` · Course: Computing Curriculum (KS3) · 6 lessons.
Source: `TeachComputing/KS3/year_9/unit_3/` (L1–L6 zips + Unit guide v1.2 + summative assessment + rubric).

Question-type variety used (the teacher's steer): **card-sort** (L1 chart-types, L2 big-data, L4 useful-data,
L5 clean-vs-leave, L6 pattern/trend/outlier — 5 lessons), **order/sequence** (L3 PPDAC cycle),
**matching-by-choice** (L4 starter PPDAC step→action), **multi-select** (L2 criteria, L4 data-to-collect,
L5 errors), **fill-in-the-blank** (L5 number of cycle steps), **slider** (L5, L6 confidence plenaries),
**single-choice** (every lesson; all genuinely single-correct — verified, no multi-correct on a radio),
**screenshot + checklist** (every activity worksheet). The data unit is a natural fit for order (the
investigative cycle), card-sort (chart types, clean/dirty data) and embedded chart/visualisation images.

## §7a Alignment tables

### L1 — Delving into data science
| Objective ("I can…") | Slide(s) | Worksheet Q / level |
|---|---|---|
| say what data science means | S3 "What is data science?" | activity Support choice ("data science means…"); starter (raw data is hard to read) |
| explain how visualising helps spot patterns/trends | S2 raw-data starter, S4 Minard, S5 charts | starter Core/Challenge; activity predict (picture vs numbers), card-sort chart-types, Core "one pattern in Minard", "why a picture is easier" |
| use a tool to visualise + find an insight | S6 you-do | activity Show your work (chart link + screenshot + one insight); ✅ checklist |

### L2 — Global data
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| examples of large data sets in daily life | S2 traffic starter, S3 | starter choice (colours=traffic; many phones); activity card-sort uses-big-data vs not; Challenge "name another service" |
| choose criteria + use data to test a prediction | S4 criteria, S5 you-do | activity multi-select criteria, Core (predict country + 3 criteria), Show your work (graph screenshot) |
| use findings to support/change a prediction | S5, S6 outliers | activity Challenge (did evidence support/change prediction); Support/Challenge outlier choices |

### L3 — Statistical state of mind
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| explain correlation and outliers | S2 correlation graph, S3 outliers graph | starter choice (positive correlation; outliers), Support "a correlation is…", Core "why 1918 low", scatter choice |
| put PPDAC in order | S4 PPDAC | activity **order** block (Problem→Plan→Data→Analysis→Conclusion); Support "5th step = Conclusion" |
| use the cycle + make a recommendation | S5 scenario, S6 you-do | activity Core (pose a question), Challenge (recommendation + is data enough), Show your work (visualisation screenshot) |

### L4 — Data for action
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| name + order the steps of the cycle | S2 recap | starter matching (step→action), Support "first step = Problem", Challenge "why Plan before Data" |
| work out what data is needed | S5 plan step + mind map | activity card-sort useful-vs-not, Support multi-select data-to-collect, Core "what data would you need" |
| make a simple data capture form | S6 | activity Show your work (form link + screenshot); ✅ checklist; choice on Disney's precise question (problem step) |

### L5 — Clean it up
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| explain why data needs cleansing | S2 dirty spreadsheet, S3 garbage-in/out | starter choice (3m = error), Core "garbage in garbage out", Support "= cleansing"; activity fill-blank (5 steps) |
| find and fix errors | S4 you-do | activity card-sort clean-vs-leave, Support multi-select errors, Core "where to check", Challenge real-vs-error |
| make a visualisation | S5 you-do | activity Show your work (clean → chart screenshot); slider confidence; ✅ checklist |

### L6 — Make a change
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| read a visualisation for patterns/trends/outliers | S2 litter viz, S3 data table | starter choice (most recyclable = Dining Hall; least = Technology); activity card-sort pattern/trend/outlier |
| draw a conclusion from data | S5 you-do | activity Support "a conclusion answers your question", Core "write one conclusion" |
| make a recommendation + report findings | S5 conclude, S6 assessment | activity Core recommendation, Challenge (reliable enough?), Show your work (final chart + conclusion); slider; ✅ checklist |

## Image gaps (for WORKSHEET_QUESTION_TYPES.md §4)
| Lesson | Where | Image wanted | Source had one? |
|---|---|---|---|
| L1 | Activity 2 (John Snow) | the **John Snow cholera map of Soho** (a label/order task could use it) | ⚠️ source only links the Wikipedia image (URL), not embedded as a raster in the deck — not extractable; embedded Minard + astronaut bar chart + infographic instead |
| L3 / L4 | PPDAC cycle slides | a clean **PPDAC investigative-cycle wheel** diagram (ideal for a label-a-diagram task) | ⚠️ the cycle is a PowerPoint **shape group**, not a raster — `extractOfficeImages` can't pull it; used an `order` block + matching instead |
| L2 | best-place / Gapminder activity | a **Gapminder bubble chart** still (income vs life expectancy) | ⚠️ Gapminder is a live tool — no clean still in the deck; embedded the traffic-map starter (the deck's only real visualisation raster) |
| L5 | starter | the **handwritten zoo data-capture form** (shows where the OCR errors came from) | ⚠️ present (image17) but 2.3 MB — omitted for bundle size; the dirty spreadsheet (image19) already carries the cleansing task |

## Media included (all OGL v3.0, Teach Computing © Raspberry Pi Foundation)
- L1: raw-data-table, Minard's-march, female-astronauts bar chart, data-science infographic.
- L2: traffic route map. (Island photo omitted — 2 MB, purely decorative.)
- L3: life-expectancy positive-correlation graph, same graph with outliers, roller-coaster scatter, roller-coaster photo.
- L4: litter sign, mind-map template (jpg).
- L5: zoo dirty-data spreadsheet (error highlighted), average-heights bar chart.
- L6: litter recyclable-waste visualisation, litter raw-data table.
- 16 images, ~3.5 MB total. All embedded via `{{res:…}}`; every declared media file is referenced (verified).

### Videos available but omitted (log, not gaps)
- L1 `A3 Teacher notes - visualise the data.mov` — **100 MB** screen-recording (teacher CODAP how-to). Omitted for bundle size (≈30× the whole rest of the bundle); not a pupil-facing hook.
- L3 `A3 Resource - Teacher support video.mp4` — **21 MB** teacher CODAP how-to. Omitted for bundle size (consistent with the Y8 batch's >4 MB omissions); teacher-facing, not a pupil hook.
Both are teacher demonstrations of the live data tool, not low-arousal pupil content — the slides instead say "the tool your teacher shows you".

## Wanted-but-unbuilt question types
None. All needed types (order, card-sort, multi-select, matching, fill-blank, slider, single-choice,
screenshot, checklist) are built and were used. A **label-a-diagram** task was *wanted* for the PPDAC cycle
wheel and the John Snow map, but no extractable raster exists for either (PPT shapes / external URL) — logged
as image gaps above rather than type gaps. If those images are sourced later, L3/L4 PPDAC and L1 cholera map
become natural label-a-diagram tasks.

## Self-verify
`_ds_verify.ts` rendered every worksheet (preview, all 3 levels) and every deck. PASS:
- each activity worksheet has a `kind==='image'` screenshot field + `## ✅ I can…` checklist;
- level sections slice (support label-set ≠ challenge label-set on every worksheet);
- all slide resource titles end `.md`; every deck parses to 7–8 slides with non-empty teacher notes;
- every `{{res:…}}` placeholder resolves to a declared manifest file present on disk; every declared media
  file is referenced by a placeholder (no orphan media);
- field-kind variety observed: text, choice, multichoice, sort, order, blank, scale, image, check.
(Starter worksheets intentionally have no screenshot — they are short recall starters; the activity
worksheet in each lesson carries the show-your-work + screenshot.)
