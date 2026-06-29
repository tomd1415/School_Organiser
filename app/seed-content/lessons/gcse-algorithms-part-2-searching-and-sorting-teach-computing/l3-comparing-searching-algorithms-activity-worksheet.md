# Comparing searching algorithms — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will choose between linear and binary search, and read and trace the code for a linear search.

## The data
Izaz's program stores the planets **in order**, with an index (position number) under each:

| Earth | Jupiter | Mars | Mercury | Neptune | Saturn | Uranus | Venus |
|---|---|---|---|---|---|---|---|
| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |

## Choose the right search
Drag each scenario under the search that suits it best.

```sort
Use linear search: the data is in any order, the list is short, the data changes often
Use binary search: the data is already sorted, the list is very large, fast searching matters
```

## 🟢 Support
| Question | Choose |
|---|---|
| Linear search checks the items… | (  ) one at a time from the start (  ) middle one first (  ) all at once |
| Which search can be used on data that is NOT in order? | (  ) linear search (  ) binary search (  ) neither |

## 🟡 Core
To find "Neptune" (index 4) with a **linear search**, the code checks Earth, Jupiter, Mars, Mercury, Neptune.

| Question | Choose |
|---|---|
| How many comparisons did that linear search make? | (  ) 5 (  ) 1 (  ) 8 |
| On a large ordered list, which search usually makes fewer comparisons? | (  ) binary search (  ) linear search (  ) they are always the same |

## Reading the code
Here is a linear search written in Python.

![Python code for a linear search: it sets index to -1 and current to 0, then a while loop checks each item]({{res:l3-linear-search-code-teach-computing.png}})

| Question | Choose |
|---|---|
| Line 1 gives the code a name. This makes it a… | (  ) function (  ) loop (  ) list |
| Which line makes the code repeat (the loop)? | (  ) line 4 — the `while` line (  ) line 1 (  ) line 8 |

## 🔴 Challenge
A faster version stops as soon as the item is found, using a `found` flag. The lines below are jumbled — drag them into order.

```parsons
def linear_search(items, search_item):
    index = -1
    current = 0
    found = False
    while current < len(items) and found == False:
        if items[current] == search_item:
            index = current
            found = True
        current = current + 1
    return index
```

| Question | Your answer |
|---|---|
| The faster version returns `-1`. What does `-1` tell you? | Type your answer here |

## Trace the linear search
The list is `[Earth, Jupiter, Mars, Mercury, Neptune]`. Fill in the value of **current** each time round the loop, as the search looks for "Neptune". The given column shows the item it checks.

| Loop round | current | item it checks | is it Neptune? |
|---|---|---|---|
| 1 | ??0?? | Earth | no |
| 2 | ??1?? | Jupiter | no |
| 3 | ??2?? | Mars | no |
| 4 | ??3?? | Mercury | no |
| 5 | ??4?? | Neptune | yes — stop |

| Question | Your answer |
|---|---|
| So the search returns the index | ??4?? |

## Show your work
| Question | Your answer |
|---|---|
| Show your completed trace table or any working out | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I can compare linear and binary search and pick the best one
- [ ] I can read the Python code for a linear search
- [ ] I can trace a search with a set of data
- [ ] I can explain what returning -1 means
