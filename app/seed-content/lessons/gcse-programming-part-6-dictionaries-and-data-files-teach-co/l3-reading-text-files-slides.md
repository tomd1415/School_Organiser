# Reading text files

## Today we are learning
- explain why programs use external data files
- open and read a text file (open, read, close)
- iterate over a file and strip the `\n`
- read a file's lines into a list

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: data file · text file · open · read · close. Same routine. Everyone has Python open and the quick.txt / numbers.txt files in the shared area.

## Starter — saving progress
![A game saves your high score in a file.]({{res:l3-saving-progress-arcade-high-score-teach-computing.png}})
How limited would gaming be if you could never save your progress?

> 🧑‍🏫 Think–pair–share. A variable is forgotten when the program ends; a FILE keeps the data. That is why we need data files. Support: tick why a data file is useful.

## Open, read, close  (I do)
```python
file = open("quick.txt", "r")
quicktext = file.read()
print(quicktext)
file.close()
```
- `"r"` = **read** mode. A book must be opened before you can read it.

> 🧑‍🏫 I-do. Step through each part: identifier `file`, the `open()` function, the filename, the mode. Warn about `"w"` — it WIPES a file (we use it next lesson). The text file MUST be in the same place as the Python file. Don't name a variable the same as the file.

## Reading line by line  (we do)
```python
file = open("quick.txt", "r")
for line in file:
    print(line.strip())     # strip() removes the \n
file.close()
```

> 🧑‍🏫 We-do. Each line from a file ends in a hidden newline `\n`. `.strip()` removes it. `readlines()` puts the lines in a list. Default data type is STRING — use `int()` if you need numbers. Fix-words "strip the newline."

## Your turn  (you do)
- Support: order the read program (Parson's).
- Core: read the lines into a list and print it.
- Challenge: add up the numbers in `numbers.txt` and print the total.

> 🧑‍🏫 Pair programming, swap every 5 mins. Likely error: file not found → check it is in the same folder. Or forgetting `int()` so the numbers join as text. Fix-words "numbers from a file are strings — int() them first." TA: prompt, don't do it for them. Screenshot at the end.

## I can…
Tick your four "I can…". Show me a file your program read.

> 🧑‍🏫 Plenary. Quick recap of the five file methods (open, read, readline, readlines, close). Next lesson: writing to files. Movement break is routine.
