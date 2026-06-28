# Making an XOR function

## Today we are learning
- read and complete a truth table
- describe what XOR does
- design an XOR function in pseudocode
- create and test an XOR function

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: XOR · operator · truth table · Boolean · return value. Everyone has Python open.

## Starter — AND and OR
```python
if num1 == 1 and num2 == 2:
    print("This is true")
else:
    print("This is false")
```

> 🧑‍🏫 Peer instruction: predict the output, then reveal. Recap: AND needs BOTH true; OR needs AT LEAST ONE true. They met AND and OR back in Lesson 10.

## Truth tables
![The AND truth table with code]({{res:l4-and-truth-table-code-teach-computing.png}})

- A **truth table** lists every input combination and the result.
- `0` = False, `1` = True.

> 🧑‍🏫 I-do. Complete the first row of AND together. Pupils complete the AND and OR tables on the worksheet by changing the code and running it.

## XOR — exclusive or
- **XOR** is True when the two inputs are **different**.
- XOR is False when the two inputs are the **same**.
- Python has no XOR operator — so we build our own **function**.

> 🧑‍🏫 We-do. Fill the XOR truth table together: 0,0→0 · 0,1→1 · 1,0→1 · 1,1→0. The label-the-parts task on the worksheet revises subroutine name / parameters / return value / arguments.

## Your turn — build the XOR function  (you do)
Design it in pseudocode first, then write and test it.

> 🧑‍🏫 Support: order the pseudocode Parson's puzzle. Core: complete the truth table + label task. Challenge: use the XOR function inside an `if` statement. Likely error: comparing `a == True` wrongly — fix-words "XOR is True when a and b are DIFFERENT." They paste a screenshot.

## I can…
Tick your four "I can…". Show me your XOR function passing the truth table.

> 🧑‍🏫 Plenary: "what is the output?" — show a few calls, pupils answer True/False on mini whiteboards.
