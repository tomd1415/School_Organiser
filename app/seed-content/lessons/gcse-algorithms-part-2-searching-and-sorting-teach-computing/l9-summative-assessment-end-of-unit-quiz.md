# Summative assessment — end-of-unit quiz

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will show what I have learnt about searching, sorting, tracing and computational thinking.

> Work on your own and in silence, like a real exam. Do your best on every question.

## The bird data (in order)
**1 Crane · 2 Finch · 3 Heron · 4 Kiwi · 5 Owl · 6 Stork · 7 Wren**

## 🟢 Support
| Question | Choose |
|---|---|
| "Removing unnecessary detail to focus on the important parts" is called… | (  ) abstraction (  ) decomposition (  ) algorithmic thinking |
| "Move through a list, comparing neighbours and swapping out-of-order pairs" describes… | (  ) bubble sort (  ) merge sort (  ) binary search |
| "Split data into single items, then merge pairs back in order" describes… | (  ) merge sort (  ) bubble sort (  ) insertion sort |
| Which search works on data that is NOT sorted? | (  ) linear search (  ) binary search (  ) neither |

## 🟡 Core
| Question | Choose |
|---|---|
| Which search needs the FEWEST comparisons to find "Crane" (first bird)? | (  ) linear search (  ) binary search (  ) they are equal |
| Which search needs the FEWEST comparisons to find "Wren" (last bird)? | (  ) binary search (  ) linear search (  ) they are equal |

A bubble sort is applied to: **Frozen, Cats, Aladdin, Moana, Grease, Annie**

| Question | Choose |
|---|---|
| What is the order after the FIRST pass? | (  ) Cats, Aladdin, Frozen, Grease, Annie, Moana (  ) Cats, Frozen, Aladdin, Moana, Grease, Annie (  ) Aladdin, Cats, Frozen, Moana, Grease, Annie |
| What is the order after the THIRD pass? | (  ) Aladdin, Cats, Annie, Frozen, Grease, Moana (  ) Aladdin, Cats, Frozen, Moana, Grease, Annie (  ) Aladdin, Annie, Cats, Grease, Frozen, Moana |

| Question | Your answer |
|---|---|
| List the birds compared to "Robin" in a binary search of the bird list. (Robin is not in the list.) | Type your answer here |

## 🔴 Challenge
| Question | Tick ALL the statements that are TRUE |
|---|---|
| Which of these statements are true? | [ ] binary search can only be performed on sorted data [ ] merge sort is a divide and conquer algorithm [ ] linear search can only be performed on unsorted data [ ] linear search uses floor division to find the midpoint [ ] bubble sort is always more efficient than insertion sort |

This Python program sorts a list:

```python
def an_algorithm(items):
    num_items = len(items)
    i = 1
    while i < num_items:
        for current in range(num_items - 1):
            if items[current] > items[current + 1]:
                temp = items[current]
                items[current] = items[current + 1]
                items[current + 1] = temp
        i = i + 1
```

| Question | Choose |
|---|---|
| What algorithm is this? | (  ) bubble sort (  ) insertion sort (  ) merge sort |
| For a list of 10 items, how many comparisons does line 6 make in the first pass? | (  ) 9 (  ) 10 (  ) 1 |

| Question | Your answer |
|---|---|
| One improvement reduces the comparisons each pass. Explain how you would change the inner loop range. | Type your answer here |

## Trace the first swap
For `Pakistan, China, Greece, Chad`, the first compare is **Pakistan** and **China**. Pakistan comes after China, so they swap. Trace lines 7–9 (the swap of `items[i] = Pakistan` and `items[i+1] = China`). Fill in each value after each line runs.

| Line | items[i] | items[i+1] | temp |
|---|---|---|---|
| before | Pakistan | China | — |
| `temp = items[i]` | Pakistan | China | ??Pakistan?? |
| `items[i] = items[i+1]` | ??China?? | China | Pakistan |
| `items[i+1] = temp` | China | ??Pakistan?? | Pakistan |

## Show your work
| Question | Your answer |
|---|---|
| Show any other working out | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I can develop a linear search function in Python
- [ ] I can choose the best search or sort for a situation
- [ ] I can trace a sorting algorithm
- [ ] I can use the correct computational thinking terms
