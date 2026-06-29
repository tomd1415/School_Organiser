# Subroutines

## Today we are learning
- describe what a subroutine is
- explain parameters and arguments
- write a subroutine that uses parameters
- use subroutines to break a problem into parts

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: subroutine · parameter · argument · decomposition. Same routine as every lesson. Everyone has Python (Trinket or IDE) open.

## Starter — predict this program
![A calculator program that calls a subroutine]({{res:l1-calculator-program-teach-computing.png}})

Predict what `calculate(num1, num2)` will print. Then run it.

> 🧑‍🏫 I-do. A subroutine is a named block of code you can CALL. Point to `def calculate(a, b):` (the definition) and `calculate(num1, num2)` (the call). It is new, so predictions may be rough — that is fine.

## What is a subroutine?
- A **subroutine** is a named block of code you can **call** by name.
- **Parameters** are the names inside the subroutine (`a`, `b`).
- **Arguments** are the values you pass in when you call it (`num1`, `num2`).

> 🧑‍🏫 We-do. Stress: the value is COPIED in. The subroutine works on a copy, so it does not change num1 itself. Misconception M24 — there is no live link between the argument name and the parameter name.

## We do — match the words
- Subroutine → a named block of code you can call
- Argument → the value passed IN when you call it
- Parameter → the name inside that receives the value

> 🧑‍🏫 Do the "Key words" match on the activity worksheet together before they code.

## Your turn — write a subroutine  (you do)
Write `average_value(a, b, c)` that prints the average of three numbers.

> 🧑‍🏫 Pair programming — driver / navigator, swap every 5 minutes. Support: order the Parson's puzzle that doubles a number. Likely error: forgetting to CALL the subroutine, so nothing happens — fix-words "call it by name on a new line." Challenge: also write a `highest(a, b)` subroutine.

## Decomposition — many small subroutines
![Fitting the pieces of a problem together]({{res:l1-decomposition-puzzle-teach-computing.png}})

Break a big problem into small subroutines — one job each.

> 🧑‍🏫 Plenary lead-in. Use the card-sort: which parts are subroutines, which parts belong in the main program. A calculator is easier to build as small parts.

## I can…
Tick your four "I can…". Show me your working subroutine.

> 🧑‍🏫 Note who wrote a subroutine that uses parameters. Advantages of subroutines: less repeated code, easier to read, easier to fix, can reuse.
