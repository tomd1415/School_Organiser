# Conversion notes — GCSE Algorithms part 2 (searching & sorting), Teach Computing → adapted

Bundle: `gcse-algorithms-2-searching-sorting-teach-computing-adapted`
Course: OCR J277 GCSE Computer Science · KS4. Source: TCC GCSE unit_9 lessons **L4–L12** (this is "part 2";
L1–L3 are part 1). 9 lessons converted: linear/binary search, comparing searches + code, bubble/insertion/
merge sort, coding sorts, review, and the summative (folded into a final quiz).

Self-verify: PASS (0 failures) — every activity worksheet renders a `kind==='image'` screenshot field; level
slicing differs support↔challenge in content; all slides parse (7–9 slides each) with teacher notes; all slide
resource titles end `.md`; every `{{res:…}}` placeholder resolves to a manifest `file`; no orphan files.
Question-type variety used: order (×9 incl. recap/parsons mix), card-sort (×6), Parsons code (×5),
label-a-diagram (×1, L7), multi-select (×2, L9 + L12), single-choice (correct option authored FIRST throughout),
fill/short-answer, screenshot + ✅ checklist on every activity. No source videos exist in this unit's zips
(checked — only docx/pptx/pdf), so none to attach.

## §7a alignment tables (objective → slide(s) → worksheet Q/level)

### L4 Linear search
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| say why computers search data | S "Why search?" | starter Core (a real search); activity intro |
| carry out a linear search | S "Linear search", "The steps" | activity Order block; Support (which is checked first) |
| count the comparisons | S "Best/worst case" | activity Core (Mumbai=5, Berlin not-found=7) |
| best-case / worst-case | S "Best and worst case" | activity Challenge (best=Dublin first; worst=7); show-your-work card table |

### L5 Binary search
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| carry out a binary search | S "Divide and conquer", "The steps" | activity Order block; Core (Harp after Guitar) |
| why the list must be in order | S "When can't you use it?" | Support tick; Core short-answer; Sort-the-facts |
| find an item's position | S "Your turn" | show-your-work ordered-card table |
| when binary search can't be used | S "When can't you use it?" | Challenge (not-in-order); doubling adds ~1 comparison |

### L6 Comparing searching algorithms
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| compare & choose linear vs binary | S "Which search, and when?" | Sort task; Support; Core (binary fewer on large) |
| read the linear-search code | S "The code" (embedded image) | Core (line 1 = function, line 4 = loop) |
| trace a search | S "Trace it" | show-your-work trace table (Neptune) |
| what -1 means | S "A faster linear search" | Challenge Parsons + "what does -1 mean" |

### L7 Bubble sort
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| say why we sort data | S "Starter — finding a surname" | starter (ordered copy quicker); Support |
| one pass, swapping out-of-order | S "Bubble sort", "One pass on cards" (embedded) | Order block; Support (neighbours/swap); Core (comparisons=items−1) |
| full bubble sort | S "Full bubble sort" | show-your-work full sort of cuisines |
| label a bubble-sort pass | S "Your turn — one pass" | Challenge label-a-diagram on the embedded pass image |

### L8 Insertion sort
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| insert into an ordered list | S "Inserting one item" (embedded) | Order block; Support (slide right) |
| describe insertion sort | S "Sorted/unsorted part" | Sort-the-facts; Core (sorted part = first item) |
| name sorted/unsorted parts | S "Sorted part and unsorted part" | Support tick |
| full insertion sort | S "Your turn" | show-your-work full sort; Challenge (pass-end conditions) |

### L9 Coding sorting algorithms
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| read & explain bubble-sort code | S "The bubble sort code" (embedded) | Support (outer loop = passes); starter true/false (multi-select) |
| order the swap lines | S "Swapping with a temp variable" | Core Parsons (3 swap lines) + temp-variable MC |
| trace the swap | S "Making it faster" | show-your-work trace of lines 7–9 |
| an efficiency improvement | S "Making it faster" | Challenge (num_items−passes; why "no swaps" = sorted) |

