# Assembly language I

## Today we are learning
- assembly language has a 1:1 relationship with machine code
- describe the LMC commands: INP, OUT, STA, LDA, ADD, SUB, BRP
- translate a Python program into LMC assembly

> 🧑‍🏫 Read the "I can…" aloud. Vocabulary on the board: assembly language · mnemonic · accumulator · register · abstraction. Same routine as every lesson.

## Starter — high-level programming
- write a Python program: input two numbers, add, output
- design it first (pseudocode or Python)

> 🧑‍🏫 Circulate while they design on the starter worksheet. Show the pseudocode solution, let them fix their design, then code and test. Keep it short — it sets up the translation.

## High level vs low level
- one line of Python does MANY things at once
- one line of assembly does just ONE thing
- so each Python line becomes several assembly lines

> 🧑‍🏫 I-do: take `num1 = input()`. It does input AND storage — two jobs. In assembly that is two lines (INP then STA). This is why low-level code is longer.

## The Little Man Computer
![The Little Man Computer and its commands]({{res:l12-the-little-man-computer-and-its-commands-teach-computing.png}})
- INP input · OUT output · STA store · LDA load
- ADD add · SUB subtract · BRP branch if positive · HLT halt

> 🧑‍🏫 Open peterhigginson.co.uk/lmc. Build the toolbox with the class. The accumulator is the one working store that ADD and SUB act on.

## Translate together
```
num1 = input()   →  INP
                    STA NUM1
num2 = input()   →  INP
                    STA NUM2
print(num1+num2) →  LDA NUM1
                    ADD NUM2
                    OUT
```

> 🧑‍🏫 We-do: model the first line, then pupils do the rest on the activity worksheet (Parsons order). Likely error: forgetting to STA after INP → the value is lost. End with HLT.

## You do — run it
- type your assembly into the LMC
- step through it and watch the accumulator

> 🧑‍🏫 You-do. Pupils run their program and screenshot it. TA: prompt them to use the toolbox picture, do not type it for them.

## I can…
Tick your "I can…". Name what STA and LDA do.

> 🧑‍🏫 Quick check: INP → STA to keep a value; LDA → ADD → OUT to use it.
