# Coding sorting algorithms — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will read the code for a bubble sort, trace a swap, and find a change that makes it faster.

## The code
Here is a bubble sort in Python. The inner loop range has been changed to `num_items - passes` to make it more efficient.

![Python code for a bubble sort: an outer while loop counts passes, an inner for loop compares each pair and swaps out-of-order items using a temp variable]({{res:l9-bubble-sort-code-teach-computing.png}})

## 🟢 Support
| Question | Choose |
|---|---|
| The outer loop in this code counts the… | (  ) passes (  ) swaps (  ) letters |
| A swap happens when one item is ______ than the next. | (  ) greater (  ) smaller (  ) equal |

## 🟡 Core
The three lines below swap two items using a temporary variable. They are jumbled — drag them into the correct order.

```parsons
temp = items[current]
items[current] = items[current + 1]
items[current + 1] = temp
```

| Question | Choose |
|---|---|
| Why does the swap use a `temp` variable? | (  ) so the first value is not lost (  ) to count the passes (  ) to make the list longer |

## 🔴 Challenge
| Question | Choose |
|---|---|
| Changing the inner range to `num_items - passes` makes each pass do… | (  ) fewer comparisons (  ) more comparisons (  ) the same comparisons |

| Question | Your answer |
|---|---|
| A second improvement stops the sort if no swaps were made in a pass. Why does "no swaps" mean the list is already sorted? | Type your answer here |

## Show your work
Trace lines 7–9 (the swap) for one swap during a pass, using a trace table. Then show it.

| Question | Your answer |
|---|---|
| After the swap, which two items have changed places? | Type your answer here |
| Show your completed trace table | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I can read and explain the code for a bubble sort
- [ ] I can put the swap lines in the right order
- [ ] I can trace the swap part of a bubble sort
- [ ] I can identify a change that makes a bubble sort more efficient
