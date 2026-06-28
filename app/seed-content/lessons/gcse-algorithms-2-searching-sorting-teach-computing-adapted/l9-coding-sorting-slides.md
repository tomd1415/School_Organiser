# Coding sorting algorithms

## Today we are learning
- read and explain the code for a bubble sort
- trace the swap part of a bubble sort
- find a change that makes a bubble sort more efficient

> 🧑‍🏫 Read the "I can…" aloud. Vocabulary on board: bubble sort · insertion sort · trace table · pass · swap · temp variable.

## Starter — true or false
Decide which statements about bubble sort and insertion sort are true.

> 🧑‍🏫 The worksheet uses a tick-all-that-are-true task. Bubble sort is NOT the fastest for large lists — draw that out.

## The bubble sort code  (I do)
![Python bubble sort code: an outer while loop for passes, an inner for loop comparing and swapping pairs]({{res:l9-bubble-sort-code-teach-computing.png}})

An outer loop counts passes; an inner loop compares each pair and swaps if needed.

> 🧑‍🏫 Build it up from the inside out: one comparison, then the swap, then the loops. Run the bubble-sort demo (ncce.io/bubble-sort-demo) to show each step.

## Swapping with a temp variable  (we do)
To swap two items you must hold one in a `temp` variable first, or its value is lost.

> 🧑‍🏫 Worksheet Parsons orders the three swap lines. Likely error: overwriting without temp — fix-words "save the first value before you copy over it."

## Making it faster  (you do)
Two improvements: check one fewer pair each pass (`num_items - passes`), and stop early if no swaps happen.

> 🧑‍🏫 Trace the swap lines together, then let pairs finish. Challenge: why "no swaps" means it is already sorted. Support: recap the code labels. TA: prompt, do not trace it for them.

## I can…
Tick your four "I can…". Tell me why a swap needs a temp variable.

> 🧑‍🏫 Answer: so the first value is not lost. Insertion sort code is similar but copies items along instead of swapping pairs.
