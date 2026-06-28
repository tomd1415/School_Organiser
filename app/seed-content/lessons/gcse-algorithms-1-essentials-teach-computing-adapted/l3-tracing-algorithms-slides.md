# Tracing algorithms

## Today we are learning
- use a trace table to follow a while loop, a for loop and a list
- use a trace table to find and fix a logic error

> 🧑‍🏫 Read the "I can…" aloud. Vocabulary on board: trace table · modulo (MOD, %) · integer division (//) · while loop · for loop · list · condition.

## Starter — what is the output?
![A flowchart that loops while count is less than 5, adding count to total]({{res:l3-starter-flowchart.png}})

Follow the flowchart. What does it output?

> 🧑‍🏫 Step through the variable values together: count and total each loop. Answer is 10 (1+2+3+4). Predict the next state to gauge understanding.

## What is a trace table?  (I do)
A table that records each variable's value, line by line, as the code runs.

> 🧑‍🏫 Used to understand HOW an algorithm works, and to find logic errors. We use these for searching and sorting later.

## Python maths — % and //  (we do)
`%` gives the remainder. `//` gives the whole number of times one number goes in.

> 🧑‍🏫 14 % 4 = 2, 28 // 5 = 5. Spend time here — integer division is key to binary search later.

## Trace Task 1 — Russian multiplication
![Python code for Russian multiplication]({{res:l3-russian-multiplication.png}})

Trace it with a = 11 and b = 7. What does it print?

> 🧑‍🏫 Walk a few rows together, then let pairs finish. It prints 77. b halves each loop, so it cannot loop forever.

## Trace Task 2 — find the logic error  (you do)
The "lowest number" code has a bug. Use a trace table to find it.

> 🧑‍🏫 The condition is the wrong way round, so it finds the highest. Fix: items[current] < lowest. Likely error: not spotting it — fix-words "trace every row, do not guess."

## Show your work
Complete the trace table, then paste a screenshot on the worksheet.

> 🧑‍🏫 Support: trace-table widget on screen, recap first two slides. Core: trace one full loop. Challenge: explain the error + the nested-loop output. TA: prompt, do not do it for them.

## I can…
Tick your four "I can…". Tell me one thing a trace table is good for.

> 🧑‍🏫 Peer-check Task 2 — more than one fix is valid, so check carefully. Note who found and fixed the error.
