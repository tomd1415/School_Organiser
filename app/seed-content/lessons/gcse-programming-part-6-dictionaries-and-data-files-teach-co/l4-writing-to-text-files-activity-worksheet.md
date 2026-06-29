# Writing to text files — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will **write** to a new file (`"w"`), **append** to a file (`"a"`), and use `\n` for new lines.

## File modes — sort the cards
Each mode is a single letter you pass to `open()`. Drag each fact into the right mode.

```sort
"r" read: opens a file so you can read it, does not change the file
"w" write: makes a new file (or WIPES an existing one) and writes to it
"a" append: opens a file and adds new data to the END, keeping what is there
```

## Code snippets
```python
file = open("players.txt", "w")     # "w" makes/overwrites the file
file.write("DinoShark\nMouseDragon\n")
file.close()
```
```python
file = open("players.txt", "a")     # "a" adds to the end
file.write("\nDragonShark")
file.close()
```

## Writing files — fill the gaps
| Question | Your answer |
|---|---|
| The mode that creates or overwrites a file is the letter [[ ]] | |
| The mode that adds data to the end is the letter [[ ]] | |
| To put the next piece of data on a new line, write [[ ]] | |

## 🟢 Support — write to a file
Order the lines so the program writes two names to a new file.

```parsons
file = open("players.txt", "w")
file.write("Fred\n")
file.write("Wilma\n")
file.close()
```

## 🟡 Core
| Question | Your answer |
|---|---|
| Write a program that asks for **four** player names and writes them to `players.txt`, each on a new line. Type your code. | Type your code here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Write a program that **appends** the user's latest score to `scores.txt` on a new line, so old scores are kept. Type your code. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Trinket / IDE share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I wrote to a new text file with `"w"` mode
- [ ] I explained that `"w"` overwrites the whole file
- [ ] I appended to a file with `"a"` mode
- [ ] I used `\n` to put data on new lines
