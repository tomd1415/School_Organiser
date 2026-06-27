# Conversion notes — Y9 Python programming with sequences of data (Teach Computing — adapted)

Slug: `y9-python-sequences-of-data-teach-computing-adapted` · Course: Computing Curriculum (KS3) · 6 lessons.
Source: `TeachComputing/KS3/year_9/unit_1` (L1 Warm up, L2 Playlist, L3 In a while crocodile, L4 The famous for,
L5 Make a thing, L6 Wrap up). Text-based Python on lists/strings — heavy use of Parsons, card-sort, matching,
fill-blank, code fields and embedded source code screenshots.

**Videos:** the source zips contain NO video files (slides `.pptx` + worksheet `.docx` only) — nothing to embed.

## §7a alignment tables

### L1 — Warm up (selection and lists)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| read a program and predict what it displays | S Selection recap | starter: walkthrough (Support MC); activity: Predict MC (weekday code image) |
| use selection (if-elif-else) | S Selection recap | starter Challenge (colon); activity Challenge (fix `if day = 4:`) |
| find and fix common syntax errors | S Spot the syntax errors | activity: card-sort "syntax error / no error"; Challenge fix line |
| create a list and read an item by index | S Lists — a number for a name | activity Support MC index · Core fill-blank index · ✅ show-your-work |

### L2 — Playlist (operations on lists)
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| add and remove items | S Operations / S Solar system | activity Support MC (append) · Core fill-blank append + code remove |
| find an item's index and count | S Operations | starter: matching (operation→job); Challenge pop vs remove |
| reorder a list (sort/reverse) | S Dice battle | activity card-sort (reorder group) · Challenge code `sort(reverse=True)` (dice image) |
| choose the right operation | S Operations (card-sort) | activity card-sort; ✅ checklist |

### L3 — In a while, crocodile
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| while loop until a condition | S Form a band / S City hopping | activity Parsons (city hopping) · Support MC condition |
| build a list with append in a loop | S City hopping | activity Parsons + Core fill-blank `append` |
| use len and in on lists/strings | S Starter passwords / S City guessing | starter MC len + Support MC `in`; Core/Challenge |
| read a character by index | S City guessing | activity Core `"London"[0]` · Challenge code first letter (city-guessing image) |

### L4 — The famous for
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| for loop over a list | S Starter shopping / S English words | starter MC predict; activity Support MC loop header · Core code print every word |
| count items that match | S Three patterns | activity card-sort (counting pattern) |
| collect matches into a new list | S Three patterns / S English words | activity card-sort (collecting pattern) · Core/Challenge code |
| for loop over a string | S Lipogram (Gadsby) | activity Challenge heartbeats loop header (ECG image); lipogram on slide |

### L5 — Make a thing
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| build up a sum/count in a loop | S Starter sums / S Sums in a for-loop | starter MC; activity Support MC accumulator · Core fill-blank |
| for loop over a string | S for on a string | activity Parsons (count the vowels, code image) |
| combine selection/iteration/list+string | S Make a thing | activity Challenge (plan + start mini-project) · show-your-work |
| choose and start a mini-project | S Make a thing | activity Challenge (which project + first lines) · ✅ |

### L6 — Wrap up
| Objective | Slide(s) | Worksheet Q / level |
|---|---|---|
| finish and show my mini-project | S Finish your mini-project | activity Show-your-work (link + screenshot) |
| read list/string code, predict output | S Show what you know | starter multi-select; activity Predict MC (days) · Challenge read planets output |
| complete a loop over a sequence | S Order the program | activity Core fill-blank loop · Parsons (alphabet position) |
| reflect on what I have learned | S Reflection | activity Reflection (text + confidence slider) · ✅ |

All MCs are single-correct; multi-correct uses multi-select (`[ ]`) — L6 starter "which work on a list".
Question-type spread: matching ×3 (L1,L2,L6), card-sort ×3 (L1,L2,L4), Parsons ×4 (L3,L5,L6 + L5 strings),
fill-blank ×6, code fields ×6, slider ×3 (L5,L6), multi-select ×1 (L6), plus MC throughout.

## Image gaps (§4 candidates)
| Lesson | Where | What image is wanted | Source had one? |
|---|---|---|---|
| L1 | Lists slide / a "label the index" task | a CLEAN list diagram with empty index boxes (would unlock a label-a-diagram widget) | ⚠️ source only has code screenshots with values pre-shown — none blank |
| L2 | "operations on lists" slide | a before/after list visual for append vs remove | ⚠️ source deck had no clean still (used dice-battle image + code-as-text) |
| L6 | "images are sequences too" slide; optional pixel mini-project | a before/after colour-filter still (original → filtered) | ⚠️ image assets are licensed for the activity only (do not redistribute) — none embedded; logged |

Embedded code screenshots from the source decks: L1 weekday-selection + months-list; L2 dice-battle; L3
city-hopping + city-guessing; L4 english-words + ECG heartbeats plot + Gadsby cover; L5 for-on-strings +
self-confidence table. (Pair-programming illustration on L1.) All OGL v3.0, attributed in the manifest.

## Wanted-but-unbuilt question types
None. The built set (Parsons, order, card-sort, matching, fill-blank, code, multi-select, slider, screenshot,
checklist) covered every demand. **label-a-diagram** would have been ideal for a "label the list indices" task
(L1) but no clean unlabelled list image exists in the source — logged as an image gap above rather than a
type gap (the type is built; the asset is missing).

## Self-verify
PASS — all 6 manifests resolve; every `{{res:}}` placeholder maps to a declared file present on disk; every
slides resource title ends `.md`; teacher notes present on every deck (7–8 slides each); level sections slice
(Support/Core/Challenge differ in content); every activity worksheet has a 📷 screenshot field; the three
matching tables render as drag-match widgets; MCs are single-correct. Throwaway scripts deleted.
