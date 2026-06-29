# For loops

## Today we are learning
- describe what a for loop does
- read a for loop that uses range()
- modify a for loop program
- compare a for loop and a while loop

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: for loop · range · sequence · definite · indefinite.

## Starter — predict this for loop
![A for loop printing the 5 times table with range]({{res:l3-times-table-for-loop-with-range-teach-computing.png}})

> 🧑‍🏫 Predict on the worksheet, then run it. It is new to them, so predictions may be rough — that is fine. Draw attention to `for x in range(1, 11)`.

## What is a for loop?
- A **for loop** repeats for every item in a **sequence**.
- `range(1, 11)` makes a sequence of numbers: **1 to 10**.
- The loop runs a **set number of times** — this is **definite** iteration.

> 🧑‍🏫 I-do. Key point: range(start, stop) stops ONE BEFORE the stop number. So range(1, 11) is 1…10. Let pupils try a few ranges in the IDE if time allows.

## We do — investigate the ranges
- `range(1, 11)` → 1 to 10
- `range(2, 22)` → 2 to 21
- `range(10, 30)` → 10 to 29

> 🧑‍🏫 We-do. Match the ranges on the worksheet. Pattern: x starts at the first number and ends one below the second number.

## Your turn — modify the program  (you do)
Let the user choose which times table to show with `input()`.

> 🧑‍🏫 Likely error: the table repeats the digit (5 5 5…) because input is a string. Fix-words: "wrap it in `int(...)`." Support: order/compare facts. Challenge: change the range to go 1 to 12. They paste a screenshot.

## For loop vs while loop
- **For loop:** a set number of times (definite).
- **While loop:** until a condition is False (indefinite — could run forever).

> 🧑‍🏫 Plenary. Use the card-sort on the worksheet. Both are iteration; a for loop is neater when you know HOW MANY times to repeat.

## I can…
Tick your four "I can…". Tell me one difference between a for loop and a while loop.

> 🧑‍🏫 Note who modified the program with input() and int().
