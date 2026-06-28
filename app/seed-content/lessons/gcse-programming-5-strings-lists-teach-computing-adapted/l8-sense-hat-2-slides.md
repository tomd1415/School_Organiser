# Sense HAT II

## Today we are learning
- use choice() to pick a random item from a list
- append random items to build a list
- light the LED matrix with a random grid
- build a Magic 8-ball

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: choice · append · random · list · LED matrix. Same routine. Emulator (or board) open. Calm 8×8 output — no flashing.

## Starter — predict
```python
from random import choice
colours = ["red", "yellow", "blue"]
print(choice(colours))
```
Predict what this could print.

> 🧑‍🏫 Peer instruction. `choice()` picks ONE random item from the list — it could be any of the three. Support: tick what choice does. Challenge: why it's simpler than randint + index.

## choice() + append()  (I do)
- `choice(colours)` returns one random item.
- `grid.append(colour)` adds it to a list.
- Do that 64 times and you have a random pixel grid.

> 🧑‍🏫 I-do. Use the `order` task so they see the plan first: make colours → list → empty grid → pick+append in a loop → light it.

## We do — random colour grid  (we do)
- A for loop that appends a random colour 64 times builds the grid.

> 🧑‍🏫 We-do. Step the loop: each turn picks a random colour and appends it. Likely error: setting pixels with the wrong number of colours (not 64). Fix-words: "the grid needs exactly 64."

## Your turn  (you do)
- Support: order a random colour pick (Parson's).
- Core: append 64 random colours in a loop.
- Challenge: a Magic 8-ball with eight answers.

> 🧑‍🏫 Pair programming, swap every 5 mins. TA: prompt, don't do it for them. Screenshot at the end. Movement break is routine.

## I can…
Tick your four "I can…". Show me your random grid or 8-ball.

> 🧑‍🏫 Plenary. A short showcase — volunteers show their grid or 8-ball. Recap: choice = random pick; append = build a list. Next: 2D lists.
