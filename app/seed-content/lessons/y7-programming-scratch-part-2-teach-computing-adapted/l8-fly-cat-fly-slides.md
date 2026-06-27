# Fly cat, fly!

## Today we are learning
- say where a `repeat until` loop is useful
- predict what a `repeat until` loop will do
- use a `repeat until` loop in a program
- make a sprite stop at the right place

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on board: iteration · condition · condition-controlled · repeat until. This lesson is PRIMM (Predict · Run · Investigate · Modify).

## Predict — the building sprite  (predict)
![Scratch code: forever, set x to 280, next costume, repeat until x position < -220, change x by -10]({{res:l8-building-repeat-until.png}})

What will happen when the green flag is clicked?

> 🧑‍🏫 Keep predict + run VERBAL and low-stakes — no need to be right. The `repeat until` runs until the building's x is less than -220 (off the left of the screen).

## Run it  (run)
Open ncce.io/flycatfly with a partner. Were your predictions right?

> 🧑‍🏫 Draw on a few pairs. Don't over-lead — the investigation will firm it up.

## Investigate — how x works  (we do)
`set x` puts the sprite at a position; `change x by -10` moves it left each loop.

> 🧑‍🏫 Model x on the board. The investigate worksheet is in three parts: with you, with a partner, then alone. The condition `x position < -220` becomes true when the building leaves the screen.

## Modify — make the cat move  (you do)
Add `when up arrow pressed → change y by 10`, then make it fall.

![Scratch code: when up arrow key pressed, change y by 10]({{res:l8-modify-up-arrow.png}})

> 🧑‍🏫 Pair programming — driver/navigator, swap every 5 minutes. Likely error: thinks a `repeat until` checks only once → fix-words: "the condition is checked every time round; it exits the instant it is true."

## Stop at the bottom  (you do)
Swap the `forever` for a `repeat until <y position < -180>` so the cat falls and stops.

> 🧑‍🏫 Misconception M9: the condition is checked constantly; the loop exits the moment it is true. They paste their link + a screenshot on the activity worksheet.

## I can…
Tick your four "I can…". Tell me when a `repeat until` loop is better than `forever`.

> 🧑‍🏫 Plenary: targeted questions — can they explain the two loops (forever vs repeat until)?
