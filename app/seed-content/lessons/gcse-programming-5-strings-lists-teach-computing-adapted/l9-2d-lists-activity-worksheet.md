# 2D lists — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will **access**, **change** and **append** items in a **2D list**, and build a password manager.

## The 2D list for these tasks
Rows: row 0 = fish, row 1 = birds, row 2 = mammals. Columns are 0, 1, 2.

```python
animals = [["Salmon", "Pollock", "Cod"],
           ["Parrot", "Duck", "Wren"],
           ["Camel", "Lion", "Tiger"]]
```

## Indexing — fill the gaps
| Question | Your answer |
|---|---|
| `animals[1]` prints the whole row [[ ]] | |
| `animals[1][2]` prints the single word [[ ]] | |
| To print `Camel`, write `animals[` [[ ]] `][` [[ ]] `]` | |

## Match the code to its output
| Code | Output |
|---|---|
| `animals[0][1]` | (  ) Pollock (  ) Duck (  ) Tiger |
| `animals[1][0]` | (  ) Pollock (  ) Parrot (  ) Tiger |
| `animals[2][2]` | (  ) Pollock (  ) Duck (  ) Tiger |

## Changing and appending
A real 2D list, shown as code:

![Password manager 2D list code snippets]({{res:l9-2d-list-code-teach-computing.png}})

```python
animals[0][2] = "Plaice"     # change one item
animals[0].append("Trout")   # add to row 0
```

## 🟢 Support — order an access program
```parsons
animals = [["Salmon", "Pollock", "Cod"],
           ["Parrot", "Duck", "Wren"]]
print(animals[1])
print(animals[1][2])
```

## 🟡 Core
| Question | Your answer |
|---|---|
| Change the word `Cod` to `Plaice`, then print the whole 2D list. Type your code. | Type your code here |

## 🔴 Challenge — password manager
Build a 2D list with three rows: accounts, usernames, passwords. Let the user add an account, then look one up.

| Question | Your answer |
|---|---|
| Type the part of your program that adds an account, username and password to the right rows. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Trinket / IDE share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I described what a 2D list is
- [ ] I accessed a row and a single item with two indexes
- [ ] I changed and appended items in a 2D list
- [ ] I built a program that uses a 2D list
