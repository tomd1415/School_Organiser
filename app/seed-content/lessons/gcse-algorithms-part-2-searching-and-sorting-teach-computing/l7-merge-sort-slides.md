# Merge sort

## Today we are learning
- merge two ordered lists into one ordered list
- describe how a merge sort splits and merges
- carry out a full merge sort

> 🧑‍🏫 Read the "I can…" aloud. Vocabulary on board: merge · split · sort · divide and conquer.

## Starter — combining birthdays
Two groups of birthdays, each already in order. How do you combine them into one ordered group?

> 🧑‍🏫 Steer toward "take the earlier of the two front birthdays each time". That is exactly one merge of a merge sort.

## Merging two ordered lists  (I do)
![Merging two ordered card lists: compare the front of each, move the smaller into the merged list]({{res:l7-merging-two-ordered-lists-teach-computing.png}})

Compare the front item of each list, move the smaller into the new list, repeat.

> 🧑‍🏫 Only the FRONT of each list is ever compared, because each list is already in order. Worksheet has the merge steps as a drag-to-order task.

## The whole merge sort  (we do)
Two stages: SPLIT the list down to single items, then MERGE pairs back together in order.

> 🧑‍🏫 Odd number to split → first list takes the middle item. Odd number of lists → the last list waits. Only PAIRS are merged. Show the all-splits and all-merges slides.

## Your turn — full merge sort  (you do)
Split the dog-breeds list to single items, then merge pairs back together until it is sorted.

> 🧑‍🏫 Support: merge-steps order task. Core: split-then-merge order task. Challenge: why merge in pairs. TA: prompt; draw clear boxes around each list. Merge sort is fast on large lists (divide and conquer) — but learners do not need the recursion for GCSE.

## I can…
Tick your four "I can…". Tell me the two stages of a merge sort.

> 🧑‍🏫 Answer: split, then merge. Note who completed a full merge sort with clear lists.
