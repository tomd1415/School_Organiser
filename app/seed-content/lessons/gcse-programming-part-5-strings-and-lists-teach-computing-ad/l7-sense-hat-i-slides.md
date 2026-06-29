# Sense HAT I

## Today we are learning
- start a Sense HAT program and show a message
- use RGB values to make a colour
- use a list to light up the LED matrix
- make my own pixel character

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: Sense HAT · LED matrix · pixel · RGB · emulator. Same routine. Everyone has the Sense HAT emulator (or a board) open. Output is on a small 8×8 grid — no flashing animation.

## Starter — array vs list
- A **Sense HAT** is a board on top of a Raspberry Pi.
- The **LED matrix** is an 8×8 grid of lights (64 **pixels**).
- We control it with a **list** — because a list can hold the 64 colours.

> 🧑‍🏫 Recap array vs list from last lesson. Support: tick what an LED matrix is. Challenge: 8×8 = 64 pixels.

## Show a message + RGB  (I do)
```python
from sense_hat import SenseHat
sense = SenseHat()
sense.show_message("Hi", text_colour=(0, 0, 255))
```
- Colour is **RGB**: `(Red, Green, Blue)`, each 0–255.

> 🧑‍🏫 I-do. `(255,0,0)` is red, `(0,255,0)` green, `(0,0,255)` blue. Store them in variables for clarity. The message scrolls slowly — calm, not flashing.

## We do — a list of pixels
- A list of 64 colours sets all 64 pixels with `set_pixels(...)`.
- Lay the list out in 8 rows of 8 so you can SEE the picture.

> 🧑‍🏫 We-do. Show the smiley list. Point out the rows line up with the grid. Likely error: a comma after the last item, or the wrong count of items. Fix-words: "8 rows of 8 — count them."

## Your turn  (you do)
- Support: order a coloured-message program (Parson's).
- Core: show a message in green.
- Challenge: design your own 8×8 character.

> 🧑‍🏫 Pair programming, swap every 5 mins. TA: prompt, don't do it for them. Screenshot the LED grid at the end. Movement break is routine.

## I can…
Tick your four "I can…". Show me your LED matrix.

> 🧑‍🏫 Plenary. Recap: RGB = three colour numbers; a list of 64 colours fills the grid. Next lesson: random pixels.
