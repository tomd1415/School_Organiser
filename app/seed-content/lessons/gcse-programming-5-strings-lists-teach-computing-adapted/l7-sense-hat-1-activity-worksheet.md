# Sense HAT I — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will set **RGB** colours and use a **list** to light up the LED matrix.

## Getting started
These two lines start every Sense HAT program (use the emulator if you have no board):

```python
from sense_hat import SenseHat
sense = SenseHat()
sense.show_message("Hello world!")
```

## Match the colour to its RGB code
Each colour is `(Red, Green, Blue)`, each value 0–255. 0 is none, 255 is full.

| RGB code | Colour |
|---|---|
| `(255, 0, 0)` | (  ) red (  ) green (  ) blue |
| `(0, 255, 0)` | (  ) red (  ) green (  ) blue |
| `(0, 0, 255)` | (  ) red (  ) green (  ) blue |

## RGB — fill the gaps
| Question | Your answer |
|---|---|
| To make a variable for blue, write `blue = (0, 0,` [[ ]] `)` | |
| `text_colour = (0, 0, 255)` makes the message appear in the colour [[ ]] | |

## Worked example — a smiley face
A list of 64 colours sets all 64 pixels.

```python
r = (255, 0, 0)
b = (0, 0, 180)
smile = [
    b, b, b, b, b, b, b, b,
    b, b, b, b, b, b, b, b,
    b, b, r, b, b, r, b, b,
    b, b, b, b, b, b, b, b,
    b, r, b, b, b, b, r, b,
    b, b, r, r, r, r, b, b,
    b, b, b, b, b, b, b, b,
    b, b, b, b, b, b, b, b
]
sense.set_pixels(smile)
```

## 🟢 Support — order a coloured message
```parsons
from sense_hat import SenseHat
sense = SenseHat()
blue = (0, 0, 255)
sense.show_message("Hi", text_colour=blue)
```

## 🟡 Core
| Question | Your answer |
|---|---|
| Make a variable `green = (0, 255, 0)` and show a message in green. Type your code. | Type your code here |

## 🔴 Challenge — your own pixel character
Make your own 8×8 character as a list and display it with `set_pixels()`.

| Question | Your answer |
|---|---|
| Type the list for your character. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Trinket / IDE share link here | Type your answer here |
| Show your finished LED matrix | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I started a Sense HAT program and showed a message
- [ ] I used RGB values to make a colour
- [ ] I used a list to light up the LED matrix
- [ ] I made my own pixel character
