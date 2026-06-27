# Connections

## Today we are learning
- use a pin to send output (LED, speaker)
- use a pin to read input (switch, touch)
- send and receive a radio message
- explain why a circuit must be closed

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary: GPIO pin · circuit · current · wireless · radio · group · message. Pairs share micro:bits; some tasks need wires, a speaker or an LED.

## Starter — light it up
A bulb only lights when the **circuit is closed**.

> 🧑‍🏫 Use the starter "order" task — close the circuit so current flows. Link to science. Then explain the micro:bit can be PART of a circuit through its pins.

## The pins (GPIO)
![The micro:bit pins: 0, 1, 2, 3V, GND]({{res:l3-microbit-pins-teach-computing.png}})

- `pin0`, `pin1`, `pin2` connect to other parts
- `3V` gives power, `GND` is ground

> 🧑‍🏫 Output through a pin: turn an LED or speaker on/off. Input through a pin: detect a switch or a touch. Common error: using the wrong pin (pin0 vs pin1) → "check which pin your wire is in".

## Wireless — the radio  (I do → we do)
`radio.on()`
`radio.send("ping")`     # send
`radio.receive()`        # listen

> 🧑‍🏫 Two boards on the same group can talk. Messages are TEXT only — a number must become a string first with `str(...)`. Worked example, then pairs flash the SAME program onto two boards.

## You do — pass the love
On the activity worksheet: sort the pin uses, then put the radio program in order and test it on two boards.

> 🧑‍🏫 Support: block-order strip. Core: build it. Challenge: explain how shake-on-one shows heart-on-other. Paste a link + screenshot.

## I can…
Tick your four "I can…". Show me two boards talking.

> 🧑‍🏫 Homework: put a project idea on paper for next lesson. Note pairs who got radio working.
