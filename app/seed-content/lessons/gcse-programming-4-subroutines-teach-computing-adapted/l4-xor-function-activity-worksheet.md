# Making an XOR function — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will complete a **truth table**, describe **XOR**, then design and build an **XOR function**.

## Truth tables
A **truth table** lists every input combination and the result. We write `0` for False and `1` for True.

![The AND truth table with code]({{res:l4-and-truth-table-code-teach-computing.png}})

## Label the parts of a subroutine
This function has an AND operator. Drag each label onto the right part of the code.

```label
image: {{res:l4-and-or-function-code-teach-computing.png}}
name1 (29%, 27%): the subroutine name
params1 (45%, 27%): the parameters
return1 (24%, 40%): the return value
args1 (51%, 50%): the arguments
```

## Complete the XOR truth table
**XOR** (exclusive or) is True when the two inputs are **different**, and False when they are the **same**.

| A | B | A XOR B |
|---|---|---|
| 0 | 0 | (  ) 0 (  ) 1 |
| 0 | 1 | (  ) 0 (  ) 1 |
| 1 | 0 | (  ) 0 (  ) 1 |
| 1 | 1 | (  ) 0 (  ) 1 |

## 🟢 Support
| Question | Choose |
|---|---|
| XOR is True when the two inputs are… | (  ) different (  ) the same (  ) both True |
| XOR is False when the two inputs are… | (  ) the same (  ) different (  ) both False only |

## 🟡 Core — design the XOR function
Here is a worked AND function to copy the shape from:

```python
def and_function(a, b):
    if a == True and b == True:
        c = True
    else:
        c = False
    return c
```

Put the pseudocode for an XOR function in order.

```parsons
SUBROUTINE xor_function(a, b)
    IF a is equal to b THEN
        c = False
    ELSE
        c = True
    END IF
    RETURN c
END SUBROUTINE
```

## 🔴 Challenge — create and test the XOR function
Write the XOR function in Python, then test it against the truth table.

| Question | Your answer |
|---|---|
| Type your `xor_function(a, b)` and a line that tests it, e.g. `print(xor_function(True, False))`. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Python (Trinket / IDE) share link here | Type your answer here |
| Show your finished XOR function | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I read and completed a truth table
- [ ] I described what XOR does
- [ ] I designed an XOR function in pseudocode
- [ ] I created and tested an XOR function
