# Tracing algorithms — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will trace code with a trace table, and use a trace to find and fix a logic error.

## Task 1 — Russian multiplication
This Python code multiplies two numbers using `//` and `%`. Read it carefully.

![Python code for Russian multiplication, with a table explaining MOD and integer division]({{res:l3-russian-multiplication.png}})

We trace it with a=11 and b=7 (so it works out 11 × 7).

| Question | Choose |
|---|---|
| When the trace finishes, what does it print? | (  ) 77 (  ) 18 (  ) 11 |
| Does this loop go on forever? | (  ) no — b halves each time until the loop stops (  ) yes — it never stops |

## 🟢 Support
| Question | Choose |
|---|---|
| A trace table records the value of each… | (  ) variable, line by line (  ) colour on the screen (  ) keyboard key |

## 🟡 Core
| Question | Your answer |
|---|---|
| Why is the line being traced (the value of b) getting smaller each time round the loop? | Type your answer here |

## Task 2 — find the logic error
This code is meant to find the LOWEST number in a list called items.

```python
lowest = items[0]
for current in range(1, len(items)):
    if lowest < items[current]:
        lowest = items[current]
```

For the list `[24, 16, 35, 42, 7]` the correct lowest is 7.

Trace it. For each step, write the value the list holds at `current`, and the value of `lowest` after that step. The first row is done for you.

| current | items[current] | lowest |
|---|---|---|
| start | — | 24 |
| 1 | ??16?? | ??24?? |
| 2 | ??35?? | ??35?? |
| 3 | ??42?? | ??42?? |
| 4 | ??7?? | ??42?? |

| Question | Choose |
|---|---|
| Your trace ends with `lowest` = 42. Does the code work as intended? | (  ) no — it finds the HIGHEST number, not the lowest (  ) yes — it finds the lowest correctly |
| Which change fixes it? | (  ) change the condition to `items[current] < lowest` (  ) change `items[0]` to `items[1]` (  ) delete the loop |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Explain, using the trace, WHY the broken code ends up with the highest value in `lowest`. | Type your answer here |

## Show your work
Complete the trace table for Task 1 (in slides or on paper), then show it here.

| Question | Your answer |
|---|---|
| Write the final value of `lowest` after your fix | Type your answer here |
| Show your completed trace table | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I can follow code with a trace table
- [ ] I can trace a while loop and a for loop
- [ ] I can use a trace to find a logic error
- [ ] I can fix a logic error in the code
