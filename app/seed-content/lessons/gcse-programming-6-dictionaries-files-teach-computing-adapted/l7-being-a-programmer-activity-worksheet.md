# Being a programmer — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will use **meaningful identifiers** and **naming conventions**, rewrite code a cleaner way, and **append** to a CSV file.

## Good or poor practice? — sort the cards
Drag each habit into the right group.

```sort
Good practice: meaningful variable names, comment your code, test early and often, follow naming conventions, start small and decompose
Poor practice: single-letter names like a and z, no comments at all, write the whole program then test once at the end, ignore naming conventions
```

## Code snippets — cleaner alternatives
```python
name = input("Enter your name: ")    # prompt inside input()
score += 1                           # short for score = score + 1
print("Name:", name, "Score:", score)  # commas, no str() needed
```

## Append to a CSV — fill the gaps
| Question | Your answer |
|---|---|
| The mode for adding to the end of a CSV file is the letter [[ ]] | |
| A meaningful identifier means a variable name that is [[ ]] to understand | |
| `score += 1` does the same as `score` [[ ]] `score + 1` | |

## 🟢 Support — append to a CSV
Order the lines so the program appends three numbers to a CSV file.

```parsons
file = open("numbers.csv", "a")
numbers = "3,4,5"
file.write(numbers)
file.close()
```

## 🟡 Core
| Question | Your answer |
|---|---|
| Take this code and rewrite it with **meaningful names** and a comment: `x = "sandwich"` / `y = input()` / `if y == x:` … Type your improved code. | Type your code here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Write a spelling-test program: read words from `spellings.csv`, ask the user to spell each one, then **append** their Correct/Incorrect results to the file. Type your code. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Trinket / IDE share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I described the good habits of a programmer
- [ ] I used meaningful identifiers and naming conventions
- [ ] I rewrote code using a cleaner alternative
- [ ] I appended data to a CSV file
