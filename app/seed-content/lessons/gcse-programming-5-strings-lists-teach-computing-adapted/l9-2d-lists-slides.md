# 2D lists

## Today we are learning
- describe what a 2D list is
- access a row and a single item with two indexes
- change and append items in a 2D list
- build a program that uses a 2D list

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: 2D list · 2D array · row · column · index. Same routine. Everyone has Python open.

## Starter — predict
```python
scores = [["Fred", "Wilma", "Dino"],
          [4, 5, 6]]
print(scores[1][2])
```
Predict the output.

> 🧑‍🏫 Peer instruction. `scores[1]` is the row `[4,5,6]`; `[2]` then picks 6. Support: tick what a 2D list is. Challenge: which index comes first.

## A list of lists  (I do)
- A **2D list** holds rows and columns — a list inside a list.
- `list[row][column]` — **row first**, then the column.
- Both start at **0**.

> 🧑‍🏫 I-do. Draw the grid with row/column numbers. Common slip: column before row. Fix-words: "row first, then column." A 2D array is the fixed version; 2D list can change.

## Access, change, append  (we do)
![Password manager 2D list code snippets]({{res:l9-2d-list-code-teach-computing.png}})
- `animals[1][2]` reads one item.
- `animals[0][2] = "Plaice"` changes one item.
- `animals[0].append("Trout")` adds to a row.

> 🧑‍🏫 We-do. Use the "fill the gaps" + "match the code to its output" tasks. Step each one on the grid you drew.

## Your turn  (you do)
- Support: order an access program (Parson's).
- Core: change an item and print the 2D list.
- Challenge: a password manager (accounts / usernames / passwords).

> 🧑‍🏫 Pair programming, swap every 5 mins. The password-manager lookup is hard — support there. Reminder: do NOT use real passwords. TA: prompt, don't do it for them. Screenshot at the end.

## I can…
Tick your four "I can…". Show me a program that uses a 2D list.

> 🧑‍🏫 Plenary. Predict one `list[row][column]` access. Recap: row first, then column; you can change and append. Next: the 2D-list project. Movement break is routine.
