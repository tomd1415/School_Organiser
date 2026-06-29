# Logical expressions — starter worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## Starter — Parson's puzzle
Here is all the code for a simple **password checker**, but the lines are jumbled.

Drag the lines into the right order so the program:
- asks for a password
- checks it against the stored password
- prints "Access granted" if it matches, or "Access denied" if it does not

```parsons
stored_password = "Fish4321"
print("Enter password:")
password = input()
if password == stored_password:
    print("Access granted")
else:
    print("Access denied")
```

## 🟢 Support
| Question | Choose |
|---|---|
| Which line must come BEFORE we can check the password? | (  ) stored_password = "Fish4321" (  ) print("Access granted") (  ) else: |

## 🟡 Core
| Question | Your answer |
|---|---|
| Why must `print("Access granted")` be indented under the `if`? | Type your answer here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| What would the program output if you typed `fish4321` (lower-case f)? Why? | Type your answer here |
