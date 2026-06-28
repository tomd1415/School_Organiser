# Reading CSV files

## Today we are learning
- describe a CSV file (commas, rows and columns)
- read a CSV file into a list
- use `split()` to break a line at the commas
- read a CSV file into a 2D list and find data

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: CSV (comma-separated values) · method · spreadsheet · tabular format. Same routine. CSV files are in the shared area.

## Starter — predict
```python
players = [["DinoFish", "0"],
           ["RockStar", "20"]]
print(players[1][0])
```
Predict the output. Row first, then column.

> 🧑‍🏫 Peer instruction. Answer: "RockStar". Recaps 2D-list indexing, which we need for CSV data. Support: what CSV stands for. Challenge: indexes for the score 20.

## What is a CSV?  (I do)
- A **CSV** file is a plain **text** file where values are separated by **commas**.
- It stores data in **tabular format** — rows and columns, like a spreadsheet.
- Python reads everything as a **string** (it does not guess numbers).

> 🧑‍🏫 I-do. Show the same CSV in a text editor (commas) and in a spreadsheet (a grid). A CSV is just a text file, so the same `open`/`read`/`close` work. Ask where they'd use one (scores, registers, weather).

## split() into a 2D list  (we do)
```python
file = open("players.csv", "r")
data = []
for line in file:
    line = line.strip()      # remove \n
    line = line.split(",")   # ["DinoFish", "0"]
    data.append(line)
file.close()
```

> 🧑‍🏫 We-do. `split(",")` breaks one line into a list at each comma — that is what turns a CSV line into a row. `pop(0)` removes the header row. Likely error: forgetting to split, so the whole line is one item. Fix-words "split at the comma to make columns."

## Your turn  (you do)
- Support: order the read-into-2D-list program (Parson's).
- Core: look up a player's score by name.
- Challenge: find the highest value in a column (weather data).

> 🧑‍🏫 Pair programming, swap every 5 mins. Likely error: comparing a string to a number, or wrong column index. Fix-words "float() the column before you compare, row first then column." TA: prompt, don't do it for them. Screenshot at the end.

## I can…
Tick your four "I can…". Show me data your program read from a CSV.

> 🧑‍🏫 Plenary. Discuss the 2D-list challenges — how far did pairs get. Recap: CSV = text + commas; split() makes columns. Next lesson: writing to CSV. Movement break is routine.
