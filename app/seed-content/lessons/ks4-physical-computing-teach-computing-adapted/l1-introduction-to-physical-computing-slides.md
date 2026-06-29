# Introduction to physical computing

## Today we are learning
- describe what physical computing is
- explain what a microcontroller and an embedded system are
- tell an input device from an output device
- build and test a working circuit

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: physical computing · microcontroller · embedded system · GPIO pin · input · output · circuit. Same routine as every lesson.

## Starter — what is a microcontroller?
![A microcontroller chip]({{res:l1-microcontroller-chip-teach-computing.png}})

- a microcontroller is a tiny computer on ONE chip
- it is built to do one job

> 🧑‍🏫 Think, write, pair, share. Where might you find a microcontroller at home? (microwave, washing machine, car key, toy). When a microcontroller is put inside a product to do one job, that is an embedded system.

## What is physical computing?
- writing code that controls REAL objects
- an INPUT sends a signal IN (a button, a sensor)
- an OUTPUT sends a signal OUT (an LED, a motor)

> 🧑‍🏫 This whole unit builds one thing: a Raspberry Pi Pico buggy. Each lesson adds a new input or output.

## Meet the Raspberry Pi Pico
![The Raspberry Pi Pico board]({{res:l1-raspberry-pi-pico-board-teach-computing.png}})

- USB port — power and code
- BOOTSEL button — for setup
- the microcontroller chip — the "brain"
- GPIO pins — connect inputs and outputs

> 🧑‍🏫 GPIO = General-Purpose Input/Output. Pupils label these four parts on the starter worksheet. Common misconception: "the Pico IS the computer" — fix-words: "the Pico is the microcontroller, a tiny computer on one chip."

## The components we will use
![Physical computing components: Pico, sensors, motor board, parts]({{res:l1-physical-computing-components-teach-computing.png}})

- over the unit we add: motors, an ultrasonic sensor, line sensors and lights

> 🧑‍🏫 Reassure: we add ONE part at a time and test it before moving on. Nobody has to remember it all at once.

## I-do — make an LED blink
![An LED wired to the Pico on a breadboard]({{res:l1-led-circuit-on-a-breadboard-teach-computing.png}})

- long leg → resistor → GP15
- short leg → GND (ground)
- `led.value(1)` = on, `led.value(0)` = off

> 🧑‍🏫 Live-build the circuit, then live-code the blink loop. Stress: current flows ONE way through an LED; everything needs a path back to GND. Likely error: LED in backwards — long leg to the pin.

## You-do — build it and run it
- build the LED circuit
- put the blink program in order (activity worksheet)
- Challenge: add a button so the LED only lights when pressed

> 🧑‍🏫 Support: choose what value(1)/value(0) does. Core: complete the loop. Challenge: the button circuit (3v3 + pull-down). TA: prompt, do not wire it for them. Screenshot the working circuit.

## I can…
Tick your four "I can…". Show me your LED working.

> 🧑‍🏫 Quick-fire plenary: input or output? what is GPIO? what is an embedded system? Note who built a working circuit.
