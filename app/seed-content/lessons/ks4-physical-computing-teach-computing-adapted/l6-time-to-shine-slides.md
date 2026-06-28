# Time to shine!

## Today we are learning
- wire white headlights and red brake lights
- turn lights on and off at the right time in code
- combine motors, sensors and lights so the buggy works on its own
- review the whole project

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary: headlight · brake light · anode · cathode · synergy · autonomous · sequence. Final lesson — pupils are more independent; use the assessment rubric while they work.

## Starter — light it up!
![A white LED]({{res:l6-led-white.png}})

- long leg (anode) → a GPIO pin
- short leg (cathode) → ground
- headlights white, brake lights red

> 🧑‍🏫 Recall last lesson's homework: which pins, what setup, when on/off. Likely error: LED in backwards — fix-words: "long leg to the pin, short leg to ground."

## I-do — add the lights
![A red LED]({{res:l6-led-red.png}})

- white LEDs at the front (headlights)
- red LEDs at the back (brake lights)
- test each with simple on/off code

> 🧑‍🏫 Anode to a spare GPIO pin, cathode to the ground rail. Pupils put the "flash headlights three times" program in order on the worksheet.

## We-do — synergy
- synergy = the parts working together as one
- inputs (sensors) decide what the outputs (motors, lights) do
- the buggy should look like it runs itself

> 🧑‍🏫 Emphasise the word synergy. The buggy must travel a circuit, light up at the right times, and avoid an obstacle.

## You-do — the Pico Grand Prix
![The finished buggy with headlights and ultrasonic sensor]({{res:l6-buggy-final.png}})

- flash headlights ×3, brake lights on, wait 5 s
- brake lights off, drive the circuit
- keep checking the ultrasonic distance
- stop + brake lights if something is in the way

> 🧑‍🏫 Pupils order the whole sequence on the worksheet, then build and test. Support: match each light to when it is on. Core: complete the start sequence. Challenge: add line-following. TA: prompt, get ONE behaviour working before combining. Screenshot the finished buggy.

## End-of-unit quiz + what next?
- sit the end-of-unit quiz (set separately)
- what would you add or improve next?

> 🧑‍🏫 The quiz reviews the whole unit in exam conditions. Plenary: collect improvement ideas. Self-tick the four "I can…". Note finished buggies for the rubric.
