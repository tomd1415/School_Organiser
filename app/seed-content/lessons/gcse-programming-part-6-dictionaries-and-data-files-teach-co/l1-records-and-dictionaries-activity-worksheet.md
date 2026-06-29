# Records and dictionaries — activity worksheet

| Name | Type your name here |
|---|---|
| Date | Type the date here |

## What we are learning
Today I will make a **record** with a **dictionary**, get and change an **attribute** by its **key**, and build a **database** (a list of dictionaries).

![A database of records — each row is a record, each column is an attribute (Teach Computing).]({{res:l1-a-database-of-records-teach-computing.png}})

## Key words — match each to its meaning
| Word | What it means |
|---|---|
| Entity | (  ) one thing we store (a player, a book) (  ) one fact about the thing (  ) the label used to find a fact |
| Attribute | (  ) one thing we store (a player, a book) (  ) one fact about the thing (  ) the label used to find a fact |
| Key | (  ) one thing we store (a player, a book) (  ) one fact about the thing (  ) the label used to find a fact |

## Code snippets
```python
player = {"username": "rockstar",
          "password": "6goatsEating",
          "score": 5328}
print(player)                  # prints the whole record
print(player["username"])      # gets ONE attribute by its key
player["password"] = "7goatsEating"   # changes the data for a key
```

## Dictionary syntax — fill the gaps
A dictionary is written with **curly brackets** `{ }`. Each pair is `key : value`.

| Question | Your answer |
|---|---|
| To get the score out of `player`, write `player[ ` [[ ]] ` ]` | |
| To change the score to 6000, write `player["score"]` [[ ]] `6000` | |
| A list is accessed by an index, but a dictionary is accessed by a [[ ]] | |

## 🟢 Support — make a record
Order the lines so the program makes a book record and prints the title.

```parsons
book = {"Title": "Matilda",
        "Author": "Roald Dahl",
        "ISBN": "0140328726"}
print(book["Title"])
```

## 🟡 Core
| Question | Your answer |
|---|---|
| Make your OWN record (a game, book, or film) with at least 3 attributes, then print one attribute with a heading, e.g. `print("Title:", book["Title"])`. Type your code. | Type your code here |

## 🔴 Challenge
| Question | Your answer |
|---|---|
| Make a `players` **list**, then `append` two `player` dictionaries to it (a database). Print the player at index 0. Type your code. | Type your code here |

## Show your work
| Question | Your answer |
|---|---|
| Paste your Trinket / IDE share link here | Type your answer here |
| Show your finished program | 📷 Paste a screenshot of your work here |

## ✅ I can…
- [ ] I described what a record is (an entity and its attributes)
- [ ] I used a dictionary to make a record in Python
- [ ] I got and changed an attribute using its key
- [ ] I used a list of dictionaries to make a database
