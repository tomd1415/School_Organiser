# Writing to CSV files — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will use `join()` to make a list into a comma string, then **write** a 1D list and a 2D list to a CSV file.

## Code snippets
```python
# write a 1D list to a CSV file (one row)
numbers = [3, 4, 5]
str_numbers = []
for number in numbers:
    str_numbers.append(str(number))   # everything must be a string
data = ",".join(str_numbers)          # "3,4,5"
file = open("numbers.csv", "w")
file.write(data)
file.close()
```

## split() and join() — match each one
| Method | What it does |
|---|---|
| `.split(",")` | (  ) breaks a string into a list at each comma (  ) joins a list into one string with commas |
| `",".join(my_list)` | (  ) breaks a string into a list at each comma (  ) joins a list into one string with commas |

## Writing CSV — fill the gaps
| Question | Your answer |
|---|---|
| All data written to a file must be a [[ ]] | |
| To join the list `["3","4","5"]` with commas, use `","` [[ ]] `(str_numbers)` | |
| To start each new row of a 2D list on a new line, add a [[ ]] | |

## 🟢 Support — write a 1D list
Order the lines so the program writes a list of numbers to a CSV file.

```parsons
numbers = ["3", "4", "5"]
data = ",".join(numbers)
file = open("numbers.csv", "w")
file.write(data)
file.close()
```

## 🟡 Core
| Question | Your answer |
|---|---|
| Ask the user for a times table (e.g. 10), build a list of its 12 values, and write them to a CSV file in one row. Type your code. | Type your code here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Write a **2D list** (a number grid) to a CSV file, with each row on its own line. (Hint: join each row, then add `\n`.) Type your code. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Trinket / IDE share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I explained that data must be a string before writing to a CSV
- [ ] I used `join()` to make a list into a comma string
- [ ] I wrote a 1D list to a CSV file
- [ ] I wrote a 2D list to a CSV file
