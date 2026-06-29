# Assembly language I — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will learn the basic LMC assembly commands and translate a Python program into assembly.

## High level vs low level
One line of Python does many things at once. In assembly (low-level), each line does just ONE thing, so you need more lines. Assembly has a 1:1 link with machine code — one assembly instruction is one machine-code instruction.

## The LMC toolbox
This is the Little Man Computer. Keep this picture to help you.

![The Little Man Computer commands]({{res:l12-the-little-man-computer-and-its-commands-teach-computing.png}})

## Match the command to what it does
Pick what each LMC command does.

| Command | What it does |
|---|---|
| INP | (  ) take an input from the user (  ) store the value into a memory box (  ) load a value from a memory box (  ) output the value |
| STA | (  ) take an input from the user (  ) store the value into a memory box (  ) load a value from a memory box (  ) output the value |
| LDA | (  ) take an input from the user (  ) store the value into a memory box (  ) load a value from a memory box (  ) output the value |
| OUT | (  ) take an input from the user (  ) store the value into a memory box (  ) load a value from a memory box (  ) output the value |

## Translate the program
The Python below inputs two numbers, adds them and outputs the total.

```
num1 = input()
num2 = input()
print(num1 + num2)
```

Drag the assembly lines into the right order to do the same thing.

```parsons
INP
STA NUM1
INP
STA NUM2
LDA NUM1
ADD NUM2
OUT
HLT
```

## 🟢 Support
| Question | Choose one |
|---|---|
| Which command OUTPUTS a value to the user? | (  ) OUT (  ) INP (  ) STA |
| `STA NUM1` will… | (  ) store a value in the box called NUM1 (  ) print NUM1 |

## 🟡 Core
| Question | Your answer |
|---|---|
| The Python line `num1 = input()` needs TWO assembly lines. Which two, and why? | Type your answer here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| What does it mean to say assembly has a 1:1 relationship with machine code? | Type your answer here |

## Show your work
Type your program into the LMC simulator (peterhigginson.co.uk/lmc) and run it.

| Question | Your answer |
|---|---|
| Write your finished assembly program | Type your code here |
| Show your program running in the LMC | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I explained that assembly has a 1:1 relationship with machine code
- [ ] I described the commands INP, OUT, STA, LDA, ADD, SUB and BRP
- [ ] I translated a Python program into LMC assembly
