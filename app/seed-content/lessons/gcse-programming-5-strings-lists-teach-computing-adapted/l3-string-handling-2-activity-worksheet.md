# String handling II — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will **slice** strings, use the **in** operator, and use **chr()** and **ord()** for ASCII conversions.

## Match the technique to what it does
Drag each answer to the right technique.

| Technique | What it does |
|---|---|
| `word[1:3]` | (  ) takes a substring (slice) (  ) checks if a substring is inside a string (  ) turns a number into a character (  ) turns a character into a number |
| `"12" in username` | (  ) takes a substring (slice) (  ) checks if a substring is inside a string (  ) turns a number into a character (  ) turns a character into a number |
| `chr(66)` | (  ) takes a substring (slice) (  ) checks if a substring is inside a string (  ) turns a number into a character (  ) turns a character into a number |
| `ord("C")` | (  ) takes a substring (slice) (  ) checks if a substring is inside a string (  ) turns a number into a character (  ) turns a character into a number |

## Slicing — fill the gaps
For `name = "Smith"` the indexes are S=0, m=1, i=2, t=3, h=4.

| Question | Your answer |
|---|---|
| `name[0:2]` gives the substring [[ ]] | |
| To get `mit`, you write `name[` [[ ]] `:` [[ ]] `]` | |
| `chr(65)` gives the character [[ ]] | |

## Worked example — make a username
The username is `20` + surname + first initial, e.g. `20SmithR`.

```python
print("Starting year:")
startyear = input()
print("First name:")
firstname = input()
print("Surname:")
surname = input()
yearsub = startyear[0:2]
initial = firstname[0]
username = yearsub + surname + initial
print(username)
```

## 🟢 Support — put the username program in order
```parsons
startyear = input()
surname = input()
firstname = input()
yearsub = startyear[0:2]
initial = firstname[0]
username = yearsub + surname + initial
print(username)
```

## 🟡 Core
| Question | Your answer |
|---|---|
| Write a year-group checker: ask for a username, then use `if "20" in username:` to print "User in Y7". Type your code. | Type your code here |

## 🔴 Challenge — secret message decoder
Use `chr()` to turn ASCII codes into letters and build up a message with concatenation.

| Question | Your answer |
|---|---|
| Type a program that reads decimal numbers, converts each with `chr()`, and joins them into one message string. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Trinket / IDE share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I took a substring using slicing
- [ ] I used the `in` operator to check for a substring
- [ ] I used `chr()` and `ord()` for ASCII conversions
- [ ] I built a program that uses substrings
