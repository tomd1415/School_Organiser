# Battle Boats — code your solution

## Today we are learning
- keep a code log of my progress
- build my program one subroutine at a time
- test each part as I build it
- build the Battle Boats program (towards Task 7)

> 🧑‍🏫 Read the four "I can…" aloud. This is the four-lesson coding block (lessons 3–6 of the project). Vocabulary on the board: code log · decomposition · subroutine · 2D list. Same routine each lesson; learning partners, check in every 15 minutes.

## Starter
- **First lesson:** why keep a code log? (Think–pair–share.)
- **Later lessons:** read your code log — what did you do, what is next?

> 🧑‍🏫 A code log saves time between lessons — it's easy to forget where you were. Read it before coding. Support: tick build-as-you-go.

## One part at a time  (I do)
- The board is a **2D list** (a list of lists).
- Build **one subroutine**, test it, then the next — that is **decomposition**.
- Reuse your noughts and crosses code where it fits.

```python
board = []
for row in range(8):
    board.append(["."] * 8)
board[2][3] = "B"   # row first, then column
```

> 🧑‍🏫 I-do. Remind: row first, then column. Likely error: row/column swapped → fix-words "row first, then column." Start from the display + place-a-boat parts; don't try to write it all at once.

## Build order  (we do)
board → display → place player boats → place computer boats → player turn → computer turn → check winner.

> 🧑‍🏫 We-do. Order the build together. Aim for **up to Task 7**. Test each part with normal, boundary, and erroneous inputs as you go.

## Your turn  (you do)
- Support: order/complete the display-board subroutine (Parson's).
- Core: let the player place a boat (check the square is empty).
- Challenge: the player's turn — hit/miss, no repeat shots.

> 🧑‍🏫 You-do — four lessons of build time. Pair programming, swap regularly. Reassure: this is demanding — do your best, test as you go, keep the log. TA: prompt, don't do it for them. Screenshot at the end of each lesson.

## I can…
Tick your four "I can…". Update your code log.

> 🧑‍🏫 Plenary each lesson. Update the code log: what worked, what was hard, next steps. Next: final testing. Movement break is routine.
