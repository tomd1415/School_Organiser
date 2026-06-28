# Records and dictionaries

## Today we are learning
- describe what a record is (an entity and its attributes)
- use a dictionary to make a record in Python
- get and change an attribute using its key
- use a list of dictionaries to make a database

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: entity · attribute · field · record · database · key · dictionary. Same routine. Everyone has Python open.

## Starter — predict
```python
grid = [["", "", ""],
        ["", "B", ""],
        ["", "", ""]]
print(grid[1][1])
```
Predict the output. Row first, then column.

> 🧑‍🏫 Peer instruction. Answer: "B". This recaps 2D-list indexing (row then column) before we meet dictionaries, which are accessed by a KEY instead of an index. Support: which number is the row. Challenge: top-right corner indexes.

## A record  (I do)
- An **entity** is one thing we store: a player, a book, a film.
- An **attribute** is one fact about it: username, score, title.
- A **record** = all the attributes for one entity.
- Many records together make a **database**.

![Each row is a record; each column is an attribute.]({{res:l1-records-database-teach-computing.png}})

> 🧑‍🏫 I-do. Point at the entity, the attributes, the record. Python has no "record" type, so we use a DICTIONARY to act like a record. This is the bridge to next lesson.

## A dictionary in Python  (we do)
```python
player = {"username": "rockstar",
          "password": "6goatsEating",
          "score": 5328}
print(player["username"])          # get by KEY
player["password"] = "7goatsEating"  # change by KEY
```

> 🧑‍🏫 We-do. A list uses an index number; a dictionary uses a KEY (the word in the brackets). Predict `print(player["username"])` first. Common slip: using `()` instead of `[]` — fix-words "square brackets to look up a key."

## Your turn  (you do)
- Support: order the "make a record" program (Parson's).
- Core: make your own record (3 attributes) and print one with a heading.
- Challenge: a list of dictionaries — a database.

> 🧑‍🏫 Pair programming, swap every 5 mins. Likely error: a missing comma between pairs, or `{}` vs `[]`. Fix-words "every pair ends with a comma; curly brackets hold the dictionary." TA: prompt, don't do it for them. Screenshot at the end.

## I can…
Tick your four "I can…". Show me a record you made.

> 🧑‍🏫 Plenary. Match the key word to its meaning (entity / attribute / key / record). Recap: a dictionary stores key:value pairs; a list of dictionaries is a database. Next lesson: dictionaries that grow. Movement break is routine.
