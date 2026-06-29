# Bare bones — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will write programs that use the micro:bit's **display** for output and its **sensors and buttons** for input. I will use a `while True` loop to keep checking for input.

## Predict
Read this program before you run it.

`from microbit import *`
`x = 0`
`while True:`
`    if button_b.was_pressed():`
`        x = x + 1`
`        display.show(x)`

| Question | Your prediction |
|---|---|
| What do you think this program does when you press button B a few times? | Type your answer here |

## Order matters
A counter program must **start the count at 0 before the loop**, then check the button **inside** the loop. Drag these lines into the right order.

```parsons
from microbit import *
counter = 0
while True:
    if button_b.was_pressed():
        counter = counter + 1
        display.scroll(counter)
```

## 🟢 Support
Fill each gap so the line does its job. `set_pixel(x, y, b)` lights the LED at column `x`, row `y`, with brightness `b`.

| Question | Your answer |
|---|---|
| Light the top-left LED at full brightness: display.set_pixel(0, 0, [[ ]]) | Type your answer here |
| Read how much light is falling on the board: light = display.read_light_[[ ]]() | Type your answer here |

## 🟡 Core
| Question | Your answer |
|---|---|
| Why do we wrap the code in `while True:`? | Type your answer here |
| `display.read_light_level()` gives back a number from 0 to 255. What does a **bigger** number mean? | Type your answer here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| `was_pressed()` and `is_pressed()` are different. Why is `was_pressed()` better for counting button presses? | Type your answer here |
| The counter goes above 4 and `set_pixel` shows an error. How could you stop `x` going above 4? | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste a link to your saved program here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I used the LED display for output
- [ ] I read a sensor or button for input
- [ ] I used a `while True` loop to keep checking for input
- [ ] I changed a program to respond to a button press
