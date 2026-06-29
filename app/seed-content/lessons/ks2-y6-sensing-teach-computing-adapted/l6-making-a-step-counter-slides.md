# Making a step counter

## Today we are learning
- build my step counter program from my design
- test my program and find and fix bugs
- change the shake sensitivity so it counts better

> 🧑‍🏫 Read the three "I can…" aloud. Words on the board: create · code · test · debug · sensitivity. Recap: last lesson we designed the step counter.

## Starter — review your design
- look at the design you made last lesson
- check it is clear enough to build from

> 🧑‍🏫 Hand back the designs with feedback. On the starter worksheet pupils choose what "debug" means. Support pupils choose what "test" means.

## Build your code
![The step counter code blocks]({{res:l6-the-step-counter-code-blocks-teach-computing.png}})

- set steps to 0
- a shake changes steps by 1
- button B shows the steps and a message

> 🧑‍🏫 Pupils order the blocks (Parsons) on the activity worksheet, then build it in MakeCode from their own design. Encourage frequent testing on the emulator. TA: prompt, do not build it for them.

## Test and debug
- test on the emulator, then on a real micro:bit
- a bug is a mistake; debugging is finding and fixing it
- two ways: isolate code, or substitute one block at a time

> 🧑‍🏫 Core pupils name a way to find a bug. Likely error: changing lots at once — fix-words: "change ONE thing, then test." If the algorithm is wrong, go back to the design.

## Fix the sensitivity
![A block that counts a step only when the shake is strong]({{res:l6-a-block-that-counts-a-step-only-when-the-shake-is-strong-teach-computing.png}})

- the counter may go up too fast
- only count a step when the shake is strong: acceleration (mg) strength > 1500

> 🧑‍🏫 A bigger number means you must shake harder for a step. Each pupil tries different values. Challenge pupils explain this on the worksheet.

## I can… — end of unit
Tick your three "I can…". Tell me one way to fix a bug.

> 🧑‍🏫 Recap the whole unit: the micro:bit → if/then/else → inputs and variables → the compass → designing → making a step counter. Listen for isolate/substitute or "test on the emulator". Movement break.
