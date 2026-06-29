# Noughts and crosses — a 2D-list project

## Today we are learning
- decompose a problem using a structure chart
- use a 2D list to store the game board
- build and test a noughts and crosses game

> 🧑‍🏫 Read the three "I can…" aloud. Vocabulary on the board: decomposition · structure chart · interface · iterative testing · final testing · 2D list. This is a double lesson and a project — reassure them: "this is the biggest program of the unit, do your best." Learning partners; check in every 15 minutes.

## Starter — testing
- **Iterative testing**: test as you build.
- **Final testing**: test the finished program.
- Test with **normal**, **boundary** and **erroneous** data.

> 🧑‍🏫 Match the testing words; sort the test data. They already test as they go — now name it.

## Decompose the game  (I do)
- Break the game into small subroutines: display board · instructions · read a position · move a piece · check for a win · play.
- A **structure chart** shows these parts and how they connect (identifier · parameters · return).

> 🧑‍🏫 I-do. Use the `order` task to build a sensible order. Each subroutine has ONE job. This is decomposition — the same idea as earlier subroutine lessons.

## The board is a 2D list  (we do)
```python
board = [[" ", " ", " "],
         [" ", " ", " "],
         [" ", " ", " "]]
```
- `board[row][column]` is one square. `board[0][0]` is top-left.

> 🧑‍🏫 We-do. Display the board with a procedure; place a piece by setting `board[r][c]`. Likely error: row/column the wrong way round. Fix-words: "row first, then column."

## Build → test → build  (you do)
- Support: order/complete the displayboard procedure (Parson's).
- Core: place X and O pieces on the board.
- Challenge: add winning lines to `check_win`; then play + validation.

> 🧑‍🏫 Pair programming, swap roles. Build one subroutine, test it, then the next. Assess with the rubric (instructions, places a piece, displays, switches players, plays to a win, announces the winner, validation). TA: prompt, don't do it for them. Screenshot the working game.

## I can… + unit quiz
Tick your three "I can…", then complete the **Strings and lists unit quiz**.

> 🧑‍🏫 Plenary + assessment. The unit quiz covers the whole unit (string slicing, list methods, 2D indexing, testing). Use it as the unit's final check. Movement break is routine.
