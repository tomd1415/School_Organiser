# Data validation

## Today we are learning
- explain why programs need data validation
- sort inputs into Correct / Out of range / ValueError / Empty
- use a while loop with try / except to validate input
- add a range check

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: data validation · try / except · ValueError · range check · robustness.

## Starter — what could the user type?
The program asks: **"Enter a number between 1 and 10"**.

> 🧑‍🏫 Discuss: users type all sorts of things. Use the card-sort on the worksheet — Correct / Out of range / ValueError / Empty. Watch for 7.5: it is a number but NOT an integer, so it is still a ValueError.

## Why validate?
- A **robust** program keeps working with strange input.
- Without checks, a bad input can **crash** the program.
- We **predict** the unexpected and handle it.

> 🧑‍🏫 I-do. Define robustness in plain words: "it does not break when someone types something silly." Real software must do this.

## try / except inside a while loop  (I do → we do)
```
not_validated = True
while not_validated:
    print("Enter a number:")
    try:
        number = int(input())
        not_validated = False
    except ValueError:
        print("You must enter a number:")
```

> 🧑‍🏫 We-do / live code. The old try/except only worked once. Putting it in a while loop makes it keep asking. Likely error: forgetting `not_validated = False`, so it loops forever. Fix-words: "we must turn the loop OFF when the input is good."

## Your turn — add a range check  (you do)
Make the number be from 1 to 10 only.

> 🧑‍🏫 Support: order the Parson's puzzle. Core: what does try/except catch? Challenge: add an `if 1 <= number <= 10` range check. Pair programming — swap driver/navigator every 5 minutes. They paste a screenshot.

## I can…
Tick your four "I can…". Tell me one input your program now handles safely.

> 🧑‍🏫 Note who got the loop to keep asking AND added the range check.
