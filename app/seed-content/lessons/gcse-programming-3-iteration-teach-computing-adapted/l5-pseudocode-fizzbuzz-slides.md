# Pseudocode and FizzBuzz

## Today we are learning
- describe what pseudocode is and why we use it
- match pseudocode to Python code
- translate pseudocode into Python
- design the FizzBuzz algorithm in pseudocode

> 🧑‍🏫 This is a double lesson — take your time. Read the four "I can…" aloud. Vocabulary on the board: pseudocode · syntax · algorithm · MOD · iteration. Pair pupils with a learning partner; check in every 15 minutes.

## Starter — will this code run?
```
WHILE pass_mismatch
    OUTPUT "Enter your password:"
    password <- USERINPUT
    pass_mismatch <- stored_pass != password
ENDWHILE
OUTPUT "Access granted"
```

> 🧑‍🏫 Predict: will the IDE run it? No — WHILE, OUTPUT, USERINPUT, <- are not Python. Draw out the differences. This leads into the word PSEUDOCODE.

## What is pseudocode?
- **Pseudocode** = informal steps for an algorithm using **structured English**.
- It is for **planning** — the computer does not run it.
- Each pseudocode word has a Python equivalent (OUTPUT → print, <- → =, MOD → %).

> 🧑‍🏫 I-do. Pseudocode lets you plan the logic without worrying about exact syntax. We use the Teach Computing pseudocode (swap for your exam board if needed).

## Translate it  (we do)
![Password pseudocode to translate]({{res:l5-pseudocode-translate-teach-computing.png}})

> 🧑‍🏫 We-do. Match pseudocode to Python on the worksheet, then translate the password program together. It is a familiar algorithm (a while loop they have seen), so cognitive load stays low.

## Design FizzBuzz  (you do)
![FizzBuzz: the number sequence and its output]({{res:l5-fizzbuzz-sequence-teach-computing.png}})

Fizz = divisible by 3 · Buzz = divisible by 5 · FizzBuzz = divisible by both.

> 🧑‍🏫 You-do over the rest of the double lesson. Support: order the FizzBuzz rules. Core: translate the password code. Challenge: write FizzBuzz in Python. Tip: MOD (`%`) gives the remainder — divisible by 3 means `number % 3 == 0`. Learning partners check in; they paste a screenshot. End with the unit quiz.

## I can…
Tick your four "I can…". Tell your partner one thing pseudocode helped you plan.

> 🧑‍🏫 Final learning-partner discussion: did you finish? what did you learn? Then hand out the iteration unit quiz.
