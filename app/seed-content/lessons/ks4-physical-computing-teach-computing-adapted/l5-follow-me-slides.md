# Follow me!

## Today we are learning
- explain how a reflective optical sensor works
- wire two optical sensors to the Pico
- read sensor values to tell if the buggy is on or off the line
- use the values to steer the buggy along a line

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary: reflective optical sensor · infrared · reflect · potentiometer · digital signal · autonomous. Wiring recap first — check last lesson's wiring still matches.

## How does it work?
![A reflective optical sensor]({{res:l5-optical-sensor.png}})

- shines infrared light DOWN at the floor
- black line reflects little → reads 1
- white floor reflects lots → reads 0

> 🧑‍🏫 Pupils match the three pins (G, V+, S) on the starter worksheet. The little dial is a potentiometer that tunes the sensitivity.

## I-do — add two sensors
- GND → blue rail, VCC → red rail
- OUT → GP10 (left), GP11 (right)
- cover a sensor and watch the value change

> 🧑‍🏫 Likely error: both OUT wires to the same pin — fix-words: "left sensor GP10, right sensor GP11." Run the test code and read Left/Right values.

## We-do — the steering rules
![A buggy following a line]({{res:l5-line-follower.png}})

- both read 0 → drive forwards (on the line)
- right reads 1 → turn right
- left reads 1 → turn left

> 🧑‍🏫 Pupils sort each situation to the action on the activity worksheet before they code it. Turning = one motor forwards, the other stopped/reversed.

## You-do — line-following challenge
- write and refine the steering code
- test on the track and adjust the potentiometer
- Challenge: follow a curve

> 🧑‍🏫 Support: match situation to action. Core: complete the forwards branch. Challenge: the curve. TA: prompt, tune the dial if it is too twitchy. Screenshot it working.

## I can…
Tick your four "I can…". Quick GPIO quiz: Pin.OUT or Pin.IN? value(1) or value(0)?

> 🧑‍🏫 Homework: plan headlight + brake-light code in Python for next lesson. Note whose buggy followed the line.
