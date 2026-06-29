# Functions — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will tell a **function** from a **procedure**, trace a function, and write a function that **returns** a value.

## Function or procedure?
A **function** returns a value with `return`. A **procedure** just runs commands and returns nothing. Sort each one.

```sort
Function (returns a value): def area(r): return 3.14 * r * r, def to_the_power(a, b): return a ** b, def find_highest(a, b): return a or b
Procedure (returns nothing): def greet(name): print(name), def show_menu(): print the options, def countdown(): print 5 4 3 2 1
```

## Trace a function with a trace table
A **trace table** shows the value of each variable, line by line, as the code runs.

![A trace table for the to_the_power function]({{res:l2-trace-table-function-teach-computing.png}})

```python
def to_the_power(a, b):
    answer = a ** b
    return answer
```

Trace the call `to_the_power(2, 3)`:

Fill in the **answer** and **return value** as the function runs (`a ** b` means a to the power b).

| Line | a | b | answer | return value |
|---|---|---|---|---|
| 1 | 2 | 3 |  |  |
| 2 | 2 | 3 | ??8?? |  |
| 3 | 2 | 3 | ??8?? | ??8?? |

## 🟢 Support
| Question | Choose |
|---|---|
| The word that sends a value OUT of a function is… | (  ) return (  ) input (  ) loop |
| When `to_the_power(2, 3)` finishes, the return value is… | (  ) 8 (  ) 6 (  ) 5 |

## 🟡 Core
Trace this function for the call `find_highest(9, 12)`.

```python
def find_highest(a, b):
    if a > b:
        return a
    else:
        return b
```

| Question | Your answer |
|---|---|
| Is the condition `a > b` True or False here? | (  ) True (  ) False |
| What is the return value? | Type your answer here |

## 🔴 Challenge — write a function that returns a value
Write a function `average_value(a, b)` that **returns** the average of two numbers (do not print inside it). Then store and print the returned value.

| Question | Your answer |
|---|---|
| Type your `average_value` function and the lines that call it and print the result. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Python (Trinket / IDE) share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I explained the difference between a function and a procedure
- [ ] I read a function that uses return
- [ ] I used a trace table to investigate a function
- [ ] I wrote a function that returns a value
