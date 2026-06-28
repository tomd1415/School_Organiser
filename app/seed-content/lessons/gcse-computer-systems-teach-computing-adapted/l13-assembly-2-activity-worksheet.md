# Assembly language II — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will design and write my own assembly program, using branching to make a decision.

## How branching works
The LMC makes decisions with branches. This program outputs the larger of two numbers — see how SUB and BRP choose a path.

![An LMC program that uses branching]({{res:l13-lmc-branching.png}})

Three rules to remember:
- all data goes into the accumulator unless you STA it
- ADD and SUB act on the value in the accumulator
- branches (BRP, BRA) let your program skip parts that do not apply

## Order the decision
Put the steps for "output the larger of two numbers" in order.

```order
Input the first number and store it
Input the second number and store it
Subtract one number from the other
If the result is positive, branch to output the bigger number
Otherwise, output the other number
Halt
```

## Your final project
Design a program that:
- inputs three numbers
- adds the first two together
- if that total is larger than the third number, outputs the total
- otherwise outputs the third number

| Question | Your answer |
|---|---|
| First, plan it in Python or pseudocode. | Type your code here |

## 🟢 Support
| Question | Choose one |
|---|---|
| Which command always jumps, with no condition? | (  ) BRA (  ) BRP (  ) HLT |

## 🟡 Core
| Question | Your answer |
|---|---|
| In your final project, which two numbers are added together first? | Type your answer here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Now write your final project in LMC assembly. | Type your code here |

## Show your work
Type your program into the LMC simulator (peterhigginson.co.uk/lmc) and test it.

| Question | Your answer |
|---|---|
| Write your finished assembly program | Type your code here |
| Show your program running in the LMC | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I translated a Python program into LMC assembly on my own
- [ ] I used branching (BRP, BRA) to make a decision in assembly
- [ ] I designed and wrote my own assembly program
