# Comparing searching algorithms

## Today we are learning
- compare linear and binary search and choose the best one
- read the Python code for a search
- trace a search with a set of data

> 🧑‍🏫 Read the "I can…" aloud. Vocabulary on board: linear search · binary search · trace table · Python · efficiency.

## Starter — finding a word
A dictionary is in alphabetical order. Which searches could you use to find a word?

> 🧑‍🏫 Both work because it is ordered. Binary is faster on ordered data; linear works on anything. Recap worst case from the last two lessons.

## Which search, and when?  (I do)
Linear works on ANY data but is slower. Binary is faster but needs ORDERED data.

> 🧑‍🏫 The worksheet has a drag-to-sort task for this. Stress: linear always works; binary needs order and is more efficient on big ordered lists.

## The code for a linear search  (we do)
![Python code for a linear search with a while loop checking each item]({{res:l3-linear-search-code-teach-computing.png}})

It has a name (a function), sets up variables, then a loop checks each item.

> 🧑‍🏫 Build it up from the inside out: one comparison first, then the loop. Run the linear-search demo (ncce.io/linear-search-demo) to show each step. Line 4 is where iteration starts.

## A faster linear search
A `found` flag lets the loop STOP as soon as the item is found, instead of always going to the end.

> 🧑‍🏫 Challenge Parsons on the worksheet builds this version. Likely error: thinking it must always reach the end — fix-words "found = True lets it stop early."

## Trace it  (you do)
Use a trace table to follow the search for "Neptune", row by row.

> 🧑‍🏫 Support: recap the sort task. Core: trace the linear search. Challenge: order the faster code. TA: prompt, do not fill the table for them. Pencil on paper helps.

## I can…
Tick your four "I can…". Tell me one reason to choose linear search over binary search.

> 🧑‍🏫 Good answers: the data is unordered, the list is short, or the data keeps changing. Note who traced correctly.
