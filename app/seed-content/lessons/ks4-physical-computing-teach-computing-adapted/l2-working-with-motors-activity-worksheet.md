# Working with motors — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will wire two motors to the controller board and write code to drive them forwards and backwards.

## The wiring
The two motors connect to the controller's OUT terminals. The Pico's GP12, GP13, GP14 and GP15 connect to IN1, IN2, IN3 and IN4 to control them.

![Two DC motors wired to the L298N controller board]({{res:l2-motors-wired-to-the-controller-teach-computing.png}})

## Put the wiring steps in order
Drag these wiring steps into the right order.

```order
Screw a jumper wire into each OUT terminal
Connect each motor to a pair of OUT terminals
Connect IN1 and IN2 to GP12 and GP13
Connect IN3 and IN4 to GP14 and GP15
Connect the common ground and power rails
Connect the battery pack to the controller board
```

## Predict
Read this test program before you run it.

`from machine import Pin`
`import utime`
`motor_right_fwd = Pin(12, Pin.OUT)`
`motor_right_fwd.value(1)`
`utime.sleep(3)`
`motor_right_fwd.value(0)`

| Question | Your prediction |
|---|---|
| What will this program make the right motor do? | Type your answer here |

## Put the motor-test program in order
Drag these lines into the right order to drive a motor forwards for 3 seconds.

```parsons
from machine import Pin
import utime
motor_right_fwd = Pin(12, Pin.OUT)
motor_right_fwd.value(1)
utime.sleep(3)
motor_right_fwd.value(0)
```

## Forwards or backwards?
Sort each signal into what it does to a motor pin.

```sort
Drives the motor: value(1), a high signal, pin on
Stops the motor: value(0), a low signal, pin off
```

## 🟢 Support
| Question | Choose |
|---|---|
| `motor_right_fwd.value(1)` makes the motor… | (  ) turn (  ) stop |
| IN1 and IN2 on the board control… | (  ) one motor (  ) the screen (  ) the USB |

## 🟡 Core
| Question | Your answer |
|---|---|
| Write the two lines that set up the SECOND motor on GP14 and GP15. | Type your code here |
| If a motor turns the wrong way, what easy change fixes it? | Type your answer here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Write code to make BOTH motors drive forwards at the same time. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Which pin made your right motor go forwards? | Type your answer here |
| Show your motors connected and running | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I explained why motors need a separate controller board
- [ ] I named the parts of the motor wiring
- [ ] I wrote code to drive a motor forwards and backwards
- [ ] I worked out which motor is left and which is right
