# Conversion notes — KS2 Y5 Selection in quizzes (Teach Computing — adapted)

- **Slug:** `ks2-y5-selection-in-quizzes-teach-computing-adapted`
- **Course:** KS2 Computing (keyStage KS2)
- **Source:** TeachComputing/KS2/Year_5/Unit 6 Selection in quizzes (6 lesson zips + unit guide).
- **Cohort:** SEND secondary working at primary curriculum level — content kept simple/concrete, framing age-respectful (not babyish), very low reading load, heavy use of visual/drag types and real Scratch screenshots.

Every lesson = starter worksheet + activity worksheet + slide deck. 15 OGL Scratch screenshots embedded.

## Question-type variety used
Text, single-choice `(  )`, multi-select `[ ]`, fill-blank `[[ ]]` (in prose), card-sort ```sort```, order ```order```, label-a-diagram ```label``` (the quiz block), screenshot `📷`, checklist. Strong fit to the unit's selection/condition content.

## §7a alignment — objective → slide → worksheet question

### L1 Exploring conditions
| Objective | Slide | Worksheet Q |
|---|---|---|
| say what a condition is | S "What is a condition?" | starter sort (true/false), Support choice, Core fill-blank (true/false) |
| find the condition in a program | S "A condition in code", "Find the condition" | activity: identify condition (text), sort condition vs action, Support choice (which block) |
| change a condition | S "Change the condition", "Your turn" | activity Challenge (change + run) + Show your work screenshot |

### L2 Selecting outcomes
| Objective | Slide | Worksheet Q |
|---|---|---|
| forever loop checks repeatedly | S "Keep checking", "With/without a loop" | starter choice (which keeps checking), Support/Core/Challenge on the loop |
| condition + two outcomes in if/then/else | S "Two outcomes", "Read the two outcomes" | activity: identify condition/true/false, order block, Support choice (when else runs), Core (key not pressed) |
| make a program with two outcomes | S "Your turn" | activity Challenge + Show your work screenshot |

### L3 Asking questions
| Objective | Slide | Worksheet Q |
|---|---|---|
| ask a question with ask and wait | S "Ask and wait" | starter sort (binary Qs), Core fill-blank (ask/answer), Support choice (who types) |
| use the answer as the condition | S "The answer is the condition", "It must match exactly" | activity: identify question/condition, sort answers TRUE/FALSE for answer=10, Core (why "ten" is false) |
| make the program go two ways | S "Your turn" | activity Challenge + Show your work screenshot |

### L4 Designing a quiz
| Objective | Slide | Worksheet Q |
|---|---|---|
| read the task / say what it needs | S "The task", "The parts of a quiz program" | starter (name question + correct answer) |
| plan questions and answers | S "Plan your questions" | activity label-the-quiz-block + plan table, Core/Challenge (write outcomes/2nd Q) |
| work out the outcome for each answer | S "Which outcome?" | activity Support (6 correct? 11 wrong?) |

### L5 Testing a quiz
| Objective | Slide | Worksheet Q |
|---|---|---|
| build the first question | S "Build the first question" | activity order block (build steps) |
| test with right + wrong answer | S "Test it", "Debug it" | starter both/one/none, activity test choices, Support debug multi-select, Core (what to check) |
| share + kind feedback | S "Share it" | activity ✅ checklist (shared) |

### L6 Evaluating a quiz
| Objective | Slide | Worksheet Q |
|---|---|---|
| find a way to improve | S "Starter — spot the difference", "The matching problem" | starter (one difference), Core (exact-match choice), Challenge (help users) |
| add setup for same start | S "What is setup?" | activity setup multi-select, Support (when setup runs), Core (why colour reset) |
| improve in Scratch | S "Improve your quiz", "Evaluate" | activity Challenge + Show your work screenshot |

All choices are single-correct (no multi-correct on a radio); multi-correct uses the multi-select type.

## Images embedded (all OGL, from the source slide decks)
L1: key-r condition, colour-touching condition, key-arrow condition. L2: if/then/else (move-or-turn), no-loop, with-loop. L3: ask "grow", ask "favourite number = 10". L4: full quiz "is 56 in the eight times table?". L5: quiz "Is Paris…", quiz "8×7=56", running stage. L6: setup blocks (tick), condition answer=no, condition answer=yes. (L5 stage image is sourced from the L6 deck — same Scratch run.)

## Type gaps
None — all demand met by existing types (sort, order, label, multi-select, choice, fill-blank, screenshot).

## Image gaps
| Where | What would help | Source had one? |
|---|---|---|
| L1 starter | a clean "condition = a TRUE/FALSE check" concept visual | ⚠️ only code stills in source — used those |
| L3 | the algorithm branching diagram (yes/no branch) | ⚠️ source diagrams are PPT vector shapes, not rasterisable — used ask-block code stills instead |
| L4 | a blank design-template still to embed | ⚠️ template is a separate activity .docx/.pptx; used the quiz code still + a plan table instead |

## Self-verify
PASS — manifest JSON valid; every `{{res:}}` resolves to a manifest image; all slides titles end `.md`; each activity worksheet has a `📷` screenshot field; support ≠ challenge slices on every worksheet; 8–9 slides per deck with non-empty teacher notes.
