# Working with motors — starter worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will find out why motors need their own controller board, and start to wire one up.

## Starter — the power of GPIO
Last lesson we used the GPIO pins. The Pico has 26 GPIO pins but only a few GND pins. How can lots of devices all share a ground?

| Question | Choose |
|---|---|
| How do many devices share power and ground? | (  ) use a common rail on the breadboard (  ) use one pin for everything (  ) you cannot share |

## Why a separate board?
A motor needs much MORE power than the Pico can give. So a motor controller board (and a battery pack) drives the motors, while the Pico only sends the data signals.

![The L298N motor controller board]({{res:l2-motor-controller.png}})

## 🟢 Support
| Question | Choose |
|---|---|
| A DC motor is an… | (  ) output (  ) input |
| A motor needs… | (  ) more power than the Pico can give (  ) no power at all |
| The board that drives the motors is the… | (  ) motor controller (  ) keyboard (  ) screen |

## 🟡 Core
| Question | Your answer |
|---|---|
| Why can't the Raspberry Pi Pico power the motors directly? | Type your answer here |
| What does the Pico send to the motor controller? (a ______ signal) | Type your answer here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Explain what a "common ground rail" is and why it is useful. | Type your answer here |
