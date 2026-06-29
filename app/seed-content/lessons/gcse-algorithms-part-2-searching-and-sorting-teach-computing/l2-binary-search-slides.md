# Binary search

## Today we are learning
- carry out a binary search on ordered data
- say why the list must be in order
- say when a binary search can and cannot be used

> 🧑‍🏫 Read the "I can…" aloud. Vocabulary on board: binary search · ordered · midpoint · middle-left · divide and conquer.

## Starter — find the number
8 boxes in order, lowest to highest. A number is hidden. You get 3 looks. Where do you look first?

> 🧑‍🏫 Steer toward "the middle". Looking in the middle rules out half the boxes in one go. This is the heart of binary search.

## Binary search — divide and conquer  (I do)
Check the MIDDLE item. Throw away the half it cannot be in. Repeat on what is left.

> 🧑‍🏫 Cups demo on the board. Each comparison halves the data, so it is much faster than linear search — but ONLY on ordered data.

## Finding the midpoint
With an even number of items, use the MIDDLE-LEFT item as the midpoint.

> 🧑‍🏫 No formula needed yet — just "middle-left". Next lesson the code uses floor division (DIV) to do exactly this. This is the bit learners find hardest.

## The steps of a binary search
In order → middle → match? stop → smaller? keep left → bigger? keep right → repeat.

> 🧑‍🏫 The worksheet has these as a drag-into-order task. Likely error: forgetting to throw away a half — fix-words "after every check, half the list is gone."

## Your turn — search ordered cards  (you do)
In groups, put cards in order, face down. Turn over the MIDDLE card first. Fill the table.

> 🧑‍🏫 Support: sort-the-facts task first. Core: one full search. Challenge: doubling the list adds only ~1 comparison. TA: prompt, do not turn cards for them.

## When can't you use it?
Binary search needs ordered data. If the data is jumbled, use a linear search OR sort it first.

> 🧑‍🏫 This is a great hook for WHY sorting algorithms matter — the next block of lessons. No suitable still in the source deck for this slide.

## I can…
Tick your four "I can…". Tell me one thing binary search needs that linear search does not.

> 🧑‍🏫 Answer: the data must be in order. Note who can explain the divide-and-conquer idea.
