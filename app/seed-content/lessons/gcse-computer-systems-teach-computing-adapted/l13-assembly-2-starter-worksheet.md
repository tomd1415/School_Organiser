# Assembly language II — starter worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
First I will translate a Python program into assembly on my own, then I will design and write my own program.

## Starter — you are the translator now
Translate this Python program into LMC assembly. The first line is done for you.

```
maximum = input()      →   INP
                           STA MAX
num1 = input()
num2 = input()
result = num1 + num2
if result > maximum:
    print(result)
```

| Question | Your answer |
|---|---|
| Write the rest of the assembly program. | Type your code here |

## 🟢 Support
| Question | Choose one |
|---|---|
| Which command branches (jumps) if the value is positive? | (  ) BRP (  ) OUT (  ) INP |

## 🟡 Core
| Question | Your answer |
|---|---|
| To check "is result bigger than maximum", you SUB maximum from result. What does the answer being positive tell you? | Type your answer here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| This `if` has no `else`. Why might you need a BRA (branch always) to skip the output? | Type your answer here |
