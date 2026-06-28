# Going ultrasonic!

## Today we are learning
- explain how ultrasonic sound waves sense distance
- name the four pins of the sensor and what they do
- wire the ultrasonic sensor to the Pico
- run code that measures distance

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary: ultrasonic · sound wave · sensor · Trig · Echo · VCC · GND · distance.

## Starter — what do these share?
![A dolphin]({{res:l4-dolphin.png}})

- a bat, a dolphin and a submarine
- they all use ULTRASONIC sound to sense their surroundings

> 🧑‍🏫 Ultrasonic = too high for humans to hear. Send a sound, listen for the echo. The time to come back tells you the distance. This is echolocation.

## Meet the sensor
![The HC-SR04 ultrasonic sensor]({{res:l4-ultrasonic-sensor.png}})

- VCC — power in
- GND — ground
- Trig — sends the ping out
- Echo — hears the ping bounce back

> 🧑‍🏫 Pupils match the four pins on the activity worksheet. Likely error: Trig and Echo swapped — fix-words: "Trig sends, Echo hears — GP20 then GP21."

## I-do — wire it up
- Trig → GP20
- Echo → GP21
- VCC → red rail, GND → blue rail

> 🧑‍🏫 Use the pinout handout. Build it together or work through the order task on the worksheet.

## We-do — how it measures distance
- time how long the ping takes to come back
- distance = time × speed of sound ÷ 2
- the buggy can now "feel" how far away things are

> 🧑‍🏫 The numbers in the code are not random: 0.0343 cm per microsecond is the speed of sound; ÷ 2 because the ping goes there AND back.

## You-do — test it
- put the test program in order (Parsons)
- read the distance as objects move closer/further
- Challenge: stop the buggy within 10 cm

> 🧑‍🏫 Support: choose what Trig does. Core: complete the print line. Challenge: the if-stop. TA: prompt, check the pins first. Screenshot the readings.

## I can…
Tick your four "I can…". How could you join the motors AND the sensor to avoid bumps?

> 🧑‍🏫 Plenary discussion seeds the final challenge. Note who got a distance reading.
