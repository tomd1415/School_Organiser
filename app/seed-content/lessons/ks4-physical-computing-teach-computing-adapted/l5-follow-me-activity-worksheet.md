# Follow me — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will wire two optical sensors and use their values to steer my buggy along a line.

## The line-following idea
Two sensors point at the floor, one each side of the line. Reading them tells the buggy if it has drifted off the line, so it can steer back.

![A buggy following a black line]({{res:l5-line-follower.png}})

## Put the test code in order
Drag these lines into order to print both sensor values.

```parsons
from machine import Pin
import utime
left_sensor = Pin(10, Pin.IN)
right_sensor = Pin(11, Pin.IN)
while True:
    print("Left:", left_sensor.value())
    print("Right:", right_sensor.value())
    utime.sleep(2)
```

## Sort each situation to the right action
A sensor reads **1** when it is ON the black line, **0** when it is over the white floor. Drag each situation to what the buggy should do.

```sort
Drive forwards: both sensors read 0, the buggy is centred on the line
Turn right: the right sensor reads 1, the left sensor reads 0
Turn left: the left sensor reads 1, the right sensor reads 0
```

## 🟢 Support
| Question | Choose |
|---|---|
| The left sensor's OUT pin connects to… | (  ) GP10 (  ) the screen (  ) the battery |
| Each sensor is set up as an… | (  ) input (Pin.IN) (  ) output (Pin.OUT) |

## 🟡 Core
| Question | Your answer |
|---|---|
| Complete the rule: if both sensors read 0, the buggy should ______. | Type your answer here |
| To turn right, one motor goes forwards and the other goes backwards. Which one stops/reverses? | Type your answer here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Write the `if` branch that turns the buggy right when the right sensor reads 1 and the left reads 0. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| What values did your sensors read on the line and off the line? | Type your answer here |
| Show your buggy following the line | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I explained how a reflective optical sensor works
- [ ] I wired two optical sensors to the Raspberry Pi Pico
- [ ] I read the sensor values to tell if the buggy is on or off the line
- [ ] I used the sensor values to steer the buggy along a line