### L10 Merge sort
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| merge two ordered lists | S "Merging two ordered lists" (embedded) | Order block (merge); Support (compare fronts) |
| split & merge stages | S "The whole merge sort" | Core Order block (split-then-merge); divide MC |
| full merge sort | S "Your turn" | show-your-work full merge sort of dog breeds |
| what merge sort divides | S "The whole merge sort" | Core MC (the list); Challenge (why merge in pairs) |

### L11 Algorithms review
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| choose the right algorithm | S "Sort the algorithms" | Sort task; Support (no binary on unsorted) |
| sort then search a list | S "Search and sort the songs" | show-your-work (bubble sort songs → binary search "Shallow") |
| describe each algorithm | S "Compare bubble/merge" | Core (which sort does what + bubble-pass Order) |
| compare & justify | S "Compare bubble sort and merge sort" | Challenge Sort (bubble vs merge) + justify-for-large-list |

### L12 Summative assessment (summative folded into the quiz)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| develop a linear search function | S "Build a linear search" | starter Parsons (the function) |
| choose best search/sort | S "Recap — searching and sorting" | quiz Support (which-algorithm terms) + Core (which search fewest comparisons) |
| trace a sorting algorithm | S "The assessment" | quiz show-your-work trace of lines 7–9 |
| use computational-thinking terms | S "Recap — computational thinking" | quiz Support (abstraction); Challenge true-statements multi-select + improvement |

Quiz coverage of the source summative: abstraction term, the two "which algorithm from a description" items,
linear-vs-binary fewest-comparisons (Crane/Wren), binary-search-of-Robin "items compared", bubble-sort
after-pass-1 / after-pass-3 (Frozen/Cats/… — answers verified by hand), the "select all true" multi-select,
"what algorithm is this code" + comparisons-on-line-6 (=9 for 10 items), and the efficiency improvement.
**Dropped:** the summative's flowchart-identification item and the merge-sort split groups (Dalí/…) free-text —
both need the source flowchart/figure raster which is not extractable (see image gaps); the multi-select +
which-algorithm items already assess the same skills.

## Image gaps (lesson / where / wanted / source had one?)
| Lesson | Where | Image wanted | Source had one? |
|---|---|---|---|
| L5 Binary search | "Divide and conquer" / "Finding the midpoint" slides | a clean "halving the list / midpoint" diagram | ⚠️ no — source deck has only single-cup rasters + PPT shapes; logged, none embedded |
| L11 Algorithms review | A1 flowchart ("counting unordered items", logic errors) | a labelled flowchart raster | ⚠️ no — flowchart is PPT shapes; reframed as mystery-code + short answer |
| L12 Summative | the flowchart-identification question | the assessment flowchart | ⚠️ no — PPT shapes; question dropped, skill covered elsewhere |

Embedded OGL images (8): L4 searching hook; L6 linear-search code; L7 bubble-sort pass (also the label
widget); L8 hand-of-cards + insert-a-card; L9 bubble-sort code; L10 merge step; L11 revision robot. All from the
source decks, attribution "Teach Computing Curriculum © Raspberry Pi Foundation, OGL v3.0." in the manifest.

## Wanted-but-unbuilt question type
- **Interactive trace table** — WORKSHEET_QUESTION_TYPES.md **§2.7 (NOT BUILT)**. Wanted in **L6** (trace the
  linear search), **L9** (trace lines 7–9, the swap), **L12** (trace lines 7–9 in the quiz). Stop-gapped exactly
  as §2.7 suggests: screenshot show-your-work of a paper/board trace table + short-answer cells. This is the
  same demand §2.7 already records for GCSE Algorithms tracing — no NEW type surfaced by this unit. (Did not edit
  the shared doc per the brief; logging here.)

No other type gaps: order/card-sort/Parsons/label/multi-select/single-choice/fill/screenshot covered everything
else. Slider not needed (plenaries use the ✅ checklist, consistent with the rest of the unit).
