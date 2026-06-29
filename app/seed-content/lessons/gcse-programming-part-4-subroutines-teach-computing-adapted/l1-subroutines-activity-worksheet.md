# Subroutines — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will **write** subroutines that use **parameters**, and use them to break a problem into parts.

## Key words — match each to its meaning
Drag each answer to the right word.

| Word | What it means |
|---|---|
| Subroutine | (  ) a named block of code you can call (  ) a value passed INTO a subroutine when you call it (  ) a name inside the subroutine that receives a value |
| Argument | (  ) a named block of code you can call (  ) a value passed INTO a subroutine when you call it (  ) a name inside the subroutine that receives a value |
| Parameter | (  ) a named block of code you can call (  ) a value passed INTO a subroutine when you call it (  ) a name inside the subroutine that receives a value |

## Worked example
This subroutine adds two numbers. The names `a` and `b` are the **parameters**.

```python
def calculate(a, b):
    answer = a + b
    print(f"{a} + {b} = {answer}")

print("Enter a number:")
num1 = int(input())
print("Enter another number:")
num2 = int(input())
calculate(num1, num2)
```

## 🟢 Support
Put the lines in order to define and call a subroutine that doubles a number.

```parsons
def double(a):
    answer = a * 2
    print(answer)

number = 4
double(number)
```

## 🟡 Core
| Question | Your answer |
|---|---|
| In `calculate(num1, num2)`, what are `num1` and `num2` called? | Type your answer here |
| Why is a copy of the value passed in, so the subroutine cannot change `num1` itself? | Type your answer here |

## 🔴 Challenge — write an average subroutine
Write a subroutine called `average_value` that has **three** parameters `a`, `b`, `c`, works out their average, and prints `The average value is {average}`.

| Question | Your answer |
|---|---|
| Type your `average_value` subroutine and a line that calls it. | Type your code here |

## Decompose the problem
Breaking a big problem into smaller subroutines is called **decomposition**.

![Fitting the pieces of a problem together]({{res:l1-decomposition-puzzle-teach-computing.png}})

A calculator program needs to add, subtract, multiply OR divide two numbers. Sort each part into the right group.

```sort
A subroutine for the job: add two numbers, subtract two numbers, multiply two numbers, divide two numbers
Done in the main program: ask for the two numbers, ask which operation, choose which subroutine to call
```

## Show your work
| Question | Your answer |
|---|---|
| Paste your Python (Trinket / IDE) share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I described what a subroutine is
- [ ] I explained what parameters and arguments are
- [ ] I wrote a subroutine that uses parameters
- [ ] I used subroutines to break a problem into parts
