# Bare bones

## Today we are learning
- use the LED display for output
- read a sensor or button for input
- use a `while True` loop to keep checking
- change a program to respond to a button

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary: output · input · sensor · while loop · pixel · coordinates. One micro:bit + USB per pair.

## Starter — what does each part do?
![The micro:bit display lighting its corners]({{res:l2-micro-bit-display-teach-computing.png}})

Match each built-in part to its job on your starter worksheet.

> 🧑‍🏫 Display = the only built-in OUTPUT. Buttons, light sensor, accelerometer, temperature = INPUT. There is no separate temperature object — it uses the `temperature()` function.

## Output — the 5×5 display  (I do)
- `display.show("A")` shows one thing
- `display.set_pixel(x, y, b)` lights ONE LED

Columns and rows are numbered 0 to 4.

> 🧑‍🏫 Slide the coordinate idea slowly: top-left is (0, 0). Worked example first, then pairs try the "Output" tasks. Likely error: x or y above 4 → error scrolls; fix-words "the grid only goes up to 4".

## Input — buttons and sensors  (we do)
`while True:`
`    if button_b.was_pressed():`
`        x = x + 1`
`        display.show(x)`

> 🧑‍🏫 Predict together, then run. Stress: `while True` keeps checking forever. `was_pressed` counts each press once; `is_pressed` would fire over and over.

## You do — build the counter
On the activity worksheet, put the counter program in order, then build it on your board.

> 🧑‍🏫 Support: block-order strip to follow. Core: build it unaided. Challenge: stop the count going above 4. Paste a link + screenshot.

## I can…
Tick your four "I can…". Show me your board counting.

> 🧑‍🏫 Note who got input AND output working. Ask: "did you have any project ideas while exploring?" — write them on the board.
