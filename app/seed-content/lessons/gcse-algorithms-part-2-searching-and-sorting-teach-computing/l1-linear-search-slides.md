# Linear search

## Today we are learning
- say why computers need to search data
- carry out a linear search
- count the comparisons and find the best and worst case

> 🧑‍🏫 Read the "I can…" aloud. Same routine as every lesson. Vocabulary on board: linear search · list · comparison · ordered · unordered · best case · worst case.

## Starter — searching for a book
![A robot searching through items one at a time]({{res:l1-searching-hook-teach-computing.png}})

Is it quicker to find a book on an ordered shelf or an unordered shelf? Why?

> 🧑‍🏫 Draw out "ordered vs unordered". No need for them to give exact instructions yet — just the idea that order helps. This theme runs through the whole unit.

## Why search?  (I do)
Computers search huge amounts of data: a contact, a song, a record. The search must be fast.

> 🧑‍🏫 Everyday examples (find a name in your phone) and computer examples (find a record). Large data → the algorithm must be efficient.

## Linear search — check one at a time  (we do)
A computer cannot "see" the whole list at once. It checks each item, one at a time, from the start.

> 🧑‍🏫 Use the cups demo on the board: lift one cup at a time. Stress it is the only sensible way to search an UNORDERED list.

## The steps of a linear search
Start → compare → if it matches stop → if not, move to the next → repeat to the end.

> 🧑‍🏫 The activity worksheet has these as a drag-into-order task. Likely error: forgetting the "or reach the end" stop — fix-words "a linear search also stops when the list runs out."

## Your turn — search shuffled cards  (you do)
In groups, place cards face down. Turn over ONE at a time to find your card. Fill the table.

> 🧑‍🏫 Support: word-bank of steps + arrow card. Core: count comparisons. Challenge: convert the steps to Python (Parsons). TA: prompt, do not turn the cards for them.

## Best case and worst case
Best case = the item is first (1 comparison). Worst case = it is last, or not there at all (check them all).

> 🧑‍🏫 Worst case for 7 items is 7 comparisons. Link to "not in the list means every item is checked." This sets up comparing with binary search next lesson.

## I can…
Tick your four "I can…". Tell me the worst-case number of comparisons for 7 items.

> 🧑‍🏫 Answer: 7. Note who can explain WHY a not-found search is the worst case.
