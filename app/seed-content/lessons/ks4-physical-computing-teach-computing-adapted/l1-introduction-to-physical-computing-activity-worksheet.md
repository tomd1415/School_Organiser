# Introduction to physical computing — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will build a real circuit with an LED and make it blink with code on the Raspberry Pi Pico.

## Build the circuit
Build this circuit on your breadboard. The **long leg** of the LED goes to the resistor, then to **GP15**. The **short leg** goes to **GND**. Current only flows one way through an LED.

![An LED, a resistor and jumper cables wired to a Raspberry Pi Pico on a breadboard]({{res:l1-led-circuit-on-a-breadboard-teach-computing.png}})

## Predict
Read this program before you run it.

`from machine import Pin`
`led = Pin(15, Pin.OUT)`
`led.value(1)`

| Question | Your prediction |
|---|---|
| What will this program do to the LED? | Type your answer here |

## Put the blink program in order
Drag these lines into the right order to make the LED blink.

```parsons
from machine import Pin
from utime import sleep
led = Pin(15, Pin.OUT)
for x in range(0, 10):
    led.value(1)
    sleep(0.5)
    led.value(0)
    sleep(0.5)
```

## 🟢 Support
| Question | Choose |
|---|---|
| `led.value(1)` turns the LED… | (  ) on (  ) off |
| `led.value(0)` turns the LED… | (  ) on (  ) off |
| Every device needs a path back to… | (  ) GND (ground) (  ) the screen (  ) the USB |

## 🟡 Core
| Question | Your answer |
|---|---|
| Which GPIO pin is the LED connected to in the code? | Type your answer here |
| `Pin(15, Pin.OUT)` sets the pin as an output. Why is the LED an output? | Type your answer here |

## 🔴 Challenge
Add a button so the LED only lights while the button is held. The button is on GP14.

| Question | Your answer |
|---|---|
| Write the line that sets up the button as a pulled-down input on GP14. | Type your code here |
| Why does the button pin need to be "pulled down"? | Type your answer here |

## Show your work
| Question | Your answer |
|---|---|
| Which GPIO pin did you use for your LED? | Type your answer here |
| Show your working circuit | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I described what physical computing is
- [ ] I explained what a microcontroller and an embedded system are
- [ ] I told an input device from an output device
- [ ] I built and tested a working circuit with an LED
