# Arrays and lists

## Today we are learning
- describe the difference between an array and a list
- create a list and get an item by its index
- append an item to a list
- remove an item from a list

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary on the board: list · array · index · append · remove · data structure. Same routine. Everyone has Python open.

## Starter — predict
```python
words = ["sun", "moon", "star", "cloud"]
print(words[2])
```
Predict the output. Counting starts at **0**.

> 🧑‍🏫 Peer instruction. Answer: "star" (index 2 is the THIRD item). Support: tick what a list holds. Challenge: which index is the last item.

## Lists and arrays  (I do)
- A **list** holds many items under **one name**; each has an **index** from 0.
- A **list** is **dynamic** — it can grow and shrink, and hold different data types.
- An **array** is **static** — a fixed size, all the same data type.

> 🧑‍🏫 I-do. Draw a list with indexes 0,1,2,3. Common slip: index 1 ≠ first item. Fix-words: "the first item is at zero." OCR uses both words — lists are the Python version.

## Append and remove  (we do)
```python
shopping = ["bread", "cheese", "milk"]
shopping.append("eggs")
shopping.remove("cheese")
print(shopping)
```

> 🧑‍🏫 We-do. `append` adds to the END; `remove` takes out the first matching item. This is what makes a list dynamic. Card-sort: which facts are about an array, which about a list.

## Your turn  (you do)
- Support: order the Simon-says program (Parson's).
- Core: a shopping-list program that adds an item.
- Challenge: ask "add or remove?" and do the right one.

> 🧑‍🏫 Pair programming, swap every 5 mins. Likely error: `remove` an item that isn't there → crash. Fix-words: "check it's in the list first." TA: prompt, don't do it for them. Screenshot at the end.

## I can…
Tick your four "I can…". Show me a program that uses a list.

> 🧑‍🏫 Plenary. Other list methods are coming next lesson. Recap: list = many items, one name, indexes from 0; append/remove change it. Movement break is routine.
