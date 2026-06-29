# Scope

## Today we are learning
- describe what local and global scope mean
- spot whether a variable is local or global
- change a global program to pass values through parameters
- describe what a constant is

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: scope · local · global · parameter · constant. Everyone has Python open.

## Starter — predict the output
```python
def example():
    number = 10
    print(number)

number = 5
example()
```

> 🧑‍🏫 I-do. It prints 10. There are TWO variables called `number`: a global (5) and a local one made inside the function (10). The function prints its own local one.

## Scope — what can be seen where
![A telescope — scope is about what you can see]({{res:l3-telescope-scope-teach-computing.png}})

- **Local** — made inside a subroutine; only that subroutine sees it.
- **Global** — made in the main program; any subroutine can read it.

> 🧑‍🏫 We-do. Step through the three examples: a function READING a global; a function making a local with the same name (no change to the global); and `global` to actually change the global.

## global — and why we avoid it
- `global number` tells Python "use the global one, not a new local".
- Global variables are **bad practice** — they make bugs hard to find.
- Better: pass values **in** through parameters and **return** the result.

> 🧑‍🏫 We-do. Show the `double()` global version, then the parameter version side by side. They do the rest on the worksheet (pair programming). Likely error: forgetting to store the returned value — fix-words "catch it: num1 = double(num1)."

## Your turn — not 'going global'  (you do)
Rewrite a global program to use a parameter and `return` instead.

> 🧑‍🏫 Support: card-sort local vs global. Core: explain why parameters are better. Challenge: convert the score program. They paste a screenshot.

## Constants
- A **constant** is a value that should not change.
- Python has no special constant — write the name in **CAPITALS**: `LIVES = 5`.

> 🧑‍🏫 Plenary lead-in. CAPITALS is only a convention — Python will still let you change it, but you should not. Other languages (like C) enforce it.

## I can…
Tick your four "I can…". Tell me one reason global variables are risky.

> 🧑‍🏫 Note who rewrote a global program using parameters. Optional lesson quiz on local/global lines.
