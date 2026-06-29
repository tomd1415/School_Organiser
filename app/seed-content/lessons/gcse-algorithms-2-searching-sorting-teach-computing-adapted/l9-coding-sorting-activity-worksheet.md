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

## Trace the swap
The swap uses a `temp` variable. We are swapping `items[i] = 8` and `items[i+1] = 3` (because 8 is greater than 3). Fill in each value after each line runs.

| Line | items[i] | items[i+1] | temp |
|---|---|---|---|
| before | 8 | 3 | — |
| `temp = items[i]` | 8 | 3 | ??8?? |
| `items[i] = items[i+1]` | ??3?? | 3 | 8 |
| `items[i+1] = temp` | 3 | ??8?? | 8 |

| Question | Your answer |
|---|---|
| Why is `temp` needed before line 8 overwrites `items[i]`? | (  ) so the 8 is not lost (  ) to count passes (  ) to make the list longer |
| Show your working out | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I can read and explain the code for a bubble sort
- [ ] I can put the swap lines in the right order
- [ ] I can trace the swap part of a bubble sort
- [ ] I can identify a change that makes a bubble sort more efficient
