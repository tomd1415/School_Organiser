# Conversion notes — KS1 Y2 Making music (Teach Computing — adapted)

Slug: `ks1-y2-making-music-teach-computing-adapted` · Course: KS1 Computing (KS1) · 6 lessons.
Source: TeachComputing KS1 Year 2 Unit 5 "Making music" (6 lesson zips + unit guide). Tool used by
the pupils: **Chrome Music Lab** (Rhythm tool, Kandinsky, Song Maker). Music has sound — all audio is
framed as **teacher-played**, volume kept low, headphones offered; no flashing/animation on slides.

Primary content, SEND-secondary cohort: simple/concrete, low reading load, age-respectful (no infant
tone). Heavy use of visual/drag types (sort, order, label, multi-select, scale, screenshot).

## §7a Alignment — objective ↔ slide ↔ worksheet question

### L1 How music makes us feel
| Objective | Slide | Worksheet Q |
|---|---|---|
| hear differences between two pieces | S3 Mars, S4 Venus | starter: choose loud/fast vs quiet/slow for Mars and Venus |
| describe music using words | S5 describing words | activity: SORT words into Mars/Venus; Core write a word |
| say how music makes me feel | S3–S4 | activity: scale (how much liked); Core words |
| say what I like / do not like | S5 | activity: Challenge "which did you like, why" |

### L2 Rhythms and patterns
| Objective | Slide | Worksheet Q |
|---|---|---|
| make a pattern | S3 colour pattern | starter: choose next in 🔴🟡 pattern |
| play a rhythm from a pattern | S4 clapping | starter: rhythm = pattern of sounds; we-do clap |
| make a rhythm on the computer | S5 Rhythm tool | activity: LABEL play/dots; ORDER make-a-rhythm steps; show-your-work |
| say people make and play music | S4 | activity: MULTI-SELECT who can make music |

### L3 How music can be used
| Objective | Slide | Worksheet Q |
|---|---|---|
| connect pictures with sounds | S3 drawing music | activity: drawing example; SORT high/low |
| use a computer to change pitch | S4 pitch, S5 Kandinsky | starter: high = top; activity ORDER steps |
| make high and low sounds | S4 | activity: SORT high/low sounds |
| make music about an idea | S6 rocket | activity: name space object + show-your-work |

### L4 Notes and tempo
| Objective | Slide | Worksheet Q |
|---|---|---|
| music is a sequence of notes | S3 a note | starter: a block = a note; Core "what is a block" |
| make a pattern of notes | S4 Song Maker | activity: ORDER Song Maker steps; show-your-work |
| change the instrument | S5 | activity: MULTI-SELECT what you can change |
| change the tempo | S6 tempo | starter: fast tempo = quick; Core "what does tempo change" |

### L5 Creating digital music
| Objective | Slide | Worksheet Q |
|---|---|---|
| choose an animal | S3 animals | activity: name animal; SORT fast/slow animals |
| make a rhythm for my animal | S4 tap rhythm | starter: elephant/mouse rhythm; activity ORDER steps |
| make the rhythm on the computer | S5 Song Maker | activity: ORDER steps; show-your-work (link + shot) |
| add a pattern of notes | S6 add notes | activity: ORDER (add notes step); Challenge how it fits animal |

### L6 Reviewing and editing music
| Objective | Slide | Worksheet Q |
|---|---|---|
| open my saved work | S2 open link | starter: open saved link |
| listen to / review my work | S3 review | activity: ORDER (listen step) |
| edit my work to make it better | S4 edit | starter: edit = change; activity MULTI-SELECT + ORDER + scale |
| say how I changed my work | S4 | activity: Challenge "what did you change, why better" |

Every objective is taught on a slide and asked on a worksheet; every worksheet question maps to a
slide/plan item. All single-choice cells have exactly one correct option (no multi-correct radios) —
"tick all that apply" uses the multi-select `[ ]` type.

## Question-type coverage
single-choice, multi-select, card-sort (`sort`), order (`order`), label-a-diagram (`label`),
slider (`scale`), screenshot, checklist, text. No new type-gaps — the built set covered every demand.
(Trace tables / interactive grids not relevant to KS1 music.)

## Images embedded (all OGL, from the source .pptx decks)
- L1: solar system, Mars, Venus, Chrome Music Lab spectrogram (computer makes music).
- L2: clapping hands; Chrome Music Lab **Rhythm tool** screenshot (also used as the `label` image).
- L3: Neptune photo; a child's "drawing music" example; rocket (space idea); Chrome Music Lab home.
- L4: Chrome Music Lab home (Song Maker smiley visible).
- L5: elephant photo (walking example), mouse, crocodile, bird (animal choices).
- L6: colourful music-bars graphic.

## Image-gap log (also added to docs/WORKSHEET_QUESTION_TYPES.md §4 candidates)
| Lesson | Where | Wanted | Source had? |
|---|---|---|---|
| L4 / L5 | Song Maker slides | a clean **Song Maker note-grid** screenshot (coloured note blocks + tempo slider) | ⚠️ source decks only show the CML *home* thumbnail; the Song Maker grid itself is a screen-recording/animation — embed a still next pass |
| L3 | Kandinsky slide | a still of the **Kandinsky** draw-to-make-sound screen | ⚠️ not a clean still in source (animated demo) — used the CML home grid instead |
| L2 | Rhythm tool label | the label coords (play/dots) are hand-set approximations on the Rhythm screenshot | ✅ image embedded; verify zone positions in /ui-gallery if a picker lands |

## Self-verify
renderWorksheet + sliceSlidesForLevel/splitTeacherNotes over all 6 lessons: every activity worksheet
has a screenshot (image) field, support≠challenge slices, ≥7 slides each, non-empty teacher notes;
all `{{res:}}` placeholders resolve to a manifest file; slides resource titles end `.md`. PASS.
