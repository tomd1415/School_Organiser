# For loops — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will read and **modify** a for loop (a times table generator) and **compare** a for loop with a while loop.

## The program
```python
times_table = 5
answer = 0
print(f"Here is the {times_table} times table")
for x in range(1, 11):
    answer = x * times_table
    print(f"{x} times {times_table} is {answer}")
```

## Investigate — what does range count through?
Match each `range()` to the numbers x counts through.

| range used | x counts through… |
|---|---|
| `range(1, 11)` | (  ) 1 to 10 (  ) 2 to 21 (  ) 10 to 29 |
| `range(2, 22)` | (  ) 1 to 10 (  ) 2 to 21 (  ) 10 to 29 |
| `range(10, 30)` | (  ) 1 to 10 (  ) 2 to 21 (  ) 10 to 29 |

## 🟢 Support
Sort each fact under the right loop.

```sort
For loop: repeats a set number of times, uses range() to count, definite iteration
While loop: repeats until a condition is False, could run forever if the condition stays True, indefinite iteration
```

## 🟡 Core
| Question | Your answer |
|---|---|
| The variable `times_table` is set to 5. Does its value change while the loop runs? | Type your answer here |
| What happens to the value of `x` after each loop? | Type your answer here |

## 🔴 Challenge
Modify the program: let the user choose which times table to display.

| Question | Your answer |
|---|---|
| Change the program so it asks the user for a times table with `input()`, then prints that times table from 1 to 12. Type your changed program. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Python (Trinket / IDE) share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I described what a for loop does
- [ ] I read a for loop that uses range()
- [ ] I modified the times table program
- [ ] I compared a for loop and a while loop
