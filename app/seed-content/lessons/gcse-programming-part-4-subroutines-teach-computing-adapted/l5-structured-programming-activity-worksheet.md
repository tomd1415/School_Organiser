# Structured programming — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will improve code so each block has **one way in, one way out**, and use a **structure chart** to build a program.

## The structured approach
The **structured approach** means every block has **one entry point** and **one exit point**. Avoid `break` and more than one `return`. Sort each one.

```sort
Follows the structured approach: one return at the end, the loop stops by setting its condition to False, one way in and one way out
Breaks the structured approach: using break to jump out of a loop, two or more return lines, several exit points
```

## 🟢 Support
| Question | Choose |
|---|---|
| Instead of `break` to stop a while loop, you should… | (  ) set the loop condition to False (  ) add another return (  ) delete the loop |
| "One entry point and one exit point" should be true for… | (  ) every block of code (  ) only the main program (  ) only loops |

## 🟡 Core — improve the code
This function has **two** exit points. Rewrite it so it has only **one** return at the end.

```python
def multiple_five(number):
    if number % 5 == 0:
        return "Multiple of 5"
    else:
        return "Not a multiple of 5"

print(multiple_five(12))
```

| Question | Your answer |
|---|---|
| Type your improved `multiple_five` function with one return at the end. | Type your code here |

## Structure charts
A **structure chart** plans the subroutines (blocks) of a program before you write it. Each block has an **identifier**, **parameters**, and a **return** value.

A dog walker wants a **weekly invoice** program: enter the number of dogs and days, work out the walks and cost, then display the invoice. This is its structure chart:

![Structure chart for the dog-walking weekly invoice — the main program splits into number of dogs, days walked, total number of walks, total charge and invoice, with one subroutine's identifier/parameters/return shown]({{res:l5-structure-chart-dog-walking-invoice-teach-computing.png}})

| Subroutine | What it returns |
|---|---|
| `num_dogs` | (  ) the number of dogs entered (  ) the total cost (  ) nothing |
| `num_walks(total_dogs, total_days)` | (  ) the total number of walks (  ) the surname (  ) the date |
| `invoice(...)` | (  ) nothing — it just displays the invoice (  ) the number of dogs (  ) the password |

## 🔴 Challenge — complete the program
Use the structure chart to finish the dog-walking invoice program. Walks = dogs × days. Cost = walks × 4.00.

| Question | Your answer |
|---|---|
| Type your completed program (or the `num_walks` and `total_charge` subroutines). | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Python (Trinket / IDE) share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I explained "one entry point, one exit point"
- [ ] I improved code to remove break and extra returns
- [ ] I read a structure chart
- [ ] I completed a program from a structure chart
