# Data validation — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will use a **while loop** with **try / except** to validate input, and add a **range check**.

## Predict
This is the start code. It only checks the input **once**.

```python
try:
    print("Enter a number between 1 and 10:")
    number = int(input())
except ValueError:
    print("You must enter a number between 1 and 10:")
    number = int(input())
```

| Question | Your prediction |
|---|---|
| What happens if the user types a letter **twice** in a row? | Type your answer here |

## Make it keep asking
To keep asking until the input is valid, we put `try / except` **inside a while loop**.

A while loop repeats the check while `not_validated` is [[ ]].

The loop stops when we set `not_validated` to [[ ]].

## 🟢 Support
Put the validation program in order so it keeps asking until the user enters a number.

```parsons
not_validated = True
while not_validated:
    print("Enter a number:")
    try:
        number = int(input())
        not_validated = False
    except ValueError:
        print("You must enter a number:")
```

## 🟡 Core
| Question | Choose |
|---|---|
| `try / except` is used to catch… | (  ) a ValueError when the input is not a number (  ) a spelling mistake in your code (  ) a missing file |

## 🔴 Challenge
Add a **range check** so the number must be from 1 to 10.

| Question | Your answer |
|---|---|
| Add an `if` that sets `not_validated = False` only when the number is between 1 and 10, and otherwise prints "Number entered out of range". Type your program. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Python (Trinket / IDE) share link here | Type your answer here |
| Show your finished validation program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I explained why programs need data validation
- [ ] I sorted inputs into Correct / Out of range / ValueError / Empty
- [ ] I used a while loop with try / except to validate input
- [ ] I added a range check
