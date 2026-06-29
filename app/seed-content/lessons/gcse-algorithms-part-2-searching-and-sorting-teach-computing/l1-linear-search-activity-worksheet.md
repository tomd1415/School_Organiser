# Linear search — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will carry out a linear search and count how many comparisons it takes.

## The data
Angela's program stores the cities her customers visited. The list is in this order:

**1 Moscow · 2 Sydney · 3 Beijing · 4 Athens · 5 Mumbai · 6 Tokyo · 7 Prague**

A linear search checks position 1, then 2, then 3, and so on, until it finds the item (or reaches the end).

## Put the steps in order
Drag the steps of a linear search into the correct order.

```order
Start at the first item in the list
Compare the item at this position to the search item
If it matches, stop — you have found it
If it does not match, move to the next item
Repeat until you find it or reach the end of the list
```

## 🟢 Support
| Question | Choose |
|---|---|
| To find "Beijing", the search checks… | (  ) Moscow, then Sydney, then Beijing (  ) Beijing first (  ) the middle city first |
| A linear search starts at the… | (  ) first item (  ) middle item (  ) last item |

## 🟡 Core
| Question | Choose |
|---|---|
| How many comparisons to find "Mumbai" (position 5)? | (  ) 5 (  ) 1 (  ) 7 |
| How many comparisons to decide "Berlin" is NOT in the list? | (  ) 7 — every city is checked (  ) 1 (  ) 0 |

> Tip: count one comparison for each city you turn over until you stop.

## 🔴 Challenge
The **best case** is the fewest comparisons; the **worst case** is the most. Use this list:

**1 Dublin · 2 Cairo · 3 La Paz · 4 Seoul · 5 New York · 6 London · 7 Paris**

| Question | Choose |
|---|---|
| Which city is the best case (fewest comparisons)? | (  ) Dublin — it is first (  ) Paris — it is last (  ) Seoul — it is in the middle |
| How many comparisons in the worst case for this list? | (  ) 7 (  ) 1 (  ) 4 |

This Python code does a linear search, but the lines are jumbled. Drag them into order.

```parsons
def linear_search(items, search_item):
    current = 0
    while current < len(items):
        if items[current] == search_item:
            return current
        current = current + 1
    return -1
```

## Show your work
You did a linear search on shuffled cards. Show your finished table.

| Question | Your answer |
|---|---|
| How many cards did you check before you knew your card was NOT in the set? | Type your answer here |
| Show your completed linear search table | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I can say why computers need to search data
- [ ] I can carry out a linear search to find an item
- [ ] I can count the comparisons a linear search makes
- [ ] I can give the best-case and worst-case for a linear search
