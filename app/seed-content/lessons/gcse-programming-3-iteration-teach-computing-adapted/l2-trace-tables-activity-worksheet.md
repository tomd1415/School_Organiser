# Trace tables — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will fill in a **trace table** to record the variable and condition at each step, and use it to **find a logic error**.

## A trace table
A trace table records the **variable** and whether the **condition** is True or False, one line at a time.

![A while loop and its trace table]({{res:l2-trace-table-code-teach-computing.png}})

## Trace this loop
Walk through this loop one step at a time.

```python
count = 3
while count != 0:
    print(count)
    count = count - 1
```

Fill in the numbers it prints, in order: [[ ]], then [[ ]], then [[ ]].

## 🟢 Support
| Question | Choose |
|---|---|
| In the loop above, the condition `count != 0` is checked… | (  ) at the start of every loop (  ) all the time, constantly (  ) only once at the end |
| When count reaches 0, the loop will… | (  ) stop (  ) print 0 (  ) start again |

## 🟡 Core
This loop is **meant** to print the 5 times table up to 25, but it has a logic error.

```python
number = 1
while number != 25:
    number = number + 5
    print(number)
```

| Question | Your answer |
|---|---|
| Trace it: number goes 1 → 6 → 11 → 16 → 21 → 26… What is wrong? | Type your answer here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Rewrite the loop above so it prints 5, 10, 15, 20, 25 and then stops. Type your fixed program. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Python (Trinket / IDE) share link here | Type your answer here |
| Show your completed trace table or fixed code | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I walked through a while loop with a trace table
- [ ] I recorded the variable and condition at each step
- [ ] I used a trace table to find a logic error
- [ ] I corrected the error in the program
