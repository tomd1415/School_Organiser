# Functions

## Today we are learning
- explain the difference between a function and a procedure
- read a function that uses return
- use a trace table to investigate a function
- write a function that returns a value

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: function · procedure · return value · trace table. Everyone has Python open.

## Starter — predict this program
```python
def powers(a, b):
    answer = a ** b

powers(2, 3)
print(f"answer is {answer}")
```

> 🧑‍🏫 I-do. Most will predict "8". It actually CRASHES: "answer is not defined". `answer` only exists inside the function. This sets up WHY we need return.

## Return — sending a value back out
- A function uses **return** to send a value back to the program.
- The function returns the **value**, not the variable.
- To keep it, store it: `answer = to_the_power(2, 3)`.

> 🧑‍🏫 Live-code: add `return answer`, then `result = powers(2, 3)`. Note: this is a demonstration — pupils watch, then try on the worksheet. Key point: code AFTER a return never runs.

## Function or procedure?
- **Function** → returns a value (`return`).
- **Procedure** → just runs commands, returns nothing.

> 🧑‍🏫 We-do. Use the card-sort on the worksheet. A built-in like `int()` is a function — it returns a value.

## We do — trace a function
![A trace table for the to_the_power function]({{res:l2-trace-table-function-teach-computing.png}})

A **trace table** records each variable, line by line.

> 🧑‍🏫 Fill one row at a time on the board for `to_the_power(2, 3)`. Then pupils trace `find_highest(9, 12)` on the worksheet.

## Your turn — write a function  (you do)
Write `average_value(a, b)` that **returns** the average, then print the returned value.

> 🧑‍🏫 Likely error: printing inside the function instead of returning, so nothing comes back to store — fix-words "return it, don't print it." Challenge: write `area_circle(radius)` that returns the area. They paste a screenshot.

## I can…
Tick your four "I can…". Tell me one difference between a function and a procedure.

> 🧑‍🏫 Note who wrote a function that returns a value (not just prints).
