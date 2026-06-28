# Scope — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will tell **local** from **global** scope, swap a global program for **parameters**, and describe a **constant**.

## Scope — what can be seen where
**Scope** is where a variable can be seen. A telescope only sees what it is pointed at — a variable is the same.

![A telescope — scope is about what you can see]({{res:l3-scope-telescope-teach-computing.png}})

- A **local** variable is made inside a subroutine — only that subroutine can see it.
- A **global** variable is made in the main program — any subroutine can read it.

## Sort each one
Sort each variable into local or global.

```sort
Local (only inside the subroutine): a variable made inside def example(), a parameter like a or b, a counter made inside a function
Global (made in the main program): a variable made at the left margin, a variable made before any def, a constant like LIVES = 5
```

## 🟢 Support
| Question | Choose |
|---|---|
| Adding the word `global` in front of a variable name means… | (  ) use the global variable, not a new local one (  ) delete the variable (  ) make it print |
| Global variables are generally seen as… | (  ) bad practice — avoid where you can (  ) always the best choice (  ) impossible in Python |

## 🟡 Core — not 'going global'
This program uses a **global** variable. We can avoid it by passing a value through a **parameter** and using **return**.

```python
def double():
    global num1
    num1 = num1 * 2

num1 = int(input())
double()
print(num1)
```

| Question | Your answer |
|---|---|
| Why is passing a value through a parameter usually better than using a global variable? | Type your answer here |

## 🔴 Challenge — rewrite it without global
Rewrite the `double` program so it does **not** use `global`. Pass `num1` in as a parameter and `return` the result.

| Question | Your answer |
|---|---|
| Type your rewritten program (use `def double(a):` … `return a`). | Type your code here |

## Constants
A **constant** is a value that should not change. Python has no special constant — we just write the name in **CAPITALS**, e.g. `LIVES = 5`.

| Question | Your answer |
|---|---|
| Write a constant for the number of lives in a game, set to 3. | Type your answer here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Python (Trinket / IDE) share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I described what local and global scope mean
- [ ] I spotted whether a variable is local or global
- [ ] I changed a global program to pass values through parameters
- [ ] I described what a constant is
