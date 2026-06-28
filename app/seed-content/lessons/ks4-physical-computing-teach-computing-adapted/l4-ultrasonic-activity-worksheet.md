# Going ultrasonic — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will wire the ultrasonic sensor to my buggy and run code that measures the distance to an object.

## The four pins
The HC-SR04 ultrasonic sensor has four pins. Match each pin to its job.

![The HC-SR04 ultrasonic sensor with four pins: VCC, Trig, Echo, Gnd]({{res:l4-ultrasonic-sensor.png}})

| Pin | What it does |
|---|---|
| VCC | (  ) power in (  ) ground (  ) send the ping (  ) hear the echo |
| GND | (  ) power in (  ) ground (  ) send the ping (  ) hear the echo |
| Trig | (  ) power in (  ) ground (  ) send the ping (  ) hear the echo |
| Echo | (  ) power in (  ) ground (  ) send the ping (  ) hear the echo |

## Put the wiring steps in order
Drag the wiring steps into the right order.

```order
Connect four female-to-male jumper cables to the sensor
Connect Trig to GP20 on the Pico
Connect Echo to GP21 on the Pico
Connect VCC to the red common power rail
Connect GND to the blue common ground rail
```

## Put the test program in order
Drag these lines into the right order to read the distance.

```parsons
from machine import Pin
import utime
trig = Pin(20, Pin.OUT)
echo = Pin(21, Pin.IN)
trig.high()
utime.sleep_us(5)
trig.low()
distance = round((elapsed * 0.0343) / 2, 2)
print("Distance from object is", distance, "cm")
```

## 🟢 Support
| Question | Choose |
|---|---|
| The Trig pin is set as an… | (  ) output (Pin.OUT) (  ) input (Pin.IN) |
| The Echo pin is set as an… | (  ) output (Pin.OUT) (  ) input (Pin.IN) |
| If Trig and Echo are swapped, the sensor will… | (  ) not work (  ) work better |

## 🟡 Core
| Question | Your answer |
|---|---|
| The sensor measures TIME. How is that turned into a distance? | Type your answer here |
| Complete the line: `print("Distance from object is", ______, "cm")` | Type your answer here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Write an `if` statement that stops the buggy when the distance is less than 10 cm. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| What distance did your sensor read for an object up close? | Type your answer here |
| Show your sensor reading distances | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I explained how ultrasonic sound waves sense distance
- [ ] I named the four pins of the sensor and what they do
- [ ] I wired the ultrasonic sensor to the Raspberry Pi Pico
- [ ] I ran code that measures the distance to an object
