# Writing to CSV files

## Today we are learning
- explain that data must be a string before writing to a CSV
- use `join()` to make a list into a comma string
- write a 1D list to a CSV file
- write a 2D list to a CSV file

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: CSV · split method · join method · string. Same routine. Everyone has Python open. This lesson has hard challenges — it is fine to spread over two.

## Starter — think, write, pair, share
When might you use a **CSV file** instead of a plain text file?

> 🧑‍🏫 Mini-whiteboards. Key point: a CSV is for data in tabular form (rows/columns), easy to open in a spreadsheet. Support: tick rows-and-columns. Lead into: writing needs strings.

## Strings and join()  (I do)
```python
numbers = [3, 4, 5]
str_numbers = []
for number in numbers:
    str_numbers.append(str(number))
data = ",".join(str_numbers)   # "3,4,5"
```
- A file can only store **strings** — `str()` each number first.
- `join()` is the **opposite** of `split()`.

> 🧑‍🏫 I-do. Show the two typical errors (writing an int, or writing a list) so they recognise them. Recap split() from last lesson, then introduce join() as its mirror. Live-code or use the steps.

## Writing the file  (we do)
```python
file = open("numbers.csv", "w")
file.write(data)
file.close()
```
For a **2D list**: join each row, then add `\n` so each row is its own line.

> 🧑‍🏫 We-do. Walk the 2D case slowly — one row at a time: cast each item to string, join the row, add `\n`. Likely error: rows all on one line → missing `\n`. Fix-words "join the row, then newline."

## Your turn  (you do)
- Support: order the write-a-list program (Parson's).
- Core: write a times table to a CSV (one row).
- Challenge: write a 2D number grid, each row on its own line.

> 🧑‍🏫 Pair programming, swap every 5 mins. Likely error: a TypeError from writing an int — fix-words "str() it first." TA: prompt, don't do it for them. Screenshot at the end.

## I can…
Tick your four "I can…". Open your CSV in a spreadsheet to check it.

> 🧑‍🏫 Plenary. Quick check of the three methods: str(), join(), write(). Next lesson: good programming habits + appending to a CSV. Movement break is routine.
