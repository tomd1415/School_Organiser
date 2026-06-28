# Time to shine — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will wire and code my buggy's lights, then combine everything for the final challenge.

## Add the lights
White headlights at the front, red brake lights at the back. Anode (long leg) → a spare GPIO pin; cathode (short leg) → the ground rail.

![A red LED]({{res:l6-led-red.png}})

![The finished buggy with its headlights and ultrasonic sensor]({{res:l6-buggy-final.png}})

## Put the headlight flash program in order
Drag these lines into order to flash the headlights three times.

```parsons
from machine import Pin
from utime import sleep
headlights = Pin(16, Pin.OUT)
for x in range(0, 3):
    headlights.value(1)
    sleep(0.5)
    headlights.value(0)
    sleep(0.5)
```

## Put the final sequence in order
Drag the whole start-up sequence into the right order.

```order
Brake lights ON at a standstill
Flash the headlights three times
Wait five seconds
Turn the brake lights off
Drive forwards around the circuit
Keep checking the ultrasonic distance
Stop and put the brake lights on if an obstacle is close
```

## 🟢 Support
| Question | Match each light to when it is on |
|---|---|
| Brake lights | (  ) when stopped (  ) when driving forwards |
| Headlights | (  ) flash at the start (  ) never used |

## 🟡 Core
| Question | Your answer |
|---|---|
| Write the line that sets up the brake lights on GP17 as an output. | Type your code here |
| After the five-second wait, what must happen before the buggy drives off? | Type your answer here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Add line-following into your final run. Describe in words how the lights, motors and sensors all work together. | Type your answer here |

## Show your work
| Question | Your answer |
|---|---|
| Which GPIO pins did you use for your lights? | Type your answer here |
| Show your finished buggy completing the challenge | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I wired white headlights and red brake lights to the Pico
- [ ] I turned lights on and off at the right time in my code
- [ ] I combined motors, sensors and lights so the buggy works on its own
- [ ] I answered review questions about the whole project
