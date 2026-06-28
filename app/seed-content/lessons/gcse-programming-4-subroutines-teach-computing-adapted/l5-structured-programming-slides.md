# Structured programming

## Today we are learning
- explain "one entry point, one exit point"
- improve code to remove break and extra returns
- read a structure chart
- complete a program from a structure chart

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: structured programming · entry point · exit point · interface · structure chart. Everyone has Python open.

## Starter — count the exit points
```python
def and_function(a, b):
    if a == True and b == True:
        return True
    else:
        return False
```

> 🧑‍🏫 I-do. Ask "how many exit points?" — there are TWO returns. The term may be new; point to each `return`. Structured code has ONE exit point.

## The structured approach
- Every block has **one entry point** and **one exit point**.
- Avoid `break` and avoid more than one `return`.
- Stop a loop by setting its condition to **False**, not `break`.

> 🧑‍🏫 We-do. Show the "improve the code" worked example: store the answer in a variable, then ONE return at the end. They do the rest on the worksheet. It runs the same — but it is tidier and easier to follow.

## Why structure it?
- Old code with GOTO jumps became tangled "spaghetti code".
- Blocks let a **team** each work on one part, then join them up.
- Planning the blocks first **reduces** the time to build.

> 🧑‍🏫 We-do. Keep it concrete: each subroutine is a tidy box with a known job (its interface = parameters in, return out).

## Structure charts
![Three dogs on a walk — the dog-walking invoice program]({{res:l5-dog-walking-teach-computing.png}})

A **structure chart** plans the subroutines before you code. Each shows: identifier · parameters · return.

> 🧑‍🏫 We-do. Walk through the dog-walking invoice chart: num_dogs, num_days, num_walks, total_charge, invoice. Explain what an invoice is — some pupils will not know.

## Your turn — complete the program  (you do)
Use the structure chart to finish the dog-walking invoice program.

> 🧑‍🏫 Likely error: a subroutine that should RETURN a value but only prints — fix-words "return it so the next subroutine can use it." Support: sort / read the chart. Challenge: add a max of 3 dogs. They paste a screenshot.

## I can…
Tick your four "I can…". Tell me one advantage of the structured approach.

> 🧑‍🏫 Note who removed the extra returns and completed a subroutine from the chart.
