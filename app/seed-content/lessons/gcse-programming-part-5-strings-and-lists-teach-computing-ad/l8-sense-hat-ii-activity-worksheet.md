# Sense HAT II — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will use **choice()** and **append()** to build random pixel grids and a **Magic 8-ball**.

## The plan — a random colour grid
Drag the steps into the right order.

```order
Make a variable for each colour you want
Put the colour variables into a list
Make a new empty list for the grid
Pick a random colour with choice() and append it to the grid
Repeat until the grid has 64 colours
Light the LED matrix with the grid
```

## Code snippets
```python
from sense_hat import SenseHat
from random import choice
sense = SenseHat()
red = (255, 0, 0)
yellow = (255, 255, 0)
blue = (0, 0, 255)
colours = [red, yellow, blue]
```

## Fill the gaps
| Question | Your answer |
|---|---|
| To pick a random colour, write `colour =` [[ ]] `(colours)` | |
| To add it to the grid list, write `grid.` [[ ]] `(colour)` | |

## 🟢 Support — order a random colour pick
```parsons
from random import choice
colours = ["red", "yellow", "blue"]
grid = []
colour = choice(colours)
grid.append(colour)
print(grid)
```

## 🟡 Core
| Question | Your answer |
|---|---|
| Use a for loop to append 64 random colours to a list called `grid`. Type your code. | Type your code here |

## 🔴 Challenge — Magic 8-ball
Make a Magic 8-ball: a list of eight answers; pick one at random and show it.

| Question | Your answer |
|---|---|
| Type the list of answers and the line that picks a random one. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Trinket / IDE share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I used `choice()` to pick a random item from a list
- [ ] I appended random items to build a list
- [ ] I lit the LED matrix with a random grid
- [ ] I built a Magic 8-ball
