# Reading CSV files — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will read a **CSV file** into a list, use `split()` to break a line at the commas, and read into a **2D list**.

## Code snippets
```python
# read each whole line into a list
file = open("scores.csv", "r")
data = []
for line in file:
    data.append(line.strip())
file.close()
```
```python
# read into a 2D list — split() each line at the commas
file = open("players.csv", "r")
data = []
for line in file:
    line = line.strip()      # remove the \n
    line = line.split(",")   # ["DinoFish", "0"]
    data.append(line)
file.close()
```

## Method ↔ what it does — match each one
| Method | What it does |
|---|---|
| `.strip()` | (  ) removes the newline `\n` from the ends (  ) breaks a string at a character into a list (  ) removes an item at an index |
| `.split(",")` | (  ) removes the newline `\n` from the ends (  ) breaks a string at a character into a list (  ) removes an item at an index |
| `.pop(0)` | (  ) removes the newline `\n` from the ends (  ) breaks a string at a character into a list (  ) removes an item at an index |

## CSV reading — fill the gaps
| Question | Your answer |
|---|---|
| A CSV file is really just a [[ ]] file with commas in it | |
| To split `"DinoFish,0"` into two items, use `line.` [[ ]] `(",")` | |
| To remove the header row from `data`, use `data.` [[ ]] `(0)` | |

## 🟢 Support — read a CSV into a 2D list
Order the lines so the program reads a CSV file into a 2D list.

```parsons
file = open("players.csv", "r")
data = []
for line in file:
    line = line.strip()
    line = line.split(",")
    data.append(line)
file.close()
```

## 🟡 Core
| Question | Your answer |
|---|---|
| Read `players.csv` into a 2D list, ask the user for a player name, and print that player's score. Type your code. | Type your code here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Read `weatherdata.csv` into a 2D list and print the **highest** rainfall value found in a column. Type your code. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Trinket / IDE share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I described a CSV file (commas, rows and columns)
- [ ] I read a CSV file into a list
- [ ] I used `split()` to break a line at the commas
- [ ] I read a CSV file into a 2D list and found data
