# Hello physical world

## Today we are learning
- describe what the micro:bit is
- list its input and output devices
- write and run a Python program on the micro:bit
- find and fix a syntax error

> 🧑‍🏫 Read the four "I can…" aloud. Same routine as every lesson. New vocabulary on the board: input · output · sensor · hardware component · flash · syntax error.

## Starter — input or output?
Think · pair · share. On your starter worksheet, drag each device into **input** or **output**.

> 🧑‍🏫 Take answers onto two board columns. Watch for "sensors" — push for WHICH sensor (light, sound, movement). The screen is an OUTPUT; the microphone is an INPUT.

## Meet the micro:bit
![The front of the micro:bit board]({{res:l1-micro-bit-front-teach-computing.png}})

- buttons A and B
- a 5×5 LED display
- a USB socket and gold pins along the bottom

> 🧑‍🏫 Label the board together first, then pupils do the label task on the starter worksheet. It runs YOUR Python, not the computer's.

## Know your tools — front and back
![The back of the micro:bit, components labelled]({{res:l1-micro-bit-back-labelled-teach-computing.png}})

Hidden on the back: the processor, compass, accelerometer and radio antenna.

> 🧑‍🏫 Link each component back to the input/output columns. The accelerometer senses movement (input); the radio sends messages (output).

## I do — Hello there!  (live coding)
`from microbit import *`
`display.scroll("Hello there!")`

Flash it. The words scroll across the LEDs.

> 🧑‍🏫 Live-code it; pupils follow along in pairs. Show how to connect the USB cable and press flash. Likely error: missing quote marks → fix-words "text always goes inside quotes".

## You do — change it  (your turn)
- swap `scroll` for `show`
- swap the text for `Image.HEART`

> 🧑‍🏫 Support: "change THIS line" arrow card. Core: change it unaided. Challenge: spot the syntax error on the worksheet. Paste a link + screenshot on the activity worksheet.

## I can…
Tick your four "I can…". Show me your micro:bit running.

> 🧑‍🏫 Note who flashed a working program. A syntax error scrolls on the display — that is normal, read it together.
