# Reading text files — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will **open** and **read** a text file, **iterate** over it line by line, and **strip** the `\n`.

## Code snippets
```python
file = open("quick.txt", "r")   # "r" = read mode
quicktext = file.read()         # read the whole file
print(quicktext)
file.close()                    # always close the file
```
```python
file = open("quick.txt", "r")
for line in file:               # iterate line by line
    print(line.strip())         # strip() removes the \n newline
file.close()
```

## File handling — fill the gaps
| Question | Your answer |
|---|---|
| The mode for reading a file is the letter [[ ]] | |
| `file.read()` reads the [[ ]] file in one go | |
| `.strip()` removes the [[ ]] newline character from the end of a line | |

## Open and read — put it in order
Drag the steps for reading a file into the right order.

```order
Open the file in read mode
Read the contents (read or a for loop)
Use or print the data
Close the file
```

## 🟢 Support — read a file
Order the lines so the program opens, reads and prints a text file.

```parsons
file = open("quick.txt", "r")
quicktext = file.read()
print(quicktext)
file.close()
```

## 🟡 Core
| Question | Your answer |
|---|---|
| Write a program that opens `numbers.txt`, reads each line into a list with `.strip()`, then prints the list. Type your code. | Type your code here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Read `numbers.txt`, change each line to an `int`, and print the **total**. (Hint: `int(line.strip())` then add them up.) Type your code. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Trinket / IDE share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I explained why programs use external data files
- [ ] I opened and read a text file (open, read, close)
- [ ] I iterated over a file and stripped the `\n`
- [ ] I read a file's lines into a list
