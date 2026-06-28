# Trace tables

## Today we are learning
- use a trace table to walk through a while loop
- record the variable and condition at each step
- use a trace table to find a logic error

> 🧑‍🏫 Read the three "I can…" aloud. Vocabulary on the board: trace table · variable · condition · logic error · iteration.

## Starter — what is the output?
```
from time import sleep
count = 5
while count != 0:
    print(count)
    count = count - 1
```

> 🧑‍🏫 Predict together. Outputs: 5, 4, 3, 2, 1. It does NOT print 0 — when count reaches 0 the condition is False at the START of the next loop, so it stops. This is misconception M9: the condition is checked at the start of each loop, not constantly.

## What is a trace table?
A trace table walks through code line by line and records:
- the **variable** value
- whether the **condition** is True or False
- the **output**

![A while loop and its trace table]({{res:l2-trace-table-code-teach-computing.png}})

> 🧑‍🏫 I-do. Fill one row at a time on the board. Stress: write down the value AFTER each line runs. The order slider on the starter shows the same idea as steps.

## We do — trace a short loop
```
count = 3
while count != 0:
    print(count)
    count = count - 1
```

> 🧑‍🏫 We-do. Trace together: prints 3, 2, 1. Then pupils fill the blanks on the activity worksheet.

## Find the logic error  (you do)
```
number = 1
while number != 25:
    number = number + 5
    print(number)
```

> 🧑‍🏫 Trace it: 1 → 6 → 11 → 16 → 21 → 26 → … it skips 25 and never stops. The trace table makes the bug obvious. Fix: start at `number = 0`, or use `while number <= 25`. Support: choose when the condition is checked. Challenge: rewrite the code.

## I can…
Tick your three "I can…". Show me your completed trace table.

> 🧑‍🏫 Note who found the bug from the trace table on their own.
