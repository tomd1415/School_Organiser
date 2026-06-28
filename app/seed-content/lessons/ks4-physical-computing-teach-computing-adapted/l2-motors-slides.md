# Working with motors

## Today we are learning
- explain why motors need a separate controller board
- name the parts of the motor wiring
- write code to drive a motor forwards and backwards
- work out which motor is left and which is right

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary: motor controller · L298N · IN1–IN4 · OUT1–OUT4 · common rail · ground · battery pack. Same routine as every lesson.

## Starter — the power of GPIO
- the Pico has 26 GPIO pins but only a few GND pins
- how do many devices share power and ground?

> 🧑‍🏫 Tease out: a COMMON rail on the breadboard. One ground rail, one power rail, that everything connects to. We will use this today.

## Why a separate board?
![The L298N motor controller board]({{res:l2-motor-controller.png}})

- motors need MORE power than the Pico can give
- a battery pack powers the motors through the controller
- the Pico only sends the data signals (IN1–IN4)

> 🧑‍🏫 The controller is the bridge between the Pico and the motors. The Pico is the brain; the battery is the muscle.

## The pin map
![Raspberry Pi Pico pinout]({{res:l2-pico-pinout.png}})

- IN1, IN2 → GP12, GP13 (one motor)
- IN3, IN4 → GP14, GP15 (other motor)

> 🧑‍🏫 Keep the pinout handout out all lesson. Likely error: motors wired to the wrong IN pins — fix-words: "IN1/IN2 to GP12/GP13, IN3/IN4 to GP14/GP15."

## I-do — wire it up
![Two DC motors wired to the controller]({{res:l2-motor-wiring.png}})

- screw wires into the OUT terminals → motors
- IN pins → GP12–GP15
- common ground + power rails, then the battery pack

> 🧑‍🏫 Live-demo or work through the activity worksheet order task. Stress the common rails from the starter.

## We-do → you-do — test the motors
- `motor_right_fwd = Pin(12, Pin.OUT)`
- `value(1)` = drive, `value(0)` = stop
- find left vs right, forwards vs backwards

> 🧑‍🏫 Support: choose what value(1) does. Core: code the second motor. Challenge: both forwards together. If a motor spins the wrong way, swap the pin numbers. TA: prompt, do not screw it in for them.

## Make it move differently
- how would you spin on the spot?
- how would you zigzag?

> 🧑‍🏫 Plenary discussion only — no need to code it yet. Homework: collect recycled materials for the chassis next lesson. Note who got both motors driving.
